# Directive: Blog Publishing

## Goal

Let XoXoCom authors write, publish, and manage blog posts on xoxocom.net from a browser,
with no redeploy. Three public/authenticated surfaces: `/blog` (index with tag filter),
`/blog/[slug]` (article), and `/admin` (authenticated CRUD). This directive covers both the
one-time build and the recurring act of publishing a post — the two are documented as
separate sub-sections of Process below.

**Architecture, in one paragraph:** posts live in a Supabase Postgres schema `blog`; public
pages read them server-side through views and cache the result; the admin writes through
Server Actions which invalidate that cache. A publish is therefore live within seconds,
with no `next build` and no git commit. The public side and the admin side deliberately use
**two different Supabase clients**: public pages read through a service-role client that
bypasses RLS entirely and is kept safe only because it queries the `published_posts` view,
never the `posts` table; `/admin` reads and writes through an anon-key-plus-session client
(`lib/supabase-auth.ts`), so every admin query runs under RLS and a signed-in user who is not
in `blog.authors` gets refused by the database itself, not just by the page.

## Inputs

Per post, the author supplies:

- **Language** — `de` or `en`. One language per post; posts are not translated, they are
  paired at most by topic.
- **Title**
- **Slug** — auto-generated from the title, editable, globally unique across both languages.
- **Excerpt** — 120–160 characters, used as the meta description.
- **Body** — Markdown.
- **Tags** — selected from the shared vocabulary or created new.
- **Cover image** (optional) — if set, **alt text is required**.
- **SEO title / SEO description overrides** (optional).
- **Status** — `draft`, `published`, or `archived`.

## Tools / Scripts

- `execution/add_blog_schema.py` — one-time, idempotent migration that creates the `blog`
  schema, its tables, indexes, two triggers, views, and RLS policies, and creates the
  `blog-media` Storage bucket where permissions allow. Flags: `--check` (read-only
  verification report, no writes) and `--seed` (inserts two clearly-marked sample posts).
  Requires `SUPABASE_DB_URL` in the repo-root `.env` — the service key cannot run DDL.
  Requires **Postgres 15 or newer**: the script checks the server version before making any
  change and exits with code 2 if it's older, because the two read views use
  `security_invoker`, a Postgres 15+ feature. Supabase projects are on 15+ by default.
- `execution/build_blog_prototypes.py` — generates layout candidates for design review into
  `.tmp/blog_prototypes/` (default; override with `--out`): `index.html` (a standalone
  preview page) and `artifact.html` (a body-only fragment for publishing as a review
  artifact). Ships five prototypes — three `/blog` index directions (dense card grid,
  feature + grid, editorial list) and two article directions (centered column, sticky meta
  rail) — plus a states panel covering the tag filter and three distinct empty states.
  Deterministic and std-lib only. Design-time only; not part of publishing.
- `sites/xoxocom/lib/markdown-render.ts` — the Markdown → HTML step itself: a dedicated
  `marked` instance, separate from the one the legal pages (`/impressum`, `/datenschutz`,
  `/agb`) use, so configuring it never touches those pages. It shifts every heading down one
  level — an author's `#` becomes an `<h2>` — so a post body can never produce a second
  `<h1>`; the page shell owns the only one. It always emits an `alt` attribute on `<img>`
  tags, even if the author left it blank in Markdown. It carries no `server-only` guard and
  does no sanitizing, on purpose: the admin editor's live preview imports this module
  directly (client-side) so the preview can never drift from what the public page renders,
  and pulling `sanitize-html` into the browser bundle would buy nothing since a draft is
  only ever seen by its own author. Also exports `readingMinutes()`, used by both the public
  read path and the editor's "N min read" label.
- `sites/xoxocom/lib/markdown.ts` — the public render path: calls `markdown-render.ts` and
  then passes the result through an allowlist sanitizer (`sanitize-html`) before it is
  written to the page. This is the load-bearing security boundary — a post body is a
  database row rendered through `dangerouslySetInnerHTML`, so a compromised admin session or
  a direct DB write would otherwise be stored XSS on the marketing domain. Runs inside the
  post cache in `lib/blog.ts`, so sanitizing costs once per cache revalidation, not once per
  request.
- `sites/xoxocom/lib/slugify.ts` — pure, dependency-free slug generation, safe in a client
  component. **Frozen decision:** German umlauts transliterate the German way (`ä→ae`,
  `ö→oe`, `ü→ue`, `ß→ss`), not the Unicode-normalization way — this is permanent because
  changing it later would silently change the slug a title generates and 404 any
  already-published URL that got regenerated. Also exports `uniqueSlug(base, taken)`, which
  returns the first free `slug`, `slug-2`, `slug-3`, … variant; the database's UNIQUE index
  is still the real arbiter, so a race is caught as a save error, never silently overwritten.
- `sites/xoxocom/lib/supabase-auth.ts` — the authenticated Supabase client (anon key +
  session cookies), used by every admin page and Server Action, as opposed to
  `lib/supabase.ts`'s service-role client used by the public site. `getCurrentAuthor()`
  resolves the signed-in user via `auth.getUser()` (never `getSession()`, which does not
  verify the JWT) and then checks for a matching row in `blog.authors` — being authenticated
  is necessary but not sufficient. `requireAuthor()` is the same check but throws instead of
  returning null; every Server Action in `app/admin/actions.ts` calls it as its first
  statement, because a Server Action is an independently addressable endpoint that no layout
  gate protects.
- `sites/xoxocom/lib/blog-admin.ts` — every read and write the admin performs. Differs from
  `lib/blog.ts` in three ways: it queries `blog.posts` (the table, so drafts are visible),
  nothing is cached (a stale "did my edit save?" screen is worse than a slow one), and it
  uses the session client so RLS applies. Reads throw on failure rather than degrading —
  an author shown an empty post list because the database is unreachable would reasonably
  conclude their work was lost. Exposes `StaleWriteError` (raised when a save's `updated_at`
  no longer matches the row — someone else saved first) and `SlugTakenError` (raised on a
  Postgres unique-violation). `updatePostRow` enforces optimistic concurrency via the
  `WHERE updated_at = <the value the form loaded with>` clause rather than a separate
  read-then-compare, so there is no race window. `setPostStatus` (used by the Publish /
  Unpublish / Archive / Restore buttons) deliberately does **not** check `updated_at` — a
  status change is a decision about the row as it stands, not a save of a stale copy.
- `sites/xoxocom/app/admin/layout.tsx`, `login/page.tsx`, `actions.ts` — the unauthenticated
  shell. `layout.tsx` wraps everything under `/admin` (including the login page itself) and
  deliberately holds no access check — a gate here would also gate `/admin/login` and create
  a redirect loop; it sets `robots: { index: false, follow: false }` on every admin page.
  `login/page.tsx` is a server component whose form posts straight to a Server Action, so it
  ships zero client JavaScript. `actions.ts` holds every mutation: `signIn`/`signOut`, and the
  post/tag CRUD actions described below. `signIn` reports a single generic "that email and
  password combination did not work" for both a wrong password and an unknown address, so no
  response ever confirms which addresses have accounts; a valid login whose account has no
  `blog.authors` row is signed back out immediately with a distinct message. `next=` deep
  links are re-validated server-side (`safeNext()`, must start with `/admin` and not `//`) so
  a crafted redirect can never turn the login form into an open-redirect phishing page.
- `sites/xoxocom/app/admin/(protected)/layout.tsx` — **the gate.** Everything inside this
  route group is unreachable without a session whose user has a `blog.authors` row; a missing
  author redirects to `/admin/login?error=signedout&next=<current path>`. It is a server
  component, not middleware — Next.js has shipped a middleware-bypass CVE
  (CVE-2025-29927) in the past, and a check that lives in the render path cannot be skipped
  that way. `middleware.ts` only refreshes the session cookie; this layout is the only place
  that decides access. Also renders the shared admin header (Posts / Topics / View blog /
  sign-out) for every page inside the group.
- `sites/xoxocom/app/admin/(protected)/page.tsx` — the post list. Every status, drafts
  first, most-recently-edited first within each status. Each row's Publish / Unpublish /
  Archive / Restore / Delete control is its own `<form>` posting to a Server Action, so the
  whole page (including the delete confirmation, a native `<details>`) ships no client
  JavaScript and keeps working through a hydration error.
- `sites/xoxocom/app/admin/(protected)/new/page.tsx` and `edit/[id]/page.tsx` — create and
  edit, sharing `components/admin/PostEditor.tsx`. The edit route is `/admin/edit/[id]`
  rather than `/admin/[id]` so a dynamic id segment can never shadow a static admin route,
  and it 404s on a malformed id (rather than passing it to Postgres, which would 500).
- `sites/xoxocom/app/admin/(protected)/topics/page.tsx` — manage a topic's German and
  English label. Exists because a topic created inline while writing a post can only seed
  **one** language's label with whatever the author typed; the other language's chip on
  `/blog` would otherwise show the wrong-language text. A topic still attached to any post
  cannot be deleted here (tags are a `text[]` of slugs, not a foreign key, so nothing at the
  database level would stop it, and `/blog` would be left rendering that tag's bare slug).
- `sites/xoxocom/components/admin/PostEditor.tsx` — the markdown editor, and the **only**
  `"use client"` component in the whole blog feature. Renders a live preview by calling
  `lib/markdown-render.ts` directly (not `lib/markdown.ts`, which would pull
  `sanitize-html` into the browser bundle for no reason), debounced via `useDeferredValue` so
  typing stays responsive on a long body. The slug field auto-fills from the title via
  `uniqueSlug()` until the author edits the slug by hand, after which it stops overwriting it.
  Handles cover and inline image upload by posting to `/api/admin/upload` and inserting the
  returned URL.
- `sites/xoxocom/app/api/admin/upload/route.ts` — the one Route Handler in the admin (every
  other write is a Server Action; this one accepts a raw multipart file body, which is what a
  Route Handler is for). Checks `getCurrentAuthor()` before touching storage. Accepts PNG,
  JPEG, WebP, or AVIF only — **SVG is rejected outright**, because an `.svg` is an XML
  document that can carry `<script>` and would be stored XSS if served from the site's own
  origin. The declared `Content-Type` only selects which magic-byte signature to check;
  it never decides acceptance by itself, so renaming a file to a different extension does not
  get it past validation. Caps at 5 MB. Discards the original filename entirely (it is
  attacker-controlled and unnecessary — alt text carries the meaning) and stores under
  `posts/<year>/<random UUID>.<ext>` in the `blog-media` bucket via the **service-role**
  client — the bucket has no anon write, so this endpoint is the only path a file can enter
  through, and authorization is checked before the service key is ever touched.
- **Site dependencies** added for this feature: `@supabase/ssr`, `sanitize-html`,
  `@types/sanitize-html`, and `server-only` (in `sites/xoxocom/package.json`).
- `execution/sync_env_local.py --slug xoxocom` — writes `sites/xoxocom/.env.local` for local
  preview, including the new Supabase public vars (see below).
- `execution/start_preview_server.py --slug xoxocom` — runs `next dev` for local preview.
- `execution/deploy_netlify.py --slug xoxocom` — deploys the `sites/xoxocom` code and pushes
  Netlify env vars. Only needed for code changes (a new admin field, a layout tweak, a schema
  migration follow-up) — never needed to publish a post.
- **Credentials** (repo-root `.env`, then Netlify env for prod): `SUPABASE_URL`,
  `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_URL`, plus two new public vars —
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The anon key is public by
  design (it ships to the browser) and is not a secret; it is scoped entirely by the RLS
  policies the migration creates.
- `sites/xoxocom/middleware.ts` — async. For every route it stamps an `x-pathname` header
  (used by the root layout, unrelated to the blog). For `/admin*` routes only, it also
  refreshes the Supabase session cookie so a signed-in author's short-lived access token
  doesn't expire mid-edit. It does **not** decide access — that is entirely
  `app/admin/(protected)/layout.tsx`'s job; treat this file as cookie plumbing, not a gate.
- `sites/xoxocom/app/layout.tsx` — drops the public `SiteHeader`/`Footer` chrome for any
  `/admin*` path, since App Router gives a nested route no way to escape the root layout.
  `app/admin/layout.tsx` supplies the admin's own minimal shell instead.

### Files — the `/blog` public surface

These live in `sites/xoxocom/` and were built on top of `lib/blog.ts` and
`lib/markdown.ts` above:

- `app/blog/page.tsx` — the index route. Uses `generateMetadata` instead of a static
  `metadata` export specifically so a filtered view (`?tags=`, `?lang=`) can be marked
  `noindex` while the bare route stays indexable.
- `app/blog/[slug]/page.tsx` — the article route. Fetches the post and decides the 404
  here, in the route segment, rather than inside the content component.
- `app/blog/page.tsx` wraps `<BlogIndexContent>` in a `<Suspense>` boundary so the index can
  show a skeleton while its data fetch resolves; the fallback lives in
  `components/blog/BlogIndexSkeleton.tsx`. **There is no `loading.tsx` anywhere under
  `app/blog/`, and there must never be one again** — see the standing rule in Edge Cases
  below. The article route (`/blog/[slug]`) has no skeleton at all; that is deliberate, not
  an oversight.
- `app/blog/not-found.tsx` — the shared not-found boundary. Covers both `notFound()`
  thrown from `/blog/[slug]` and any genuinely unmatched `/blog/**` path.
- `components/content/BlogIndexContent.tsx` — renders the B3 editorial list: language
  handling, the tag filter, the three distinct empty states, and the `?lang=all` escape
  hatch.
- `components/content/BlogPostContent.tsx` — renders the C1 centered article.
- `components/blog/TagFilter.tsx` — the tag filter chips. Server-rendered, no client JS.
- `components/blog/PostRow.tsx` — one row of the index list.
- `app/robots.ts` — disallows `/api/` and `/admin` in addition to allowing everything
  else.
- `app/sitemap.ts` — async; appends published post URLs to the static routes, read
  through `listPublishedForSitemap` in `lib/blog.ts`.

## Process

### A. One-time setup (the build)

1. **Run the schema migration first**: `python execution/add_blog_schema.py` (add `--seed` on
   a fresh environment to insert two clearly-marked sample posts for testing the pipeline end
   to end). Idempotent — safe to re-run. The script checks the Postgres version before doing
   anything and exits with code 2 if it's older than 15 (the read views need
   `security_invoker`, a 15+ feature) — this should only trigger on an unusually old instance,
   since Supabase projects are on 15+ by default. Use `--check` first on an existing
   environment to get a read-only verification report before making changes. This step must
   come **before** the dashboard steps below, not after: the `blog` schema does not exist
   until this migration creates it, and Supabase's Exposed-schemas picker in the dashboard
   only lists schemas that already exist — there is nothing to add `blog` to until this runs.

2. **Manual Supabase dashboard prerequisites.** Do these after the migration above, before
   deploying any admin code — several of them fail silently otherwise:
   1. **Settings → API → Exposed schemas: add `blog`.** Only possible now that the migration
      has created the schema. Without this, every query against the schema returns PostgREST
      error `PGRST106`, and `/blog` renders empty with no other symptom. The `leads` schema
      already required this same step. **Confirm this one by hand** — `add_blog_schema.py
      --check` cannot reliably verify it: on Supabase's pooled connection the underlying
      setting (`pg_db_role_setting`) usually isn't readable, so the report prints `WARN
      exposed schemas not readable over this connection` instead of a pass/fail. It only
      prints a hard `MISS` in the rarer case where the list is readable and genuinely omits
      `blog`.
   2. **Authentication → Providers → Email → disable "Allow new users to sign up."** This is
      enforced server-side, not merely hidden in the UI. It matters because the anon key
      ships to the browser — leaving signup enabled would let anyone create an authenticated
      session. Running the migration before this step is disabled is safe: every write policy
      is gated on membership in `blog.authors`, which starts empty right after the migration
      runs, so an account created in the window before this toggle is flipped still has zero
      write access. The toggle only becomes load-bearing once the admin routes are actually
      deployed and reachable.
   3. **Create each author.** There is no invite-callback page and no self-service password
      reset built into the admin, so the Supabase dashboard is the only way to provision an
      account: Authentication → Users → **Add user → Create new user**, set a password by
      hand, and tick **Auto Confirm User** (otherwise the account sits unconfirmed and cannot
      sign in). Then add a matching row to `blog.authors` — this second step is what actually
      grants write access, and it requires the service key (the anon key cannot write to
      `blog.authors`). **Both steps are required, and being a valid Supabase account is not
      the same as being authorised**: a user who exists in Auth but has no `blog.authors` row
      can enter correct credentials, but the sign-in action itself detects the missing row and
      immediately signs them back out again with a distinct "not on the author list" message —
      it never leaves them holding a session that merely fails on save. The display name in
      the `blog.authors` row is the public byline that appears on every article that account
      writes — it is looked up server-side on each save (see Runtime Contract below), so
      correcting a byline later is a database `UPDATE` on `blog.authors.display_name`, never
      an edit to any individual post. **Current state (2026-08-08):** three accounts are
      provisioned and in `blog.authors` — `albert@xoxocom.net` → Albert Jr Itoumbou,
      `tudor@xoxocom.net` → Tudor Laslau, `info@xoxocom.net` → Patryk Kwitowski. All three are
      confirmed with passwords set; none had actually signed in as of that date.

   The `blog-media` Storage bucket does not need a manual step in the normal case — it is
   usually created automatically by `add_blog_schema.py` in step 1 (anon read, no anon write).
   Verify it exists after running the migration. If the migration lacked the privilege to
   create it (storage is owned by `supabase_storage_admin` and grants vary by project), the
   script prints a warning with the manual steps: Storage → New bucket → name `blog-media` →
   Public.

3. **Build/verify the code**: the admin UI (`app/admin/**`, `components/admin/PostEditor.tsx`,
   `app/api/admin/upload/route.ts`), the public `/blog` and `/blog/[slug]` routes, and the
   Server Actions that write through the cache-invalidation path described below all live in
   `sites/xoxocom/`, which depends on `@supabase/ssr`, `sanitize-html`,
   `@types/sanitize-html`, and `server-only`. Post bodies are rendered to HTML by
   `sites/xoxocom/lib/markdown-render.ts` (unsanitised) and `lib/markdown.ts` (sanitised),
   imported respectively by the admin's live preview and the public article page so the two
   renderings can never drift apart. Use `execution/build_blog_prototypes.py --out
   .tmp/blog_prototypes` during design review to generate layout candidates (`index.html`
   for standalone preview, `artifact.html` for publishing as a review artifact), then
   implement the approved layout in the site. This surface is now built and has been verified
   end to end against both a dev server and a real production build.

4. **Local preview**: `python execution/sync_env_local.py --slug xoxocom`, then
   `python execution/start_preview_server.py --slug xoxocom`. Confirm `/blog`, an article
   page, and `/admin` all load, and that a test publish from `/admin` appears on `/blog`
   without a rebuild. **Standing rule: review every change here before deploying** — there is
   no exception for a "small" admin tweak.

5. **Deploy**: `python execution/deploy_netlify.py --slug xoxocom`, per
   `deploy_to_netlify.md`. Confirm the two `NEXT_PUBLIC_SUPABASE_*` vars are present in
   Netlify's env settings — they are pushed by the deploy script from repo `.env` the same as
   any other per-site var.

### B. Getting access to `/admin`

This is the question that actually prompted building the admin, so it gets its own
sub-section rather than living inside the setup checklist above.

1. **Getting a new author provisioned is a two-step, dashboard-only process** — see Process A
   step 2.3 above for the exact clicks. There is no invite-callback page and no self-service
   password reset anywhere in the admin, so both steps below must be done by hand in the
   Supabase dashboard by whoever holds the service key:
   1. Authentication → Users → **Add user → Create new user**, set a password, tick
      **Auto Confirm User**.
   2. `INSERT INTO blog.authors (user_id, display_name) VALUES (...)`.
   **Both steps are required.** A Supabase account that exists but has no `blog.authors` row
   can enter valid credentials and still cannot use the admin — the sign-in action itself
   detects the missing row and signs the account back out immediately with a distinct
   message ("not on the author list"). Being authenticated is not the same as being
   authorised.
2. **Signing in.** Go to `xoxocom.net/admin/login` and sign in with your email and password.
   A deep link to a specific page (e.g. a bookmark to `/admin/edit/<id>`) survives sign-in —
   the login form carries the original destination through a `?next=` parameter and lands
   you there once you're in, rather than dropping you at the plain post list.
3. **Currently provisioned (as of 2026-08-08):** `albert@xoxocom.net` = Albert Jr Itoumbou,
   `tudor@xoxocom.net` = Tudor Laslau, `info@xoxocom.net` = Patryk Kwitowski. All three are
   confirmed Supabase accounts with a password set and a matching `blog.authors` row.
4. **Forgotten password:** there is no self-service reset. Whoever holds the service key
   must set a new password for that user directly in the Supabase dashboard
   (Authentication → Users → the account → reset/change password) and pass it along
   out-of-band.

### C. Publishing a post (the recurring operator flow)

This is the day-to-day flow for a non-technical author. It requires **no deploy and no git
commit** — a publish is live at `xoxocom.net/blog` within seconds.

1. Go to `xoxocom.net/admin/login` and sign in with your email and password (see Process B
   above if you don't have access yet).
2. Click **New Post**.
3. Fill in each field:
   - **Language** — pick `de` or `en`. This is the only language the post will appear in.
   - **Title** — the headline as it will appear on the article page and in the index.
   - **Slug** — auto-fills from the title; edit it if you want a cleaner URL. It must be
     unique across both languages — if it's taken, the editor suggests a `-2` suffix.
   - **Excerpt** — a 120–160 character summary. This becomes the meta description search
     engines show, so write it as a real sentence, not a teaser fragment.
   - **Body** — write in Markdown. A live preview renders next to the editor.
   - **Tags** — pick existing tags or type a new one. A new tag's slug is generated
     automatically from what you type (e.g. "AI Transformation" becomes `ai-transformation`)
     — the database normalizes it on save, so capitalization or spacing can't cause a save
     to fail. Tags are shared across languages, so the same topic shows as one filter chip
     regardless of which language the reader is in.
   - **Cover image** — optional. If you add one, you must also fill in alt text — the editor
     won't let you save a cover without it, and the database enforces the same rule
     independently (a `CHECK` constraint rejects any row with a cover and no alt text), so
     there's no path that can save one without the other.
   - **SEO title / description** — optional overrides. Leave blank to fall back to the title
     and excerpt.
4. **Save as draft.** This stores the post but does not make it public — it never appears on
   `/blog` or in the sitemap while `status` is `draft`.
5. **Check the live preview pane** in the editor — the body panel renders the Markdown side
   by side with the textarea as you type, so you can see roughly how the post will look
   before publishing. This version has no shareable preview link: there is no URL that shows
   an unpublished post, and `/blog/<slug>` returns a real 404 until the post is actually
   published. If you need someone outside the editor to look at a draft, publish
   it temporarily (and unpublish afterward) or send a screenshot — see Edge Cases below.
6. When ready, **change status to Published** and save. This is the entire publish action —
   there is no separate deploy step.
7. **Verify**: open `xoxocom.net/blog` and confirm the post appears (filter by its tag to
   double-check tag assignment), then open the article URL directly.
8. To take a post down, switch its status back to `draft` or `archived`. Re-publishing later
   keeps the original publish date — the system does not treat a re-publish as a new post.

### Editor guards, and why each one exists

These are enforced by the editor and/or the Server Action behind it. An operator who hits one
of these without reading this list will otherwise mistake it for a bug:

- **Headings shift down one level.** Typing `##` renders as an `<h3>`; start a post at `##`,
  not `#`. This protects the site's single-`<h1>` structure (and the SEO scorer's check for
  it) — a body can never accidentally produce a second top-level heading.
- **Publishing needs a body and an excerpt.** Saving a post with `status=published` and an
  empty body is refused outright ("save it as a draft instead"). Publishing with no excerpt
  and no SEO description override is also refused, because the excerpt becomes the article's
  meta description — shipping neither means an invisible, empty description that nobody
  notices for months.
- **A cover image cannot be saved without alt text.** Enforced twice: the editor requires it
  the moment a cover URL is present, and the database's `posts_cover_needs_alt` CHECK
  constraint refuses the row independently even if the client-side check is bypassed.
- **Saving compares the `updated_at` you loaded the post with.** If a colleague saved the same
  post in between, your save is refused with a message ("someone else saved this post after
  you opened it") rather than silently overwriting their edit. Reload the page to see their
  version, then re-apply your change and save again.
- **Renaming a published post's slug changes its live URL and breaks the old one.** The
  editor shows a warning next to the slug field once a post is published; nothing at the
  database or application level stops the rename itself.
- **Uploads accept PNG, JPEG, WebP, or AVIF only — SVG is rejected outright**, and every file
  is checked by its magic bytes, not its filename or declared `Content-Type`, so renaming a
  file to a different extension does not get it past validation. 5 MB cap. Every accepted
  file is stored under a random name; the original filename is discarded.
- **`/admin/topics` exists because a topic created inline while writing a post can only guess
  one language's label.** The other language's label must be corrected on that screen — it
  is visitor-facing, rendered directly on the filter chips at `/blog`.

## Runtime Contract

The live project runs **PostgreSQL 17.6** — comfortably above the 15+ minimum the
`security_invoker` views require.

| Object | Kind | Notes |
|---|---|---|
| `blog` | schema | created by `add_blog_schema.py`, must be added to Supabase's Exposed schemas |
| `blog.posts` | table | see key columns below |
| `blog.tags` | table | language-neutral slugs with `label_de` / `label_en` |
| `blog.authors` | table | the write allowlist — a Supabase Auth user without a row here is signed back out immediately on sign-in attempt, before ever reaching the editor |
| `blog.published_posts` | view | the **only** source public pages read |
| `blog.tag_counts` | view | backs the tag filter chips on `/blog` |
| `blog-media` | Storage bucket | anon read, no anon write |

`blog.posts` key columns: `slug` (globally unique across both languages), `lang` (`de`|`en`),
`status` (`draft`|`published`|`archived`), `title`, `excerpt`, `body_md`, `cover_url`,
`cover_alt`, `tags` (text array of tag slugs), `reading_minutes` (computed on save),
`seo_title`, `seo_description`, `author_id`, `author_name`, `published_at`, `created_at`,
`updated_at`. A `CHECK` constraint (`posts_cover_needs_alt`) rejects any row with `cover_url`
set and `cover_alt` empty — the alt-required rule is enforced by the database, not only by
the editor.

- Public pages read only `published_posts`, never `posts` directly. The view filters
  `status = 'published' AND published_at <= now()`, which makes a draft leak structurally
  impossible and gives scheduled publishing for free — set a future `published_at` and the
  post appears automatically once that time passes.
- A database trigger (`blog.normalize_post` / `trg_posts_normalize`) normalizes the slug and
  tags, stamps `updated_at` on every write, and fills `published_at` on first publish.
  Unpublishing and republishing preserves the original publication date — it does not reset
  to "now." The same trigger also decides `author_id` and `author_name`: on insert it sets
  `author_id` from the signed-in user (`auth.uid()`) and makes it immutable on every later
  update, then looks up `author_name` from that user's `display_name` in `blog.authors`.
  Attribution is therefore controlled entirely server-side — no author can publish under a
  colleague's name, and changing a byline means changing the name in `blog.authors`, not
  editing the post. Rows created outside the admin (the seed script, or any service-role
  import) have no signed-in user to attach, so they keep no `author_id` and whatever
  `author_name` was supplied directly.
- A second trigger (`blog.normalize_tag` / `trg_tags_normalize`) does the equivalent
  normalization for `blog.tags.slug` on insert/update, so a tag typed as "AI Transformation"
  becomes `ai-transformation` instead of failing the slug-format constraint.
- Deleting is soft by default (`status = 'archived'`); a hard delete exists behind a second
  confirmation in the admin.

### Public-facing behavior of `/blog`

- Filtered index views — `?tags=` and `?lang=` — render `noindex, follow` with a
  canonical URL of bare `/blog`, and only bare `/blog` is listed in the sitemap. This is
  deliberate: tag permutations are near-duplicate pages with no unique content, and
  indexing them would burn crawl budget and trip the SEO scorer's `title_unique` /
  `desc_unique` checks.
- `?tags=` is capped at five tags, and any tag not in the known tag set is silently
  discarded rather than rendered as an active (but invisible) filter. This bounds how
  many distinct URLs a crawler — or a malicious query string — could otherwise generate
  from junk input.
- Filtering by more than one tag is AND, not OR: with two tags active, only posts
  carrying both are shown.
- `/blog?lang=all` is the escape hatch: when the reader's active language has no posts
  but the other language does, the index shows a link to this URL instead of rendering
  empty.
- `app/robots.ts` disallows `/api/` and `/admin`.
- `app/sitemap.ts` is async and appends published post URLs (via `listPublishedForSitemap`
  in `lib/blog.ts`) to the ten static routes. The whole call is wrapped in try/catch so a
  failed blog query degrades the sitemap to the static routes rather than failing the
  response — a non-200 or missing `/sitemap.xml` is a hard gate in the SEO scorer.

### Cache invalidation

- Public reads are cached with a 300-second floor and invalidated by tag on every admin
  write, so a publish is normally live within seconds — well under the 300-second floor.
- **Caveat:** tag invalidation only works on `@netlify/plugin-nextjs` **v5**, which backs the
  cache with Netlify Blobs. v4 silently ignores the invalidation call. The plugin is installed
  through the Netlify UI, not `package.json`, so its version is not visible in the repo —
  check the build log to confirm which version is active. If it is v4, publishing still
  works, but the change can take up to five minutes to appear instead of seconds.

## Outputs (Deliverables)

- **Live post**: `https://www.xoxocom.net/blog/<slug>`
- **Listed** at `https://www.xoxocom.net/blog`
- **Indexed** in `https://www.xoxocom.net/sitemap.xml`

Not deliverables: drafts (never public), the `/admin` authoring surface itself (internal
tool, not a public asset), `.tmp/` prototype HTML from `build_blog_prototypes.py`, and local
preview URLs from `start_preview_server.py`.

## Edge Cases

- **`/blog` renders empty after deploy**: check that `blog` is in Supabase's Exposed schemas
  (Settings → API) — a missing entry causes `PGRST106` and an empty page with no other
  symptom. If schemas are fine, check that `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` were actually pushed to Netlify's env settings.
- **Account exists in Supabase Auth but is not in `blog.authors`**: the sign-in action itself
  detects this and signs the account back out immediately, showing "that account is valid but
  is not on the author list" — it never leaves them holding a working session. Fix by adding
  a row to `blog.authors` for that user (see Process B, "Getting access").
- **Author forgot their password**: there is no self-service reset flow anywhere in the
  admin. Whoever holds the Supabase service key must reset it by hand in the dashboard
  (Authentication → Users → the account) and pass the new password along out-of-band.
- **A byline needs to be corrected**: attribution is decided by the database, not the editor
  — `author_id` is set from the signed-in user on insert and is immutable after that, and
  `author_name` is looked up from `blog.authors.display_name`. Fix it by updating that
  author's `display_name` row in `blog.authors`; you cannot fix it by editing the post
  itself. Posts inserted by the seed script or a service-role import have no `author_id` and
  keep whatever name was supplied at insert time.
- **`add_blog_schema.py --check` reports `WARN exposed schemas not readable over this
  connection`**: this is expected on Supabase's pooled connection, not a failure — the
  underlying setting (`pg_db_role_setting`) usually isn't readable that way. It means
  `--check` cannot confirm this step; verify Settings → API → Exposed schemas by hand instead.
- **`PGRST106` reappears after a Supabase project change** (a project migration, a restore,
  or switching which project `SUPABASE_URL`/`SUPABASE_DB_URL` point at): the Exposed-schemas
  setting is per-project, not global, so it does not carry over. Re-add `blog` under
  Settings → API → Exposed schemas on the new project the same way as the first-time setup
  in Process A step 2.1.
- **Author wants to show a draft to a colleague before publishing**: not supported in this
  version. Drafts render only in the editor's live preview pane — there is no shareable
  link, and `/blog/<slug>` returns a real 404 until the post is published. Either publish
  the post temporarily and unpublish it after review, or send a screenshot. A tokenised
  preview URL is a planned addition, not yet built.
- **Slug already taken**: slugs are unique across both languages, so a DE and an EN article
  on the same topic need distinct slugs. The editor suggests a `-2` suffix as the title is
  typed; if a save still collides (e.g. two authors picked the same slug at once), the save
  is refused with `The slug "<slug>" is already used by another post.` rather than silently
  overwriting the other post.
- **Post is published but not visible**: check `status` first, then check whether
  `published_at` is set in the future — that's a scheduled post, not a bug.
- **A newly published post takes minutes to appear instead of seconds**: the Netlify Blobs
  cache caveat above — the site is running `@netlify/plugin-nextjs` v4, not v5. Check the
  build log for the plugin version.
- **Two authors editing the same post (stale-write conflict)**: the save is refused, not
  silently overwritten. `updatePostRow` matches on the `updated_at` the editor loaded the
  post with; if a colleague saved in between, that predicate matches zero rows and the action
  returns "someone else saved this post after you opened it — reload the page to see their
  version before saving again." Reload, re-apply your change, save again.
- **A post's language differs from the visitor's site-language toggle**: the `/blog` index
  only shows posts in the currently active language. An article page always renders in the
  post's own language regardless of the toggle, with a notice to that effect; the surrounding
  site chrome (nav, footer) stays in the visitor's selected language.
- **No posts yet in the visitor's language**: the index shows an escape-hatch link to view
  all languages rather than rendering empty.
- **Supabase is unreachable**: `/blog` degrades to its empty state rather than erroring, and
  `/sitemap.xml` still serves the static routes — nothing 500s. This is deliberate: a failing
  sitemap is a hard gate in the SEO optimizer (`auto_optimize_seo.md`), so the blog must never
  be able to take it down.
- **Image upload rejected**: only PNG, JPEG, WebP, and AVIF are accepted — SVG is rejected
  outright, because it is an XML document that can carry `<script>` and would be stored XSS
  if served from the site's own origin. Size is capped at 5 MB. Acceptance is decided by
  sniffing the file's magic bytes, not its filename or declared `Content-Type`, so renaming a
  file to a different extension (e.g. an `.svg` renamed to `.png`) does not get it through.
  Accepted files are stored under a random UUID name; the original filename is discarded.
- **A topic renders as a bare slug on `/blog`'s filter chips instead of a real label**: a
  topic created inline while writing a post seeds only the language the author typed in —
  the other language's label falls back to the raw slug until someone visits `/admin/topics`
  and fills it in.
- **`SUPABASE_DB_URL`'s host stops resolving** (`could not translate host name ...`): Supabase
  periodically retires the direct-connection host (`db.<project-ref>.supabase.co`) as it moves
  a project onto a newer pooler generation — this happened mid-session on 2026-08-07 with no
  warning, and the host simply had no A/AAAA record afterward. Fix: Project Settings →
  Database → take the **Session pooler** connection string (port 5432, username
  `postgres.<project-ref>`, host like `aws-1-<region>.pooler.supabase.com`) and put it in
  `SUPABASE_DB_URL`. Use the session pooler, not the transaction pooler on port 6543 — the
  transaction pooler is not reliable for DDL, which is exactly what `add_blog_schema.py` runs.
  This only affects the Python migration scripts; the live site never uses
  `SUPABASE_DB_URL` — it reaches Supabase over the REST API with `SUPABASE_URL` +
  `SUPABASE_SERVICE_KEY`, so a broken `SUPABASE_DB_URL` never takes down the public site.
- **Adding a new public route**: if a future change adds another public blog-adjacent route,
  `PUBLIC_ROUTES` in both `execution/autoresearch/score/score_seo.py` and
  `execution/autoresearch/score/score_speed.py` must include it — but individual article
  slugs (`/blog/<slug>`) must **not** be added there. A later unpublish or rename of a post
  would otherwise hard-fail the whole SEO optimizer run and look like a code regression.
- **`/blog` and its `metaTitle`/`metaDescription` are still provisional draft copy, not
  final.** `/blog` is now registered in `PUBLIC_ROUTES` in both `score_seo.py` and
  `score_speed.py` (index only — see "Adding a new public route" above for why article
  slugs never go in that list) and the scores held at 100 SEO / 87.54 speed with it added.
  The copy itself, however, was written into `lib/copy.ts` as a placeholder to unblock the
  build and is meant to be replaced with real editorial copy — treat any string under the
  `blog` key in `lib/copy.ts` as provisional until someone explicitly signs off on it.
- **`/blog/<unknown-slug>` soft-404 — RESOLVED, root cause confirmed.** For a while
  `/blog/<unknown-slug>` returned HTTP 200 with the not-found body instead of a real 404.
  **Root cause: a segment-level `loading.tsx`, not the root layout's `cookies()`/`headers()`
  calls** (that earlier hypothesis was wrong — those APIs force server rendering, which is a
  precondition, but per the Next.js docs they block navigation until the layout resolves
  rather than flushing an early shell; they don't lock the status). Next.js wraps a segment
  that has a `loading.tsx` — and every child segment beneath it — in a Suspense boundary. As
  soon as the fallback renders, the response body has started streaming and the HTTP status
  is locked, so a `notFound()` thrown later renders the 404 page body under a 200 status.
  This is documented Next.js behavior (the "Status Codes" section of the `loading.js` docs),
  not a bug, and has been reported and closed-without-fix against `vercel/next.js` repeatedly
  (issues #45801, #64446, #70447, #76474) as an accepted consequence of streaming. The
  concrete trap here was two skeleton files added earlier in the same build session:
  `app/blog/loading.tsx` and `app/blog/[slug]/loading.tsx`. The first was the subtle one — a
  `loading.tsx` in `/blog` is inherited by `/blog/[slug]`, so it broke the article route even
  though it was written for the index. **Fix applied:** both `loading.tsx` files were
  deleted. The index skeleton was preserved by moving it into a `<Suspense>` inside
  `app/blog/page.tsx` wrapping `<BlogIndexContent>`, with the fallback in a new
  `components/blog/BlogIndexSkeleton.tsx`. A `<Suspense>` placed inside a page is scoped to
  that route only — it is not inherited by child segments — and `/blog` never calls
  `notFound()`, so streaming costs it nothing. The article route now has no loading skeleton
  at all; that is a deliberate trade, a correct 404 matters more than a placeholder on a
  cached page. Post-fix verification: `/blog/<unknown>` returns 404; `/blog` returns 200 with
  exactly one `<h1>` and real content (not stuck on the skeleton); `/blog?tags=x` returns 200;
  the homepage and legal pages return 200; the sitemap returns 200 with 11 URLs; typecheck is
  clean. Worth noting for context: even during the window when the soft 404 existed, no dead
  URL would have been indexed — Next.js automatically injects
  `<meta name="robots" content="noindex">` on any `notFound()` render, and
  `generateMetadata` in `app/blog/[slug]/page.tsx` also sets an explicit noindex for a missing
  post.

  **Standing rule (this is the durable lesson — keep it in sync with the matching code
  comment in `app/blog/page.tsx`): never add a `loading.tsx` to `app/blog/` or
  `app/blog/[slug]/`.** Any loading UI for the index belongs in a `<Suspense>` inside
  `app/blog/page.tsx`, exactly as it is today. A `loading.tsx` in either location silently
  turns every article 404 into a soft 404, with no error and no obvious symptom until someone
  checks the raw HTTP status of an unknown slug. If a genuine 404 is ever needed on a route
  that must keep a `loading.tsx`, the documented workaround is to do the existence check in
  middleware and return the 404 from there, rather than from `notFound()` inside the segment.

  **Second, related finding (same investigation, later): the custom not-found boundary
  itself is not server-rendered — accepted as-is, not fixed.** With the status code now
  correct, further investigation found that `/blog/<unknown-slug>`'s 404 response body
  contains only the layout shell — about 53 characters of visible text, no `<h1>` — because
  `app/blog/not-found.tsx`'s actual markup is delivered only inside the RSC flight payload
  and rendered on the client after hydration. For comparison: a genuinely unmatched route
  such as `/totally-unknown` server-renders Next's own default 404 page (about 474
  characters, with an `<h1>`); and `/blog` itself server-renders correctly — its `<h1>` and
  the empty-state sentence are both present in the raw HTML, outside any `<script>` tag.
  Four fixes were tried and none changed the behavior: moving `not-found.tsx` into the
  parent segment (`app/blog/`); moving it to be a sibling of the throwing page
  (`app/blog/[slug]/`); rewriting it as a plain synchronous component with no `cookies()`
  call; and moving both the fetch and the `notFound()` call up into the route segment
  itself. Behavior is identical in `next dev` and in a real production build.

  This is accepted as Next.js framework behavior with no application-level fix, rather than
  worked around, for these reasons: the HTTP status is correct at 404, which is the part
  search engines act on; Next injects `noindex` on any `notFound()` render regardless of how
  the body is rendered; Googlebot executes JavaScript, so it renders the branded 404 page
  normally, the same as a human visitor with JavaScript enabled; the only visitors who
  actually see the near-blank shell are those browsing with JavaScript disabled, plus
  unsophisticated bots — a small cost on a page nobody is meant to land on deliberately. The
  documented alternative, if this cost is ever judged worth removing: do the slug-existence
  check in middleware and return the 404 response from there instead of from `notFound()` in
  the segment — keep that check cheap (a cached slug set) rather than a full content fetch,
  so middleware itself doesn't become the expensive path.

## Error Handling

- `PGRST106` from any blog query → the `blog` schema is not in Supabase's Exposed schemas
  list. Fix in the dashboard; this is not a code bug. Note that `add_blog_schema.py --check`
  can only sometimes catch this in advance — see the Edge Case above.
- **Postgres older than 15** → `add_blog_schema.py` exits with code 2 before making any
  change, because the two read views require `security_invoker`. Supabase projects are on
  15+ by default, so this should not occur in practice; if it does, no migration side effects
  have happened yet.
- Auth errors are shown to the user as a generic message and never echo the raw Supabase
  error string, to avoid leaking internal detail. Specifically: a wrong password and an
  unknown email address both show the identical "that email and password combination did not
  work" — the sign-in action does not distinguish them, so a failed attempt never confirms
  which addresses have accounts. A valid account with no `blog.authors` row gets its own
  message ("not on the author list") after being signed back out. The `?next=` redirect
  target on the login form is re-validated server-side (must start with `/admin`, must not
  start with `//`) regardless of what the URL says, closing an open-redirect path.
- Every Server Action in `app/admin/actions.ts` calls `requireAuthor()` first and lets it
  throw on failure — it is not caught. Reaching that throw means a Server Action was invoked
  outside the normal UI flow (there is no session, or the session's user has no
  `blog.authors` row); Next.js renders its generic error boundary for that request. This is
  expected and not a bug to fix — the UI never triggers this path, since every button that
  could is already behind the `(protected)` layout's gate.
- The upload route (`/api/admin/upload`) returns explicit JSON error responses (401 not
  signed in, 400 no/empty file, 413 over 5 MB, 415 wrong type or failed magic-byte check, 502
  storage rejected the write) rather than throwing, so the editor can show a specific message
  instead of a generic failure.
- `could not translate host name ... to address: Name or service not known` from any
  `execution/*.py` script that connects via `SUPABASE_DB_URL` means Supabase retired the
  direct-connection host on its side — see the Edge Case above. Swap in the current Session
  pooler connection string from Project Settings → Database; do not use the transaction
  pooler (port 6543) for this variable, since the migration script runs DDL and the
  transaction pooler is not reliable for that. This never affects the live site, which
  connects over the REST API instead.
- Markdown is sanitized server-side on render, so pasted HTML or scripts are stripped from
  the public page even though they may still appear as typed in the admin's live preview.
- Never auto-retry a failed deploy of the blog code — treat it like any other deploy failure
  per `deploy_to_netlify.md`.
- `next build` can fail intermittently because the repo lives under a synced OneDrive folder
  — build from a copy outside OneDrive per the workaround in `deploy_to_netlify.md`. This
  applies to blog code changes the same as any other deploy; it does not apply to publishing
  a post, which never runs a build.
- Supabase Auth throttles repeated sign-in attempts — an author who mistypes their password
  several times in a row will be rate-limited before the account is locked.

---

This directive documents an in-progress implementation and is a living document. Update it
as edge cases surface once the admin and public pages are built and used in production.
