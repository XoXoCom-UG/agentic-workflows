#!/usr/bin/env python3
"""Create the `sally` schema behind Sally Studio (/sally/admin): `sally.generations` and
`sally.drafts`.

What it stores:

  * sally.generations — one row per call to the LinkedIn agent: the topic, the settings
    the team picked, the model, Sally's strategy note and what the call cost (input /
    output tokens and the USD estimate). This is the cost ledger Patryk asked for: the
    studio sums it per month.
  * sally.drafts — one row per post variant of a generation, with the full draft and its
    analysis as jsonb (`post`), plus a few promoted columns for listing (title, hook,
    score) and the workflow `status`:
        generated -> saved -> approved -> posted     (and archived, from anywhere)
    Every variant is written as 'generated', so the history is complete even when
    nobody presses "Save draft". The LinkedIn integration (later) will only ever pick
    up 'approved' rows.

Demo results (no ANTHROPIC_API_KEY) are never written.

Security: RLS ENABLED with no policies, and only service_role gets grants. The site
touches these tables only from server code with the service key, behind the Sally
Studio password; the browser's anon key cannot read or write them. Same model as
leads.course_waitlist.

Why a new schema instead of `public` or `leads`: these are internal editorial records,
not leads and not public content, and a schema of their own keeps the grants simple.
The cost is one dashboard step — PostgREST only serves exposed schemas:
    Supabase -> Settings -> API -> Exposed schemas: add 'sally'
The script checks for it where it can and prints the step if it is missing.

Why a direct Postgres connection: the PostgREST service key cannot run DDL, so this
connects with SUPABASE_DB_URL from the repo-root .env — same pattern as the other
execution/add_*.py migrations.

Idempotent and safe to re-run: everything is IF NOT EXISTS / guarded.

Usage:
    python execution/add_sally_studio_tables.py          # create / update
    python execution/add_sally_studio_tables.py --check  # read-only report

Exit codes: 0 ok, 1 runtime/verification failure, 2 bad environment.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from dotenv import dotenv_values
except ImportError:
    print("python-dotenv not installed. Run: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)

try:
    import psycopg2
except ImportError:
    print("psycopg2 not installed. Run: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent

SCHEMA = "sally"
TABLES = ("generations", "drafts")

DDL = f"""
CREATE SCHEMA IF NOT EXISTS {SCHEMA};

CREATE TABLE IF NOT EXISTS {SCHEMA}.generations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    timestamptz NOT NULL DEFAULT now(),
    topic         text        NOT NULL,
    -- goal / format / tone / language / variants / notes, exactly as the studio sent them.
    settings      jsonb       NOT NULL DEFAULT '{{}}'::jsonb,
    model         text        NOT NULL,
    strategy_note text,
    input_tokens  integer     NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens integer     NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    -- Estimate at the model's list price when the call was made (lib/sally-agent.ts).
    cost_usd      numeric(12, 6) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0)
);

CREATE TABLE IF NOT EXISTS {SCHEMA}.drafts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id uuid        NOT NULL REFERENCES {SCHEMA}.generations(id) ON DELETE CASCADE,
    -- Variant number within its generation (0-based), so a generation re-renders in order.
    position      smallint    NOT NULL DEFAULT 0,
    lang          text        NOT NULL CHECK (lang IN ('de', 'en')),
    status        text        NOT NULL DEFAULT 'generated'
                  CHECK (status IN ('generated', 'saved', 'approved', 'posted', 'archived')),
    title         text        NOT NULL,
    hook          text        NOT NULL,
    score         numeric(4, 1),
    -- The whole draft as the agent returned it: text, structure, analysis, hashtags...
    post          jsonb       NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- The library lists "newest first, optionally by status"; the cost card sums a month.
CREATE INDEX IF NOT EXISTS ix_sally_drafts_status_created ON {SCHEMA}.drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_sally_drafts_generation     ON {SCHEMA}.drafts (generation_id);
CREATE INDEX IF NOT EXISTS ix_sally_generations_created   ON {SCHEMA}.generations (created_at DESC);

-- Deny-by-default: RLS on, no policies. Only the service-role key (server-side) can
-- touch these tables.
ALTER TABLE {SCHEMA}.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE {SCHEMA}.drafts      ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA {SCHEMA} TO service_role;
GRANT ALL ON {SCHEMA}.generations, {SCHEMA}.drafts TO service_role;
"""

VERIFY_TABLE_SQL = (
    "SELECT 1 FROM information_schema.tables WHERE table_schema = %s AND table_name = %s;"
)
# PostgREST reads its exposed-schema list from a role setting (see add_blog_schema.py).
Q_EXPOSED = "SELECT unnest(setconfig) FROM pg_db_role_setting;"


def exposed_status(conn) -> str:
    """'ok', 'absent' or 'unknown' — 'unknown' when pooled connections hide the setting,
    which is not evidence the schema is unexposed."""
    try:
        with conn.cursor() as cur:
            cur.execute(Q_EXPOSED)
            rows = cur.fetchall()
    except psycopg2.Error:
        return "unknown"
    finally:
        conn.rollback()
    for (setting,) in rows:
        if setting and setting.startswith("pgrst.db_schemas="):
            names = [s.strip() for s in setting.split("=", 1)[1].split(",")]
            return "ok" if SCHEMA in names else "absent"
    return "unknown"


def report(conn) -> bool:
    ok = True
    with conn.cursor() as cur:
        for table in TABLES:
            cur.execute(VERIFY_TABLE_SQL, (SCHEMA, table))
            if cur.fetchone() is None:
                print(f"  {SCHEMA}.{table}: MISSING")
                ok = False
                continue
            cur.execute(f"SELECT count(*) FROM {SCHEMA}.{table};")
            print(f"  {SCHEMA}.{table}: present ({cur.fetchone()[0]} row(s))")
    conn.rollback()

    status = exposed_status(conn)
    if status == "ok":
        print(f"  exposed schemas include '{SCHEMA}'")
    elif status == "absent":
        print(f"  MISS '{SCHEMA}' is not in the exposed schemas")
    else:
        print("  WARN exposed schemas not readable over this connection - check the dashboard")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description="Create the sally schema for Sally Studio.")
    ap.add_argument("--check", action="store_true", help="read-only: report what exists and change nothing")
    args = ap.parse_args()

    env_path = REPO_ROOT / ".env"
    if not env_path.is_file():
        print(f"missing {env_path}", file=sys.stderr)
        return 2
    db_url = dotenv_values(env_path).get("SUPABASE_DB_URL")
    if not db_url:
        print("SUPABASE_DB_URL not set in .env", file=sys.stderr)
        return 2

    try:
        conn = psycopg2.connect(db_url)
    except psycopg2.OperationalError as exc:
        print(f"could not connect to Postgres: {exc}", file=sys.stderr)
        return 1

    try:
        if args.check:
            print("\ncurrent state (read-only):")
            return 0 if report(conn) else 1

        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(DDL)
        except psycopg2.Error as exc:
            print(f"migration FAILED and was rolled back: {exc}", file=sys.stderr)
            return 1

        print("\nafter:")
        ok = report(conn)
        status = exposed_status(conn)
    finally:
        conn.close()

    if not ok:
        print("migration ran but a table was not found afterwards", file=sys.stderr)
        return 1

    print(f"\nok: schema '{SCHEMA}' is ready")
    print("next steps:")
    if status != "ok":
        print(f"  1. Supabase -> Settings -> API -> Exposed schemas: add '{SCHEMA}'.")
        print("     Until then Sally Studio cannot save (PGRST106) and keeps drafts in the browser.")
    print("  2. Vercel env: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (the blog uses them too).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
