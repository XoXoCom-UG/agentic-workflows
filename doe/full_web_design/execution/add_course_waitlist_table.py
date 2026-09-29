#!/usr/bin/env python3
"""Create `leads.course_waitlist` — the table behind the course booking form.

(Named for the waiting list it started as; since 2026-09-29 each row is a booking
request — see "Booking type" in the design notes.)

Why a separate table instead of reusing `leads.prospects`: a waitlist signup answers a
different question than a contact request. It is per-course (one person may join two
waitlists), it carries no message body, and it exists to measure demand for one specific
course before it is built. Folding it into `prospects` would mean either a nullable
`course_slug` on every contact row or a `campaign_slug` overload that breaks the existing
one-row-per-visitor upsert. A small dedicated table keeps both queries honest.

Why a direct Postgres connection: the PostgREST service key cannot run DDL, so this
connects with SUPABASE_DB_URL from the repo-root .env — same pattern as
add_blog_schema.py, add_campaign_slug_column.py and add_prospects_dedup_constraint.py.

Design notes:

  * Unique on (course_slug, email) — PLAIN columns, not an expression. This is not a
    style choice: PostgREST sends `ON CONFLICT (course_slug, email)`, and Postgres can
    only infer a conflict target from an index over exactly those columns. A unique
    index on `(course_slug, lower(email))` looks equivalent and fails at runtime with
    42P10, "no unique or exclusion constraint matching the ON CONFLICT specification",
    which is precisely what the first version of this migration did.
    Case-insensitivity is preserved structurally instead, by a CHECK constraint that
    refuses any address that isn't already lowercase — the API route lowercases before
    writing, so the constraint documents that contract rather than fighting it.

  * RLS is ENABLED with no policies at all. The public site reads and writes this table
    only through the server-side service-role client (which bypasses RLS); the anon key
    that ships to the browser therefore has zero access — it cannot read the list of
    people who signed up. That is the whole point: a waitlist is a private list.

  * `email` is text, not citext, so the project needs no extra extension. The
    lowercase CHECK above is what makes plain text behave case-insensitively here.

  * Booking type (added 2026-09-29, when the form became a booking request with a
    "For myself" / "For my team" choice). `booking_type` is 'self' or 'team'; `places`
    is how many places the booking asks for. One CHECK ties them together: a 'self'
    booking is exactly one place, a 'team' booking is 2-20 places and must name a
    company. Existing rows pick up the defaults ('self', 1), which is what they were.
    `updated_at` is set by the route when a repeat booking replaces an earlier one;
    `created_at` keeps the date of the first booking. The table keeps its original
    name: renaming it would break the route and the index names for no user benefit.

Idempotent and safe to re-run: CREATE SCHEMA / TABLE / INDEX all use IF NOT EXISTS and
the column adds are additive, so running this against a database that already has the
table changes nothing.

Usage:
    python execution/add_course_waitlist_table.py          # create / update
    python execution/add_course_waitlist_table.py --check  # read-only report

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

SCHEMA = "leads"
TABLE = "course_waitlist"
INDEX = "ux_course_waitlist_course_email"

# Ordered DDL; the whole block runs in one transaction. Identifiers are trusted module
# constants, but they are interpolated once here rather than per-statement so the SQL
# below reads as SQL.
DDL = f"""
CREATE SCHEMA IF NOT EXISTS {SCHEMA};

CREATE TABLE IF NOT EXISTS {SCHEMA}.{TABLE} (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_slug text        NOT NULL,
    email       text        NOT NULL,
    first_name  text,
    -- Unused by today's form, which asks only for a first name: every extra required
    -- box on a "tell me when it's ready" form costs signups. They exist so a later,
    -- longer form is an additive change here rather than a migration.
    last_name   text,
    company     text,
    -- Which language the visitor had the site in when they signed up. Useful when the
    -- course launch email goes out: it decides which version of it they receive.
    -- CHECKed, not merely conventional: the route only ever writes 'de'/'en', but a
    -- later direct insert (seed, import, admin tool) that wrote anything else would be
    -- read as English by mailer.ts rather than rejected. Cheaper to refuse it here.
    lang        text CHECK (lang IS NULL OR lang IN ('de', 'en')),
    -- Free-text "what do you want to get out of this" answer, if the form collects one.
    note        text,
    -- Provenance, mirroring leads.prospects so both tables debug the same way.
    site_slug   text,
    user_agent  text,
    ip          text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- An earlier version of this migration indexed (course_slug, lower(email)). Postgres
-- cannot infer an ON CONFLICT target from an expression index, so every upsert from the
-- site failed with 42P10. Drop any such index before creating the plain one below.
DO $$
DECLARE idx text;
BEGIN
    FOR idx IN
        SELECT indexname FROM pg_indexes
        WHERE schemaname = '{SCHEMA}' AND tablename = '{TABLE}'
          AND indexdef ILIKE '%lower(email)%'
    LOOP
        EXECUTE format('DROP INDEX {SCHEMA}.%I', idx);
    END LOOP;
END $$;

-- One row per (course, person). ON CONFLICT (course_slug, email) infers from this.
CREATE UNIQUE INDEX IF NOT EXISTS {INDEX}
    ON {SCHEMA}.{TABLE} (course_slug, email);

-- ...and this is what keeps that plain index case-insensitive in practice: an address
-- can only be stored in the form the route writes it in.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '{SCHEMA}.{TABLE}'::regclass
          AND conname = '{TABLE}_email_lowercase'
    ) THEN
        ALTER TABLE {SCHEMA}.{TABLE}
            ADD CONSTRAINT {TABLE}_email_lowercase CHECK (email = lower(email));
    END IF;
END $$;

-- The CHECK in the CREATE TABLE above only fires on a FIRST run. This adds the same
-- constraint to a table that already exists, which is the case on every re-run.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '{SCHEMA}.{TABLE}'::regclass
          AND conname = '{TABLE}_lang_known'
    ) THEN
        ALTER TABLE {SCHEMA}.{TABLE}
            ADD CONSTRAINT {TABLE}_lang_known CHECK (lang IS NULL OR lang IN ('de', 'en'));
    END IF;
END $$;

-- Booking type + places (2026-09-29). ADD COLUMN IF NOT EXISTS so a re-run is a no-op;
-- the defaults backfill existing rows as the one-place, for-myself signups they were.
ALTER TABLE {SCHEMA}.{TABLE}
    ADD COLUMN IF NOT EXISTS booking_type text        NOT NULL DEFAULT 'self',
    ADD COLUMN IF NOT EXISTS places       integer     NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS updated_at   timestamptz;

-- The route validates the same rule, but a direct insert (seed, import, admin tool)
-- must not be able to store a team booking with no company or a 'self' booking for
-- five people — the operator's running total of places would silently be wrong.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '{SCHEMA}.{TABLE}'::regclass
          AND conname = '{TABLE}_booking_shape'
    ) THEN
        ALTER TABLE {SCHEMA}.{TABLE}
            ADD CONSTRAINT {TABLE}_booking_shape CHECK (
                (booking_type = 'self' AND places = 1)
                OR (booking_type = 'team' AND places BETWEEN 2 AND 20 AND company IS NOT NULL)
            );
    END IF;
END $$;

-- Demand reporting reads "everyone waiting for course X, newest first".
CREATE INDEX IF NOT EXISTS ix_course_waitlist_course_created
    ON {SCHEMA}.{TABLE} (course_slug, created_at DESC);

-- Deny-by-default: RLS on, no policies. Only the service-role key (server-side) can
-- touch this table; the browser's anon key cannot read who signed up.
ALTER TABLE {SCHEMA}.{TABLE} ENABLE ROW LEVEL SECURITY;

-- PostgREST reaches the table through these roles; the service role still bypasses RLS.
GRANT USAGE ON SCHEMA {SCHEMA} TO service_role;
GRANT ALL ON {SCHEMA}.{TABLE} TO service_role;
"""

VERIFY_TABLE_SQL = (
    "SELECT 1 FROM information_schema.tables "
    "WHERE table_schema = %s AND table_name = %s;"
)
VERIFY_INDEX_SQL = (
    "SELECT 1 FROM pg_indexes WHERE schemaname = %s AND tablename = %s AND indexname = %s;"
)
COLUMNS_SQL = (
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position;"
)
VERIFY_CHECK_SQL = (
    "SELECT 1 FROM pg_constraint WHERE conrelid = %s::regclass AND conname = %s;"
)
COUNT_SQL = f"SELECT count(*) FROM {SCHEMA}.{TABLE};"


def report(cur) -> bool:
    """Print what exists right now. Returns True when the table is present."""
    cur.execute(VERIFY_TABLE_SQL, (SCHEMA, TABLE))
    if cur.fetchone() is None:
        print(f"  {SCHEMA}.{TABLE}: MISSING")
        return False

    cur.execute(COLUMNS_SQL, (SCHEMA, TABLE))
    cols = cur.fetchall()
    cur.execute(VERIFY_INDEX_SQL, (SCHEMA, TABLE, INDEX))
    has_index = cur.fetchone() is not None
    checks = {}
    for name in (f"{TABLE}_email_lowercase", f"{TABLE}_lang_known", f"{TABLE}_booking_shape"):
        cur.execute(VERIFY_CHECK_SQL, (f"{SCHEMA}.{TABLE}", name))
        checks[name] = cur.fetchone() is not None
    cur.execute(COUNT_SQL)
    rows = cur.fetchone()[0]

    print(f"  {SCHEMA}.{TABLE}: present ({rows} row(s))")
    print(f"    columns: {', '.join(f'{n} {t}' for n, t in cols)}")
    print(f"    {INDEX}: {'present' if has_index else 'MISSING'} (plain columns — required by ON CONFLICT)")
    for name, present in checks.items():
        print(f"    {name} CHECK: {'present' if present else 'MISSING'}")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description="Create leads.course_waitlist.")
    ap.add_argument("--check", action="store_true",
                    help="read-only: report what exists and change nothing")
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
            print("\nbefore (read-only):")
            with conn.cursor() as cur:
                present = report(cur)
            conn.rollback()
            return 0 if present else 1

        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(DDL)
        except psycopg2.Error as exc:
            # `with conn` has already rolled the whole block back, so the database is
            # exactly as it was. The realistic failure here is the lowercase CHECK
            # meeting a pre-existing mixed-case row, which deserves a readable line
            # rather than a traceback — same treatment add_blog_schema.py gives its
            # own multi-step DDL.
            print(f"migration FAILED and was rolled back: {exc}", file=sys.stderr)
            return 1

        with conn.cursor() as cur:
            print("\nafter:")
            ok = report(cur)
        conn.rollback()
    finally:
        conn.close()

    if not ok:
        print(f"migration ran but {SCHEMA}.{TABLE} was not found afterwards", file=sys.stderr)
        return 1

    print(f"\nok: {SCHEMA}.{TABLE} is ready")
    print("next: the site's /api/course-waitlist route writes here with the service key.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
