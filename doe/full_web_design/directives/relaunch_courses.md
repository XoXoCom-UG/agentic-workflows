# Directive: Relaunch Courses

## Goal

Bring the `/courses` section of the XoXoCom site back into public view once a real course
is ready to sell, and — when the time comes to pull it down again — park it the same way
it was parked before: without deleting any of the code, copy, or assets.

## Background

The whole Courses feature (nav link, `/courses` index, `/courses/<slug>` detail pages, the
sitemap entries, and the `/api/course-waitlist` signup endpoint) is gated behind one flag,
`COURSES_ENABLED`, exported from `sites/xoxocom/lib/features.ts`. With the flag `false`
(its current state): the "Kurse"/"Courses" nav item is omitted; `app/sitemap.ts` omits both
`/courses` and every `/courses/<slug>`; `app/courses/page.tsx` and
`app/courses/[slug]/page.tsx` call `notFound()` in both `generateMetadata` and the page
itself; and `app/api/course-waitlist/route.ts` returns a 404 JSON response instead of
processing a signup. Everything else — the course catalog and copy in `lib/copy.ts`, the
`components/courses/*` artwork and card components, `components/content/CoursesContent.tsx`
and `CourseDetailContent.tsx`, `lib/courses.ts`, the waitlist emails in `lib/mailer.ts`, the
logos under `public/course-logos/` and `assets/course-logos/`, and
`execution/add_course_waitlist_table.py` — stays in the repo untouched. Relaunching is a
one-line flag flip plus a deploy, not a rebuild.

## Inputs

- **Owner confirmation** that a course is genuinely ready to be shown to visitors, and that
  the CTA/copy question in Process step 1 below has been settled.
- **Site slug**: `xoxocom` — this directive is specific to that site.
- **`.env`** at the repo root with `SUPABASE_DB_URL` (to confirm the waitlist table) and
  `NETLIFY_AUTH_TOKEN` (to deploy). The mail vars (`CONTACT_EMAIL`, `GMAIL_USER`,
  `GMAIL_APP_PASSWORD`) are already pushed to Netlify for `xoxocom` because
  `site.config.json` has `has_contact_form: true` — relaunching courses does not require
  any new Netlify environment variable.

## Tools / Scripts

- `execution/add_course_waitlist_table.py` — creates/verifies the `leads.course_waitlist`
  Supabase table the waitlist form writes to. Run with `--check` for a read-only report;
  without it, it creates or repairs the table (idempotent, safe to re-run).
- `execution/deploy_netlify.py`, plus the manual OneDrive external-build workaround — used
  to deploy per `directives/deploy_to_netlify.md`.
- `npx tsc --noEmit` (run inside `sites/xoxocom`) — typecheck. `sites/xoxocom/package.json`
  has no dedicated `typecheck` script, only `dev`/`build`/`start`/`lint`.

## Process

1. **Decide the CTA/copy question first.** The waitlist form's submit button and the
   detail-page hero button already read "Book the course now" / "Kurs jetzt buchen" — that
   wording was changed at the owner's request. Nothing else was changed to match: the
   waitlist section's eyebrow ("Waitlist" / "Warteliste"), its title ("Be first in line when
   the doors open"), its body copy ("leave your email and you'll hear the start date before
   anyone else"), the success message, and both languages' course `metaDescription`s still
   describe a waitlist. The form itself still only inserts a signup row into
   `leads.course_waitlist` — it does not take payment or create a booking. Before
   relaunching, decide with the owner: either (a) revert the CTA back to waitlist wording so
   it matches the rest of the copy and the actual behavior, or (b) rewrite the surrounding
   copy and build a real booking/payment flow to match a "book now" promise. Do not launch
   with copy that promises something the form doesn't do.
2. **Flip the flag.** In `sites/xoxocom/lib/features.ts`, change `COURSES_ENABLED` from
   `false` to `true`. This is the only source change required — the nav, both course
   routes' `generateMetadata` and page components, `app/sitemap.ts`, and
   `app/api/course-waitlist/route.ts` all read this same constant.
3. **Confirm the waitlist table.** Run `execution/add_course_waitlist_table.py --check`
   against the shared Supabase project. It should report the table present with its
   columns, the plain-column unique index on `(course_slug, email)`, and both CHECK
   constraints (`email` lowercase, `lang` known). If it reports the table missing or a
   constraint missing, run the script again without `--check` — it is idempotent and will
   create or repair what's missing.
4. **Confirm mail env vars are still valid.** `/api/course-waitlist` only attempts to send
   the operator notification and visitor acknowledgment emails when both `CONTACT_EMAIL`
   and `GMAIL_USER` are present in the environment (they already are, on Netlify, for this
   site); a signup still succeeds and is written to the table even if the mail send fails or
   times out, since the send is time-boxed and any failure is only logged, not surfaced to
   the visitor. Don't assume the credentials still work — verify with a real test signup in
   step 7.
5. **Typecheck.** Run `npx tsc --noEmit` inside `sites/xoxocom` and fix anything it reports
   before deploying.
6. **Deploy.** Follow the "Subsequent deploys (same slug)" process in
   `directives/deploy_to_netlify.md` — `python execution/deploy_netlify.py --slug xoxocom`,
   falling back to the OneDrive external-build workaround documented there if the repo is
   still inside a OneDrive-synced folder.
7. **Verify in production.** Confirm: `/courses` and `/courses/rag-agent-n8n-pinecone`
   return 200; the "Kurse"/"Courses" nav link is visible in both languages; `sitemap.xml`
   lists both course URLs; an unknown course slug under `/courses/` still 404s; and a real
   waitlist signup through the live form returns success, writes a row to
   `leads.course_waitlist`, and both the operator notification and visitor acknowledgment
   emails arrive. Delete the test row afterward so the table stays a clean signal of real
   demand.

## Outputs (Deliverables)

- The `/courses` index and `/courses/<slug>` detail page(s) live at
  `https://www.xoxocom.net`, linked from the site nav and listed in `sitemap.xml`.
- A working waitlist signup flow writing to `leads.course_waitlist` in Supabase, with
  operator and visitor emails sending (when the Gmail credentials are valid).

## Edge Cases

- **CTA/copy mismatch not resolved before relaunch**: relaunching without settling step 1
  means the live site promises "Book the course now" while the form only records a waitlist
  signup. -> Do not deploy until the owner has chosen (a) or (b) in step 1.
- **`leads.course_waitlist` missing or drifted** (missing table, missing unique index, or
  missing CHECK constraint): `add_course_waitlist_table.py --check` reports it. -> Re-run
  the script without `--check`; it is idempotent and will not disturb any existing rows.
- **Mail credentials stale or revoked**: signups still succeed (the database write doesn't
  depend on email), but both notification emails silently fail to send — the route catches
  and logs the error rather than returning it to the visitor. -> Always confirm both emails
  actually arrive during step 7's real signup test, not just that the API call returned
  `{"ok": true}`.
- **Repo still inside a OneDrive-synced folder at deploy time**: expect the intermittent
  build failures cataloged in `directives/deploy_to_netlify.md`'s OneDrive Edge Case. -> Use
  the documented external-build workaround.
- **Only one course exists in the catalog**: `lib/courses.ts`'s catalog currently holds a
  single entry (`rag-agent-n8n-pinecone`). Relaunching does not require adding a second
  course — flipping the flag alone un-parks whatever is already in the catalog.
- **`/courses` still 404s in production after flipping the flag and deploying**: confirm the
  deployed build actually picked up the source change (check the Netlify build log / trigger
  a fresh deploy) before assuming the flag logic itself is broken — the flag is read at
  build/request time from the deployed source, not cached anywhere else.

## Error Handling

- If `npx tsc --noEmit` reports an error, fix it before deploying — do not ship a build that
  hasn't typechecked clean.
- Don't auto-retry a failing deploy; diagnose per `directives/deploy_to_netlify.md`'s Error
  Handling section first.
- **To park the section again** (pull it back out of public view without deleting anything):
  set `COURSES_ENABLED` back to `false` in `sites/xoxocom/lib/features.ts` and redeploy per
  `directives/deploy_to_netlify.md`. No other rollback step is needed — the single flag
  drives the nav, both course routes, the sitemap, and the API route's 404 behavior.
