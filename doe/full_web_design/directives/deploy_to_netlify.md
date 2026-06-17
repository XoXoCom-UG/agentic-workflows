# Directive: Deploy to Netlify

## Goal

Push a finalized `sites/<slug>/` multi-page site to a per-site Netlify site, with all env
vars in place, and return the live URL to the user.

## Inputs

- **Slug** of the site to deploy (`sites/<slug>/` exists and is user-approved)
- **`sites/<slug>/site.config.json`** filled with final values (source of truth for Netlify env vars)
- **`.env`** at repo root with `NETLIFY_AUTH_TOKEN`. For a contact-form site, also `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`.

## Tools / Scripts

- `execution/deploy_netlify.py` — orchestrates the per-site deploy. When it echoes each `netlify env:set` command, it masks the values of secret keys (`SUPABASE_SERVICE_KEY`, `GMAIL_APP_PASSWORD`) so they never appear in plain text in logs or terminal scrollback; non-secret values are echoed normally.
- `netlify` CLI (authenticated via `netlify login` or `NETLIFY_AUTH_TOKEN`)

## Process

### First deploy for a new slug

1. From inside the site dir, create the Netlify site:
   ```
   cd sites/<slug>
   netlify sites:create --name <netlify-site-name> --account-slug <account-slug>
   cd ../..
   ```
   - `<netlify-site-name>` becomes `<netlify-site-name>.netlify.app`. It need not equal the slug — and **cannot** when the slug has underscores (Netlify rejects them in subdomains). The directory and `SITE_SLUG` keep the underscores; only the public subdomain is hyphenated.
   - `--account-slug` is required when the login owns more than one team, else `sites:create` prompts interactively and hangs. Find it with `netlify api listAccountsForUser` (the `slug` field).
   - `sites:create` auto-links the current directory. If they drift, `netlify link --name <netlify-site-name>`.

2. Run:
   ```
   python execution/deploy_netlify.py --slug <slug>
   ```
   The script reads `site.config.json`, runs `npm install`, sets the env vars (table below), runs `netlify deploy --prod` from inside the site dir, and prints the deploy URL.

3. Verify by opening the URL: click through every page in the nav, confirm the legal pages load, and — on a contact-form site — submit the form with a real email and confirm the row appears in `leads.prospects` (tagged with `campaign_slug`) and both emails arrive. See `capture_contact_submission.md` for the runtime contract.

### Subsequent deploys (same slug)

Skip step 1. Re-run `python execution/deploy_netlify.py --slug <slug>`. Env vars are re-set every time so config drift can't accumulate.

## Per-site Netlify env vars

Pushed by `deploy_netlify.py`:

| Variable | Source | Used by |
|---|---|---|
| `SITE_SLUG` | `site.config.json` `.slug` | `/api/submit` → `campaign_slug` in `leads.prospects` |
| `COMPANY_NAME` | `site.config.json` `.company` | `/api/submit` (email from name + signoff) |
| `CONTACT_EMAIL` | `site.config.json` `.contact_email` | `/api/submit` (operator notification target) — contact-form sites only |
| `SUPABASE_URL` | repo `.env` | `/api/submit` route — contact-form sites only |
| `SUPABASE_SERVICE_KEY` | repo `.env` | `/api/submit` route — contact-form sites only |
| `LEAD_COLUMNS` | repo `.env` | `/api/submit` allowlist filter — contact-form sites only |
| `GMAIL_USER` | repo `.env` | `/api/submit` SMTP auth + From — contact-form sites only |
| `GMAIL_APP_PASSWORD` | repo `.env` | `/api/submit` SMTP auth — contact-form sites only |

A brochure site with `has_contact_form: false` pushes only `SITE_SLUG` + `COMPANY_NAME`. None of these are committed — they live in the repo `.env` (dev) and Netlify env settings (prod) only.

## Outputs (Deliverables)

- **Live URL**: `https://<netlify-site-name>.netlify.app` (or a custom domain if configured), echoed by `deploy_netlify.py` and surfaced to the user.

## Edge Cases

- **Not authenticated**: `sites:create` fails with an auth error. Run `netlify login` once, or rely on `NETLIFY_AUTH_TOKEN` (the CLI reads it from the environment every command; `deploy_netlify.py` loads it via `load_dotenv`). For the manual `sites:create`, export it in your shell first.
- **Multiple teams**: pass `--account-slug <slug>` to `sites:create` or it hangs non-interactively.
- **Slug has underscores**: choose a hyphenated `<netlify-site-name>`; `SITE_SLUG`/`campaign_slug` keep the verbatim slug.
- **Site name collides**: the create step fails. Pick a different name, or `netlify link --name <existing>` if the user owns it.
- **`site.config.json` missing a field**: the script refuses and prints which field. Fix and re-run.
- **`leads.prospects` lacks `campaign_slug`**: deploys succeed but the slug is dropped by the `LEAD_COLUMNS` allowlist. Run `execution/add_campaign_slug_column.py`, or remove it from `LEAD_COLUMNS`.
- **Submit 500s on a fresh table without the unique index**: the `/api/submit` route upserts with `onConflict: "campaign_slug,email"`, which requires a UNIQUE index on `(campaign_slug, email)`. If it is missing, every submit fails with `error: "db"`. Run `execution/add_prospects_dedup_constraint.py` once (de-dupes existing rows + creates the index). See `capture_contact_submission.md`.
- **Page 500s on submit**: ~90% of the time a missing env var or a `LEAD_COLUMNS` typo. Check `netlify functions:log submit`.

## Error Handling

- `npm install` failures: check `node -v` (Next.js needs Node 20+).
- `next build` failures during deploy: usually a TypeScript error introduced by the design step. Reproduce with `npm run build` locally and fix before retrying.
- Don't auto-retry a failing deploy — each `--prod` deploy consumes a slot and a log entry. Fix the root cause first.
