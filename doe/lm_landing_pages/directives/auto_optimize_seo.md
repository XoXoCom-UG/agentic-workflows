# Directive: Auto-Optimize SEO (AutoResearch Harness)

## Goal

Run the AutoResearch keep-or-revert loop to drive the MatFIT fake-door site's SEO-completeness score (0–100) toward 100. The harness crawls every public route's rendered HTML plus `/sitemap.xml` and `/robots.txt`, scores each check against a fixed set of rules, records the result, and either recommends keeping the change or reverting it. The workflow is free and local — no GPU, no paid API; the only cost is Claude tokens already in use.

Currently wired for `sites/matfit_fakedoor_12062026/` (canonical domain `https://matfit.ai`, already live on Netlify, site id `f641bb12-70dd-4a9b-93c7-5e065fafc672`). As of the first completed run, the score moved from a baseline of 30.95 to 100.0 over four iterations.

---

## Inputs

- **Slug**: defaults to `matfit_fakedoor_12062026`. Pass `--slug <other>` only if running against a different site in `sites/`.
- **Hypothesis**: a one-line plain-English description of the change just made. Required for the `evaluate` subcommand. Example: `"Added sitemap.ts and robots.ts"`.
- **Canonical domain**: `sites/matfit_fakedoor_12062026/site.config.json` must contain a `site_url` field set to `"https://matfit.ai"`. The scorer uses this to verify canonical links and sitemap entries.
- **node_modules**: `sites/matfit_fakedoor_12062026/node_modules/` must be present. Run `npm install` inside the site directory if it is missing. Required whenever `--serve` is used.
- **Research direction**: `execution/autoresearch/program/seo.md` — the human-owned file that lists what to optimize, which files may be edited, and the prioritized hypothesis list. Read it before making any change.

---

## Tools / Scripts

| Script | Role |
|---|---|
| `execution/autoresearch/optimize.py` | The loop driver. Two subcommands: `state` (prints research direction + history + optional live weak-spots) and `evaluate` (scores the site, appends a results row, prints KEEP or REVERT). |
| `execution/autoresearch/score/score_seo.py` | The **fixed scorer**. Crawls every public route plus sitemap and robots on a running Next server. Emits one JSON line: `{"score":0–100, "passed":bool, "subscores":{...}, "routes":{...}}`. This file is never edited by the agent or by any script. |
| `execution/autoresearch/program/seo.md` | The **research direction**. Plain-English description of the goal, allowed edits, off-limits files, scoring rules summary, and prioritized hypothesis list. Human-owned; never modified by the agent or by scripts. |
| `execution/autoresearch/results/seo.tsv` | The **append-only experiment log**. Columns: `iter`, `timestamp`, `hypothesis`, `score`, `prev_best`, `decision`, `commit`. Each row is one scored iteration. |
| `execution/start_preview_server.py` | Starts `next dev` on a free port for manual inspection. Not used by the loop itself — the loop's `--serve` flag manages its own server lifecycle. |
| `execution/deploy_netlify.py` | Deploys the site to Netlify once the score is satisfactory. See `deploy_to_netlify.md` for the full deploy workflow and the OneDrive build workaround. |

**External dependencies**: Python 3 standard library only (`urllib`, `html.parser`). No pip installs required for the scorer or loop driver. Node.js and npm are required for the site itself.

---

## The 3-File Contract

The AutoResearch harness enforces a strict separation of roles:

1. **Fixed scorer** (`score/score_seo.py`) — measures reality. Never touched.
2. **Editable site artifacts** — everything the agent changes to improve the score. Permitted files are listed in `program/seo.md`:
   - `app/sitemap.ts` and `app/robots.ts`
   - `app/layout.tsx` (metadataBase, default Open Graph / Twitter, title template, JSON-LD Organization, Google Search Console verification slot)
   - Per-page `metadata` exports under `app/**/page.tsx` (home, impressum, datenschutz); `app/thank-you/page.tsx` must carry `robots: { index: false }`
   - `app/opengraph-image.tsx` (branded OG image via next/og)
   - `lib/seo.ts` and `lib/config.ts` (add `SITE_URL`)
   - `site.config.json` (add `"site_url": "https://matfit.ai"`)
3. **Research direction** (`program/seo.md`) — tells the agent what to do. Never touched by the agent or scripts.

Canonical and OG URLs must stay config-driven via `SITE_URL` sourced from `site.config.json` (overridable by `NEXT_PUBLIC_SITE_URL`). Never hardcode the domain.

---

## How the Scorer Works

The scorer (`score_seo.py`) crawls a running `next dev` server — not a production build. This sidesteps the OneDrive `next build` issue; `next dev` works fine inside OneDrive and renders metadata identically to production.

**Public routes scored**: `/` (home), `/impressum`, `/datenschutz`. All must return HTTP 200 or `passed` is set to false and the change is reverted. `/thank-you` is excluded (noindex, post-conversion only). `/api/` routes are not pages and are not checked.

**Score breakdown**:
- 70% from per-route checks averaged across all three routes: unique title (30–60 chars), unique description (120–160 chars), exactly one `<h1>`, canonical link on the configured domain, correct `<html lang="de">`, full Open Graph set (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`), `og:locale:alternate` for bilingual signal, a Twitter card, JSON-LD (Organization / BreadcrumbList / WebSite / ProfessionalService), and alt text on every image.
- 30% from site-level checks: `/sitemap.xml` exists and lists the home route; `/robots.txt` exists and references the sitemap; the `og:image` URL actually returns an image (not just a meta tag — the image route is fetched and confirmed to return an `image/*` content type).

**Hard gates** (`passed=false`): any public route returning non-200, a missing `/sitemap.xml`, or a missing `/robots.txt`. Any hard gate failure forces a revert regardless of the numeric score.

**Bilingual model**: language switches client-side via `localStorage` (`matfit-lang`); one URL per page, German default (`<html lang="de">`). There are no per-language URLs, so `hreflang` pairs are not used. Bilingual availability is signalled via `og:locale` (de_DE) and `og:locale:alternate` (en_US).

**Determinism**: the same server HTML produces a byte-identical score on every run. This is the scorer's implicit unit test.

---

## Process

### Step 1 — Read the research direction and history

Run:

    python execution/autoresearch/optimize.py state --metric seo

This prints the full contents of `execution/autoresearch/program/seo.md` followed by the last ten rows of `results/seo.tsv` and the current best-kept score.

To also get a live breakdown of which checks are currently failing, add `--base-url` while a dev server is already running:

    python execution/autoresearch/optimize.py state --metric seo --base-url http://localhost:3000

The output includes the eight weakest per-route checks (ranked by pass rate across all routes) and the pass/fail status of each site-level check. Use this to decide which hypothesis to try next.

### Step 2 — Make one targeted edit

Edit one of the permitted files listed in `execution/autoresearch/program/seo.md`. Make one change per iteration — this keeps the results log meaningful and makes bad changes easy to isolate and revert.

### Step 3 — Score and record (Mode A — default, safe)

Mode A is the standard agent-assisted flow. The agent scores, reads the recommendation, then commits or reverts deliberately.

Run:

    python execution/autoresearch/optimize.py evaluate \
      --metric seo \
      --hypothesis "one-line description of change" \
      --serve

`--serve` has the script start and stop `next dev` automatically around the score. It picks a free port in the range 3000–3099, starts `next dev` inside `sites/matfit_fakedoor_12062026/`, waits up to 120 seconds for the server to become ready, pre-warms the root route to completion, scores, then tears the server down.

If a dev server is already running, omit `--serve` and pass the port directly:

    python execution/autoresearch/optimize.py evaluate \
      --metric seo \
      --hypothesis "one-line description" \
      --base-url http://localhost:3000

The script appends a row to `results/seo.tsv` and prints one of three recommendations:

- `KEEP — commit this change` (score strictly improved and `passed=true`)
- `REVERT — score did not improve` (score same or lower, site still up)
- `REVERT — hard gate failed (passed=false)` (route non-200, sitemap or robots missing)

### Step 4 — Act on the recommendation (Mode A)

**If KEEP:** commit the changed files. Scope the commit to the files actually edited:

    git add sites/matfit_fakedoor_12062026/app/ sites/matfit_fakedoor_12062026/lib/
    git commit -m "seo: <hypothesis>"

**If REVERT:** undo the edit. For a small, known set of files:

    git checkout -- sites/matfit_fakedoor_12062026/app/layout.tsx

For a broader revert when unsure what changed:

    git checkout -- sites/

Then return to Step 1 and choose a different hypothesis.

### Mode B — Autonomous, unattended (`--auto-git`)

Mode B is for overnight or scheduled runs. The script commits on improvement (`git add sites execution directives` + `git commit`) and runs `git reset --hard HEAD` on regression — no agent decision required. Requires a clean working tree before the first run.

    python execution/autoresearch/optimize.py evaluate \
      --metric seo \
      --hypothesis "one-line description" \
      --serve \
      --auto-git

Use with the `/loop` skill. Note that the SEO score is bounded at 100 — the loop will converge and terminate naturally once 100 is reached and no further hypotheses can improve it.

### Step 5 — Repeat until 100

Repeat Steps 1–4 until `score = 100.0` and `passed = true`. The prioritized hypothesis list in `execution/autoresearch/program/seo.md` gives the highest-leverage changes first. As of the initial run, the sequence that reached 100 in four iterations was: (1) add `sitemap.ts` + `robots.ts` + `site_url` config, (2) add `metadataBase` + default OG/Twitter + title template + JSON-LD Organization + branded opengraph-image + per-page metadata, (3) fix the crashing OG image route so the `og_image_renders` site-level check passes.

### Step 6 — Post-score production steps (one-time, manual)

Once the score reaches 100 locally, complete the following before the score is meaningful in production:

1. **Verify the canonical domain is connected.** `matfit.ai` is already live on Netlify. Confirm `NEXT_PUBLIC_SITE_URL=https://matfit.ai` is set as a Netlify environment variable (or that `site.config.json` has `"site_url": "https://matfit.ai"`). This ensures canonical links and OG URLs resolve correctly for crawlers.
2. **Set up Google Search Console.** Create a property for `matfit.ai` at `search.google.com/search-console`. DNS-TXT verification is recommended. For meta-tag verification: set `GOOGLE_SITE_VERIFICATION=<token>` as a Netlify environment variable — `app/layout.tsx` reads this and injects the verification meta tag automatically.
3. **Submit the sitemap.** In Search Console, submit `https://matfit.ai/sitemap.xml`. One-time, free.
4. **Validate the share card.** Paste `https://matfit.ai` into LinkedIn Post Inspector to confirm the OG image and title render correctly. Validate JSON-LD via Google Rich Results Test.
5. **Deploy.** Because the site lives inside an OneDrive-managed directory, `next build` fails intermittently. Use the external-copy workaround documented in `deploy_to_netlify.md` (robocopy outside OneDrive, excluding `node_modules/`, `.next/`, `.netlify/`; then `npm install`, `netlify link --id f641bb12-70dd-4a9b-93c7-5e065fafc672`, `netlify deploy --prod`). Or run `python execution/deploy_netlify.py --slug matfit_fakedoor_12062026` from a path outside OneDrive.
6. **Set Netlify env vars for production SEO.** Optionally set `NEXT_PUBLIC_SITE_URL=https://matfit.ai` and `GOOGLE_SITE_VERIFICATION=<token>` on the Netlify site dashboard or via the CLI.

---

## Outputs (Deliverables)

- **`execution/autoresearch/results/seo.tsv`** — the append-only experiment log. Each row records iteration number, timestamp, hypothesis, score, previous best score, decision (kept / reverted), and git commit SHA. This file is not committed to the repo.
- **Improved site files** — the committed changes to `sites/matfit_fakedoor_12062026/` that raised the score. These are the real deliverable: a site with complete, crawlable SEO metadata.
- The scorer's JSON output (`score`, `passed`, `subscores`, `routes`) is printed to stdout on each `evaluate` run.

Temporary intermediates (`.next/`, `node_modules/`) are never deliverables.

---

## Edge Cases

**`next dev` not ready within 120 seconds.** The script exits with an error before scoring. Clear any orphan `node.exe` (Windows) or `node` (macOS/Linux) processes from a previous unclean shutdown, then re-run. On Windows, `taskkill /F /IM node.exe` clears all Node processes. Also delete `sites/matfit_fakedoor_12062026/.next/cache/` — OneDrive can corrupt pack files in that directory ("Restoring pack failed: incorrect data check"), which causes `next dev` to hang during compilation.

**`og_image_renders` check fails despite an `og:image` meta tag being present.** The scorer fetches the image URL and confirms it returns an `image/*` content type. A crashing `app/opengraph-image.tsx` still emits a meta tag but the route itself returns 500 — the check catches this. The most common cause in Satori-based OG images: a `<div>` with multiple children without `display:flex` set. Fix: ensure every multi-child node has `display:flex`, or flatten the children to a single interpolated string. Revert the change if the fix is not immediately obvious.

**Score did not improve despite a correct-looking change.** Run `state --base-url ...` after the change to see the current per-check breakdown. Title/description uniqueness checks fail when two routes share identical text — even if each is individually valid. Description length checks require 120–160 characters; too short or too long both fail.

**A change lowers the score or equals the previous best.** The script recommends REVERT. The score gate is strict: only strictly greater than `prev_best` counts as improvement. Revert and try a different hypothesis.

**`passed=false` despite the site appearing functional.** Check which route failed by inspecting the `routes` key in the scorer's JSON output, or run `state --base-url ...` for a human-readable breakdown. `/sitemap.xml` returning 404 (not yet created) and `/robots.txt` missing are the two most common hard-gate failures on a fresh site.

**`--auto-git` staged unintended files.** Mode B stages `sites`, `execution`, and `directives`. If OneDrive sync or another background process wrote to those directories during the 60–120 second score run, those files may be swept into the commit. Prefer Mode A during active development.

**Sitemap `lastModified` changes between runs.** `sitemap.ts` uses `new Date()`, so the timestamp in `/sitemap.xml` changes on every server start. The scorer's sitemap check only reads `<loc>` values — it never reads `<lastmod>` — so this does not affect determinism.

---

## Error Handling

- **Scorer produces no output or exits non-zero.** The loop driver prints the scorer's stderr and aborts. Common causes: `next dev` not running (or not yet ready), wrong `--base-url` port, or the scorer file was accidentally edited and introduced a syntax error. Start or confirm the dev server and retry. The scorer uses only the Python standard library — import errors are not expected.
- **`--auto-git` requires a clean working tree.** The script checks this at startup and exits immediately if any uncommitted changes exist. Commit or stash all pending changes first.
- **Node version mismatch.** If `next dev` fails to start, check that Node.js 20 or higher is installed (`node -v`). The site requires Node 20+.
- **Results TSV corruption.** `results/seo.tsv` is append-only and tab-delimited. If it becomes corrupted (e.g. partial write during a crash), delete it and re-run the baseline. The scorer is deterministic, so the baseline score can always be reconstructed.
- **`node_modules` missing when using `--serve`.** The loop driver checks for `node_modules/` before starting `next dev` and exits with a clear error message. Run `npm install` inside `sites/matfit_fakedoor_12062026/` to resolve.
- **`deploy_netlify.py` fails due to `next build` errors inside OneDrive.** This is the known OneDrive build issue — it is not an SEO harness failure. Follow the external-copy workaround in `deploy_to_netlify.md`. The SEO loop itself (which uses only `next dev`) is unaffected by this constraint.
- **No paid APIs or rate limits apply.** This workflow uses no external APIs beyond Claude tokens already in use for agent reasoning. All scoring is local (stdlib HTTP to localhost).
