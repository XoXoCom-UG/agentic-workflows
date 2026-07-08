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

2. Confirm hero recordings are up to date. If the site has any hero canvas or video graphic, `assets/exploded-views/<concept-name>.webm` and `.mp4` must already exist before this step. Recording happens in the design step via `execution/record_canvas_animation.py`; see `design_website.md` for the procedure.

3. Run:
   ```
   python execution/deploy_netlify.py --slug <slug>
   ```
   The script reads `site.config.json`, runs `npm install`, sets the env vars (table below), runs `netlify deploy --prod` from inside the site dir, and prints the deploy URL.

4. Verify by opening the URL: click through every page in the nav, confirm the legal pages load, and — on a contact-form site — submit the form with a real email and confirm the row appears in `leads.prospects` (tagged with `campaign_slug`) and both emails arrive. See `capture_contact_submission.md` for the runtime contract.

### Subsequent deploys (same slug)

Skip steps 1 and 2. Re-run `python execution/deploy_netlify.py --slug <slug>`. Env vars are re-set every time so config drift can't accumulate.

### Connecting an externally-hosted custom domain

Use this when the domain is registered elsewhere and its DNS is not managed by Netlify (Netlify's `dns_zone_id` for the domain is null). Do the DNS work first — Netlify cannot verify ownership or issue a certificate for a domain that doesn't yet resolve to it.

1. Confirm `sites/<slug>/site.config.json`'s `site_url` already holds the final domain (e.g. `https://www.xoxocom.net`). This is the single source of truth: `lib/config.ts` reads it into `SITE_URL` (with an optional `NEXT_PUBLIC_SITE_URL` env override), which feeds `metadataBase`, `robots.ts`, `sitemap.ts`, canonical tags, and JSON-LD. If it's already correct, connecting the domain requires no code change.
2. At the registrar, point the domain at Netlify: apex `@` → A record `75.2.60.5` (Netlify's load balancer); `www` → CNAME `<netlify-site-name>.netlify.app`.
3. Wait for propagation and confirm against a public resolver, e.g. `nslookup <domain> 8.8.8.8` — the apex should resolve to `75.2.60.5`.
4. Only once DNS resolves, set the Netlify primary domain (`custom_domain`, e.g. `www.xoxocom.net`) and domain alias (`xoxocom.net`), then provision the TLS certificate. Netlify creates the apex → `www` redirect automatically.
5. Redeploy (`python execution/deploy_netlify.py --slug <slug>`) so `robots.txt`, `sitemap.xml`, the Open Graph image route, and canonical URLs rebuild against the live domain. A build made before the domain was connected will 404 those routes when requested through the new domain.

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
- **OneDrive intermittent build failures (repo lives under a synced OneDrive folder)**: `next build` — and therefore `netlify deploy --prod`, which rebuilds via `@netlify/plugin-nextjs` — fails intermittently because OneDrive dehydrates or locks freshly written `.next/server` and `.next/standalone/node_modules` files between write and read. Symptoms vary randomly by run: `Cannot find module for page: /<route>` (ENOENT) during "Collecting page data"; `<Html> should not be imported outside of pages/_document` while prerendering `/500` or `/_error`; `lstat ... ENOENT` during the plugin's `onBuild` copy of `.next/standalone`; or — the most deceptive variant — Netlify reports the deploy as "ready" with no build error at all, but one route (observed: the homepage) 500s in production while every other route returns 200. This last variant has been traced to stray `node.exe` processes (an orphaned `next dev`, or leftover `netlify deploy`/`next build` children from a killed-but-not-tree-killed retry) still writing to `.next` inside the OneDrive-synced site directory during the build — kill them with `taskkill /F /T /PID <pid>` first (see step 1 in Error Handling below). Merely pausing OneDrive's watchdog process helps the local build but does not reliably fix the deploy's standalone-copy step. The dependable fix is to build and deploy from a copy outside OneDrive — see the Error Handling section below.
- **Setting the Netlify primary domain or SSL cert before DNS resolves**: for an externally-hosted domain (registrar DNS, Netlify `dns_zone_id` null), calling Netlify to set `custom_domain` or provision the TLS certificate before the registrar's DNS records actually point at Netlify fails with `422 Unprocessable Entity` — Netlify can't verify ownership yet. Fix the DNS records at the registrar first (apex → A `75.2.60.5`, `www` → CNAME `<netlify-site-name>.netlify.app`), wait for propagation, then retry. See "Connecting an externally-hosted custom domain" above.

## Error Handling

- `npm install` failures: check `node -v` (Next.js needs Node 20+).
- `next build` failures during deploy: usually a TypeScript error introduced by the design step. Reproduce with `npm run build` locally and fix before retrying.
- Don't auto-retry a failing deploy — each `--prod` deploy consumes a slot and a log entry. Fix the root cause first.
- **OneDrive external-build workaround**: when the repo is inside a synced OneDrive folder and the build fails with the symptoms described in Edge Cases above, use the following procedure:
  1. Kill any lingering `next dev`, `next build`, or `netlify deploy` node process before building. A running dev server that shares `.next` with the build can cause the same `/_error` prerender failure. On Windows, kill with `taskkill /F /T /PID <pid>`, not a plain `Stop-Process` or `kill` on the parent PID alone — `netlify deploy --prod` and `next build` spawn child/grandchild processes (jest-worker pools, etc.) that a parent-only kill leaves orphaned and still writing to `.next` inside OneDrive, which reproduces the exact corruption this workaround exists to avoid. The `/T` flag kills the whole process tree.
  2. Copy `sites/<slug>/` to a path entirely outside OneDrive, e.g. `C:\xoxo-build\<slug>`, excluding `node_modules`, `.next`, and `.netlify` (on Windows: `robocopy sites\<slug> C:\xoxo-build\<slug> /E /XD node_modules .next .netlify`).
  3. In that copy: run `npm install`; run `netlify link --id <siteId>`; export `NETLIFY_AUTH_TOKEN` from the repo `.env`; run `netlify deploy --prod`.
  4. Because Netlify env vars were already set by a previous run of `deploy_netlify.py`, the env:set step does not need to be repeated for this workaround deploy.
  5. After the deploy completes, relaunch OneDrive if you stopped it (`OneDrive.exe /background`).
  Note: this is currently a manual procedure. The `execution/deploy_netlify.py` script does not yet automate the external-build copy; that is a possible future improvement.
  - **Partial automation now exists for build verification**: `execution/autoresearch/serve_prod.py` (built for the speed AutoResearch loop — see `directives/auto_optimize_speed.md`) automates the copy-and-build half of this procedure: `python execution/autoresearch/serve_prod.py up --slug <slug>` mirrors `sites/<slug>/` to `C:\xoxo-build\<slug>-speed` via robocopy `/MIR` (excluding `node_modules`, `.next`, `.netlify`), runs a hash-cached `npm ci`, and runs `next build` + `next start` outside OneDrive — a fast way to confirm a build succeeds before deploying. It does not run `netlify deploy`; the actual deploy still follows the manual steps above (`netlify link`, `NETLIFY_AUTH_TOKEN`, `netlify deploy --prod`) against the standard build directory, not the `-speed` copy.
