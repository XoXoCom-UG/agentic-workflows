#!/usr/bin/env python3
"""De-duplicate leads.prospects and enforce one row per (campaign_slug, email).

Why: every site's /api/submit route writes into the shared leads.prospects table,
tagging each row with a campaign_slug (the site slug). Re-submits, re-tests, and
redeploys were creating duplicate rows for the same person on the same campaign.
This migration (a) collapses existing duplicates, keeping the most recent row per
(campaign_slug, email), then (b) adds a UNIQUE index on (campaign_slug, email) so
the database itself rejects future duplicates. With the index in place the submit
routes upsert with `on_conflict=campaign_slug,email`, which makes a repeat
submission a no-op at the row level instead of a new row.

Scope of the uniqueness rule:
    - Rows are unique per (campaign_slug, email). The SAME email under DIFFERENT
      campaign slugs stays separate (intended — different sites/campaigns).
    - The index uses Postgres' default NULLS DISTINCT semantics, so rows with a
      NULL campaign_slug never conflict (multiple allowed). In practice every
      deployed site sets its slug, so this only matters for un-tagged legacy rows,
      which we deliberately leave untouched.

The migration is idempotent and safe to re-run:
    - The de-dupe DELETE only removes surplus rows within a non-null
      (campaign_slug, email) group; on a clean table it deletes nothing.
    - CREATE UNIQUE INDEX IF NOT EXISTS is a no-op once the index exists.

Connection: uses SUPABASE_DB_URL (direct Postgres connection string) from the
repo-root .env. That string carries DDL privileges; the PostgREST service key
cannot run DDL, which is why we connect directly here. Shared with the
lm_landing_pages workspace (same table) — running it from either workspace is
equivalent.

Usage:
    python execution/add_prospects_dedup_constraint.py
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from dotenv import dotenv_values
except ImportError:
    print("python-dotenv not installed. Run: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("psycopg2 not installed. Run: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent

SCHEMA = "leads"
TABLE = "prospects"
INDEX = "ux_prospects_campaign_slug_email"
COLUMNS = ("campaign_slug", "email")

_T = sql.Identifier(SCHEMA, TABLE)

# Collapse duplicates within each (campaign_slug, email) group, keeping the most recent
# row (created_at desc; ctid breaks ties for rows with equal/NULL timestamps). Rows where
# EITHER column is NULL are excluded: under the index's NULLS DISTINCT semantics such rows
# never conflict, so deleting them would over-delete legacy/un-tagged leads the index would
# happily allow. ctid is a physical row pointer — fine within a single statement.
DEDUPE_SQL = sql.SQL(
    """
    DELETE FROM {table} p
    USING (
        SELECT ctid,
               campaign_slug,
               email,
               row_number() OVER (
                   PARTITION BY campaign_slug, email
                   ORDER BY created_at DESC NULLS LAST, ctid DESC
               ) AS rn
        FROM {table}
    ) d
    WHERE p.ctid = d.ctid
      AND d.rn > 1
      AND d.campaign_slug IS NOT NULL
      AND d.email IS NOT NULL
    """
).format(table=_T)

CREATE_INDEX_SQL = sql.SQL(
    "CREATE UNIQUE INDEX IF NOT EXISTS {index} ON {table} ({cols})"
).format(
    index=sql.Identifier(INDEX),
    table=_T,
    cols=sql.SQL(", ").join(sql.Identifier(c) for c in COLUMNS),
)

VERIFY_INDEX_SQL = (
    "SELECT 1 FROM pg_indexes "
    "WHERE schemaname = %s AND tablename = %s AND indexname = %s;"
)


def main() -> int:
    env_path = REPO_ROOT / ".env"
    if not env_path.is_file():
        print(f"missing {env_path}", file=sys.stderr)
        return 2

    env = dotenv_values(env_path)
    db_url = env.get("SUPABASE_DB_URL")
    if not db_url:
        print("SUPABASE_DB_URL not set in .env", file=sys.stderr)
        return 2

    try:
        conn = psycopg2.connect(db_url)
    except psycopg2.OperationalError as exc:
        print(f"could not connect to Postgres: {exc}", file=sys.stderr)
        return 1

    try:
        with conn:  # single transaction: dedupe + index, or nothing
            with conn.cursor() as cur:
                cur.execute(DEDUPE_SQL)
                removed = cur.rowcount
            with conn.cursor() as cur:
                cur.execute(CREATE_INDEX_SQL)
            with conn.cursor() as cur:
                cur.execute(VERIFY_INDEX_SQL, (SCHEMA, TABLE, INDEX))
                exists = cur.fetchone() is not None
    except psycopg2.errors.UniqueViolation as exc:
        # Should not happen — the dedupe runs first — but surface it clearly if it does.
        print(f"index creation hit a duplicate the dedupe missed: {exc}", file=sys.stderr)
        conn.close()
        return 1
    finally:
        if not conn.closed:
            conn.close()

    if not exists:
        print(
            f"migration ran but index {SCHEMA}.{TABLE}.{INDEX} was not found afterwards",
            file=sys.stderr,
        )
        return 1

    cols = ", ".join(COLUMNS)
    print(f"ok: removed {removed} duplicate row(s); kept the most recent per ({cols}).")
    print(f"ok: UNIQUE index {INDEX} on {SCHEMA}.{TABLE} ({cols}) exists.")
    print("next: submit routes upsert with on_conflict=campaign_slug,email; repeats are now no-ops.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
