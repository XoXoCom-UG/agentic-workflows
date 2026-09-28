# Directive: Capture Contact Submission (Runtime Contract)

## Goal

Document the runtime behavior of a deployed website's contact form: what happens after a
visitor submits. **Reference material, not an agent action.** The agent reads it to debug
live submissions, build/modify `_template/app/api/submit/route.ts`, or update the contract
when the schema or flow changes. Sites with `has_contact_form: false` have no submission
flow and this directive does not apply.

## Inputs

(Not invoked at agent-time. These are the runtime inputs the deployed `/api/submit` route receives.)

- **Request body** (JSON): `{ email: string, fields: Record<string, string> }` — `fields` carries everything except email (e.g. `first_name`, `company`, `message`).
- **Server-side env vars** (set per-site by `deploy_netlify.py`):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS` — from repo `.env`. `LEAD_COLUMNS` must include `campaign_slug`; the route drops any column not in this allowlist.
  - `SITE_SLUG`, `COMPANY_NAME`, `CONTACT_EMAIL` — from `site.config.json`.
  - `GMAIL_USER`, `GMAIL_APP_PASSWORD` — from repo `.env`.
  - For local dev, all of the above go into `sites/<slug>/.env.local` via `python execution/sync_env_local.py --slug <slug>`.

## Tools / Scripts

- `sites/_template/app/api/submit/route.ts` — the Netlify Function implementing the contract
- `sites/_template/lib/supabase.ts` — service-role Supabase client factory
- `sites/_template/lib/mailer.ts` — nodemailer transporter; exports `sendContactEmails` (operator notification + visitor acknowledgment)
- `sites/_template/components/ContactForm.tsx` — client form; posts JSON, shows an inline success state (no redirect)
- `execution/add_campaign_slug_column.py` — one-off idempotent migration adding `campaign_slug text` to `leads.prospects`
- `execution/add_prospects_dedup_constraint.py` — one-off idempotent migration that de-duplicates `leads.prospects` (keeps the most recent row per `(campaign_slug, email)`) and adds a UNIQUE index on `(campaign_slug, email)`. Connects directly via `SUPABASE_DB_URL` (DDL privileges; the service key can't run DDL). Run once with `python execution/add_prospects_dedup_constraint.py`; safe to re-run. Shared with the `lm_landing_pages` workspace (same table) — running it from either workspace is equivalent.

## Process (runtime, executed by the Netlify Function on every submit)

1. **Receive** `POST /api/submit` with JSON body.

2. **Validate**: `email` matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. If invalid → `422 { ok: false, error: "invalid_email" }`. No DB write, no email.

3. **Build the row**: merge `email`, `campaign_slug` (from `SITE_SLUG`), `user_agent`, `ip` (from `x-forwarded-for`), `created_at` (ISO), plus each non-empty string in `fields`.

4. **Filter to `LEAD_COLUMNS`**: drop nulls and any column not in the allowlist, guaranteeing only existing `leads.prospects` columns are written. A `message` field is only stored if `message` is both a table column and in `LEAD_COLUMNS`; otherwise it is silently dropped from the DB row (but still included in the operator email).

5. **Upsert**: `supabase.schema("leads").from("prospects").upsert(row, { onConflict: "campaign_slug,email", ignoreDuplicates: true }).select()`. A UNIQUE index on `(campaign_slug, email)` backs the conflict target, so a repeat submission from the same email on the same site is a no-op at the row level — no duplicate row is written. On error → `500 { ok: false, error: "db" }`. No email. (The conflict is silenced by `ignoreDuplicates`, so a repeat is not a DB error; the route still proceeds to send the email — see step 6.)

6. **Send emails** (best-effort on errors, but the route awaits the send before responding; only when `CONTACT_EMAIL` and `GMAIL_USER` are set): `sendContactEmails` sends (a) a notification to `CONTACT_EMAIL` with the full message and `replyTo` the visitor, and (b) an acknowledgment to the visitor. If `sendMail` throws, log and continue — the DB row is already saved. "Best-effort" here only covers failure handling: a slow or unreachable Gmail SMTP still delays the HTTP response by the full send duration, since the route does `await sendContactEmails(...)` with no timeout. See Edge Cases.

7. **Respond** `200 { ok: true }`. The client (`ContactForm`) shows an inline "message received" state; there is no redirect and no thank-you route.

## Outputs (per-request)

- **Side effect**: at most one row in `leads.prospects` per `(campaign_slug, email)` (tagged with `campaign_slug` when the column exists and is in `LEAD_COLUMNS`). A first submit inserts the row; a repeat from the same email on the same site is ignored at the row level (no new row, no overwrite).
- **Side effect**: up to two Gmail sends (operator + visitor), best-effort.
- **Response body**: `{ ok }` consumed by the form, which flips to its success state on `ok: true`.

## Edge Cases

- **`LEAD_COLUMNS` missing/empty**: the client falls back to `first_name,last_name,email,campaign_slug,user_agent,ip,created_at`. Treat as a misconfig and fix in Netlify env.
- **`campaign_slug` not in `LEAD_COLUMNS`**: built in the route but dropped by the filter; all rows get `campaign_slug = NULL`. Add it to `LEAD_COLUMNS` and redeploy. Confirm the column exists; if not, run `add_campaign_slug_column.py`.
- **`campaign_slug` column missing from the table**: insert fails with a Postgres error. Run `add_campaign_slug_column.py` (idempotent; needs `SUPABASE_DB_URL`; the service key can't run DDL).
- **Form posts a column the table lacks** (e.g. `message`): silently dropped by the allowlist; submission still succeeds and the value still reaches the operator email. Add the column + extend `LEAD_COLUMNS` if you want it stored.
- **Repeat submission (same email, same site)**: de-duped at the row level by the UNIQUE `(campaign_slug, email)` index plus `upsert(..., ignoreDuplicates: true)` — the second submit writes no new row and does not overwrite the existing one. The emails are NOT de-duped: the operator notification and visitor acknowledgment still fire on every submit, so the operator always sees the message even when no row is added. The same email under a different `campaign_slug` (different site) stays a separate row — uniqueness is per campaign.
- **Unique index missing from `leads.prospects`**: the upsert's `onConflict: "campaign_slug,email"` has no backing index, so Postgres rejects it and the submit 500s with `error: "db"`. Run `execution/add_prospects_dedup_constraint.py` once to collapse existing duplicates and create the index (idempotent; needs `SUPABASE_DB_URL`).
- **Email send fails**: the row is already saved, so no lead is lost; the visitor sees the success state regardless. Monitor `netlify functions:log submit` for repeat failures (likely an expired Gmail app password).
- **Bot submits**: no bot protection in v1. Symptoms: junk rows + bounce emails. Add Turnstile to the form if it becomes a problem.
- **Slow or unreachable Gmail SMTP delays the response**: the row is already committed before the email step, but the route still `await`s `sendContactEmails` with no timeout, so the visitor's spinner runs for the full SMTP round trip (or hangs if outbound SMTP is blocked on the network) before the success state appears. A sibling route on the same site, `app/api/course-waitlist/route.ts`, hit this exact shape and fixed it with an 8-second `Promise.race` time-box (`EMAIL_TIMEOUT_MS`) that lets the response return on schedule while the send continues in the background with its own attached rejection handler. That fix has not been ported to `submit/route.ts` as of this writing — apply the same pattern here if the latency becomes a problem.

## Error Handling

- The Supabase service-role key is server-side only (Netlify env, never bundled into the client). If you ever see `NEXT_PUBLIC_` in front of it, that's a bug — remove the prefix and rotate the key.
- Gmail SMTP: ~500 sends/day per account, and a contact submit sends two. For higher volume switch to a transactional provider (Resend, Postmark).
- Cold-start latency on Netlify Functions: first hit after idle can be ~1–2s before SMTP is ready; the inline success state absorbs it.
- Unbounded SMTP wait: unlike `app/api/course-waitlist/route.ts` (see Edge Cases), this route has no timeout around the email send, so a hung or very slow Gmail connection is visible to the visitor as response latency, not just a delayed notification.
