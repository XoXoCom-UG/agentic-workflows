# Auto-Optimize SEO (AutoResearch Harness)

## Goal

Run the AutoResearch keep-or-revert loop to drive the XoXoCom website's SEO-completeness score from wherever it is today toward 100. The harness crawls every public route's rendered HTML plus `/sitemap.xml` and `/robots.txt`, scores each check, records the result, and either recommends keeping the change or reverting it. The entire workflow is free and local — no GPU, no paid API; the "experiment" is `next dev` plus a stdlib HTML audit.

---

## Inputs

- **Running site**: `next dev` must be running inside `sites/xoxocom/` (or pass `--serve` to have the script manage it automatically).
- **Base URL**: the local dev-server address. Default is `http://localhost:3000`. Override with `--base-url` if another port was picked up.
- **Hypothesis**: a one-line plain-English description of the change just made (required for `evaluate`). Example: `"Added sitemap.ts and robots.ts"`.
- **Canonical domain**: `sites/xoxocom/site.config.json` must contain a `site_url` field (e.g. `"https://www.xoxocom.net"`). The scorer uses this to verify canonical links and sitemap entries. Locally the dev server runs on `localhost`, so the scorer rewrites the domain when checking the OG image URL.
- **node_modules**: `sites/xoxocom/node_modules/` must exist. Run `npm install` there if it is missing. Required only when using `--serve`.

---

## Tools / Scripts

| Script | Role |
|---|---|
| `execution/autoresearch/score/score_seo.py` | The **fixed scorer**. Crawls every public route + sitemap + robots on a running Next server. Prints one JSON line: `{"score":0-100, "passed":bool, "subscores":{...}, "routes":{...}}`. Never edited. |
| `execution/autoresearch/optimize.py` | The **loop driver**. Two subcommands: `state` (read direction + history + optional live weak-spots) and `evaluate` (score, record, keep/revert). |
| `execution/autoresearch/program/seo.md` | The **research direction**. Plain-English description of what to optimize, what may be edited, what is off-limits, and a prioritized list of hypotheses to try. Human-owned; never edited by scripts. |
| `execution/autoresearch/results/seo.tsv` | The **append-only experiment log**. Columns: `iter`, `timestamp`, `hypothesis`, `score`, `prev_best`, `decision`, `commit`. Gitignored. |
| `sites/xoxocom/lib/seo.ts` | The `buildMetadata` helper and `organizationJsonLd` factory — the editable site-side artifact. |

**External dependencies**: Python 3 standard library only (`urllib`, `html.parser`). No pip installs required. Node.js / npm required for the site itself.

---

## Process

### Step 1 — Read the research direction and history

Run:

    python execution/autoresearch/optimize.py state --metric seo

This prints the full contents of `execution/autoresearch/program/seo.md` followed by the last ten rows of `results/seo.tsv` and the current best-kept score.

To also get a live breakdown of which checks are failing right now, add `--base-url` while the dev server is running:

    python execution/autoresearch/optimize.py state --metric seo --base-url http://localhost:3000

The output includes the eight weakest per-route checks (ranked by pass rate across routes) and the pass/fail status of each site-level check (sitemap, robots, og:image renders). Use this to decide which hypothesis to try next.

### Step 2 — Make one targeted edit

Edit one of the files listed under "What you may edit" in `execution/autoresearch/program/seo.md`:

- `sites/xoxocom/app/sitemap.ts` or `sites/xoxocom/app/robots.ts`
- `sites/xoxocom/app/layout.tsx` (metadataBase, default OG/Twitter, title template, JSON-LD, Google Search Console verification slot)
- Any `sites/xoxocom/app/**/page.tsx` (per-page `metadata` export)
- `sites/xoxocom/app/opengraph-image.tsx` (branded OG image via next/og)
- `sites/xoxocom/lib/seo.ts` or `sites/xoxocom/lib/config.ts`

Keep canonical and OG URLs config-driven via `SITE_URL` (sourced from `site.config.json` and overridable by the `NEXT_PUBLIC_SITE_URL` environment variable). Never hardcode the domain.

### Step 3 — Score and record the change

**Mode A (default, safe — recommended for agent-assisted runs):**

    python execution/autoresearch/optimize.py evaluate \
      --metric seo \
      --hypothesis "one-line description of change" \
      --base-url http://localhost:3000

The script scores the running server, appends a row to `results/seo.tsv`, and prints one of three recommendations:

- `KEEP — commit this change` (score improved and `passed=true`)
- `REVERT — score did not improve` (score the same or lower, but site still up)
- `REVERT — hard gate failed (passed=false)` (a route returned non-200, or sitemap/robots missing)

In Mode A the agent commits (on KEEP) or reverts (on REVERT) deliberately. No destructive git side effects occur automatically.

To have the script start and stop `next dev` automatically around the score (avoids leaving a stale server running):

    python execution/autoresearch/optimize.py evaluate \
      --metric seo \
      --hypothesis "one-line description of change" \
      --serve

`--serve` auto-detects a free port in the range 3000–3099, starts `next dev` in `sites/xoxocom/`, waits up to 120 seconds for the server to become ready, scores, then tears the server down.

**Mode B (autonomous, unattended — `--auto-git`):**

    python execution/autoresearch/optimize.py evaluate \
      --metric seo \
      --hypothesis "one-line description" \
      --serve \
      --auto-git

In Mode B the script commits on improvement (`git add sites execution directives` + `git commit`) and runs `git reset --hard HEAD` on regression — no agent decision needed. Requires a clean working tree before the first run. Use for overnight or scheduled loops. Pair with the `/loop` or schedule skills.

### Step 4 — Act on the recommendation

**If KEEP (Mode A):** commit the changed files. Example:

    git add sites/xoxocom/app/ sites/xoxocom/lib/
    git commit -m "seo: <hypothesis>"

**If REVERT:** undo the edit. For a small, known set of files:

    git checkout -- sites/xoxocom/app/layout.tsx

For a broader revert when unsure what changed:

    git checkout -- sites/

Then return to Step 1, read the weak-spot output, and choose a different hypothesis.

### Step 5 — Repeat until 100

Repeat Steps 1–4 until `score = 100.0` and `passed = true`. The prioritized hypothesis list in `execution/autoresearch/program/seo.md` gives the highest-leverage changes first.

### Step 6 — Post-score production steps (one-time, manual)

Once the score reaches 100 locally, complete the following before the score is meaningful in production:

1. **Connect the canonical domain.** Set `NEXT_PUBLIC_SITE_URL=https://www.xoxocom.net` as a Netlify environment variable (or update `site.config.json`) and re-deploy. Until the domain is connected and DNS is live, canonical links and OG URLs point at the unconfigured domain and will not be followed by crawlers.
2. **Set up Google Search Console.** Create a property for the canonical domain at `search.google.com/search-console`. Verify ownership using the meta-tag method: set `GOOGLE_SITE_VERIFICATION=<token>` as a Netlify environment variable (the root `app/layout.tsx` reads this env var and injects the verification meta tag).
3. **Submit the sitemap.** In Search Console, submit `https://www.xoxocom.net/sitemap.xml`. This is a one-time free step.

---

## Outputs / Deliverables

- **`execution/autoresearch/results/seo.tsv`** — the append-only experiment log. Each row records the iteration number, timestamp, hypothesis text, score, previous best score, decision (kept/reverted), and git commit SHA. Gitignored; not committed to the repo.
- **Improved site files** — the committed changes to `sites/xoxocom/` that raised the score. These are the actual deliverable: a site with complete, crawlable SEO metadata.
- The scorer's JSON output (`score`, `passed`, `subscores`, `routes`) is printed to stdout each run and can be piped or redirected for logging.

---

## Edge Cases

**`passed=false` even though the site looks fine.** The scorer fails hard if any public route returns non-200, or if `/sitemap.xml` or `/robots.txt` is missing. Check which route failed by inspecting the `routes` key in the JSON output, or run `state --base-url ...` for a human-readable breakdown. A `next dev` lazy-compile delay can cause the first hit on a route to time out — the scorer retries transient connection failures automatically (3 attempts, 2-second pause), but a 120-second `--serve` wait should be used if routes are slow to compile.

**OG image renders check fails despite a present `og:image` meta tag.** The scorer does not just check for the tag — it fetches the image URL and confirms it returns an `image/*` content type. A crashing or empty `app/opengraph-image.tsx` will still emit a meta tag but fail this check. Inspect the `opengraph-image` route directly in the browser to debug.

**Score did not improve despite a correct-looking change.** Run `state --base-url ...` after the change to see the current per-check breakdown. Compare to the previous weakest checks to confirm the intended check is now passing. Title/description uniqueness checks fail when two routes share identical text — even if both are individually valid.

**`--auto-git` staged unintended files.** Mode B stages `sites`, `execution`, and `directives`. If OneDrive sync or another background process touched files in those directories during the score run (which takes 60–120 seconds), those files may be swept into the commit. Prefer Mode A during active development; use Mode B only on a machine where no other process is writing to the repo.

**`next dev` fails to start or times out.** Confirm `node_modules` exists in `sites/xoxocom/`. If another process is already holding port 3000, `--serve` will pick the next free port in the 3000–3099 range automatically. If `next dev` was previously killed uncleanly on Windows, stale `node.exe` processes may be holding the port — kill them via Task Manager or `taskkill`.

**OneDrive path interference.** The site lives inside an OneDrive-managed directory. `next dev` works fine here (metadata renders identically to production). `next build` (used by `deploy_netlify.py`) does NOT — follow the external-copy workaround documented in `directives/deploy_to_netlify.md` before deploying. Running the SEO loop itself only requires `next dev` and is unaffected by this constraint.

**Canonical domain not yet connected.** `site.config.json` contains `site_url = "https://www.xoxocom.net"` but that domain is not yet pointed at the Netlify deployment. The local scorer rewrites canonical host to `localhost` when checking the OG image, so a score of 100 is achievable and accurate locally. It does not mean the production site is fully wired — see Step 6 above.

**OG image content changed but the old version keeps showing up (browsers, CDN, or link-preview scrapers like WhatsApp).** `app/opengraph-image.tsx` is served at a stable URL with a one-year immutable cache header, so any change to its visual content (text, colors, layout) is invisible to anyone who already fetched the old version until that cache expires. `lib/seo.ts` references the image via the `OG_IMAGE` constant, currently `"/opengraph-image?v=2"` — the `?v=` token exists specifically to bust this cache. Whenever `app/opengraph-image.tsx`'s rendered content changes, bump the version number in `OG_IMAGE` in the same change; this gives the image a new URL so browsers, the Netlify CDN, and social scrapers all treat it as new and refetch. The scorer's `og_image_renders` check only confirms the URL returns an `image/*` content type — it cannot detect a stale-but-still-valid cached image, so this step is not caught by scoring and must be done manually. Even after bumping the token, WhatsApp's own per-device link-preview cache can still show the old image for some time — that cache is keyed per shared URL and refreshes independently per client; there is no server-side purge for it. It clears itself over time, or immediately if the shared link carries a new query string, or by forcing a re-scrape via the Facebook Sharing Debugger.

---

## Error Handling

- **Scorer produces no output / exits non-zero.** The optimize driver will print the scorer's stderr and abort. Common causes: `next dev` not running (or not yet ready), wrong `--base-url` port, or a Python import error (unlikely — stdlib only). Start the dev server and retry.
- **`--auto-git` requires a clean working tree.** If the tree is dirty, the script exits immediately with an error before scoring. Commit or stash all pending changes first.
- **Node version / next version mismatch.** If `next dev` fails to start, check for a Node.js version mismatch. The site requires Node 18+ (as specified in `sites/xoxocom/package.json`).
- **Results TSV corruption.** `results/seo.tsv` is append-only and tab-delimited. If it becomes corrupted (e.g. a partial write), delete it and re-run the baseline. The scorer is deterministic, so the baseline score can always be reconstructed.
- **`node_modules` missing when using `--serve`.** The optimize driver checks for `node_modules` before starting `next dev` and exits with a clear error message. Run `npm install` in `sites/xoxocom/` to resolve.
- **Rate limits / API costs.** This workflow uses no external APIs and incurs no costs. All scoring is local (stdlib HTTP to `localhost`).

---

## Future Phases

The same AutoResearch harness can be applied to other metrics. Each new metric requires a new `execution/autoresearch/score/score_<metric>.py` and a new `execution/autoresearch/program/<metric>.md`. The `optimize.py` driver is metric-agnostic (pass `--metric <name>`). Candidates:

- Performance / Lighthouse score
- Accessibility (axe-core audit)
- Copy / conversion rate signals
- Build health (`tsc --noEmit`, `eslint`, bundle size)
