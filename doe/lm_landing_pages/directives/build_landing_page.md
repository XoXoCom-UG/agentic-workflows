# Directive: Build Landing Page

## Goal

Produce a deployed, distinct-looking lead-magnet landing page for a single campaign. End state: a live Netlify URL whose form writes to `leads.prospects` in Supabase and emails the visitor a Google Drive download link.

## Inputs

Confirm all of these with the user before doing anything else:

- **Company name** and **slug** (slug = lowercase, underscore-separated; used as the directory name, the `CAMPAIGN_SLUG` env var, and the value written to `campaign_slug` in `leads.prospects`. The Netlify site name may use hyphens instead of underscores, since Netlify subdomains cannot contain underscores — the two can intentionally differ.)
- **Form fields** to capture from visitors. Default: `first_name, last_name, email`. Email is always required regardless.
- **Google Drive link** for the lead magnet (required, full shareable URL). For a fake-door/waitlist campaign with no download, a real but vestigial URL must still be provided to pass validation in `sync_env_local.py` and `scaffold_site.py`; the per-site flow can choose not to use it.
- **Lead-magnet title** (used in the email subject and the page copy)
- **Hero asset** — pick from `exploded_views/` (see step 2) or none
- **Campaign variant** — standard lead-magnet (default) or fake-door/waitlist (no download, confirmation email only). This determines which per-site `route.ts` and `mailer.ts` pattern to follow after scaffolding.

## Tools / Scripts

- `execution/list_exploded_views.py` — enumerates available mp4 hero assets
- `execution/scaffold_site.py` — clones `sites/_template/` to `sites/<slug>/` and writes `site.config.json`
- `execution/sync_env_local.py` — generates `sites/<slug>/.env.local` from root `.env` (shared vars) + `site.config.json` (per-campaign vars including `drive_link`); must run before `next dev`
- `execution/start_preview_server.py` — runs `next dev` on a free port
- `execution/deploy_netlify.py` — sets Netlify env vars and deploys
- `execution/add_campaign_slug_column.py` — one-off, idempotent DB migration that adds the `campaign_slug text` column to `leads.prospects` via a direct Postgres connection. Run this once before the first campaign that needs per-campaign filtering. Uses `SUPABASE_DB_URL` from root `.env`; requires `psycopg2-binary` (included in `requirements.txt`).
- `design-taste-frontend` skill — generates the per-site design
- Other directives: `design_landing_page.md` (iteration loop), `add_legal_pages.md` (Impressum + Datenschutz — mandatory before deploy), `deploy_to_netlify.md` (deploy step), `capture_email_redirect.md` (runtime contract reference)

Required env in `.env` at repo root: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS` (must include `campaign_slug`), `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NETLIFY_AUTH_TOKEN`, `SUPABASE_DB_URL` (direct Postgres connection string, required only for the migration script).

## Process

1. **Intake** — Ask the user for every input listed above. Do not infer. If they don't specify form fields, confirm the default explicitly. For a standard lead-magnet campaign, the Drive link is mandatory; refuse to proceed without one. For a fake-door/waitlist campaign, a real URL is still required in `drive_link` to satisfy script validation, but it will not be used in the visitor-facing flow.

   Also confirm whether this is the first campaign that requires `campaign_slug` filtering. If so, run the migration before deploying:
   - Run `python execution/add_campaign_slug_column.py` once. This adds the `campaign_slug text` column to `leads.prospects` if it doesn't already exist. Existing rows keep `campaign_slug = NULL`. The script is idempotent — safe to run again.
   - Confirm that `campaign_slug` appears in `LEAD_COLUMNS` in root `.env`. The submit route only writes columns in that allowlist; if `campaign_slug` is absent, the value is silently dropped and campaign separation will not work.

2. **Pick hero asset** — Run `python execution/list_exploded_views.py`. Present the list of `.mp4` files (filename, size, modified date) to the user.
   - User picks one filename → record it.
   - User says "none" → **ask** which alternative they want:
     - (a) Use a still image — get the path
     - (b) Text-only hero (no media)
     - (c) Wait while they drop a new mp4 into `exploded_views/` — re-run the listing when they're ready
   - Never default silently to no-video.

3. **Compute variance brief** — Read every existing `sites/*/site.config.json` and collect the `visual_fingerprint` values used so far (palette, layout, motion, typography). Build an explicit avoid-list to pass to the taste-skill. Generate a unique `signature` token: `lm-<slug>-<6-char-hash-of-slug+timestamp>`.

4. **Scaffold** — Run:
   ```
   python execution/scaffold_site.py \
     --slug <slug> \
     --company "<company>" \
     --fields "<csv-of-fields>" \
     --drive-link "<url>" \
     --lead-magnet-title "<title>" \
     --hero <mp4-filename-or-none> \
     --signature <token>
   ```
   This clones `sites/_template/` to `sites/<slug>/`, writes `site.config.json`, and copies the selected mp4 to `sites/<slug>/public/hero.mp4` if one was chosen.

5. **Design** — Invoke the `design-taste-frontend` skill scoped to `sites/<slug>/`. Pass it:
   - The brief (company, lead-magnet title, audience if known)
   - The variance avoid-list from step 3
   - The chosen `visual_fingerprint` axes (palette, layout, motion, typography) — must diverge on at least palette + layout from every prior site
   - The mandate that the `signature` token (read from `site.config.json`) must appear somewhere visible on the page (footer is fine)
   After the skill produces output, write the realized `visual_fingerprint` back into `sites/<slug>/site.config.json`.

6. **Install + preview** — `cd sites/<slug> && npm install`. Then, before starting the dev server, confirm that `site.config.json` has a real `drive_link` (not a placeholder), and run `python execution/sync_env_local.py --slug <slug>` from the repo root. This generates `sites/<slug>/.env.local` by combining the shared vars from root `.env` with the per-campaign values from `site.config.json`. If `drive_link` is missing or still looks like a placeholder, the script will refuse and print which field to fix. Once `.env.local` is written, run `python execution/start_preview_server.py --slug <slug>` to start `next dev` on a free port. Open the URL.

7. **Iterate** — Hand control to `design_landing_page.md`. Screenshot → critique → edit → reload until the user approves. Never collapse the design back onto a fingerprint already used by another site, and never remove the `signature` token.

8. **Add legal pages** — Before deploying, follow `add_legal_pages.md` to add the Impressum and Datenschutzerklärung. This is mandatory for any site that collects personal data (including a waitlist email). The legal pages must be reachable from every page via the footer `FooterLinks` component, and the `LeadForm` must show the static consent notice linking to `/datenschutz`. Do not proceed to deploy without completing this step.

9. **Deploy** — On user approval (and after legal pages are in place), run `deploy_to_netlify.md`.

## Outputs (Deliverables)

- **Cloud deliverable**: the live Netlify URL (`lm-<slug>.netlify.app`) returned by the deploy step.
- **Repo artifacts** (committed):
  - `sites/<slug>/` — full Next.js project including the realized design
  - Updated `sites/<slug>/site.config.json` with final `visual_fingerprint` and `signature`
- **Not deliverables**: `.tmp/` screenshots, `.next/` build output, `node_modules/`.

## Edge Cases

- **`exploded_views/` is empty**: Ask the user whether to wait for an upload or proceed with a still-image / text-only hero. Don't assume.
- **Slug collision with existing `sites/<slug>/`**: Refuse to overwrite. Ask the user whether to pick a new slug, suffix it (`-v2`), or delete the existing one first.
- **Drive link missing or invalid**: Stop. Ask the user for it. For standard lead-magnet campaigns, the page is useless without a real download target. For fake-door/waitlist campaigns, a real but vestigial URL is still required (e.g. the company homepage) to pass the placeholder check in `sync_env_local.py` and `scaffold_site.py`; the per-site `route.ts` simply never uses it.
- **Fake-door / waitlist variant (no download)**: This is a supported alternative to the standard lead-magnet flow. In this variant, the per-site `app/api/submit/route.ts` returns `redirect_url: "/thank-you"` with no `?to=` parameter; the per-site `lib/mailer.ts` exports `sendConfirmationEmail` (not `sendThankYouEmail`) and sends a plain early-access confirmation email rather than a Drive link; and `app/thank-you/page.tsx` shows a static confirmation without auto-redirect. The email is sent whenever `GMAIL_USER` is set — `DRIVE_LINK` is not required by the email logic. These are per-site file modifications made after scaffolding, not changes to the shared `_template/`; the standard template flow is unchanged. See `capture_email_redirect.md` for the runtime contract of each variant.
- **Netlify site name differs from slug**: Netlify subdomain names cannot contain underscores. If the slug uses underscores (e.g. `matfit_fakedoor_12062026`), the Netlify site must be named with hyphens (e.g. `matfit-xoxocom-ug`). The directory name, `CAMPAIGN_SLUG` env var, and `campaign_slug` DB value all use the original slug with underscores. This divergence is intentional and does not affect the submit route or DB writes.
- **`leads.prospects` schema doesn't include all columns we want to write**: Adjust `LEAD_COLUMNS` in `.env` to the actual columns. The Next.js route filters to that allowlist, so unknown columns are dropped server-side — the insert will succeed but the column won't be stored. Alert the user if a column they cared about is missing. If `campaign_slug` is missing from the table entirely, run `python execution/add_campaign_slug_column.py` first.
- **Taste-skill produces a fingerprint already in use**: Re-prompt the skill with the avoid-list reinforced. If it still collides twice, ask the user which axis to fix manually.
- **Form field names with characters that don't match the Supabase column names**: Ask the user to confirm the mapping before scaffolding. Form input `name` attributes must exactly match column names in `leads.prospects`.

## Error Handling

- `npm install` failures in `sites/<slug>/`: surface the npm output to the user. Most likely cause is a missing Node version (requires Node 20+).
- Netlify CLI not authenticated: prompt the user to run `netlify login` once.
- The taste-skill needs Tailwind v4, Motion, and the chosen icon library installed. `_template/package.json` ships them; if the user customizes the template, keep these.
- Don't auto-retry the deploy step on failure — Netlify deploys can be partial and re-running blindly creates orphan deploys.
