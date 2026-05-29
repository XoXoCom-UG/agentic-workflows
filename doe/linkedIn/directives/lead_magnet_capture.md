# Lead Magnet Capture

## Goal

Capture a visitor's name and email address via the landing page, store the lead in Supabase, and deliver the lead magnet file(s) to their inbox via a branded email containing Google Drive download link(s).

---

## Inputs

- **first_name** — Visitor's first name (from form)
- **last_name** — Visitor's last name (from form)
- **email** — Visitor's email address (from form)
- **drive_links** — One or more Google Drive download URLs for the lead magnet file(s) (set in `.env` as `LEAD_MAGNET_DRIVE_LINKS`, space-separated)

---

## Tools / Scripts

| Script | Purpose |
|--------|---------|
| `execution/insert_lead_supabase.py` | Inserts the lead (first name, last name, email) into the `leads` table in Supabase |
| `execution/send_lead_magnet_email.py` | Sends a branded HTML welcome email to the visitor with Google Drive download button(s) |
| `execution/lead_magnet_api.py` | Modal-hosted FastAPI app that receives the form POST, orchestrates the two scripts above, and returns a JSON response to the landing page |

**External dependencies:**
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_DB_URL` in `.env`
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `.env` (Gmail App Password, not account password)
- `LEAD_MAGNET_DRIVE_LINKS` in `.env` — space-separated Google Drive URLs; files must be shared as "Anyone with the link → Viewer"

---

## Process

### Step 1 — Form submission (frontend)
The visitor fills in first name, last name, and email on the landing page (`landing_page/index.html`) and clicks Submit. The page `fetch()`es a POST request to the Modal endpoint with JSON body `{ first_name, last_name, email }`.

### Step 2 — Input validation (API)
`lead_magnet_api.py` receives the request and validates:
- All three fields are non-empty strings
- Email matches a valid format
- If validation fails → return HTTP 422 with `{ "error": "..." }`

### Step 3 — Insert lead into Supabase
Call `insert_lead_supabase.py` logic with the validated inputs.
- Connects via `SUPABASE_DB_URL` (direct Postgres) and runs `CREATE TABLE IF NOT EXISTS leads (...)` — no-op if the table already exists
- Connects to Supabase using `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` and inserts `{ first_name, last_name, email, created_at }`
- On success → continue to Step 4
- On failure → return HTTP 500 with `{ "error": "Database error" }` (do not expose raw exception)

### Step 4 — Send welcome email
Call `send_lead_magnet_email.py` logic with first name, email, and the list of Drive links from `LEAD_MAGNET_DRIVE_LINKS`.
- Connects to Gmail SMTP (port 587, STARTTLS) using `GMAIL_USER` + `GMAIL_APP_PASSWORD`
- Sends a branded HTML email: greeting with first name, one download button per file
- On success → return HTTP 200 with `{ "status": "ok" }`
- On failure → log the error; return HTTP 500 with `{ "error": "Email delivery failed" }`

### Step 5 — Frontend confirms
The landing page receives the `{ "status": "ok" }` response, hides the form, and shows the "Check your inbox!" confirmation message.

---

## Outputs (Deliverables)

- **Supabase `leads` table** — new row for each successful submission (permanent record)
- **Email in visitor's inbox** — HTML email with Download button(s) linking to Google Drive

> `.tmp/` is not used by this workflow. No intermediate files are written.

---

## Edge Cases

**Duplicate email submitted.** Supabase will accept it (no unique constraint by default). The visitor receives a second email. If deduplication is needed later, add a `UNIQUE` constraint on `email` in Supabase and handle the resulting error in `insert_lead_supabase.py`.

**Invalid email format.** The API returns HTTP 422 before touching Supabase or Gmail. The landing page shows an inline error message.

**Supabase insert fails (network / auth).** The API returns HTTP 500. The email is NOT sent. The landing page shows "Something went wrong. Please try again." The visitor's data is not stored — they must resubmit.

**Gmail send fails after successful insert.** The lead IS stored in Supabase, but no email is delivered. Log the error. The visitor sees an error message and may retry (a duplicate row will be inserted on retry). Monitor Gmail App Password expiry and SMTP rate limits.

**Google Drive link is broken or access-revoked.** The email still delivers, but the download button leads to a 404 or "access denied" page. Fix the sharing settings on the Drive file and optionally re-email affected leads using Supabase records.

**`LEAD_MAGNET_DRIVE_LINKS` is empty.** The API will return an error on startup/config check. Ensure the env var is set before deploying.

---

## Error Handling

- **Supabase auth:** Use the `service_role` key (not the `anon` key) so RLS does not block inserts. Rotate the key in Supabase Settings → API if compromised.
- **Gmail App Password:** Generate at Google Account → Security → 2-Step Verification → App Passwords. The password is 16 characters with no spaces. Do not use the Gmail account password directly.
- **Modal secrets:** The Modal app loads secrets via `modal.Secret.from_dotenv()` at deploy time. Re-deploy after changing `.env` values.
- **CORS:** The Modal API allows all origins (`*`) by default. Restrict to the Netlify domain after deployment for production hardening.
- **Rate limits:** Gmail SMTP allows ~500 emails/day on a standard account. For higher volume, replace Gmail SMTP with a transactional email provider (SendGrid, Resend, etc.) and update `send_lead_magnet_email.py` accordingly.
