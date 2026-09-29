# Directive: Relaunch Courses

## Goal

Bring the `/courses` section of the XoXoCom site back into public view once a real course
is ready to sell, and — when the time comes to pull it down again — park it the same way
it was parked before: without deleting any of the code, copy, or assets.

## Background

The whole Courses feature (nav link, `/courses` index, `/courses/<slug>` detail pages, the
sitemap entries, and the `/api/course-waitlist` signup endpoint) is gated behind one flag,
`COURSES_ENABLED`, exported from `sites/xoxocom/lib/features.ts`. **Current state (as of
2026-09-28): `true` — the section is LIVE.** With the flag `false` (parked): the
"Kurse"/"Courses" nav item is omitted; `app/sitemap.ts` omits both `/courses` and every
`/courses/<slug>`; `app/courses/page.tsx` and `app/courses/[slug]/page.tsx` call
`notFound()` in both `generateMetadata` and the page itself; and
`app/api/course-waitlist/route.ts` returns a 404 JSON response instead of processing a
signup. With the flag `true` (live), all of the above render normally. Everything else — the
course catalog and copy in `lib/copy.ts`, the
`components/courses/*` artwork and card components, `components/content/CoursesContent.tsx`
and `CourseDetailContent.tsx`, `lib/courses.ts`, the waitlist emails in `lib/mailer.ts`, the
logos under `public/course-logos/` and `assets/course-logos/`, and
`execution/add_course_waitlist_table.py` — stays in the repo untouched. Relaunching is a
one-line flag flip plus a deploy, not a rebuild.

## Booking flow (as of 2026-09-29)

The form on each course detail page is a booking request, not a payment or seat
reservation — vocabulary (Booking, Place, For myself, For my team, Contact person) is
defined in `sites/xoxocom/CONTEXT.md`. It supports two booking types, both written to the
same `leads.course_waitlist` table:

- **For myself** ("Privat" in German): one place, no company. This is the default and the
  only option that existed before 2026-09-29.
- **For my team** ("Für mein Unternehmen"): one contact person books 2–20 places for their
  company in a single booking. `WaitlistForm.tsx` renders an accessible toggle (ARIA
  radiogroup, arrow-key navigation) that reveals company name (required), last name
  (optional), and a number-of-participants field (2–20) only when this type is selected.
  Larger groups are pointed at `/kontakt` by the field's own hint text, not accepted by
  this form.

`app/api/course-waitlist/route.ts` re-validates both fields server-side regardless of what
the client already checked: a team booking with no company returns `422 invalid_company`;
a places value outside 2–20 (or non-integer) returns `422 invalid_places`. The table itself
enforces the same shape independently of the route, via the `course_waitlist_booking_shape`
CHECK constraint added by `execution/add_course_waitlist_table.py`: a `self` row must have
exactly 1 place; a `team` row must have 2–20 places and a non-null company. The table also
carries `booking_type` (`'self'`/`'team'`, default `'self'`) and `updated_at`.

**Repeat bookings replace, they don't stack.** One person can hold at most one booking per
course. Submitting again for the same `(course_slug, email)` upserts over the existing row:
`created_at` is kept from the first booking, `updated_at` is set, and every other column
(including a switch from one booking type to the other) is overwritten. The operator
notification email's subject and opening line say "Aktualisierte"/"updated" instead of
"Neue"/"new" when this happens, so the operator can tell a replace from a first-time
booking.

**Running total, operator-only.** Each booking triggers a fresh `SELECT places FROM
leads.course_waitlist WHERE course_slug = ...` summed in the route, and the operator email
shows it as "Bisher gebuchte Plätze für diesen Kurs: N". This decides internally when a
course has enough interest to get a start date ("interest-based scheduling" — see
`CONTEXT.md`); it is never shown to visitors, and no course date or threshold number appears
in any visitor-facing copy. The count is a plain, unpaginated `select` — it would undercount
a course past 1000 bookings — and a failed count does not block the booking or the email; the
total line is simply omitted (`totalPlaces: null`).

The course card and detail page both show the price with a `priceUnit` label next to it
("per participant" / "pro Person" in `lib/copy.ts`), since a team booking's price applies
per place, not per booking.

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

1. **Decide the CTA/copy question first.** **Settled 2026-09-28: the owner chose to match the
   surrounding copy to a booking-request framing rather than build a real payment/booking
   flow.** All of the courses copy in `lib/copy.ts` — the `comingSoon` badge ("Now booking" /
   "Jetzt buchbar"), the waitlist section's eyebrow ("Book your place" / "Platz buchen"),
   title ("Secure your place in the first cohort" / "Sichere dir deinen Platz in der ersten
   Gruppe"), body copy, the submit button ("Book now" / "Jetzt buchen"), the success message
   ("Booking request received." / "Buchungsanfrage erhalten."), and both languages' course
   `metaDescription`s — now consistently describes sending a booking request, and the body
   copy and mailer text both say explicitly that no payment is taken ("No payment is taken
   here." / "Hier wird nichts bezahlt."). `lib/mailer.ts`'s `sendWaitlistEmails()` operator
   and visitor emails were reworded to match (subjects/bodies now reference a "booking
   request" / "Buchungsanfrage"). **This is still not a real payment or booking system: the
   form only inserts a signup row into `leads.course_waitlist`, same as before — the copy is
   honest about that, but nothing was built to actually take payment or confirm a booking
   automatically.** If a real payment/booking flow is ever wanted instead, that is still a
   separate build, not covered by this directive. Internal names (the `waitlist` copy keys,
   `WaitlistForm` component, `/api/course-waitlist` route, `leads.course_waitlist` table)
   were deliberately left unchanged — only the visible strings changed.
2. **Flip the flag.** In `sites/xoxocom/lib/features.ts`, change `COURSES_ENABLED` from
   `false` to `true`. This is the only source change required — the nav, both course
   routes' `generateMetadata` and page components, `app/sitemap.ts`, and
   `app/api/course-waitlist/route.ts` all read this same constant.
3. **Confirm the waitlist table.** Run `execution/add_course_waitlist_table.py --check`
   against the shared Supabase project. It should report the table present with its
   columns (including `booking_type`, `places`, and `updated_at`), the plain-column unique
   index on `(course_slug, email)`, and all three CHECK constraints (`email` lowercase,
   `lang` known, and `course_waitlist_booking_shape` — the self/team places+company rule).
   If it reports the table missing or a constraint missing, run the script again without
   `--check` — it is idempotent and will create or repair what's missing without disturbing
   existing rows (existing rows default to `booking_type = 'self'`, `places = 1`).
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
   emails arrive. Repeat the test as a **For my team** booking (company name, 2–20 places)
   to confirm the team fields validate and save, and submit the same email a second time to
   confirm the row is replaced (not duplicated) and the operator email reads "Aktualisierte"/
   "updated". Delete the test row(s) afterward so the table stays a clean signal of real
   demand.

## Outputs (Deliverables)

- The `/courses` index and `/courses/<slug>` detail page(s) live at
  `https://www.xoxocom.net`, linked from the site nav and listed in `sitemap.xml`. **Currently
  live as of 2026-09-28** (`COURSES_ENABLED = true`).
- A working booking-request signup flow (still backed by the `leads.course_waitlist` table
  and the `/api/course-waitlist` route) writing to Supabase, with operator and visitor emails
  sending (when the Gmail credentials are valid). The visible copy calls this a booking
  request and states no payment is taken; it does not process payment or confirm a booking
  automatically.
- Two booking types, **For myself** and **For my team** (see "Booking flow" above), both
  writing to `leads.course_waitlist` with a `booking_type` marker and a `places` count. A
  repeat booking from the same email for the same course replaces the earlier row rather than
  creating a second one. The operator notification email includes a running total of places
  booked for that course so far; visitors never see this total or any course-start-date
  concept.

## Edge Cases

- **CTA/copy mismatch not resolved before relaunch**: relaunching without settling step 1
  means the live site promises something the form doesn't do. -> Do not deploy until the
  owner has confirmed the CTA and surrounding copy agree with what the form actually does
  (as of 2026-09-28 they do — see step 1). If the copy or CTA wording is changed again in the
  future, re-check that the eyebrow, title, body, success message, `metaDescription`s, and
  mailer text all still agree with each other and with the form's actual behavior before
  redeploying.
- **`leads.course_waitlist` missing or drifted** (missing table, missing unique index, or
  missing CHECK constraint, including `course_waitlist_booking_shape`):
  `add_course_waitlist_table.py --check` reports it. -> Re-run the script without `--check`;
  it is idempotent and will not disturb any existing rows.
- **A "For my team" booking is submitted with no company, or with a places value outside
  2–20**: the client-side check in `WaitlistForm.tsx` normally catches this first, but the
  route re-validates independently and returns `422 invalid_company` or `422 invalid_places`
  either way — no row is written. -> Expected behavior, not a bug; if a visitor reports being
  stuck here, check they're using a whole number between 2 and 20 and have filled in a
  company name.
- **A group larger than 20 wants to book**: the form does not accept it — `WaitlistForm.tsx`
  caps the participants field at 20 and points to `/kontakt` in its hint text instead. ->
  Direct larger groups to `/kontakt`; there is no code path for a single booking above 20
  places.
- **The running-place-total in the operator email looks wrong or is missing**: the count is a
  plain, unpaginated `select` over all rows for that course, summed in
  `app/api/course-waitlist/route.ts` — it silently undercounts once a single course passes
  1000 booking rows, and if the count query itself fails, the email sends without the total
  line (`totalPlaces: null`) rather than blocking the booking. -> Not a bug at current volume;
  if a course ever approaches 1000 rows, the count query needs pagination.
- **A visitor expects to edit or cancel a booking themselves**: there is no self-service
  management. -> The only way to change a booking is to submit the form again with the same
  email, which replaces the row; cancellation is a manual operator action (delete the row) or
  a reply to the acknowledgment email.
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
- **Privacy policy is silent on course bookings**: `sites/xoxocom/content/datenschutz.md` (the
  generic template) does not mention that a course booking collects name, company, email, and
  number of places. -> This is a legal-copy gap, not a code defect; flag for the owner/legal
  before relying on the policy to cover this form. Not fixed by this directive.

## Error Handling

- If `npx tsc --noEmit` reports an error, fix it before deploying — do not ship a build that
  hasn't typechecked clean.
- Don't auto-retry a failing deploy; diagnose per `directives/deploy_to_netlify.md`'s Error
  Handling section first.
- **To park the section again** (pull it back out of public view without deleting anything):
  set `COURSES_ENABLED` back to `false` in `sites/xoxocom/lib/features.ts` and redeploy per
  `directives/deploy_to_netlify.md`. No other rollback step is needed — the single flag
  drives the nav, both course routes, the sitemap, and the API route's 404 behavior.
