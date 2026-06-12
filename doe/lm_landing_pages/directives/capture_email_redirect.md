# Directive: Capture, Email, Redirect (Runtime Contract)

## Goal

Document the runtime behavior of a deployed landing page: what happens after a visitor submits the form. This directive is **reference material**, not an agent action. The agent reads it to debug live submissions, build the `_template/app/api/submit/route.ts` file, or update the contract when the schema or flow changes.

## Inputs

(Not invoked at agent-time. These are the runtime inputs the deployed `/api/submit` route receives.)

- **Request body** (JSON): `{ email: string, fields: Record<string, string> }`
- **Server-side env vars** (set per-site by `deploy_netlify.py`):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS` — sourced from repo root `.env`. `LEAD_COLUMNS` must include `campaign_slug` for campaign separation to work; the route drops any column not in this allowlist.
  - `DRIVE_LINK`, `CAMPAIGN_SLUG`, `LEAD_MAGNET_TITLE`, `COMPANY_NAME` — sourced from `site.config.json` (per-campaign; `DRIVE_LINK` is `site.config.json` `.drive_link`). For fake-door/waitlist sites `DRIVE_LINK` is set to a real but vestigial URL to pass validation; the submit route does not use it.
  - `GMAIL_USER`, `GMAIL_APP_PASSWORD` — sourced from repo root `.env`
  - For local development, all of the above are written into `sites/<slug>/.env.local` by running `python execution/sync_env_local.py --slug <slug>`. `DRIVE_LINK` is never stored in the shared root `.env`.

## Tools / Scripts

- `sites/_template/app/api/submit/route.ts` — the Netlify Function that implements the standard lead-magnet contract
- `sites/_template/lib/supabase.ts` — service-role Supabase client factory
- `sites/_template/lib/mailer.ts` — nodemailer transporter + thank-you HTML template (standard variant; exports `sendThankYouEmail`)
- `execution/add_campaign_slug_column.py` — one-off idempotent migration that adds `campaign_slug text` to `leads.prospects` via direct Postgres (`SUPABASE_DB_URL`). Run once before the first deployment that relies on `campaign_slug` filtering. PostgREST/service key cannot run DDL; only the direct connection can.

**Fake-door / waitlist variant** (per-site overrides, not template changes):
- `sites/<slug>/app/api/submit/route.ts` — returns `redirect_url: "/thank-you"` with no `?to=` parameter
- `sites/<slug>/lib/mailer.ts` — exports `sendConfirmationEmail`; sends a plain early-access confirmation, no Drive link. Requires only `GMAIL_USER` (not `DRIVE_LINK`).
- `sites/<slug>/app/thank-you/page.tsx` — static confirmation page; no Drive URL validation, no auto-redirect

## Process (runtime, executed by the Netlify Function on every form submit)

1. **Receive** `POST /api/submit` with JSON body.

2. **Validate**:
   - `email` matches `/^[^@]+@[^@]+\.[^@]+$/`
   - If invalid → respond `422 { ok: false, error: "invalid_email" }`. No DB write, no email, no redirect.

3. **Build the row**: merge `body.fields`, `email`, `campaign_slug` (from `CAMPAIGN_SLUG` env var, which `deploy_netlify.py` sets from `site.config.json` `.slug`), `user_agent` (from request header), `ip` (from `x-forwarded-for`), `created_at` (ISO timestamp).

4. **Filter the row** to the `LEAD_COLUMNS` allowlist. Drop nulls. This guarantees only columns that exist in `leads.prospects` are written. `campaign_slug` must be listed in `LEAD_COLUMNS` for campaign separation to work — if it is absent from the allowlist, the value is silently dropped even though the route builds it. The `campaign_slug` column itself must first exist in the table; run `execution/add_campaign_slug_column.py` if it does not.

5. **Insert**: `supabase.schema("leads").from("prospects").insert(filtered_row).select()`.
   - If insert errors → respond `500 { ok: false, error: "db" }`. No email, no redirect.

6. **Send thank-you email** (await, but wrap in try/catch):
   - From: `"<COMPANY_NAME>" <GMAIL_USER>`
   - To: visitor's email
   - Subject: `Your download: <LEAD_MAGNET_TITLE>`
   - Body: HTML with greeting (uses `first_name` if present), a Drive link styled as a button, signoff with `COMPANY_NAME`
   - If `sendMail` throws → swallow + log to Netlify function logs. **Don't block the redirect** — the visitor still gets to Drive via the thank-you page, which is the primary download path.

7. **Respond** `200 { ok: true, redirect_url: "/thank-you?to=<urlencoded(DRIVE_LINK)>" }`.

**Fake-door / waitlist variant** — steps 6 and 7 differ:

6. **Send confirmation email** (best-effort, non-blocking) only when `GMAIL_USER` is set. The email confirms the visitor is on the early-access list; it contains no download link and does not use `DRIVE_LINK`. If `sendMail` throws, the error is logged and the response is not blocked.

7. **Respond** `200 { ok: true, redirect_url: "/thank-you" }` — no `?to=` query parameter. The thank-you page is a static confirmation; it does not validate a Drive URL and does not auto-redirect.

## Outputs (per-request)

- **Side effect**: one row in `leads.prospects` (tagged with `campaign_slug` when the column exists and `LEAD_COLUMNS` includes it)
- **Side effect**: one Gmail send (best-effort)
- **Response body**: `{ ok, redirect_url }` consumed by the browser, which then `window.location.assign(redirect_url)`s

## Browser-side flow after the 200

**Standard lead-magnet variant:**

1. Browser receives the response.
2. JS does `window.location.assign(data.redirect_url)` → loads `/thank-you?to=<drive>`.
3. `/thank-you/page.tsx` reads `?to=` from URL, validates it's an https URL pointing at `drive.google.com`, renders a "Check your email — your download is starting…" UI, and emits `<meta http-equiv="refresh" content="2;url=<drive>">`.
4. After 2s, browser navigates to Drive.

**Fake-door / waitlist variant:**

1. Browser receives the response.
2. JS does `window.location.assign("/thank-you")` — no query parameter.
3. `/thank-you/page.tsx` renders a static "you're on the list" confirmation. No Drive URL is read or validated. No auto-redirect occurs.

## Edge Cases

- **`LEAD_COLUMNS` is missing or empty**: the route falls back to `first_name,last_name,email,campaign_slug,user_agent,ip,created_at`. Treat as a misconfig and fix in Netlify env settings.
- **`campaign_slug` not in `LEAD_COLUMNS`**: the value is built in the route but silently dropped by the allowlist filter. All rows for that campaign will have `campaign_slug = NULL`. Fix: add `campaign_slug` to `LEAD_COLUMNS` in `.env`, redeploy. Also confirm the column exists in the table; if not, run `execution/add_campaign_slug_column.py`.
- **`campaign_slug` column missing from `leads.prospects`**: the insert fails with a Postgres error. Run `execution/add_campaign_slug_column.py` to add it (idempotent). The script requires `SUPABASE_DB_URL` in root `.env`; the PostgREST service key cannot run DDL.
- **Form posts a column that doesn't exist in `leads.prospects`** (e.g. `phone` when the table doesn't have it): the column is silently dropped by the allowlist filter. The form submission still succeeds. Add the column to `leads.prospects` first, then add it to `LEAD_COLUMNS`.
- **Drive link is malformed** (standard variant): the thank-you page validates it's an `https://drive.google.com/...` URL before refreshing. If not, it just shows the email-sent message without auto-redirect (visitor still has the email).
- **Drive link is vestigial** (fake-door variant): `DRIVE_LINK` is set to a real URL (e.g. the company homepage) only to satisfy `sync_env_local.py`'s placeholder check. The submit route and mailer do not use it. This is expected behaviour, not a misconfiguration.
- **Email send fails**: in the standard variant, the visitor still gets to Drive via the thank-you page redirect. In the fake-door variant, the visitor sees the static thank-you page and has no other delivery path, but no action is blocked. Monitor Netlify function logs to catch repeat failures (likely Gmail app-password expired).
- **Bot submits the form**: there is no bot protection in v1. Deferred. Symptoms: junk rows in `leads.prospects` and bounce emails from Gmail. Add Turnstile to the form when this becomes a problem.

## Error Handling

- Supabase service-role key compromise risk: this key is server-side only (Netlify env, never bundled into the client). If you ever see `NEXT_PUBLIC_` in front of it in any file, that's a bug — remove the prefix immediately and rotate the key.
- Gmail SMTP rate limits: ~500/day per Gmail account. Hitting this means you need a dedicated transactional email provider (Resend, Postmark). For v1, fine.
- Cold-start latency on Netlify Functions: first hit after idle can be ~1-2s before the SMTP transporter is ready. The thank-you page absorbs this; the visitor doesn't perceive it.
- Supabase rate limits: insert is one row per submit, very low write volume. No concern at v1 traffic.
