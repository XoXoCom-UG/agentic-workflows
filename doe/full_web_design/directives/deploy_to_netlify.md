# Directive: Deploy to Netlify

## Goal

Push a finalized `sites/<slug>/` multi-page site to a per-site Netlify site, with all env
vars in place, and return the live URL to the user.

## Inputs

- **Slug** of the site to deploy (`sites/<slug>/` exists and is user-approved)
- **`sites/<slug>/site.config.json`** filled with final values (source of truth for Netlify env vars)
- **`.env`** at repo root with `NETLIFY_AUTH_TOKEN`. Which other vars are required depends on the site's feature flags in `site.config.json`:
  - `has_contact_form: true` → also `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LEAD_COLUMNS`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
  - `has_blog: true` → also `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Both features share one Supabase project, so `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` are required (and pushed) once if **either** flag is true — `deploy_netlify.py` and `sync_env_local.py` build the required-var list this way, not per-feature independently.

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
| `SUPABASE_URL` | repo `.env` | service-role client: `/api/submit` insert into `leads.prospects`, public blog reads (`lib/blog.ts`), and `/api/admin/upload` writes to the `blog-media` bucket — pushed when `has_contact_form` **or** `has_blog` is true |
| `SUPABASE_SERVICE_KEY` | repo `.env` | same service-role client as above — pushed when `has_contact_form` **or** `has_blog` is true. **Never** give this the `NEXT_PUBLIC_` prefix |
| `NEXT_PUBLIC_SUPABASE_URL` | repo `.env` | the `/admin` auth session (`@supabase/ssr`, anon key + session cookies) — blog sites only. Public by design: the value ships to every browser, and RLS (not secrecy) is what protects the data. `NEXT_PUBLIC_` vars are inlined at **build time**, so this must be set on Netlify before the build runs, not just before the page is requested |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | repo `.env` | same as above — blog sites only, same build-time-inlining caveat |
| `LEAD_COLUMNS` | repo `.env` | `/api/submit` allowlist filter — contact-form sites only |
| `GMAIL_USER` | repo `.env` | `/api/submit` SMTP auth + From — contact-form sites only |
| `GMAIL_APP_PASSWORD` | repo `.env` | `/api/submit` SMTP auth — contact-form sites only |

A brochure site with `has_contact_form: false` **and** `has_blog: false` (or absent — `has_blog` defaults to false when not present, so pre-blog `site.config.json` files behave exactly as before) pushes only `SITE_SLUG` + `COMPANY_NAME`. Any site with either flag true also gets the shared `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` pair pushed. None of these are committed — they live in the repo `.env` (dev) and Netlify env settings (prod) only.

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
- **OneDrive intermittent build failures (repo lives under a synced OneDrive folder)**: `next build` — and therefore `netlify deploy --prod`, which rebuilds via `@netlify/plugin-nextjs` — fails intermittently because OneDrive dehydrates or locks freshly written `.next/server` and `.next/standalone/node_modules` files between write and read. Symptoms vary randomly by run: `Cannot find module for page: /<route>` (ENOENT) during "Collecting page data"; `<Html> should not be imported outside of pages/_document` while prerendering `/500` or `/_error`; `lstat ... ENOENT` during the plugin's `onBuild` copy of `.next/standalone`; `Error: Failed publishing static content` thrown by the plugin's `onPostBuild` step even though `next build` itself completed with no error (observed 2026-09-20 — the identical build had succeeded outside OneDrive minutes earlier, confirming it is this same OneDrive write/read race and not a code fault); or — the most deceptive variant — Netlify reports the deploy as "ready" with no build error at all, but one route (observed: the homepage) 500s in production while every other route returns 200. This last variant has been traced to stray `node.exe` processes (an orphaned `next dev`, or leftover `netlify deploy`/`next build` children from a killed-but-not-tree-killed retry) still writing to `.next` inside the OneDrive-synced site directory during the build — kill them with `taskkill /F /T /PID <pid>` first (see step 1 in Error Handling below). Merely pausing OneDrive's watchdog process helps the local build but does not reliably fix the deploy's standalone-copy step. The dependable fix is to build and deploy from a copy outside OneDrive — see the Error Handling section below.
- **Setting the Netlify primary domain or SSL cert before DNS resolves**: for an externally-hosted domain (registrar DNS, Netlify `dns_zone_id` null), calling Netlify to set `custom_domain` or provision the TLS certificate before the registrar's DNS records actually point at Netlify fails with `422 Unprocessable Entity` — Netlify can't verify ownership yet. Fix the DNS records at the registrar first (apex → A `75.2.60.5`, `www` → CNAME `<netlify-site-name>.netlify.app`), wait for propagation, then retry. See "Connecting an externally-hosted custom domain" above.
- **A site with `has_blog: true` publishes but new posts take minutes to appear instead of seconds**: cache-tag invalidation for the blog (`revalidateTag`, called by every admin Server Action) is only honored by `@netlify/plugin-nextjs` **v5**, which backs the Data Cache with Netlify Blobs — v4 silently no-ops the call and the 300-second revalidate floor becomes the real freshness bound. Nothing is broken either way, but check the Netlify build log for the plugin version if a publish seems slow; the plugin is installed through the Netlify UI, not `package.json`, so its version is never visible in this repo. See `directives/blog_publishing.md` for the full cache-invalidation contract.
- **Malformed `site.config.json`** (e.g. a trailing comma from hand-editing): both `sync_env_local.py` and `deploy_netlify.py` catch the JSON parse error and print the file path and the parser's message instead of a raw Python traceback. Fix the JSON and re-run.
- **`contact_email` looks like a typo** (missing `@`, or empty while `has_contact_form` is true): both scripts refuse to run and print which file to fix. This check is intentionally identical in both scripts — `deploy_netlify.py` used to only check for a non-empty string, which meant a typo'd address could reach production even though `sync_env_local.py` would have refused it locally; both now require an `@` in the value.
- **`deploy_netlify.py` fails on its very first `netlify env:set` call with `Error: Missing required path variable 'account_id'`**: this happens before `SITE_SLUG` (the first var pushed) even sets. The message is misleading — it reads like a missing `--account-slug`/site-link problem, but it is what the Netlify CLI (v26.0.2, observed) emits when it has **no valid authentication at all**: the account can't be resolved, so it can't fill in the API path template for the env endpoint. Diagnose with `netlify status`, which states the real cause plainly (`Your session has expired. Please try to re-authenticate by running 'netlify logout' and 'netlify login'.`). Then confirm which credential is actually dead — the CLI's stored session and the `NETLIFY_AUTH_TOKEN` PAT in `.env` are independent and can fail separately (or together): test the token directly against the API, bypassing the CLI entirely, with `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" https://api.netlify.com/api/v1/user`. HTTP 200 means the token is fine and only the CLI's local session is stale; HTTP 401 means the PAT itself is revoked or expired and re-linking the CLI will not help. Netlify PATs (the `nfp_`-prefixed kind) can carry an expiry date, so a token that deployed successfully before can start returning 401 with zero changes to the repo or the deploy script — this is not a regression to chase in `deploy_netlify.py`. The fix needs the repo owner and can't be done by an unattended agent: either mint a fresh PAT at `https://app.netlify.com/user/applications#personal-access-tokens` and update `NETLIFY_AUTH_TOKEN` in the repo `.env`, or run `netlify logout` then `netlify login` in an interactive terminal (never run `netlify login` from a non-interactive/agent session — it blocks waiting on a browser handshake). Blast radius is nil: the failure happens before any `env:set` succeeds and long before `netlify deploy --prod` runs, so the live site is untouched — simply re-run `python execution/deploy_netlify.py --slug <slug>` once the credential is refreshed.

## Error Handling

- `npm install` failures: check `node -v` (Next.js needs Node 20+).
- `next build` failures during deploy: usually a TypeScript error introduced by the design step. Reproduce with `npm run build` locally and fix before retrying.
- Don't auto-retry a failing deploy — each `--prod` deploy consumes a slot and a log entry. Fix the root cause first.
- `Missing required path variable 'account_id'` on the first `env:set` call: this is an auth failure, not a config or account-slug problem — see the matching Edge Case above for diagnosis (`netlify status`, then a direct `curl` check of `NETLIFY_AUTH_TOKEN`) and the fix (fresh PAT or interactive `netlify logout`/`netlify login`, both of which require the repo owner). Do not retry automatically and do not edit `deploy_netlify.py` in response — the script is not the cause.
- **OneDrive external-build workaround**: when the repo is inside a synced OneDrive folder and the build fails with the symptoms described in Edge Cases above, use the following procedure:
  1. Kill any lingering `next dev`, `next build`, or `netlify deploy` node process before building. A running dev server that shares `.next` with the build can cause the same `/_error` prerender failure. On Windows, kill with `taskkill /F /T /PID <pid>`, not a plain `Stop-Process` or `kill` on the parent PID alone — `netlify deploy --prod` and `next build` spawn child/grandchild processes (jest-worker pools, etc.) that a parent-only kill leaves orphaned and still writing to `.next` inside OneDrive, which reproduces the exact corruption this workaround exists to avoid. The `/T` flag kills the whole process tree.
  2. Copy `sites/<slug>/` to a path entirely outside OneDrive, e.g. `C:\xoxo-build\<slug>`, excluding `node_modules`, `.next`, and `.netlify` (on Windows: `robocopy sites\<slug> C:\xoxo-build\<slug> /MIR /XD node_modules .next .netlify`). `/MIR` (mirror) is preferred over a plain `/E` copy when the destination folder is reused across deploys (it also removes files from the destination that were deleted from the source, so the external copy can't drift stale).
     - **Run this from PowerShell or `cmd.exe`, not from the Git Bash tool.** Git Bash's MSYS layer auto-converts flags that look like Unix paths — `/MIR` becomes `C:/Program Files/Git/MIR` — which makes robocopy exit with usage-error code 16 instead of copying anything. If robocopy must be invoked from a script, disable MSYS path conversion (`MSYS_NO_PATHCONV=1`) or just shell out to PowerShell.
     - **Don't add OneDrive conflict-copy names to `/XD`.** OneDrive sometimes creates a sync-conflict folder like `.next (1)` (space + parens) inside the site directory. Excluding plain `.next` (as shown above) is sufficient — trying to list `.next (1)` explicitly in `/XD` is unnecessary and the space breaks simple quoting. If a stray `.next (1)` folder exists, it's harmless to leave excluded from the mirror; it does not get built or deployed.
     - Robocopy's own success exit codes are **0–7**, not just 0 (3 is common: files copied + extra destination files removed under `/MIR`). Treat any exit code ≥8 as a real failure; anything 0–7 is fine.
  3. In that copy: run `npm install`; run `netlify link --id <siteId>`; export `NETLIFY_AUTH_TOKEN` from the repo `.env`; run `netlify deploy --prod`.
  4. Because Netlify env vars were already set by a previous run of `deploy_netlify.py`, the env:set step does not need to be repeated for this workaround deploy.
  5. After the deploy completes, relaunch OneDrive if you stopped it (`OneDrive.exe /background`). The external build copy (e.g. `C:\xoxo-build\<slug>`) can be left in place between deploys to speed up the next one — it's outside OneDrive and disposable.
  Note: this is currently a manual procedure. The `execution/deploy_netlify.py` script does not yet automate the external-build copy; that is a possible future improvement.
  - **Partial automation now exists for build verification**: `execution/autoresearch/serve_prod.py` (built for the speed AutoResearch loop — see `directives/auto_optimize_speed.md`) automates the copy-and-build half of this procedure: `python execution/autoresearch/serve_prod.py up --slug <slug>` mirrors `sites/<slug>/` to `C:\xoxo-build\<slug>-speed` via robocopy `/MIR` (excluding `node_modules`, `.next`, `.netlify`), runs a hash-cached `npm ci`, and runs `next build` + `next start` outside OneDrive — a fast way to confirm a build succeeds before deploying. It does not run `netlify deploy`; the actual deploy still follows the manual steps above (`netlify link`, `NETLIFY_AUTH_TOKEN`, `netlify deploy --prod`) against the standard build directory, not the `-speed` copy.
