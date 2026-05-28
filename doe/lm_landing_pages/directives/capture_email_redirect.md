# Directive: Capture, Email, Redirect (Runtime Contract)

## Goal

Document the runtime behavior of a deployed landing page: what happens after a visitor submits the form. This directive is **reference material**, not an agent action. The agent reads it to debug live submissions, build the `_template/app/api/submit/route.ts` file, or update the contract when the schema or flow changes.

## Inputs

(Not invoked at agent-time. These are the runtime inputs the deployed `/api/submit` route receives.)

- **Request body** (JSON): `{ email: string, fields: Record<string, string> }`
- **Server-side env vars** (set per-site by `deploy_netlify.py`):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS`
  - `DRIVE_LINK`, `CAMPAIGN_SLUG`, `LEAD_MAGNET_TITLE`, `COMPANY_NAME`
  - `GMAIL_USER`, `GMAIL_APP_PASSWORD`

## Tools / Scripts

- `sites/_template/app/api/submit/route.ts` — the Netlify Function that implements this contract
- `sites/_template/lib/supabase.ts` — service-role Supabase client factory
- `sites/_template/lib/mailer.ts` — nodemailer transporter + thank-you HTML template

## Process (runtime, executed by the Netlify Function on every form submit)

1. **Receive** `POST /api/submit` with JSON body.

2. **Validate**:
   - `email` matches `/^[^@]+@[^@]+\.[^@]+$/`
   - If invalid → respond `422 { ok: false, error: "invalid_email" }`. No DB write, no email, no redirect.

3. **Build the row**: merge `body.fields`, `email`, `campaign_slug` (from env), `user_agent` (from request header), `ip` (from `x-forwarded-for`), `created_at` (ISO timestamp).

4. **Filter the row** to the `LEAD_COLUMNS` allowlist. Drop nulls. This is what guarantees we only write columns that exist in `leads.prospects` regardless of what the page form contains.

5. **Insert**: `supabase.schema("leads").from("prospects").insert(filtered_row).select()`.
   - If insert errors → respond `500 { ok: false, error: "db" }`. No email, no redirect.

6. **Send thank-you email** (await, but wrap in try/catch):
   - From: `"<COMPANY_NAME>" <GMAIL_USER>`
   - To: visitor's email
   - Subject: `Your download: <LEAD_MAGNET_TITLE>`
   - Body: HTML with greeting (uses `first_name` if present), a Drive link styled as a button, signoff with `COMPANY_NAME`
   - If `sendMail` throws → swallow + log to Netlify function logs. **Don't block the redirect** — the visitor still gets to Drive via the thank-you page, which is the primary download path.

7. **Respond** `200 { ok: true, redirect_url: "/thank-you?to=<urlencoded(DRIVE_LINK)>" }`.

## Outputs (per-request)

- **Side effect**: one row in `leads.prospects`
- **Side effect**: one Gmail send (best-effort)
- **Response body**: `{ ok, redirect_url }` consumed by the browser, which then `window.location.assign(redirect_url)`s

## Browser-side flow after the 200

1. Browser receives the response.
2. JS does `window.location.assign(data.redirect_url)` → loads `/thank-you?to=<drive>`.
3. `/thank-you/page.tsx` reads `?to=` from URL, validates it's an https URL pointing at `drive.google.com`, renders a "Check your email — your download is starting…" UI, and emits `<meta http-equiv="refresh" content="2;url=<drive>">`.
4. After 2s, browser navigates to Drive.

## Edge Cases

- **`LEAD_COLUMNS` is missing or empty**: the route falls back to `first_name,last_name,email,campaign_slug,user_agent,ip,created_at`. Treat as a misconfig and fix in Netlify env settings.
- **Form posts a column that doesn't exist in `leads.prospects`** (e.g. `phone` when the table doesn't have it): the column is silently dropped by the allowlist filter. The form submission still succeeds. Add the column to `leads.prospects` first, then add it to `LEAD_COLUMNS`.
- **Drive link is malformed**: the thank-you page validates it's an `https://drive.google.com/...` URL before refreshing. If not, it just shows the email-sent message without auto-redirect (visitor still has the email).
- **Email send fails**: the visitor still gets to Drive via the thank-you page redirect. They just don't get the backup email. Monitor Netlify function logs to catch repeat failures (likely Gmail app-password expired).
- **Bot submits the form**: there is no bot protection in v1. Deferred. Symptoms: junk rows in `leads.prospects` and bounce emails from Gmail. Add Turnstile to the form when this becomes a problem.

## Error Handling

- Supabase service-role key compromise risk: this key is server-side only (Netlify env, never bundled into the client). If you ever see `NEXT_PUBLIC_` in front of it in any file, that's a bug — remove the prefix immediately and rotate the key.
- Gmail SMTP rate limits: ~500/day per Gmail account. Hitting this means you need a dedicated transactional email provider (Resend, Postmark). For v1, fine.
- Cold-start latency on Netlify Functions: first hit after idle can be ~1-2s before the SMTP transporter is ready. The thank-you page absorbs this; the visitor doesn't perceive it.
- Supabase rate limits: insert is one row per submit, very low write volume. No concern at v1 traffic.
