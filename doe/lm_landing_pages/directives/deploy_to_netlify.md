# Directive: Deploy to Netlify

## Goal

Push a finalized `sites/<slug>/` to a per-campaign Netlify site, with all per-site environment variables in place, and return the live URL to the user.

## Inputs

- **Slug** of the site to deploy (`sites/<slug>/` must exist and be user-approved)
- **`sites/<slug>/site.config.json`** must be filled in with the final values (used as the source of truth for Netlify env vars)
- **`.env`** at repo root must have: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NETLIFY_AUTH_TOKEN`

## Tools / Scripts

- `execution/deploy_netlify.py` — orchestrates the per-site deploy
- `netlify` CLI (must be authenticated — run `netlify login` once per machine)

## Process

### First deploy for a new slug

1. From the repo root (`lm_landing_pages/`):
   ```
   cd sites/<slug>
   netlify sites:create --name <netlify-site-name> --account-slug <account-slug>
   cd ../..
   ```
   - `<netlify-site-name>` becomes `<netlify-site-name>.netlify.app`. It does NOT have to equal the slug — and CANNOT when the slug contains characters Netlify rejects in a subdomain (underscores especially). Example: slug `matfit_fakedoor_12062026` → site name `matfit-xoxocom-ug`. The directory and `CAMPAIGN_SLUG` keep the underscores (so the DB tag is exact); only the public subdomain is hyphenated.
   - `--account-slug` is required when your login owns more than one account/team — otherwise `sites:create` prompts for a team interactively and hangs in a non-interactive shell. Find it with `netlify api listAccountsForUser` (the `slug` field).
   - `sites:create` auto-links the current directory to the new site, so a separate `netlify link` is usually unnecessary. If they ever drift apart, run `netlify link --name <netlify-site-name>`.

2. Run:
   ```
   python execution/deploy_netlify.py --slug <slug>
   ```
   The script will:
   - Read `sites/<slug>/site.config.json`
   - Run `npm install` inside `sites/<slug>/`
   - Run `netlify env:set` for each variable (see list below)
   - Run `netlify deploy --prod` from inside `sites/<slug>/`
   - Capture the deploy URL and print it

3. Verify by opening the URL, submitting the form with a real email, and confirming the row appears in `leads.prospects` (tagged with `campaign_slug`) and the email arrives. Standard lead-magnet sites then redirect to the Drive link; fake-door / waitlist sites instead land on a static `/thank-you` confirmation with no Drive redirect (see `capture_email_redirect.md`).

### Subsequent deploys (same slug)

Skip step 1. Just re-run `python execution/deploy_netlify.py --slug <slug>`. The env vars are re-set every time so config drift can't accumulate.

## Per-site Netlify env vars

These are pushed by `deploy_netlify.py` on every deploy:

| Variable | Source | Used by |
|---|---|---|
| `SUPABASE_URL` | repo `.env` | `/api/submit` route |
| `SUPABASE_SERVICE_KEY` | repo `.env` | `/api/submit` route |
| `LEAD_COLUMNS` | repo `.env` | `/api/submit` route (allowlist filter) |
| `CAMPAIGN_SLUG` | `site.config.json` `.slug` | `/api/submit` → row in `leads.prospects` |
| `DRIVE_LINK` | `site.config.json` `.drive_link` | `/api/submit` (email body, redirect target) — vestigial for fake-door/waitlist sites (still required non-placeholder) |
| `LEAD_MAGNET_TITLE` | `site.config.json` `.lead_magnet_title` | `/api/submit` (email subject) |
| `COMPANY_NAME` | `site.config.json` `.company` | `/api/submit` (email from name + signoff) |
| `GMAIL_USER` | repo `.env` | `/api/submit` (SMTP auth + From) |
| `GMAIL_APP_PASSWORD` | repo `.env` | `/api/submit` (SMTP auth) |

None of these are committed. They live in two places only: the repo `.env` (developer-local) and Netlify's per-site env settings (production).

## Outputs (Deliverables)

- **Live URL**: `https://<netlify-site-name>.netlify.app` (the name chosen at `sites:create`, not necessarily `lm-<slug>`; or a custom domain if configured)
- Echoed by `deploy_netlify.py` and surfaced to the user.

## Edge Cases

- **Not authenticated**: `netlify sites:create` fails with an auth error. Either run `netlify login` once, or export `NETLIFY_AUTH_TOKEN` — the CLI reads it from the environment for every command, enabling non-interactive use. The repo `.env` already holds `NETLIFY_AUTH_TOKEN`.
- **Multiple accounts/teams on the login**: `sites:create` without `--account-slug` prompts for a team and hangs non-interactively. Pass `--account-slug <slug>` (from `netlify api listAccountsForUser`).
- **Slug has underscores (or other chars Netlify rejects in a subdomain)**: choose a hyphenated `<netlify-site-name>` distinct from the slug. The DB `campaign_slug` / `CAMPAIGN_SLUG` keep the slug verbatim; only the public subdomain changes.
- **Site name collides with an existing Netlify site**: the create step fails. Pick a different name, or `netlify link --name <existing>` if the user owns it.
- **`site.config.json` missing a field** (e.g. `drive_link`): the script refuses to deploy and prints which field is missing. Fix `site.config.json` and re-run.
- **`leads.prospects` doesn't actually have a `campaign_slug` column**: deploys succeed but inserts will silently drop the slug from the row (because of the `LEAD_COLUMNS` allowlist filter). Add the column to the table OR remove it from `LEAD_COLUMNS`. The script does not check schema before deploying.
- **First deploy succeeds but the page 500s on submit**: ~90% of the time this is a missing env var or a typo in `LEAD_COLUMNS`. Check Netlify function logs (`netlify functions:log submit`).

## Error Handling

- `npm install` failures: surface the Node version (`node -v`). Next.js requires Node 20+.
- `next build` failures during `netlify deploy`: usually a TypeScript error in `app/page.tsx` from the taste-skill output. Reproduce locally with `npm run build` and fix before retrying the deploy.
- Don't auto-retry a failing deploy. Each `netlify deploy --prod` consumes a deploy slot and creates a log entry. Fix the underlying issue first.
- The `netlify` CLI authenticates with either the stored credentials from `netlify login` OR a `NETLIFY_AUTH_TOKEN` environment variable (it checks the env var on every command). The repo `.env` holds `NETLIFY_AUTH_TOKEN`; `deploy_netlify.py` loads it via `load_dotenv` so its `netlify` subprocess calls are authenticated without an interactive login. For the manual `sites:create` step, export it in your shell first (e.g. `export NETLIFY_AUTH_TOKEN=...`).
