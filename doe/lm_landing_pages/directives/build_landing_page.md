# Directive: Build Landing Page

## Goal

Produce a deployed, distinct-looking lead-magnet landing page for a single campaign. End state: a live Netlify URL whose form writes to `leads.prospects` in Supabase and emails the visitor a Google Drive download link.

## Inputs

Confirm all of these with the user before doing anything else:

- **Company name** and **slug** (slug = lowercase, kebab-case; used in URLs and as `campaign_slug` in Supabase)
- **Form fields** to capture from visitors. Default: `first_name, last_name, email`. Email is always required regardless.
- **Google Drive link** for the lead magnet (required, full shareable URL)
- **Lead-magnet title** (used in the email subject and the page copy)
- **Hero asset** — pick from `exploded_views/` (see step 2) or none

## Tools / Scripts

- `execution/list_exploded_views.py` — enumerates available mp4 hero assets
- `execution/scaffold_site.py` — clones `sites/_template/` to `sites/<slug>/` and writes `site.config.json`
- `execution/start_preview_server.py` — runs `next dev` on a free port
- `execution/deploy_netlify.py` — sets Netlify env vars and deploys
- `design-taste-frontend` skill — generates the per-site design
- Other directives: `design_landing_page.md` (iteration loop), `deploy_to_netlify.md` (deploy step), `capture_email_redirect.md` (runtime contract reference)

Required env in `.env` at repo root: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NETLIFY_AUTH_TOKEN`.

## Process

1. **Intake** — Ask the user for every input listed above. Do not infer. If they don't specify form fields, confirm the default explicitly. The Drive link is mandatory; refuse to proceed without one.

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

6. **Install + preview** — `cd sites/<slug> && npm install`, then `python execution/start_preview_server.py --slug <slug>` to start `next dev` on a free port. Open the URL.

7. **Iterate** — Hand control to `design_landing_page.md`. Screenshot → critique → edit → reload until the user approves. Never collapse the design back onto a fingerprint already used by another site, and never remove the `signature` token.

8. **Deploy** — On user approval, run `deploy_to_netlify.md`.

## Outputs (Deliverables)

- **Cloud deliverable**: the live Netlify URL (`lm-<slug>.netlify.app`) returned by the deploy step.
- **Repo artifacts** (committed):
  - `sites/<slug>/` — full Next.js project including the realized design
  - Updated `sites/<slug>/site.config.json` with final `visual_fingerprint` and `signature`
- **Not deliverables**: `.tmp/` screenshots, `.next/` build output, `node_modules/`.

## Edge Cases

- **`exploded_views/` is empty**: Ask the user whether to wait for an upload or proceed with a still-image / text-only hero. Don't assume.
- **Slug collision with existing `sites/<slug>/`**: Refuse to overwrite. Ask the user whether to pick a new slug, suffix it (`-v2`), or delete the existing one first.
- **Drive link missing or invalid**: Stop. Ask the user for it. The page is useless without a real download target.
- **`leads.prospects` schema doesn't include all columns we want to write**: Adjust `LEAD_COLUMNS` in `.env` to the actual columns. The Next.js route filters to that allowlist, so unknown columns are dropped server-side — the insert will succeed but the column won't be stored. Alert the user if a column they cared about is missing.
- **Taste-skill produces a fingerprint already in use**: Re-prompt the skill with the avoid-list reinforced. If it still collides twice, ask the user which axis to fix manually.
- **Form field names with characters that don't match the Supabase column names**: Ask the user to confirm the mapping before scaffolding. Form input `name` attributes must exactly match column names in `leads.prospects`.

## Error Handling

- `npm install` failures in `sites/<slug>/`: surface the npm output to the user. Most likely cause is a missing Node version (requires Node 20+).
- Netlify CLI not authenticated: prompt the user to run `netlify login` once.
- The taste-skill needs Tailwind v4, Motion, and the chosen icon library installed. `_template/package.json` ships them; if the user customizes the template, keep these.
- Don't auto-retry the deploy step on failure — Netlify deploys can be partial and re-running blindly creates orphan deploys.
