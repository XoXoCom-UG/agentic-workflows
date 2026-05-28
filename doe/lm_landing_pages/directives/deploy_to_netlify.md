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
   netlify sites:create --name lm-<slug>
   netlify link --name lm-<slug>
   cd ../..
   ```
   This creates a new Netlify site `lm-<slug>.netlify.app` and links the local directory to it.

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

3. Verify by opening the URL, submitting the form with a real email, and confirming: row appears in `leads.prospects`, email arrives, browser redirects to Drive.

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
| `DRIVE_LINK` | `site.config.json` `.drive_link` | `/api/submit` (email body, redirect target) |
| `LEAD_MAGNET_TITLE` | `site.config.json` `.lead_magnet_title` | `/api/submit` (email subject) |
| `COMPANY_NAME` | `site.config.json` `.company` | `/api/submit` (email from name + signoff) |
| `GMAIL_USER` | repo `.env` | `/api/submit` (SMTP auth + From) |
| `GMAIL_APP_PASSWORD` | repo `.env` | `/api/submit` (SMTP auth) |

None of these are committed. They live in two places only: the repo `.env` (developer-local) and Netlify's per-site env settings (production).

## Outputs (Deliverables)

- **Live URL**: `https://lm-<slug>.netlify.app` (or a custom domain if configured)
- Echoed by `deploy_netlify.py` and surfaced to the user.

## Edge Cases

- **`netlify login` not done**: `netlify sites:create` will fail with an auth error. Tell the user to run `netlify login` once.
- **Slug collides with an existing Netlify site** (someone already grabbed `lm-acme`): the create step will fail. Either pick a different slug, or `netlify link --name <existing>` if the user owns it.
- **`site.config.json` missing a field** (e.g. `drive_link`): the script refuses to deploy and prints which field is missing. Fix `site.config.json` and re-run.
- **`leads.prospects` doesn't actually have a `campaign_slug` column**: deploys succeed but inserts will silently drop the slug from the row (because of the `LEAD_COLUMNS` allowlist filter). Add the column to the table OR remove it from `LEAD_COLUMNS`. The script does not check schema before deploying.
- **First deploy succeeds but the page 500s on submit**: ~90% of the time this is a missing env var or a typo in `LEAD_COLUMNS`. Check Netlify function logs (`netlify functions:log submit`).

## Error Handling

- `npm install` failures: surface the Node version (`node -v`). Next.js requires Node 20+.
- `next build` failures during `netlify deploy`: usually a TypeScript error in `app/page.tsx` from the taste-skill output. Reproduce locally with `npm run build` and fix before retrying the deploy.
- Don't auto-retry a failing deploy. Each `netlify deploy --prod` consumes a deploy slot and creates a log entry. Fix the underlying issue first.
- The `NETLIFY_AUTH_TOKEN` env var in `.env` is only read by the script for the `netlify env:set` API calls. The interactive `netlify` CLI uses its own stored credentials from `netlify login`.
