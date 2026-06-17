#!/usr/bin/env python3
"""Add the `campaign_slug` column to leads.prospects (idempotent migration).

Why: every website's /api/submit contact route populates `campaign_slug` from the
SITE_SLUG env var, but the column has to exist in Supabase AND be listed in
LEAD_COLUMNS for the value to actually be written. This one-off migration adds
the column so contact submissions from different sites can be separated by
`where campaign_slug = '<slug>'`. Shared with the lm_landing_pages workspace and
safe to re-run if that workspace already added the column.

The migration is additive and idempotent:
    ALTER TABLE leads.prospects ADD COLUMN IF NOT EXISTS campaign_slug text;
Existing rows keep campaign_slug = NULL. Safe to run against production and
safe to run more than once.

Connection: uses SUPABASE_DB_URL (direct Postgres connection string) from the
repo-root .env. That string carries DDL privileges; the PostgREST service key
cannot run DDL, which is why we connect directly here.

Usage:
    python execution/add_campaign_slug_column.py
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
COLUMN = "campaign_slug"

# Identifiers are trusted module constants, but build the DDL via psycopg2.sql
# so injection-safety is structural rather than incidental.
ALTER_SQL = sql.SQL("ALTER TABLE {}.{} ADD COLUMN IF NOT EXISTS {} text").format(
    sql.Identifier(SCHEMA), sql.Identifier(TABLE), sql.Identifier(COLUMN)
)
VERIFY_SQL = (
    "SELECT 1 FROM information_schema.columns "
    "WHERE table_schema = %s AND table_name = %s AND column_name = %s;"
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
        with conn:
            with conn.cursor() as cur:
                cur.execute(ALTER_SQL)
            with conn.cursor() as cur:
                cur.execute(VERIFY_SQL, (SCHEMA, TABLE, COLUMN))
                exists = cur.fetchone() is not None
    finally:
        conn.close()

    if not exists:
        print(
            f"migration ran but {SCHEMA}.{TABLE}.{COLUMN} was not found afterwards",
            file=sys.stderr,
        )
        return 1

    print(f"ok: {SCHEMA}.{TABLE}.{COLUMN} exists (added if it was missing)")
    print("existing rows keep campaign_slug = NULL; new inserts will be tagged.")
    print("next: ensure `campaign_slug` is in LEAD_COLUMNS in .env so the route writes it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
