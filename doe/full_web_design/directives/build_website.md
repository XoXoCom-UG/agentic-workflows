# Directive: Build Website

## Goal

Produce a deployed, multi-page marketing website for a single operator, styled from a
chosen `awesome-design-md` brand DESIGN.md. End state: a live Netlify URL with a home page
plus the requested content pages (about / services / contact / …), German legal pages, and
— if requested — a working contact form that writes to `leads.prospects` in Supabase and
emails both the operator and the visitor.

## Inputs

Confirm all of these with the user before doing anything else:

- **Company name** and **slug** (slug = lowercase, underscore-separated; used as the directory name, the `SITE_SLUG` env var, and the value written to `campaign_slug` in `leads.prospects`. The Netlify subdomain may use hyphens instead, since Netlify subdomains cannot contain underscores — the two can intentionally differ.)
- **Tagline** — one-line value proposition (used in the hero + meta description)
- **Pages** to build. Default: `home, about, services, contact`. The template ships these four; any other page must be authored by hand after scaffolding.
- **Design source** — the look the user wants, mapped to one of the 74 `awesome-design-md` brands (e.g. "clean fintech like Stripe", "developer tool like Linear"). If unsure, the design step picks candidates and confirms.
- **Contact form?** — yes/no. If yes, also confirm the **operator contact email** (inbox that receives submissions) and the **form fields** (default `first_name, email, company, message`; email always required).
- **Operator legal details** for the Impressum/Datenschutz (see `add_legal_pages.md` for the full list). Required before deploy.

## Tools / Scripts

- `execution/scaffold_site.py` — clones `sites/_template/` to `sites/<slug>/` and writes the extended `site.config.json`
- `execution/sync_env_local.py` — generates `sites/<slug>/.env.local` from root `.env` + `site.config.json`; only needed when the site has a contact form. Run before `next dev`.
- `execution/start_preview_server.py` — runs `next dev` on a free port
- `execution/deploy_netlify.py` — sets Netlify env vars and deploys
- `execution/add_campaign_slug_column.py` — one-off, idempotent migration adding `campaign_slug text` to `leads.prospects` (only needed for contact-form sites that filter by site). Uses `SUPABASE_DB_URL`.
- `execution/record_canvas_animation.py` — records a live `<canvas>` hero animation to `assets/exploded-views/<concept-name>.webm` + `.mp4`. Mandatory whenever a new hero canvas or video graphic is produced; called during the design step before deploy. Requires `browser-harness` daemon and `ffmpeg` on PATH.
- `awesome-design-md` skill — the design source (74 brand DESIGN.md token specs)
- Other directives: `design_website.md` (design + iteration loop), `add_legal_pages.md` (legal — mandatory before deploy), `deploy_to_netlify.md` (deploy step), `capture_contact_submission.md` (runtime contract reference)

Required env in `.env` at repo root (contact-form sites only): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS` (must include `campaign_slug`), `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NETLIFY_AUTH_TOKEN`, `SUPABASE_DB_URL` (migration only). A brochure site with no form needs only `NETLIFY_AUTH_TOKEN`.

## Process

1. **Intake** — Ask the user for every input above. Do not infer. Confirm the page list and whether a contact form is needed explicitly. For a contact-form site, the operator email is mandatory.

   If this is the first contact-form site that needs per-site filtering, run the migration before deploying:
   - `python execution/add_campaign_slug_column.py` once (idempotent; shared with the `lm_landing_pages` workspace, so it may already exist).
   - Confirm `campaign_slug` is in `LEAD_COLUMNS` in root `.env`, or the value is silently dropped.

2. **Generate a signature** — `web-<slug>-<6-char-hash-of-slug+date>`. This visible build token stays in the footer for production disambiguation.

3. **Scaffold** — Run:
   ```
   python execution/scaffold_site.py \
     --slug <slug> \
     --company "<company>" \
     --tagline "<tagline>" \
     --design-source <brand-or-omit> \
     --pages <csv-of-pages> \
     [--has-contact-form --contact-email "<email>"] \
     --signature web-<slug>-<hash>
   ```
   This clones `sites/_template/` to `sites/<slug>/` and writes `site.config.json`. If the user requested pages outside the template's four, the script lists them — create those `app/<page>/page.tsx` routes by hand and add them to `SiteHeader` via the `pages` array.

4. **Design** — Hand control to `design_website.md`. It picks/confirms the `awesome-design-md` brand, copies that `DESIGN.md` into `sites/<slug>/`, translates its tokens into `app/globals.css`, and applies the brand's component/voice rules across every page. Record the brand in `site.config.json.design_source` and the realized axes in `visual_fingerprint`.

5. **Install + preview** — `cd sites/<slug> && npm install` (Node 20+). For a contact-form site, run `python execution/sync_env_local.py --slug <slug>` from the repo root to write `.env.local`. Then `python execution/start_preview_server.py --slug <slug>` and open the URL.

6. **Iterate** — Within `design_website.md`: screenshot every route at desktop + mobile → critique → edit → reload until the user approves. Keep the `signature` token visible.

7. **Add / finalize legal pages** — Follow `add_legal_pages.md`. The template already ships the legal routes, `FooterLinks`, `LegalShell`, the `.legal-prose` styles, and the consent notice; this step fills `content/impressum.md` + `content/datenschutz.md` with the operator's real data, prunes sections for features the site lacks, and verifies. Mandatory for any site that collects personal data (a contact form counts).

8. **Deploy** — On user approval (and after legal pages are done), run `deploy_to_netlify.md`.

## Outputs (Deliverables)

- **Cloud deliverable**: the live Netlify URL returned by the deploy step.
- **Repo artifacts** (committed): `sites/<slug>/` — full multi-page Next.js project including the realized design and the chosen `DESIGN.md`; `site.config.json` with `design_source`, `visual_fingerprint`, and `signature` filled in.
- **Not deliverables**: `.tmp/` screenshots, `.next/` build output, `node_modules/`, `.env.local`.

## Edge Cases

- **Slug collision with existing `sites/<slug>/`**: refuse to overwrite. Ask the user to pick a new slug, suffix it (`-v2`), or delete the existing one first. `scaffold_site.py` already refuses and exits 2.
- **User wants a page the template doesn't ship** (pricing, blog, case studies): scaffold with the standard pages, then author the extra `app/<page>/page.tsx` by hand following the existing page structure, and add it to the `pages` array in `site.config.json` so it appears in the nav. A database-backed blog with an admin UI is now its own workflow — see `blog_publishing.md`.
- **No contact form wanted**: pass neither `--has-contact-form` nor `--contact-email`. The contact page falls back to a `mailto:` link, no Supabase/Gmail env is required, and `sync_env_local.py` writes only the identity vars.
- **Netlify subdomain differs from slug**: Netlify subdomains cannot contain underscores. Use a hyphenated site name; the directory, `SITE_SLUG`, and `campaign_slug` keep the underscores. Intentional divergence — see `deploy_to_netlify.md`.
- **`leads.prospects` lacks a column the form posts** (e.g. `message`): the route filters to `LEAD_COLUMNS`, so unknown columns are dropped server-side and the insert still succeeds. Alert the user if a field they cared about won't be stored; add the column + extend `LEAD_COLUMNS` if needed.
- **Form field names don't match Supabase columns**: confirm the mapping before scaffolding. Form input `name` attributes must match column names in `leads.prospects` (after the `LEAD_COLUMNS` allowlist).

## Error Handling

- `npm install` failures: surface the npm output. Most likely a missing Node version (requires Node 20+).
- Netlify CLI not authenticated: prompt the user to run `netlify login` once, or rely on `NETLIFY_AUTH_TOKEN` in `.env`.
- The design step needs Tailwind v4, Motion, and `marked` installed — `_template/package.json` ships them; keep them if the user customizes the template.
- Don't auto-retry the deploy step on failure — Netlify deploys can be partial and re-running blindly creates orphan deploys.
- Never auto-retry a step that burns paid credits (none here by default) without checking with the user.
