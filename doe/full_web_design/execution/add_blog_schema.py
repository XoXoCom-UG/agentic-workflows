#!/usr/bin/env python3
"""Create the `blog` schema that backs the XoXoCom blog: posts, tags, authors,
the two read views the public site uses, RLS policies, and the media bucket.

Why a direct Postgres connection: the PostgREST service key cannot run DDL, so this
connects with SUPABASE_DB_URL from the repo-root .env — same pattern as
add_prospects_dedup_constraint.py and add_campaign_slug_column.py.

Design notes worth knowing before you change anything here:

  * Public pages never read `blog.posts`. They read `blog.published_posts`, a view
    whose WHERE clause pins `status = 'published' AND published_at <= now()`. The site's
    server-side Supabase client uses the SERVICE ROLE key, which bypasses RLS entirely —
    so RLS alone would not stop a forgotten filter from publishing drafts. The view makes
    that structurally impossible, and gives scheduled publishing for free.

  * Write access is gated on membership in `blog.authors`, not merely on being signed in.
    Supabase Auth lets anyone with the anon key (which ships to the browser) create an
    account unless public signup is disabled in the dashboard. The allowlist is the second
    layer, so a rogue `authenticated` session still has zero write surface.

  * Tags are a text[] of language-neutral slugs on the post, plus a `blog.tags` lookup
    table carrying `label_de` / `label_en`. A bare array of display labels would fragment
    one topic into two chips across languages; a join table would cost a three-way join on
    every index read. This is the middle path — GIN-indexed containment for filtering,
    one small cached lookup for labels.

  * A BEFORE trigger owns what a CHECK constraint cannot: slug/tag normalisation,
    `updated_at`, and stamping `published_at` on first publish. CHECKs evaluate after
    BEFORE triggers, so `posts_published_has_date` sees the trigger-filled value.
    Unpublishing and republishing preserves the original `published_at`.

Idempotent and safe to re-run: every object uses IF NOT EXISTS or CREATE OR REPLACE,
and policies are dropped before being recreated.

Usage:
    python execution/add_blog_schema.py             # create / update everything
    python execution/add_blog_schema.py --check     # read-only report, changes nothing
    python execution/add_blog_schema.py --seed      # also insert two sample posts

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

SCHEMA = "blog"
BUCKET = "blog-media"

TABLES = ("authors", "tags", "posts")
VIEWS = ("published_posts", "tag_counts")
INDEXES = ("ux_posts_slug", "ix_posts_public", "ix_posts_tags", "ix_posts_status")
POLICIES = (
    "posts_public_read",
    "posts_author_read",
    "posts_author_insert",
    "posts_author_update",
    "posts_author_delete",
    "tags_public_read",
    "tags_author_write",
    "authors_self_read",
)


# =========================================================================
# DDL — ordered; the whole block runs in one transaction
# =========================================================================

DDL_SCHEMA = "CREATE SCHEMA IF NOT EXISTS blog;"

DDL_AUTHORS = """
CREATE TABLE IF NOT EXISTS blog.authors (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
"""

DDL_TAGS = """
CREATE TABLE IF NOT EXISTS blog.tags (
  slug       text PRIMARY KEY,
  label_de   text NOT NULL,
  label_en   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
"""

DDL_POSTS = """
CREATE TABLE IF NOT EXISTS blog.posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL,
  lang            text NOT NULL CHECK (lang IN ('de','en')),
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','archived')),
  title           text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 120),
  excerpt         text NOT NULL DEFAULT '' CHECK (length(excerpt) <= 300),
  body_md         text NOT NULL DEFAULT '',
  cover_url       text,
  cover_alt       text,
  tags            text[] NOT NULL DEFAULT '{}',
  reading_minutes int NOT NULL DEFAULT 1 CHECK (reading_minutes > 0),
  seo_title       text,
  seo_description text,
  author_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name     text,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_slug_format        CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT posts_published_has_date CHECK (status <> 'published' OR published_at IS NOT NULL),
  CONSTRAINT posts_published_has_body CHECK (status <> 'published' OR length(btrim(body_md)) > 0),
  CONSTRAINT posts_cover_needs_alt    CHECK (cover_url IS NULL OR length(btrim(coalesce(cover_alt,''))) > 0)
);
"""

# Slug is unique GLOBALLY, not per language: /blog/[slug] carries no language segment,
# so a DE and an EN article on the same topic must have distinct slugs.
DDL_INDEXES = """
CREATE UNIQUE INDEX IF NOT EXISTS ux_posts_slug ON blog.posts (slug);
CREATE INDEX IF NOT EXISTS ix_posts_public
  ON blog.posts (lang, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS ix_posts_tags   ON blog.posts USING gin (tags);
CREATE INDEX IF NOT EXISTS ix_posts_status ON blog.posts (status, updated_at DESC);
"""

DDL_TRIGGER = """
CREATE OR REPLACE FUNCTION blog.normalize_post() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  cleaned text[];
BEGIN
  NEW.slug := lower(btrim(coalesce(NEW.slug, '')));

  -- Normalise each tag to a slug, drop blanks, de-duplicate, sort. Sorting keeps the
  -- stored array canonical so two posts tagged the same way compare equal.
  SELECT coalesce(array_agg(DISTINCT x.t ORDER BY x.t), '{}'::text[])
    INTO cleaned
    FROM (
      SELECT btrim(regexp_replace(lower(btrim(raw)), '[^a-z0-9]+', '-', 'g'), '-') AS t
        FROM unnest(coalesce(NEW.tags, '{}'::text[])) AS raw
    ) x
   WHERE x.t <> '';
  NEW.tags := cleaned;

  NEW.updated_at := now();

  -- First publish stamps the date; a later unpublish/republish keeps the original.
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  -- Attribution is decided by the database, never by the client. Without this, any
  -- allow-listed author could post under a colleague's name simply by sending a
  -- different author_id: the RLS policies only prove that the caller IS an author,
  -- not that they are THIS author. auth.uid() is NULL for service-role and direct
  -- psql connections (seeding, migrations), which keeps those paths working.
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.author_id := auth.uid();
    END IF;
  ELSE
    NEW.author_id := OLD.author_id;   -- immutable after creation
  END IF;

  -- Byline follows the allowlist, so it cannot be spoofed either. Posts with no
  -- author_id (seed rows, service-role imports) keep whatever name was supplied.
  IF NEW.author_id IS NOT NULL THEN
    SELECT a.display_name INTO NEW.author_name
      FROM blog.authors a WHERE a.user_id = NEW.author_id;
  END IF;

  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_posts_normalize ON blog.posts;
CREATE TRIGGER trg_posts_normalize
  BEFORE INSERT OR UPDATE ON blog.posts
  FOR EACH ROW EXECUTE FUNCTION blog.normalize_post();

-- blog.tags.slug has a format CHECK; without this a tag typed as "AI Transformation"
-- would hard-fail instead of becoming 'ai-transformation'. Mirrors how post tags are
-- normalised above, so the two vocabularies can never drift apart.
CREATE OR REPLACE FUNCTION blog.normalize_tag() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.slug := btrim(regexp_replace(lower(btrim(coalesce(NEW.slug, ''))), '[^a-z0-9]+', '-', 'g'), '-');
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_tags_normalize ON blog.tags;
CREATE TRIGGER trg_tags_normalize
  BEFORE INSERT OR UPDATE ON blog.tags
  FOR EACH ROW EXECUTE FUNCTION blog.normalize_tag();
"""

# security_invoker: the caller's permissions and RLS apply to the underlying table.
# The view's own WHERE clause applies regardless — including to the service role,
# which is the whole point.
DDL_VIEWS = """
CREATE OR REPLACE VIEW blog.published_posts WITH (security_invoker = true) AS
  SELECT id, slug, lang, title, excerpt, body_md, cover_url, cover_alt, tags,
         reading_minutes, seo_title, seo_description, author_name,
         published_at, created_at, updated_at
    FROM blog.posts
   WHERE status = 'published' AND published_at <= now();

CREATE OR REPLACE VIEW blog.tag_counts WITH (security_invoker = true) AS
  SELECT p.lang, t.tag, count(*)::int AS post_count
    FROM blog.published_posts p, unnest(p.tags) AS t(tag)
   GROUP BY p.lang, t.tag;
"""

DDL_RLS = """
ALTER TABLE blog.posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.tags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_public_read   ON blog.posts;
DROP POLICY IF EXISTS posts_author_read   ON blog.posts;
DROP POLICY IF EXISTS posts_author_insert ON blog.posts;
DROP POLICY IF EXISTS posts_author_update ON blog.posts;
DROP POLICY IF EXISTS posts_author_delete ON blog.posts;
DROP POLICY IF EXISTS tags_public_read    ON blog.tags;
DROP POLICY IF EXISTS tags_author_write   ON blog.tags;
DROP POLICY IF EXISTS authors_self_read   ON blog.authors;

CREATE POLICY posts_public_read ON blog.posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at <= now());

CREATE POLICY posts_author_read ON blog.posts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM blog.authors a WHERE a.user_id = auth.uid()));

CREATE POLICY posts_author_insert ON blog.posts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM blog.authors a WHERE a.user_id = auth.uid()));

CREATE POLICY posts_author_update ON blog.posts
  FOR UPDATE TO authenticated
  USING      (EXISTS (SELECT 1 FROM blog.authors a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM blog.authors a WHERE a.user_id = auth.uid()));

CREATE POLICY posts_author_delete ON blog.posts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM blog.authors a WHERE a.user_id = auth.uid()));

CREATE POLICY tags_public_read ON blog.tags
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY tags_author_write ON blog.tags
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM blog.authors a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM blog.authors a WHERE a.user_id = auth.uid()));

CREATE POLICY authors_self_read ON blog.authors
  FOR SELECT TO authenticated USING (user_id = auth.uid());
"""

# anon needs SELECT on blog.posts as well as on the view, because security_invoker
# resolves permissions against the underlying table. RLS narrows it to published rows.
DDL_GRANTS = """
GRANT USAGE ON SCHEMA blog TO anon, authenticated, service_role;
GRANT SELECT ON blog.published_posts, blog.tag_counts TO anon, authenticated, service_role;
GRANT SELECT ON blog.posts, blog.tags TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON blog.posts, blog.tags TO authenticated, service_role;
GRANT SELECT ON blog.authors TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON blog.authors TO service_role;
"""

DDL_STEPS = (
    ("schema", DDL_SCHEMA),
    ("authors table", DDL_AUTHORS),
    ("tags table", DDL_TAGS),
    ("posts table", DDL_POSTS),
    ("indexes", DDL_INDEXES),
    ("normalise trigger", DDL_TRIGGER),
    ("views", DDL_VIEWS),
    ("row level security", DDL_RLS),
    ("grants", DDL_GRANTS),
)


# =========================================================================
# Seed — clearly-marked samples, so /blog can be previewed before the admin exists
# =========================================================================

SEED_TAGS = [
    ("sample-topic", "Beispielthema", "Sample topic"),
    ("sample-second", "Zweites Beispiel", "Second sample"),
]

_SEED_BODY = (
    "## Sample heading\n\n"
    "This is seeded placeholder content created by `execution/add_blog_schema.py --seed`. "
    "It exists so the blog routes can be previewed before the admin UI is built.\n\n"
    "- Delete this post once you publish something real.\n"
    "- Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n"
    "> Pull quotes render like this.\n"
)

SEED_POSTS = [
    {
        "slug": "sample-post-en",
        "lang": "en",
        "title": "SAMPLE — English test post (safe to delete)",
        "excerpt": "Seeded by add_blog_schema.py --seed so the blog routes can be previewed. Delete once real content exists.",
        "body_md": _SEED_BODY,
        "tags": ["sample-topic", "sample-second"],
        "reading_minutes": 2,
        "author_name": "Seed script",
    },
    {
        "slug": "beispiel-beitrag-de",
        "lang": "de",
        "title": "BEISPIEL — Deutscher Testbeitrag (kann geloescht werden)",
        "excerpt": "Von add_blog_schema.py --seed angelegt, damit die Blog-Routen getestet werden koennen. Bitte spaeter loeschen.",
        "body_md": _SEED_BODY,
        "tags": ["sample-topic"],
        "reading_minutes": 2,
        "author_name": "Seed script",
    },
]

SEED_TAG_SQL = """
INSERT INTO blog.tags (slug, label_de, label_en) VALUES (%s, %s, %s)
ON CONFLICT (slug) DO NOTHING;
"""

SEED_POST_SQL = """
INSERT INTO blog.posts
  (slug, lang, status, title, excerpt, body_md, tags, reading_minutes, author_name)
VALUES (%s, %s, 'published', %s, %s, %s, %s, %s, %s)
ON CONFLICT (slug) DO NOTHING;
"""


# =========================================================================
# Verification
# =========================================================================

Q_TABLES = """
SELECT table_name, table_type FROM information_schema.tables
 WHERE table_schema = 'blog' ORDER BY table_name;
"""

Q_INDEXES = "SELECT indexname FROM pg_indexes WHERE schemaname = 'blog' ORDER BY indexname;"

Q_POLICIES = "SELECT policyname FROM pg_policies WHERE schemaname = 'blog' ORDER BY policyname;"

Q_RLS = """
SELECT c.relname, c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'blog' AND c.relkind = 'r' ORDER BY c.relname;
"""

Q_TRIGGERS = """
SELECT t.tgname FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'blog' AND NOT t.tgisinternal;
"""

# security_invoker on views is Postgres 15+. Without it the two read views would run
# with the definer's rights and the draft guarantee would be weaker than documented,
# so this is a hard prerequisite rather than a nice-to-have.
Q_VERSION = "SELECT current_setting('server_version_num')::int, version();"
MIN_PG_VERSION = 150000

# PostgREST reads its exposed-schema list from a role setting. It can be attached to the
# `authenticator` role or set database-wide, so scan every row rather than assuming.
Q_EXPOSED = "SELECT unnest(setconfig) FROM pg_db_role_setting;"

Q_BUCKET = "SELECT public FROM storage.buckets WHERE id = %s;"

Q_COUNTS = """
SELECT
  (SELECT count(*) FROM blog.posts),
  (SELECT count(*) FROM blog.posts WHERE status = 'published'),
  (SELECT count(*) FROM blog.tags),
  (SELECT count(*) FROM blog.authors);
"""


def q(conn, statement: str, params: tuple | None = None) -> list | None:
    """Run one read-only query, isolated. Returns rows, or None if the query failed.

    Every check gets its own transaction and is rolled back afterwards. Without this,
    a single expected failure — `blog.posts` not existing yet on a fresh database, or
    `storage.buckets` being unreadable — would abort the surrounding transaction and
    make every subsequent check fail with InFailedSqlTransaction, turning one missing
    object into a wall of misleading errors.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(statement, params)
            return cur.fetchall()
    except psycopg2.Error:
        return None
    finally:
        conn.rollback()


def check_exposed_schema(conn) -> tuple[str, str | None]:
    """Return (status, raw setting) where status is 'ok', 'absent' or 'unknown'.

    'unknown' matters: on Supabase's pooled connections `pg_db_role_setting` is often
    not visible, so the setting cannot be read from SQL at all. That is NOT evidence
    the schema is unexposed, and treating it as a failure would make this script exit 1
    forever on a perfectly healthy install. Only a readable list that genuinely omits
    'blog' is a hard failure.
    """
    rows = q(conn, Q_EXPOSED)
    if rows is None:
        return ("unknown", None)
    for (setting,) in rows:
        if setting and setting.startswith("pgrst.db_schemas="):
            value = setting.split("=", 1)[1]
            names = [s.strip() for s in value.split(",")]
            return ("ok" if SCHEMA in names else "absent", value)
    return ("unknown", None)


def report(conn) -> bool:
    """Print a verification report. Returns True if everything required is present."""
    ok = True

    rows = q(conn, Q_TABLES) or []
    found = {name: kind for name, kind in rows}
    if not found:
        print(f"  MISS schema blog is empty or does not exist yet")
        ok = False
    for t in TABLES:
        present = found.get(t) == "BASE TABLE"
        ok &= present
        print(f"  {'ok  ' if present else 'MISS'} table   blog.{t}")
    for v in VIEWS:
        present = found.get(v) == "VIEW"
        ok &= present
        print(f"  {'ok  ' if present else 'MISS'} view    blog.{v}")

    idx = {r[0] for r in (q(conn, Q_INDEXES) or [])}
    for i in INDEXES:
        present = i in idx
        ok &= present
        print(f"  {'ok  ' if present else 'MISS'} index   {i}")

    trg = {r[0] for r in (q(conn, Q_TRIGGERS) or [])}
    for name in ("trg_posts_normalize", "trg_tags_normalize"):
        present = name in trg
        ok &= present
        print(f"  {'ok  ' if present else 'MISS'} trigger {name}")

    rls = q(conn, Q_RLS) or []
    for name in TABLES:
        enabled = any(r[0] == name and r[1] for r in rls)
        ok &= enabled
        print(f"  {'ok  ' if enabled else 'MISS'} rls     blog.{name}")

    pol = {r[0] for r in (q(conn, Q_POLICIES) or [])}
    for p in POLICIES:
        present = p in pol
        ok &= present
        print(f"  {'ok  ' if present else 'MISS'} policy  {p}")

    status, raw = check_exposed_schema(conn)
    if status == "ok":
        print(f"  ok   exposed schemas include '{SCHEMA}' ({raw})")
    elif status == "absent":
        ok = False
        print(f"  MISS exposed schemas: '{SCHEMA}' absent (current: {raw})")
    else:
        print(f"  WARN exposed schemas not readable over this connection - "
              f"confirm '{SCHEMA}' by hand in Settings -> API")

    bucket = q(conn, Q_BUCKET, (BUCKET,))
    if bucket is None:
        print(f"  WARN could not read storage.buckets (insufficient privilege) - "
              f"check '{BUCKET}' in the dashboard")
    elif not bucket:
        print(f"  MISS storage bucket '{BUCKET}' does not exist")
        ok = False
    elif not bucket[0][0]:
        print(f"  WARN storage bucket '{BUCKET}' exists but is not public")
    else:
        print(f"  ok   storage bucket '{BUCKET}' exists and is public")

    counts = q(conn, Q_COUNTS)
    if counts:
        total, published, tags, authors = counts[0]
        print(f"  --   {total} post(s), {published} published, {tags} tag(s), {authors} author(s)")
        if authors == 0:
            print("  WARN blog.authors is empty - nobody can write yet. See next steps.")

    return ok


def next_steps(conn) -> None:
    """Print the manual dashboard steps. Deliberately ASCII-only: this prints to a
    Windows console that is not always UTF-8, and mangled output in a security
    checklist is worse than plain hyphens."""
    status, _ = check_exposed_schema(conn)
    print("\nnext steps (Supabase dashboard - none of these can be done from SQL):")
    if status != "ok":
        print(f"  1. Settings -> API -> Exposed schemas: add '{SCHEMA}'.")
        print("     Until this is done every query returns PGRST106 and /blog renders empty.")
    print("  2. Authentication -> Providers -> Email: disable 'Allow new users to sign up'.")
    print("     The anon key ships to the browser; public signup would let anyone")
    print("     create an authenticated session.")
    print("  3. Authentication -> Users -> Invite each author, then add them to the allowlist:")
    print("       INSERT INTO blog.authors (user_id, display_name)")
    print("       VALUES ('<uuid from the Users table>', '<name>');")
    print("     Being a Supabase user is NOT enough to write - the policies check this table.")
    print("  4. Point Auth SMTP at GMAIL_USER / GMAIL_APP_PASSWORD to avoid the")
    print("     rate-limited default Supabase sender.")


# =========================================================================
# Main
# =========================================================================

def ensure_bucket(conn) -> str:
    """Create the public media bucket. Runs in its own transaction because the
    storage schema is owned by supabase_storage_admin and the grant situation varies
    between projects — a failure here must not roll back the blog schema."""
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO storage.buckets (id, name, public) VALUES (%s, %s, true) "
                    "ON CONFLICT (id) DO UPDATE SET public = true;",
                    (BUCKET, BUCKET),
                )
        return f"ok: storage bucket '{BUCKET}' present and public."
    except psycopg2.Error as exc:
        conn.rollback()
        first = str(exc).strip().splitlines()[0]
        return (
            f"warn: could not create storage bucket '{BUCKET}' from SQL ({first}). "
            "Create it by hand: Storage -> New bucket -> name 'blog-media', Public."
        )


def main() -> int:
    ap = argparse.ArgumentParser(description="Create the blog schema in Supabase.")
    ap.add_argument("--check", action="store_true",
                    help="read-only verification report; makes no changes")
    ap.add_argument("--seed", action="store_true",
                    help="also insert two clearly-marked sample posts")
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
            print(f"checking schema '{SCHEMA}' (read-only):")
            ok = report(conn)
            next_steps(conn)
            if not ok:
                print("\nnot fully provisioned - run without --check to create what is missing.")
            return 0 if ok else 1

        # --- preflight: fail before touching anything, not halfway through ---
        version = q(conn, Q_VERSION)
        if version:
            num, banner = version[0]
            if num < MIN_PG_VERSION:
                print(f"Postgres {num} is too old: the read views need "
                      f"security_invoker, which is Postgres 15+.\n  {banner}", file=sys.stderr)
                return 2
        else:
            print("warn: could not read the Postgres version; "
                  "the views require 15+ for security_invoker.")

        # --- migrate: one transaction, all of it or none of it ---
        # Labels are buffered rather than printed as we go: on a failure the whole
        # transaction rolls back, and "ok: posts table" lines already on screen for
        # objects that no longer exist are worse than no output at all.
        done: list[str] = []
        try:
            with conn:
                with conn.cursor() as cur:
                    for label, statement in DDL_STEPS:
                        cur.execute(statement)
                        done.append(label)
        except psycopg2.Error as exc:
            reached = ", ".join(done) if done else "nothing"
            print(f"\nmigration FAILED and was rolled back. Nothing was applied.\n"
                  f"  reached: {reached}\n  error: {exc}", file=sys.stderr)
            return 1
        for label in done:
            print(f"ok: {label}")

        print(ensure_bucket(conn))

        if args.seed:
            try:
                with conn:
                    with conn.cursor() as cur:
                        for row in SEED_TAGS:
                            cur.execute(SEED_TAG_SQL, row)
                        inserted = 0
                        for p in SEED_POSTS:
                            cur.execute(SEED_POST_SQL, (
                                p["slug"], p["lang"], p["title"], p["excerpt"],
                                p["body_md"], p["tags"], p["reading_minutes"], p["author_name"],
                            ))
                            inserted += cur.rowcount
                print(f"ok: seed - {inserted} sample post(s) inserted "
                      f"({len(SEED_POSTS) - inserted} already present).")
            except psycopg2.Error as exc:
                print(f"seed failed: {exc}", file=sys.stderr)
                return 1

        print("\nverifying:")
        ok = report(conn)
        next_steps(conn)

        if not ok:
            print("\nsome objects are missing or the schema is not exposed - see MISS lines above.",
                  file=sys.stderr)
            return 1
        return 0
    finally:
        if not conn.closed:
            conn.close()


if __name__ == "__main__":
    sys.exit(main())
