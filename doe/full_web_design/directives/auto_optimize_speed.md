# Auto-Optimize Speed (AutoResearch Harness — Experiment #2)

## Goal

Run the AutoResearch keep-or-revert loop to drive the XoXoCom website's page-weight
speed score from its recorded baseline (86.13) toward 100. This is the second
AutoResearch experiment on this site (experiment #1, SEO, went 32.57 → 100 — see
`directives/auto_optimize_seo.md`). Unlike SEO, speed is scored by a **deterministic
byte-budget audit**, not Lighthouse: it fetches every public route from a running
**production** build, downloads every referenced same-origin asset, gzip-compresses
each locally, and grades bytes against fixed budgets. Lighthouse / PageSpeed Insights
scores wobble ±2–5 points between identical runs, which would corrupt the keep/revert
gate by randomly keeping no-ops or reverting real wins — so Lighthouse is used only as
a before/after "bookend" against the live URL (`pagespeed.web.dev`, free), never
inside the loop. The entire loop itself is free and local — no GPU, no paid API.

---

## Inputs

- **Production build + server**: speed MUST be scored against `next build` + `next start`, never `next dev` (dev bundles are unminified and the scorer hard-rejects them). Because `next build` fails intermittently inside this repo's OneDrive-synced folder, the build must run outside OneDrive via `execution/autoresearch/serve_prod.py` — never invoke `next build` directly in `sites/xoxocom/`.
- **Base URL**: the address `serve_prod.py up` prints, e.g. `http://localhost:3100`. Its port range (3100–3199) is deliberately separate from `optimize.py`'s dev-server range (3000–3099) so a speed evaluation can never collide with a running SEO/dev loop.
- **Hypothesis**: a one-line plain-English description of the change just made (required for `evaluate`). Example: `"lazy-load the 3 canvas heroes via next/dynamic"`.
- **`node_modules` / `package-lock.json`**: `sites/xoxocom/package-lock.json` must be committed — `serve_prod.py` refuses to run `npm ci` without it. `node_modules` itself does not need to pre-exist in the repo copy; `serve_prod.py` installs it in the external build copy.
- **SEO must already be at 100**: `score_speed.py` re-runs `score_seo.py` against the same server as a hard gate. If SEO is not currently 100, fix that first via `auto_optimize_seo.md` — the speed loop will otherwise fail every iteration regardless of byte savings.

---

## Tools / Scripts

| Script | Role |
|---|---|
| `execution/autoresearch/serve_prod.py` | Builds and serves a **production** bundle from outside OneDrive. Subcommands: `up --slug xoxocom` (robocopy `/MIR` the site to `C:\xoxo-build\xoxocom-speed`, excluding `node_modules`/`.next`/`.netlify`; hash-cached `npm ci`; `next build`; `next start` on a free port in 3100–3199; prints one JSON line `{"base_url", "port", "pid"}`), `down` (kills the recorded server, or sweeps the reserved port range for orphaned `node.exe` if the state file is lost), `status --slug xoxocom` (reports recorded state + a live probe of `/`). Robocopy exit codes 0–7 count as success. Build output is logged to `<builddir>/build.log`; server output to `<builddir>/serve.log`. |
| `execution/autoresearch/score/score_speed.py` | The **fixed scorer**. Crawls the same 10 public routes as `score_seo.py` against a running prod server, downloads every referenced asset, gzip-compresses locally (zlib level 9), and grades against frozen KB budgets. Prints one JSON line: `{"score":0-100, "passed":bool, "subscores":{...}, "routes":{...}}`. Never edited — recalibrating mid-run corrupts `prev_best` comparability in the results log. |
| `execution/autoresearch/optimize.py` | The same metric-agnostic loop driver used for SEO. `state --metric speed` and `evaluate --metric speed` work identically, except `--serve` (which starts `next dev`) must NOT be used for speed — always score against the `serve_prod.py` base URL instead. |
| `execution/autoresearch/program/speed.md` | The **research direction** for speed: goal, frozen baseline, what may/may not be edited, scoring-rule summary, known constraints, and a prioritized hypothesis list. Human-owned; never edited by scripts. |
| `execution/autoresearch/results/speed.tsv` | The **append-only experiment log** for this metric. Same columns as `seo.tsv`. Gitignored. Row 1 is the frozen baseline: score 86.13, recorded 2026-07-07. |
| `execution/autoresearch/score/score_seo.py` | Invoked internally by `score_speed.py` as the SEO hard gate — not run directly by this directive, but its pass/fail result can revert a speed change. |

**External dependencies**: Python 3 standard library only for the scorers and driver. Node.js / npm for the site build itself. On Windows, `robocopy`, `tasklist`, `taskkill`, and `netstat` (all built into Windows) for `serve_prod.py`.

---

## Process

### Step 1 — Read the research direction and history

    python execution/autoresearch/optimize.py state --metric speed

This prints `execution/autoresearch/program/speed.md` in full, followed by the last ten rows of `results/speed.tsv` and the current best-kept score. Add `--base-url` (pointed at a running prod server from Step 2 below) to also get the eight weakest per-route checks and the site-level check breakdown — the same weak-spot mechanism used for SEO.

### Step 2 — Start the production build

    python execution/autoresearch/serve_prod.py up --slug xoxocom

This mirrors `sites/xoxocom/` into `C:\xoxo-build\xoxocom-speed`, runs `npm ci` (skipped if `package-lock.json` is unchanged since the last run), runs `next build`, and starts `next start` on a free port in 3100–3199. It prints one JSON line, e.g. `{"base_url": "http://localhost:3100", "port": 3100, "pid": 12345}`. First run takes several minutes (full install + build); subsequent runs are ~40–90 seconds (incremental robocopy + rebuild).

### Step 3 — Make one targeted edit

Edit one of the files listed under "What you may edit" in `execution/autoresearch/program/speed.md`:

- Anything under `sites/xoxocom/` — components, `app/**`, `lib/**`, `next.config.mjs`, `package.json` (dependencies must stay pinned via `package-lock.json`)
- Typical levers, highest-leverage first: `next/dynamic` around the 3 canvas hero components (`HeroGraph`, `HeroGraphHubs`, `HeroGraphCluster`); converting `components/content/*Content.tsx` + `lib/i18n.tsx` from client to server components (moves bilingual copy off the client JS bundle — the biggest lever, but must preserve the `xoxocom-lang` cookie contract and the client-side `LangToggle`); checking for accidental client-bundle leakage of server-only dependencies (`marked`, `@supabase/supabase-js`); `next.config.mjs` tuning (`optimizePackageImports`, etc.)

Never edit `score_speed.py`'s budgets or `program/speed.md` mid-run. Never delete or thin out visible copy to save bytes — the `ssr_content` check and the SEO gate both guard against that.

### Step 4 — Rebuild, score, and record

Rebuild after the edit (repeat Step 2 — `serve_prod.py up` is idempotent and incremental), then:

    python execution/autoresearch/optimize.py evaluate \
      --metric speed \
      --hypothesis "one-line description of change" \
      --base-url http://localhost:3100

Do **not** pass `--serve` for speed — that flag starts `next dev`, which the scorer hard-rejects. Always score against the `serve_prod.py` base URL from Step 2.

The script scores the running prod server, appends a row to `results/speed.tsv`, and prints one of three recommendations, exactly as in the SEO loop:

- `KEEP — commit this change` (score improved and `passed=true`)
- `REVERT — score did not improve` (score the same or lower, but no hard gate failed)
- `REVERT — hard gate failed (passed=false)` — any route non-200, any referenced same-origin asset 404, a dev server detected, or the SEO gate failed (`score_seo.py` returned less than 100 against the same server)

Mode B (`--auto-git`) is also available, identical in behavior to the SEO loop — commits on improvement, `git reset --hard HEAD` on regression, requires a clean working tree to start.

### Step 5 — Act on the recommendation

**If KEEP:** commit the changed files.

**If REVERT:** `git checkout -- sites/xoxocom` (or the specific changed files), then return to Step 1.

Each iteration after the first costs roughly 1–2 minutes: ~40–90 seconds for the incremental `serve_prod.py` rebuild plus a few seconds for the scorer.

### Step 6 — Repeat until the score plateaus

Repeat Steps 2–5, working through the prioritized hypothesis list in `program/speed.md`. Unlike the SEO loop, 100.0 is not necessarily the practical ceiling — stop when the score plateaus and remaining changes would require trading away content or UX. When finished for the session:

    python execution/autoresearch/serve_prod.py down --slug xoxocom

This stops the recorded server (or, if the state file was lost, sweeps ports 3100–3199 for orphaned `node.exe` processes).

### Step 7 — Bookend with Lighthouse / PageSpeed Insights (outside the loop)

Before the first iteration and again after the final deploy, run PageSpeed Insights (`https://pagespeed.web.dev`, free) against the **live** URL and record mobile Performance + LCP/TBT/CLS in `program/speed.md`'s "Bookends" section. This validates that the byte savings produced real Lighthouse gains — it is never used as the loop's keep/revert signal.

### Step 8 — Deploy

Once the score plateaus, deploy the committed changes via the existing `directives/deploy_to_netlify.md` workflow.

---

## Outputs / Deliverables

- **`execution/autoresearch/results/speed.tsv`** — the append-only experiment log (iteration, timestamp, hypothesis, score, previous best, decision, commit SHA). Gitignored; row 1 is the frozen baseline (86.13, 2026-07-07).
- **Improved site files** — the committed changes to `sites/xoxocom/` that raised the score. This is the actual deliverable: a lighter site that loads faster for real visitors.
- **Live deployment** via `deploy_to_netlify.md` once the score plateaus.
- **Before/after PageSpeed Insights bookends** recorded in `program/speed.md`, confirming real-world Lighthouse impact.
- The scorer's JSON output (`score`, `passed`, `subscores`, `routes`) is printed to stdout each run and can be piped or redirected for logging.

---

## Edge Cases

**OneDrive build failures.** `next build` fails intermittently inside this repo's OneDrive-synced folder. Always build through `serve_prod.py`, which mirrors the site to `C:\xoxo-build\xoxocom-speed` and builds there — never run `next build` directly against `sites/xoxocom/`.

**Port conflicts.** `serve_prod.py` reserves 3100–3199, separate from `optimize.py`'s dev range (3000–3099), so a speed evaluation and a concurrent SEO/dev loop never collide. If `up` cannot find a free port, another process is holding the entire range.

**Stale or lost state file.** If `.serve_state.json` in the build copy is missing or corrupted, `down` falls back to sweeping ports 3100–3199 for any `node.exe` process still listening there and kills it — but only after confirming the image name is actually `node`, so nothing unrelated is harmed. `kill_tree` performs the same recycled-PID safety check before killing a recorded PID.

**Lighthouse / PSI variance — why it's excluded from the loop.** Lighthouse timing scores can swing ±2–5 points between identical runs on the same machine. Using it as the keep/revert signal would randomly keep no-op changes or revert real wins. The byte-budget scorer is deterministic (same build → same score, every time); PSI is used only as a before/after bookend against the live URL.

**Byte-scorer blindness to runtime behavior.** The scorer measures bytes, not behavior. After any i18n/hydration refactor (e.g. converting content components to server components), manually verify the language toggle, the contact form, and the hero canvas animations in a browser — a broken toggle or non-functional form would NOT fail any byte check.

**Keyless PageSpeed Insights API quota.** If scripting the bookend via the free PSI API rather than the browser UI, the keyless quota can be exhausted. Retry the next day, or use `pagespeed.web.dev` directly in a browser, which has no quota.

**SEO regression from a speed change.** `score_speed.py` re-runs `score_seo.py` against the same server as a hard gate and fails (`passed=false`) unless SEO is still exactly 100. This was verified by deliberately deleting `robots.ts`, which correctly produced `passed=false`. Experiment #2 must never silently undo experiment #1's win — if this gate fails, the SEO regression must be fixed (or the speed change reverted) before continuing.

**Manrope font-weight reduction is a byte no-op.** Manrope is a variable font; `next/font` serves identical unicode-range slices regardless of the declared `weight` list, and this de/en site's browsers only ever fetch the latin slice (~24 KB). Reducing weights 5→3 was probed during calibration and produced no byte change — do not retry it. The scorer counts "critical" fonts as preloaded fonts plus `next/font`'s priority-subset (`.p.`) files, not every slice referenced in CSS. The real levers are all JavaScript: the site's 17 `"use client"` files, bilingual copy currently shipping as client JS, and the 3 canvas hero components.

**Budgets are frozen.** The byte budgets in `score_speed.py` were calibrated against the real baseline build on 2026-07-07 and then frozen. Never adjust them mid-run — doing so corrupts `prev_best` comparability in `results/speed.tsv`, and any future recalibration should start a fresh results file with a note in `program/speed.md`.

---

## Error Handling

- **Scorer produces no output / exits non-zero.** The optimize driver prints the scorer's stderr and aborts. Common causes: the prod server from `serve_prod.py up` isn't actually running, the wrong `--base-url` port was used, or the SEO gate subprocess itself failed. Confirm with `serve_prod.py status --slug xoxocom` and retry.
- **`robocopy` failure.** `serve_prod.py` treats robocopy exit codes 0–7 as success (these are informational, not failure, codes for robocopy); exit codes ≥8 raise immediately with the robocopy output. Check disk space and permissions on `C:\xoxo-build\` if this happens.
- **`npm ci` failure.** `serve_prod.py` requires a committed `package-lock.json` in the site and exits with a clear message if it's missing. `npm ci` output is captured; the last 3000 characters of stderr are shown on failure.
- **`next build` failure.** The full build log is written to `<builddir>/build.log`; the last 30 lines of combined stdout/stderr are shown in the error message. This is the scenario `serve_prod.py` exists to make reliable — if it still fails outside OneDrive, the error is a real code problem, not the OneDrive file-locking issue.
- **`next start` fails to become ready.** `serve_prod.py` waits up to 120 seconds for the server to answer, then confirms `/` returns exactly 200 (production serves eagerly, unlike dev's lazy compile, so one check suffices). On failure the server process is killed and `serve.log` is referenced in the error.
- **`--auto-git` requires a clean working tree.** Same rule as the SEO loop — commit or stash all pending changes before using Mode B.
- **Rate limits / API costs.** The loop itself uses no external APIs and incurs no cost — all scoring is local. Only the optional PSI bookend (Step 7) touches an external service, and only outside the loop.

---

## Future Phases

The same AutoResearch harness applies to further metrics beyond SEO (experiment #1) and speed (experiment #2). Each new metric needs a new `execution/autoresearch/score/score_<metric>.py` and `execution/autoresearch/program/<metric>.md`; `optimize.py` is already metric-agnostic (`--metric <name>`). `serve_prod.py` is reusable as-is for any future metric that also needs a production build (e.g. bundle-analyzer-driven checks). Candidates:

- Accessibility (axe-core audit)
- Copy / conversion rate signals
- Build health (`tsc --noEmit`, `eslint`, bundle size)
- Automating the OneDrive external-build copy for `deploy_netlify.py` itself, reusing `serve_prod.py`'s sync/build logic for actual deploys, not just scoring
