# DOE Repo — Session Progress Tracker

## Purpose

This file is the running progress log for the `full_web_design` DOE repo. It records what has been worked on, what is finished, and what is left unfinished or needs follow-up across working sessions. Albert can read it at any time to see exactly where things stand — what is done, what is in progress, and what still needs a decision or action.

## How This File Is Maintained

The documenter sub-agent owns this file and updates it in three situations:

- (a) A step of a process is completed but further action is still required.
- (b) Work is left unfinished at the end of a session or between sessions.
- (c) At the end of each working session, to record a clean summary of what happened.

Every entry in the Progress Log must carry a timestamp in the format `YYYY-MM-DD HH:MM`. Entries are added at the top of the log (reverse-chronological). The Open / Unfinished Items checklist is updated whenever an item is resolved or a new one surfaces.

---

## Current Status

Production domain `www.xoxocom.net` is live and fully connected to the Netlify site `xoxocom-ug` (site id 5ec12ba7-2b39-4c85-8aa4-d3c8db971b2a). TLS cert covers both apex and www (expires 2026-09-27). https://www.xoxocom.net returns 200; https://xoxocom.net redirects 301 to www. SEO infrastructure is deployed and verified: /robots.txt, /sitemap.xml, /opengraph-image all return 200; homepage canonical, OG tags, and JSON-LD Organization are present in production HTML. `site.config.json` `site_url` is the single source of truth for all canonical/OG/JSON-LD URLs. Google Search Console verification is now server-side complete: `GOOGLE_SITE_VERIFICATION` is set as a production Netlify env var and the `google-site-verification` meta tag is confirmed live in the homepage `<head>`. The visible site `signature` (`web-xoxocom-fb6b4c`) has been removed from the footer and from the head meta tag; the change is committed on branch `doe` (commit `61c5aea`) but NOT yet deployed to Netlify — deploy is pending user go-ahead. The homepage "About us" copy has been reworded in both languages (`lib/copy.ts`) and verified locally; this change is uncommitted and also pending the same deploy go-ahead. AutoResearch Experiment #2 (Speed) is now underway: a deterministic byte-budget harness (`serve_prod.py` + `score/score_speed.py`) was built and verified, and the first optimization run raised the score from a frozen baseline of 86.13 to 87.43 via a full server-side i18n refactor (bilingual copy no longer ships in client JS). All five iterations are committed on branch `doe`. The optimized site is NOT yet deployed — a live PSI/Lighthouse "before" bookend must be captured first (see Open Items), since deploying now would destroy that baseline measurement.

Outstanding items: XoXoCom signature-removal commit `61c5aea` AND the reworded home "About us" copy both need a commit + deploy decision from the user; the AutoResearch speed experiment needs a PSI/Lighthouse baseline bookend captured against the live site before deploying the optimized build; GSC verification and Bing Webmaster Tools setup are now CONFIRMED DONE (verified via the Bing GSC-import succeeding); the only remaining GSC-side action is optional "Request Indexing" for the homepage + priority pages; the `deploy_to_netlify.md` DNS-ordering reconciliation is RESOLVED (directive updated); MAtfIT `LegalShell.tsx` campaign signature still visible in legal-pages footer; bilingual hreflang is a future phase needing user sign-off; `execution/deploy_netlify.py` does not yet automate the OneDrive external-build workaround; `hero-centrality-hubs.*` may need re-recording at 1900×790; three legal follow-ups in `add_legal_pages.md`; `sites/xoxocom/content/agb.md` placeholder DRAFT pending legal sign-off; testing Gmail credentials must be swapped for owner credentials before production use; Stop hook activation requires user to open `/hooks` panel or restart Claude Code once.

---

## Progress Log

### 2026-07-07 18:15

**AutoResearch Experiment #2 (Speed) — byte-budget harness built and verified; first optimization run complete, score 86.13 → 87.43. Live PSI/Lighthouse bookend and deploy still pending. 🟡**

New files under `execution/autoresearch/`:

- `serve_prod.py` — builds and serves the XoXoCom **production** bundle from outside OneDrive (mirrors the site to `C:\xoxo-build\xoxocom-speed`, hash-cached `npm ci`, `next build`, `next start` on a free port in 3100–3199; `up`/`down`/`status` subcommands). This automates the manual robocopy/external-build workaround already documented in `deploy_to_netlify.md`'s Error Handling section — for scoring purposes only; `deploy_netlify.py` itself is unchanged. Reviewer sub-agent findings applied: orphan-port sweep on `down` when the state file is lost, a PID-identity check before `taskkill` (guards against a recycled PID), a protocol-relative-URL fix, and UTF-8 decoding of subprocess output.
- `score/score_speed.py` — the deterministic byte-budget scorer. Crawls the same 10 public routes as `score_seo.py` against a running prod server, gzip-compresses every referenced same-origin asset locally, and grades against frozen KB budgets (per-route JS 110/260, CSS 12/40, HTML 25/90; shared JS 95/220; critical font 45/130; script count 10/25). Re-runs `score_seo.py` as a hard gate so a speed change can never silently regress the SEO-100 score from experiment #1. Verified byte-identical across repeat runs, hard-rejects a `next dev` server, and the SEO gate was negative-tested by deleting `robots.ts` (correctly returned `passed=false`).
- `program/speed.md` — the human-owned research direction and prioritized hypothesis list for this metric.

New directive `directives/auto_optimize_speed.md` (commit `c4fa2ea`) documents the full Mode A/B loop, the `serve_prod.py` port range (3100–3199, kept separate from `optimize.py`'s 3000–3099 dev range so a speed run never collides with a SEO/dev loop), and why Lighthouse/PSI is used only as a before/after bookend rather than the loop's keep/revert signal (Lighthouse's ±2–5 point run-to-run variance would corrupt the gate; the byte-budget scorer is deterministic).

**Five iterations logged in `results/speed.tsv`, all committed on branch `doe`:**

| Iter | Score | Decision | Commit | Hypothesis |
|---|---|---|---|---|
| 1 | 86.13 | kept (baseline) | `718b515` | Frozen baseline, prod build via `serve_prod.py` |
| 2 | 86.17 | kept | `c43bf87` | Lazy-load the 3 canvas heroes via `next/dynamic` (`ssr:false`) |
| 3 | 86.54 | kept | `c4fa2ea` | Server-side i18n for `/ueber-uns` only (`getCopy` cookie helper; provider `router.refresh()` on toggle) |
| 4 | 86.52 | **reverted** | `511e4b0` | Server-side i18n for `/produkte` alone — proved per-page conversion can't cross the shared-bundle valley |
| 5 | 87.43 | kept | `511e4b0` | Full server-side i18n: `COPY` leaves the client bundle entirely |

The winning refactor (iteration 5) moves the bilingual `COPY` tree off the client JS bundle for good: content components now read language server-side via a new `lib/server-copy.ts` `getCopy()` helper; `SiteHeader`, `LangToggle`, and `ContactForm` receive translated strings as props instead of calling `useLang()` directly; `LanguageProvider` was slimmed down to language state plus `router.refresh()` on toggle; a new `components/LazyHero.tsx` wraps the lazy-mounted hero canvases from iteration 2. Per-route first-load JS dropped from 149–158 KB gz to 145–146 KB gz. Verified manually in the browser: DE↔EN toggle works across header, nav, contact form, and footer; lazy heroes render; form labels localize correctly.

**Calibration finding** (recorded in `program/speed.md`): the Manrope variable font makes weight-list reduction a byte no-op — `next/font` serves the same unicode-range slice regardless of the declared `weight` list, and the scorer only counts preloaded/`.p.` "critical" fonts, not every slice referenced in CSS. Do not retry that lever.

**Hygiene commit `943a165`:** removed the unused `motion` dependency from `package.json`. Score unchanged at 87.43 — it was already tree-shaken out of the bundle, so the removal is byte-invisible but reduces `node_modules` surface.

**Not yet deployed.** The optimized site (87.43) is committed but sits behind an ordering constraint: a live PSI/Lighthouse "before" bookend against https://www.xoxocom.net has not been captured yet (the keyless PageSpeed Insights API quota was exhausted this session, and local Lighthouse could not drive Chrome). Deploying now would overwrite the "before" state the bookend needs to measure against — so the bookend must be captured first, then the deploy, then an "after" bookend.

**Open items added** (see Open/Unfinished Items below): capture the PSI/Lighthouse baseline bookend before deploying; deploy via `deploy_to_netlify.md` and capture the after-bookend; decide whether to commit the currently-untracked `execution/autoresearch/EXPLAINER.md` and extend it with a plain-language speed section once before/after numbers exist; optional runtime-only hygiene (pause hero canvas `requestAnimationFrame` via `IntersectionObserver` when scrolled offscreen — byte-invisible, not scored). Note for future sessions: the byte score has likely plateaued near 87.4 — the remaining ~145 KB gz first-load JS is dominated by the React 19/Next 15 framework baseline, and no further server-only dependency leakage was found.

**Git state:** all code and results changes from this session are committed on branch `doe` (`718b515`, `c43bf87`, `c4fa2ea`, `511e4b0`, `943a165`). `execution/autoresearch/EXPLAINER.md` remains untracked pending a decision on whether to commit it.

---

### 2026-07-07 00:00

**XoXoCom — home "About us" copy reworded to a more confident/professional framing (DE + EN); verified in local preview, not committed or deployed. 🟡**

`sites/xoxocom/lib/copy.ts` — `home.aboutTitle` / `home.aboutBody` updated in both language trees, replacing the earlier "dynamic team" wording:

- DE: `aboutTitle` → "A.I.-Implementierung, mit Bedacht umgesetzt"; `aboutBody` → "Strategie, Architektur, Umsetzung: Wir begleiten den ganzen Weg vom Business Case bis zur Produktion."
- EN: `aboutTitle` → "A.I. implementation, done deliberately"; `aboutBody` → "Strategy, architecture, delivery: we cover the full path from business case to production."

Since `en` is typed as `typeof de`, both trees stay structurally in sync automatically. No other file changed — the home page and `HomeContent.tsx` already render `aboutTitle`/`aboutBody` from `useLang().c.home`, so no component edit was needed.

Verified on the local `next dev` preview (localhost:3000) via browser screenshots in both German and English.

**Git state:** uncommitted on branch `doe`, alongside the still-uncommitted signature-removal commit `61c5aea` context. **Open item added:** deploy this copy change (together with `61c5aea`) to Netlify once the user gives the go-ahead.

**Dev server left running:** the local `next dev` server for `sites/xoxocom` was left running at http://localhost:3000 for the user's own review of the reworded copy. No further activity this session beyond the dev server writing its own build artifacts under `sites/xoxocom/.next`.

---

### 2026-07-04 00:00

**XoXoCom — visible site signature removed from footer and head meta; committed but not deployed. 🟡**

Removed the rendered site `signature` (`web-xoxocom-fb6b4c`) from every place it reached the live page:

1. `sites/xoxocom/components/Footer.tsx` — deleted the visible `<span>` at the footer bottom-right along with its `data-signature` attribute.
2. `sites/xoxocom/app/layout.tsx` — removed the `other: { "x-site-signature": site.signature }` entry from the `metadata` export, so the `x-site-signature` meta tag no longer renders in `<head>`.

Verified locally via `next dev` + browser: the footer now shows only copyright, LinkedIn, and legal links; DOM inspection confirmed no signature text, no `data-signature` attribute, and no `x-site-signature` meta tag anywhere in the rendered page.

The `signature` field itself was left untouched in `sites/xoxocom/site.config.json` and its type in `lib/config.ts` — it's unused data now but harmless to keep, consistent with how the equivalent MAtfIT signature removal (2026-06-25) preserved the field in `site.config.json` while only stripping it from rendered output.

Committed to branch `doe` as commit `61c5aea` ("fix(xoxocom): remove site signature from footer and head meta"). **Not deployed** — the user asked to preview and commit only; deploy is being held pending explicit go-ahead.

No directive edits were needed: `design_website.md` and `build_website.md` describe the signature as default template behavior for new site builds ("keep the signature token in the footer," "explain it disambiguates sites in production" if a user asks to remove it) — that general guidance is unaffected by this one-off customization on an already-shipped site, matching the precedent set when the same request was handled for MAtfIT without a directive change.

**Open item added:** deploy XoXoCom's `61c5aea` to Netlify once the user confirms.

---

### 2026-06-26 17:30

**XoXoCom — `deploy_to_netlify.md` DNS-ordering lesson folded into the directive; GSC verification confirmed via successful Bing Webmaster Tools import; sitemap submitted to Bing. ✅**

`directives/deploy_to_netlify.md` gained a new Process subsection "Connecting an externally-hosted custom domain" and a new Edge Case documenting the `422 Unprocessable Entity` failure returned by the Netlify API when the primary-domain/SSL call is made before the registrar DNS resolves to Netlify — with the correct DNS-first sequence (A/CNAME records at the registrar → wait for propagation → then set primary domain via API).

Signed into Bing Webmaster Tools via "Sign in with Google" (SSO, no typed credentials) as albert@xoxocom.net. Bing auto-imported the `www.xoxocom.net` property from Google Search Console — since Bing's import only succeeds against a verified GSC property, this confirms GSC verification for `www.xoxocom.net` is complete under that account. The imported sitemap `https://www.xoxocom.net/sitemap.xml` shows Status = Success, 0 errors, 0 warnings, 10 URLs discovered in Bing.

**Status:** GSC verification and Bing Webmaster Tools setup are both DONE. The only open GSC-side action left is optional: URL Inspection → Request Indexing for the homepage and priority pages (/produkte, /leistungen/ai-transformation, /ueber-uns, /kontakt).

---

### 2026-06-26 16:00

**XoXoCom — Google Search Console verification tag deployed server-side (GSC-side verify/submit/index still pending on the user). 🟡**

Set the Netlify env var `GOOGLE_SITE_VERIFICATION` (production context) on the `xoxocom-ug` site (site id 5ec12ba7-2b39-4c85-8aa4-d3c8db971b2a) to the token the user obtained from GSC's HTML-tag verification method. `app/layout.tsx` was already wired (from the 2026-06-18 AutoResearch SEO work) to emit `<meta name="google-site-verification">` whenever this env var is present, so no code change was needed.

Redeployed via `python execution/deploy_netlify.py --slug xoxocom` — clean build, 2m44s, no OneDrive ENOENT. Verified live: `https://www.xoxocom.net/` now serves the verification meta tag in the head. The env var persists across future deploys, so the tag stays live automatically without further action.

**Status:** the GSC indexation open item is now split — the server-side half (verification tag live) is done; the remainder is entirely on the user's side inside Google Search Console: (1) click "Verify" in GSC, (2) submit the sitemap `sitemap.xml`, (3) URL-inspect + Request Indexing for the homepage and priority pages (/produkte, /leistungen/ai-transformation, /ueber-uns, /kontakt). Optional follow-on: import to Bing Webmaster Tools from GSC.

**Carried forward unchanged:** MAtfIT `LegalShell.tsx` still renders the campaign signature in the legal-pages footer; the `deploy_to_netlify.md` DNS-ordering-lesson reconciliation was offered to the user but not yet applied.

---

### 2026-06-26 00:00

**XoXoCom — production domain connected, TLS provisioned, SEO infrastructure deployed; site live at https://www.xoxocom.net. ✅**

**1. Custom domain connected and TLS provisioned.**

Pre-session reality check revealed the Netlify site had the apex `xoxocom.net` set as primary domain, `www` was not added, DNS was external (no Netlify DNS zone), the apex A-record pointed to a non-Netlify IP (2.57.91.91), and the `www` CNAME already pointed to Netlify but had no SSL cert (broken HTTPS).

DNS ordering lesson (to be folded into `deploy_to_netlify.md`): Netlify rejected setting `www` as primary via API (422 Unprocessable Entity) until the apex A-record pointed at Netlify's load balancer. Netlify cannot verify domain ownership until DNS resolves to Netlify. The correct sequence when an external registrar controls DNS is: (1) update apex A-record → 75.2.60.5 and www CNAME → `<site>.netlify.app` at the registrar; (2) wait for propagation; (3) only then call the Netlify API to set the primary domain and provision TLS.

The user updated the apex A-record at their registrar to 75.2.60.5. Propagation was verified on Google and Cloudflare resolvers. Via Netlify API: `custom_domain` set to `www.xoxocom.net`, `domain_aliases` set to `[xoxocom.net]`; TLS cert provisioned (issued, covers both hosts, expires 2026-09-27). Verified: https://www.xoxocom.net → 200; https://xoxocom.net → 301 → www; cert valid. No code change was needed — `site.config.json` `site_url` was already `https://www.xoxocom.net` and is the single source of truth that feeds `SITE_URL` in `lib/config.ts`, which in turn drives `metadataBase`, `robots.ts`, `sitemap.ts`, `seo.ts`, and JSON-LD throughout the site.

**2. SEO infrastructure deployed (was committed but never live).**

Discovered the SEO-completeness work (commits 264e865 and 6ea5568) had never been deployed — the live site was a stale June-18 manual CLI deploy. `/robots.txt`, `/sitemap.xml`, and `/opengraph-image` all returned 404; the homepage had no canonical, OG, or JSON-LD tags in production HTML.

Redeployed via `python execution/deploy_netlify.py --slug xoxocom`. Build completed cleanly in 2m29s (no OneDrive ENOENT). Post-deploy verification:

- `/robots.txt` — 200; `Host:` directive and sitemap URL both reference `www.xoxocom.net`.
- `/sitemap.xml` — 200; all public route URLs use `www.xoxocom.net`.
- `/opengraph-image` — 200 (branded OG image renders).
- Homepage HTML — canonical `https://www.xoxocom.net`; `og:url` `https://www.xoxocom.net`; JSON-LD Organization present.

Production URL: https://www.xoxocom.net.

**Open items carried forward:**

- Google Search Console indexation is still pending: set `GOOGLE_SITE_VERIFICATION` as a Netlify env var (layout.tsx already wired to emit the meta tag), verify in GSC, submit `https://www.xoxocom.net/sitemap.xml`, request indexing. SEO completeness score = 100 does not mean the site is indexed.
- (Carryover, lm_landing_pages) MAtfIT `components/LegalShell.tsx` still renders the campaign signature in the legal-pages footer.

---

### 2026-06-25 00:00

**MAtfIT fake-door — campaign signature removed from landing and thank-you footers; deployed to production. ✅**

Commit f008d9f on branch `doe`: "fix(matfit): remove campaign signature code from landing & thank-you footers".

Two files edited in `sites/matfit_fakedoor_12062026/components/content/`:

- `LandingContent.tsx` — the `<div>` containing the visible signature string `lm-matfit-fakedoor-3f9c1a` was removed from the page footer.
- `ThankYouContent.tsx` — the `<p>` containing the visible signature was removed, along with the now-unused `site` import.

The signature was intentionally preserved in two places that do not render visibly to end users:

- `site.config.json` — source-of-truth config file; unchanged.
- `sites/matfit_fakedoor_12062026/app/layout.tsx` — still emits `x-campaign-signature` as an HTTP response header for server-side tracking.

Deployed to Netlify via `python execution/deploy_netlify.py --slug matfit_fakedoor_12062026`. Build completed cleanly (no OneDrive ENOENT error this run). Production URL: https://matfit.ai (Netlify site name: matfit-xoxocom-ug).

**Open item carried forward:** `components/LegalShell.tsx` still renders the campaign signature in the legal-pages footer (Impressum, Datenschutz). The user's request covered only the landing page and thank-you page; `LegalShell.tsx` was left untouched. Full removal requires a deliberate follow-up edit to that component.

---

### 2026-06-18 21:45

**AutoResearch — EXPLAINER.md expanded with "How do I run this myself?" section (documentation only). ✅**

Added a new section 7 ("How do I run this myself? Do I need to prompt it?") to `execution/autoresearch/EXPLAINER.md`. It clarifies the two distinct usage modes: getting an SEO grade is fully automatic (run `score_seo.py` directly, no A.I. required); improving the site is prompted (ask Claude to run the change → grade → keep/undo loop). Includes a ready-to-paste example prompt for starting a Mode A run. Also explains the advanced unattended mode (`optimize.py evaluate --auto-git` combined with the /loop tool). Later sections were renumbered to accommodate the insertion. No code or behavior changed; this is a documentation-only addition. No directive reconciliation needed.

---

### 2026-06-18 21:00

**AutoResearch — beginner-friendly EXPLAINER.md added (documentation only). ✅**

Created `execution/autoresearch/EXPLAINER.md`: a plain-language guide written at a 10-year-old reading level covering what SEO completeness means, exactly what changed on the XoXoCom site (sitemap, robots.txt, Open Graph share-preview image, JSON-LD Organization schema, per-page titles/descriptions, and the GSC verification slot), and how the AutoResearch keep-or-revert loop works (Teacher = scorer, Student = AI, illustrated with the 32.57 → 100 score arc including the "false 100" OG-image story). Includes a prominent "See the value RIGHT NOW" section and a "how to view it yourself" walkthrough (start `next dev`, open `/sitemap.xml`, `/robots.txt`, `/opengraph-image`, run the scorer, open `results/seo.tsv`). Also maps where every harness file lives. No code or behavior changed; this is a documentation-only addition. No directive reconciliation needed.

---

### 2026-06-18 20:00

**XoXoCom — AutoResearch SEO harness built and run; SEO score 32.57 → 100.0; directive `auto_optimize_seo.md` created. ✅**

**AutoResearch harness (new files under `execution/autoresearch/`):**

- `execution/autoresearch/score/score_seo.py` — the fixed scorer ("prepare.py"). Pure Python stdlib (urllib + html.parser). Crawls all 10 public routes' rendered HTML plus `/sitemap.xml` and `/robots.txt` on a running Next server and prints one JSON line: `{"score":0-100, "passed":bool, "subscores":{...}, "routes":{...}}`. Deterministic: same server HTML → same number. `passed=false` is a hard gate (triggers revert regardless of score). Per-route checks = 70% of score (unique title 30–60 chars, unique description 120–160 chars, single h1, canonical on configured domain, html lang, full Open Graph set including og:locale + og:locale:alternate, Twitter card, JSON-LD, img alt). Site-level = 30% (valid sitemap listing all public routes, robots referencing the sitemap, OG image URL actually returning an image — not just a present meta tag). The og:image-renders check was added after the earlier "100" was identified as a false pass (the OG image route was crashing but still emitting a meta tag).

- `execution/autoresearch/optimize.py` — the loop driver. Subcommands: `state --metric seo [--base-url]` (prints research direction + results history + live weak-spot hints) and `evaluate --metric seo --hypothesis "..." [--serve] [--auto-git]`. Mode A (default): recommends KEEP or REVERT; agent commits deliberately. Mode B (`--auto-git`): commits on improvement / `git reset --hard` on regression (requires clean tree; use for unattended runs). `--serve` starts and stops `next dev` automatically, picks a free port in the 3000–3099 range.

- `execution/autoresearch/program/seo.md` — the human-owned research direction. Lists what may be edited, what is off-limits, scoring rules summary, and a prioritized hypothesis list. Not edited by scripts.

- `execution/autoresearch/results/seo.tsv` — append-only experiment log. Gitignored.

**Site-level SEO changes (`sites/xoxocom/`):**

- `site.config.json` gained `site_url` (`https://www.xoxocom.net`); `lib/config.ts` exposes `SITE_URL` (overridable via `NEXT_PUBLIC_SITE_URL` env var).
- New `lib/seo.ts` — `buildMetadata({title, description, path})` factory (canonical + full Open Graph incl. og:locale/og:locale:alternate + Twitter card + og:image) and `organizationJsonLd()`.
- New `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx` (branded OG image via next/og).
- `app/layout.tsx` — metadataBase, default OG/Twitter, JSON-LD Organization, Google Search Console verification slot (env `GOOGLE_SITE_VERIFICATION`).
- Every `app/**/page.tsx` uses `buildMetadata` with unique titles/descriptions in the ideal length bands.

**Experiment log (4 iterations):**

| Iter | Score | Decision | Hypothesis |
|---|---|---|---|
| 1 | 32.57 | kept (baseline) | Current site, pre-optimization |
| 2 | 88.64 | kept | sitemap.ts + robots.ts + metadataBase + OG + JSON-LD + per-page metadata |
| 3 | 100.0 | kept | Explicit og:image on every route via buildMetadata |
| 4 | 100.0 | kept (re-confirmed) | Fix crashing OG image (Satori multi-child) + harden scorer to verify og:image renders |

**New directive:** `directives/auto_optimize_seo.md` created with all required sections (Goal, Inputs, Tools/Scripts, Process, Outputs, Edge Cases, Error Handling). Documents Mode A and Mode B runs, the `state` and `evaluate` subcommands with all flags, how to read `results/seo.tsv`, the GSC/measurement post-score steps, and the future-phases extension pattern.

**Open follow-ups added (see Open/Unfinished Items below):**

- Connect canonical domain `www.xoxocom.net` to Netlify; set `NEXT_PUBLIC_SITE_URL` env var.
- Create Google Search Console property, verify (set `GOOGLE_SITE_VERIFICATION` env var in Netlify), submit sitemap.
- True per-language hreflang needs locale-routed URLs — a future phase requiring user sign-off.

**Reviewer pass:** TypeScript (`tsc --noEmit`) exits 0 after all SEO changes. No lint errors.

---

### 2026-06-18 14:00

**XoXoCom — bilingual DE/EN feature committed and deployed to Netlify production. ✅**

Commit `b2aefc2` ("feat(xoxocom): bilingual DE/EN site with instant language toggle") on branch `doe` — 26 files: `lib/copy.ts`, `lib/i18n.tsx`, `components/LangToggle.tsx`, `components/SmartLink.tsx`, all seven `components/content/*` files, the seven converted page wrappers, `SiteHeader`, `Footer`, `FooterLinks`, `ContactForm`, `lib/config.ts`, `directives/progress.md`, and `.gitignore`.

`.gitignore` was extended to exclude `sites/*/.next */` (OneDrive conflict-copy build directories such as `.next (1)`) and `sites/*/*.tsbuildinfo`; both were verified absent from the commit. `.claude/` and `CLAUDE.md` remain gitignored by design — the Stop-hook `settings.json` and `CLAUDE.md` changes are intentionally not tracked in git (per-machine orchestration config).

Deployed to Netlify production via `python execution/deploy_netlify.py --slug xoxocom` (running `next dev` killed first to release the `.next` lock). Build used the `.next` junction workaround; build.command completed in approximately 2m12s, "Deploy is live!", exit 0.

Verified live at https://xoxocom-ug.netlify.app: default German (`lang="de"`); with `Cookie: xoxocom-lang=en` the server renders English (`lang="en"`, "Let's talk", "First name") — cookie-driven SSR confirmed in production. Language toggle present and functional.

Closed items: "Commit all unstaged work to git on branch `doe`" and "Deploy bilingual XoXoCom to Netlify" — both resolved.

---

### 2026-06-18 11:15

**XoXoCom — `LangToggle` deduplicated: now visible in header at all breakpoints; removed from mobile menu panel. 🟡 (local preview only; uncommitted, not deployed)**

Removed the `hidden md:inline-flex` class from the `LangToggle` in `SiteHeader.tsx` so the DE|EN toggle appears in the header on desktop, split-screen, and mobile (390 px verified). Removed the `LangToggle` entry that was previously duplicated inside the `#mobile-menu` hamburger panel. The toggle now appears exactly once at all widths. Open items unchanged.

---

### 2026-06-18 10:00

**XoXoCom — bilingual performance bugfix: client-side navigation + cookie-driven SSR. 🟡 (local preview only; not committed or deployed)**

Root cause: every internal link was a plain `<a href>`, forcing a full-page hard reload on each navigation. Each reload rebooted React and reset `LanguageProvider` to its German default, painted German, then re-read the `localStorage` preference and re-rendered to English (the visible flash); in dev the reload also recompiled the route (the 2–3s lag).

Two-part fix:

1. **New `sites/xoxocom/components/SmartLink.tsx`** — renders a Next.js `<Link>` for internal routes (paths starting with `/`) and a plain `<a>` for external URLs, hash anchors (`#…`), and `mailto:` links. All props pass through. Converted all internal links across `SiteHeader`, `FooterLinks`, `ContactForm`, and all seven content components (`HomeContent`, `BusinessCoachingContent`, `AiTransformationContent`, `ExpertConsultingContent`, `ProdukteContent`, `UeberUnsContent`, `KontaktContent`) to use `SmartLink`. Hash and external links intentionally remain plain `<a>`. Result: internal navigation is now client-side; the in-memory `LanguageProvider` state survives the route change — no reload, no re-translate, no flash.

2. **Cookie-based language preference + server-side rendering** — Language preference moved from `localStorage` to a cookie (`xoxocom-lang`). `app/layout.tsx` is now an async server component: reads the cookie via `next/headers` `cookies()`, sets `<html lang>` accordingly, and passes `initialLang` to `LanguageProvider`. The provider initializes its state from `initialLang` (no post-mount read); on change it writes the cookie. Result: even a hard refresh renders the saved language on the server with zero flash.

   **Lesson recorded — shared constants between server and client modules:** the `LANG_COOKIE` constant was initially defined in `lib/i18n.tsx`, which carries `"use client"`. Importing a plain constant from a client module into a server component yields a client-reference stub (a function), not the string value — so `cookies().get(LANG_COOKIE)` silently returned `undefined` and SSR stayed German. Fix: shared server-readable constants must be defined in a non-client module. `LANG_COOKIE` was moved to `lib/copy.ts` (no `"use client"` directive); both the server layout and the client provider import it from there.

**Verified:** `npx tsc --noEmit` exits 0; `curl` with no cookie returns `lang="de"` + German "Vorname"/"Nachricht absenden"; `curl -H "Cookie: xoxocom-lang=en"` returns `lang="en"` + English "First name"/"Send message"; browser test confirms clicking a nav link performs client-side navigation (~0.8s, no full reload, window marker survived, language stayed English, destination rendered English immediately). Note: reading `cookies()` opts the affected routes into dynamic rendering — acceptable for this site and Netlify's Next.js runtime.

**Git state:** fix is on branch `doe` (uncommitted), incorporated into the bilingual feature. Not deployed to Netlify.

---

### 2026-06-18 01:30

**XoXoCom — home-page content restored after accidental clobber during bilingual i18n refactor. 🟡 (local preview only; not committed or deployed)**

During the bilingual conversion, `components/content/HomeContent.tsx` and `lib/copy.ts` were written with the "Unsere Leistungen / Services" section rebuilt from an older in-memory copy rather than from the actual committed file. This clobbered customizations present in `app/page.tsx` at commit 6fe8c0b ("home content refinements").

Recovered via `git show HEAD:doe/full_web_design/sites/xoxocom/app/page.tsx` and restored into `lib/copy.ts` (both `de` and `en` trees) and `HomeContent.tsx`:

1. **Card order corrected** — A.I. Transformation (left) → Projekteinsätze (middle) → Business Coaching (right). The earlier refactor had reshuffled these.
2. **Card bodies restored to short teasers** — German text is the user's exact wording from commit 6fe8c0b; English entries are new matching teasers. The accidental draft had replaced them with full-copy paragraphs.
3. **Per-card roles `<ul>` list removed** — The `roles` data field was dropped from the home Leistungen entries in `lib/copy.ts`; the `<ul>`/`<li>` rendering block was deleted from `HomeContent.tsx`. The home section is now teaser-only, matching the original page design.
4. **Home "About" teaser restored** — Title is "Dynamisches Team mit Durchschlagskraft"; body opens "Wir sind ein dynamisches Team …". The earlier refactor had reverted to "junges Team mit großem Anspruch" / "junges Team".

**Verified:** `npx tsc --noEmit` exits 0; home HTTP 200; SSR HTML confirms correct card order, all three teasers present, no `<ul>`/`<li>` in the services section, correct About text. Browser-harness screenshots were unavailable this turn (Chrome remote-debugging permission lapsed); verification was via DOM/HTML inspection.

**Lesson recorded:** when refactoring an existing page whose content may have been hand-customized, read the full current file AND run `git show HEAD:<path>` to check for committed-vs-working drift before overwriting. Never rebuild content from an in-memory copy.

**Git state:** fix is incorporated into the uncommitted bilingual feature on branch `doe`. Not deployed.

---

### 2026-06-17 23:59

**XoXoCom — site made bilingual (DE/EN) with instant client-context toggle. Local preview only; not deployed or committed. 🟡**

1. New `sites/xoxocom/lib/copy.ts` — bilingual content dictionary. `de` is the source of truth; `en` is typed `typeof de`, which forces the English tree to mirror the German one at compile time (missing or renamed key = TypeScript error). Holds all user-facing copy: nav items, CTAs, header aria-labels, footer, contact form, and all seven pages (home, business-coaching, ai-transformation, expert-consulting, produkte, ueber-uns, kontakt).

2. New `sites/xoxocom/lib/i18n.tsx` — `LanguageProvider` React context and `useLang()` hook. Default language is German (matches SSR `<html lang="de">` to avoid hydration mismatch). A saved preference in `localStorage` key `xoxocom-lang` is applied after mount. Switching is instant (no reload, no route change) and sets `document.documentElement.lang`. Exposes `{ lang, setLang, toggle, c }` where `c = COPY[lang]`.

3. New `sites/xoxocom/components/LangToggle.tsx` — segmented "DE | EN" switch. Rendered in the header desktop bar and in the mobile menu.

4. Architecture decision: no locale-based routing (no `/en` or `/de` URL segments, no Next.js middleware). This is a deliberate lightweight client-context approach suited to a small marketing site. Consequence: per-page `<title>` / description metadata (exported from each server page component) remains in German by default. Legal pages (Impressum / AGB / Datenschutz) intentionally stay German for legal validity; only the footer legal-nav aria-label localizes.

5. Refactor pattern applied across all seven routes: each `app/.../page.tsx` is now a thin server wrapper that keeps the `metadata` export and renders a matching client content component under `sites/xoxocom/components/content/` (HomeContent, BusinessCoachingContent, AiTransformationContent, ExpertConsultingContent, ProdukteContent, UeberUnsContent, KontaktContent). Content components consume `useLang()`. `app/layout.tsx` wraps everything in `<LanguageProvider>`. `SiteHeader`, `Footer` (promoted to client component), `FooterLinks` (gained an `ariaLabel` prop), and `ContactForm` all read copy from the context. Nav items, CTA text, `NavItem`, and `NavChild` config were removed from `lib/config.ts` and moved into `lib/copy.ts`; `config.ts` still exports `site` and `SOCIALS`.

6. Verified: `npx tsc --noEmit` passes (exit 0); `next dev` compiles all seven routes (HTTP 200 confirmed); browser smoke test confirmed clicking EN flips nav labels (Produkte → Products, Leistungen → Services, Über uns → About), headline, CTAs, and contact form; sets `<html lang="en">`; choice persists across in-app navigation and page reload via localStorage. Reset to DE after testing.

**Follow-up items added:**
- Commit the bilingual feature to git on branch `doe` once user is satisfied with the local preview.
- Deploy to Netlify after committing.
- Optional future: migrate to locale-routed `app/[locale]/` with `hreflang` and per-locale metadata if true multilingual SEO is later required. Would need user sign-off before a new directive is written.

**Git state:** uncommitted on branch `doe` (alongside all previously-listed unstaged files). Not deployed to Netlify.

---

### 2026-06-17 23:30

**Infrastructure — end-of-session documentation enforcement added (Stop hook + CLAUDE.md hardening). ✅**

1. New script `execution/hooks/ensure_progress_logged.py`:
   - Pure-stdlib Python. Resolves the repo root from `__file__`. Reads the hook JSON payload from stdin.
   - If `stop_hook_active` is true in the payload, exits 0 immediately (loop-safe).
   - Otherwise compares mtimes: if any file under `sites/`, `execution/`, `assets/`, or `directives/` (excluding `directives/progress.md` itself, and pruning `node_modules`/`.next`/`.netlify`/`__pycache__`/`.git`/`.tmp`/the `hooks` directory) is newer than `progress.md`, it prints `{"decision":"block","reason":"..."}` instructing the model to call the documenter sub-agent before ending. Otherwise exits 0.
   - Runs in approximately 0.3 s.

2. New project file `.claude/settings.json`:
   - Registers `ensure_progress_logged.py` as a `Stop` hook using the exec form (`"command":"python"`, `"args":["<absolute path>"]`) so the non-ASCII/space-containing OneDrive path never passes through a shell parser. Timeout 30 s.

3. `CLAUDE.md` Operating Principle 4 and Key rules sub-agent trigger list strengthened:
   - End-of-session progress documentation via the documenter is now stated as mandatory and as enforced by the Stop hook.

**Caveat:** the Stop hook may not activate until the user opens the `/hooks` settings panel once or restarts Claude Code. Settings-file watchers only observe `.claude/` if a settings file existed there at session start; this file was created mid-session.

**Git state:** `execution/hooks/ensure_progress_logged.py`, `.claude/settings.json`, and the `CLAUDE.md` changes are uncommitted on branch `doe` alongside the already-listed business-coaching and hero-animation files. User has not asked to commit.

---

### 2026-06-17 21:00

**XoXoCom — Business Coaching hero built and deployed; `record_canvas_animation.py` created and production-tested; hero recording made mandatory before every deploy; OneDrive deploy workaround documented. ✅**

1. New component `sites/xoxocom/components/HeroGraphCluster.tsx` (sibling of `HeroGraph.tsx`):
   - Canvas animation visualising the graph-theory **local clustering coefficient**. A focal node lights up; radial spokes draw to its k neighbours; triangles among those neighbours close and fill in Coral; a small arc-gauge sweeps to C = 2·(links among neighbours)/(k·(k−1)). Uses a random-geometric graph so triangles and clustering are always visible. Focal node rotates left-to-right through ~5 high-clustering nodes per cycle.
   - Same technical pattern as the other two heroes: reads CSS design tokens at runtime, honours `prefers-reduced-motion`, responsive via `ResizeObserver` + `devicePixelRatio`, subtle pointer parallax.

2. Integrated into `sites/xoxocom/app/leistungen/business-coaching/page.tsx`:
   - Canvas mounted as absolute background layer with the same centre text-protection scrim and accent glow pattern used by the other service pages.

3. New execution script `execution/record_canvas_animation.py` (reviewer-approved, end-to-end tested):
   - Records any on-page `<canvas>` animation to `assets/exploded-views/<name>.webm` (VP9) + `.mp4` (H.264/yuv420p/faststart, even dims enforced via crop filter).
   - Drives `browser-harness` via a piped Python snippet. In-browser: CDP `Page.startScreencast` prevents rAF throttling; composites each transparent canvas frame onto the `--color-bg` background token in an offscreen canvas; captures with `MediaRecorder` (VP9); reads webm back base64-chunked; python side writes to disk and calls ffmpeg.
   - Flags: `--url` (required); `--name`/`--out` (mutually exclusive, required); `--selector` (default `canvas`); `--seconds` (default 12); `--fps` (default 30); `--bitrate` (default 8M); `--bg` (default: reads `--color-bg` token from the live page); `--settle` (default 2.5); `--no-mp4`.
   - Records at the canvas's native on-page resolution. Reviewer fixes applied: UTF-8 decoding of harness stdout; chunk-scaled subprocess timeout; closes only the tab it opened (no tab leak); polls for `MediaRecorder.onstop` instead of a fixed sleep; substitutes user-supplied tokens last to prevent injection collisions.

4. Hero recording made a mandatory pre-deploy step:
   - `design_website.md` step 9 (Record hero animation) and `deploy_to_netlify.md` step 2 (first-deploy checklist) already document this rule.
   - Asset recorded: `assets/exploded-views/hero-cluster-coefficient.webm` + `.mp4`.

5. Deployed to Netlify production and verified live (HTTP 200, animation confirmed): https://xoxocom-ug.netlify.app/leistungen/business-coaching.
   - Deploy used the external-copy fallback (see below) — not in-place via `deploy_netlify.py`.

6. OneDrive external-build workaround documented in `deploy_to_netlify.md`:
   - Edge Cases section: describes the three failure symptoms (ENOENT during "Collecting page data", `<Html>` import error on `/500`/`/_error`, `lstat ENOENT` during plugin `onBuild` standalone copy).
   - Error Handling section: step-by-step external-copy procedure (kill `next dev`; robocopy site to non-OneDrive path excluding `node_modules`/`.next`/`.netlify`; `npm install`; `netlify link --id <siteId>`; `netlify deploy --prod`). Notes that `deploy_netlify.py` does NOT yet automate this.

**Centrality-hubs delete/regenerate incident (cross-session):**
A parallel session built `HeroGraphHubs` and its `assets/exploded-views/hero-centrality-hubs.*` assets. During cleanup this session deleted those files because at that moment they were broken (0-byte webm; mp4 was a byte-for-byte duplicate of `hero-cluster-coefficient.mp4`). This session regenerated valid ones from the live expert-consulting page using `record_canvas_animation.py` at the canvas's native height of 1900×620. The parallel session had documented 1900×790. Open item: re-record `hero-centrality-hubs.*` at 1900×790 via a bare full-bleed route if exact dimensional consistency across the exploded-views library is required. The live site is unaffected.

**Git state:** nothing committed. On branch `doe`, unstaged: `sites/xoxocom/components/HeroGraphCluster.tsx`, `sites/xoxocom/app/leistungen/business-coaching/page.tsx`, `execution/record_canvas_animation.py`, `assets/exploded-views/hero-cluster-coefficient.webm`, `assets/exploded-views/hero-cluster-coefficient.mp4`, `assets/exploded-views/hero-centrality-hubs.webm` (regenerated), `assets/exploded-views/hero-centrality-hubs.mp4` (regenerated), plus the three directive edits. User has not asked to commit.

---

### 2026-06-17 18:00

**XoXoCom — Expert Consulting hero animation built, recorded, and deployed live. Leistungen hero set now complete. ✅**

1. New component `sites/xoxocom/components/HeroGraphHubs.tsx`:
   - Canvas animation visualising graph-theory **centrality and hubs**. The highlight alternates on a loop between two modes: a **connector hub** (bridges separate communities; bridge edges pulse in Coral) and a **provincial hub** (links contained inside a single community). Node radius encodes degree centrality — higher-degree nodes are visibly larger.
   - Same technical pattern as the other two service-page heroes: reads CSS design tokens at runtime, honours `prefers-reduced-motion`, and is responsive via `ResizeObserver` + `devicePixelRatio`.

2. Integrated into `sites/xoxocom/app/leistungen/expert-consulting/page.tsx`:
   - Canvas mounted as absolute background layer with a text-protection scrim and accent glow, matching the pattern established by the A.I. Transformation and Business Coaching pages.

3. Recorded as an exploded-view asset (bare on `#0B0E11`, 1900×790, 30 fps, ~12 s):
   - `assets/exploded-views/hero-centrality-hubs.mp4`
   - `assets/exploded-views/hero-centrality-hubs.webm`
   - Matches the existing asset pair for the other two heroes.

4. Deployed to Netlify production via `python execution/deploy_netlify.py --slug xoxocom` — build succeeded in place (~1m30s), "Deploy is live!", exit 0. Verified live (HTTP 200): https://xoxocom-ug.netlify.app/leistungen/expert-consulting.

5. The Leistungen hero set is now complete:
   - shortest-path → A.I. Transformation (`HeroGraph`)
   - clustering-coefficient → Business Coaching (`HeroGraphCluster`)
   - centrality & hubs → Expert Consulting (`HeroGraphHubs`)

**Operational note (no follow-up required):** the local `.next` build cache (junction → C:\xoxo-next-cache) was cleared during recording troubleshooting and its required inner `node_modules` junction was restored; the in-place Netlify build/deploy continues to work with this setup.

**Open item carried forward:** `HeroGraphHubs.tsx`, the expert-consulting page edit, and the two new video assets (`hero-centrality-hubs.mp4` / `.webm`) are deployed but not yet committed to git on branch `doe`.

---

### 2026-06-17 09:00

**Session close — documentation pass complete. All baseline gaps resolved. ✅**

Summary of everything accomplished across this session:

1. Initialized `directives/progress.md` as the repo's timestamped progress tracker. Performed a baseline survey: 6 directives, 10 execution scripts (at that point), `sites/_template/` and `sites/xoxocom/` present. Established the reverse-chronological log format and the Open / Unfinished Items checklist.

2. Documented two previously-undocumented execution scripts in `directives/preview_design_systems.md`:
   - `execution/build_font_lab.py` added as Mode C (Font lab): renders a side-by-side HTML specimen of every `awesome-design-md` system's typeface stack to `.tmp/font_lab/index.html`.
   - `execution/build_accent_lab.py` added as Mode D (Accent lab): renders accent-color palette swatches for every system to `.tmp/accent_lab/index.html`.
   - Both scripts added to Inputs, Tools/Scripts, Process, Outputs, and Error Handling sections.

3. Documented the optional AGB page workflow in `directives/add_legal_pages.md`:
   - New process step covering when to create an AGB page (site sells a paid product or service), what to create (`app/agb/page.tsx`, `content/agb.md`, FooterLinks AGB entry), and the trigger logic.
   - Noted that the template does not ship an AGB by default — it must be created from scratch.
   - Noted that `sites/xoxocom/content/agb.md` is a placeholder DRAFT pending legal review and sign-off.

4. Codified progress-log maintenance as Operating Principle 4 in `CLAUDE.md`:
   - Three trigger conditions (step completed with follow-up needed, work left unfinished, end-of-session wrap-up).
   - Timestamp format, reverse-chronological ordering, and Current Status / Open Items refresh requirements.
   - Matching bullet added to the Key rules sub-agent trigger list.

Open items at session close: three legal follow-ups in `add_legal_pages.md` (sub-processors, DPAs, Supabase EU region); `sites/xoxocom/content/agb.md` placeholder DRAFT pending legal sign-off; testing Gmail credentials to be swapped for owner credentials before real production use. All three checked-off documentation gaps are fully resolved.

---

### 2026-06-17 12:00

**XoXoCom — reusable hero animation asset captured; home "Aktuelles" section given subtle Coral life. Both deployed live and verified. ✅**

1. Reusable hero animation asset created for reuse (ads, social, static fallbacks):
   - Screen-recorded the `HeroGraph` node-network animation composited on the brand background (`#0b0e11`), ~5 seconds.
   - Saved at `assets/exploded-views/hero-node-network.webm` (VP9, 1901×790) and `assets/exploded-views/hero-node-network.mp4` (H.264, 1900×790).
   - Capture method: in-page `MediaRecorder` on `canvas.captureStream` while a CDP screencast kept frames flowing — the Chrome window was backgrounded, which otherwise throttles `requestAnimationFrame` to ~1/s.
   - New root-level `assets/` folder with an `exploded-views/` subfolder; purpose is reusability.

2. Home-page "MAtfIT" section (`sites/xoxocom/app/page.tsx`) refreshed:
   - Renamed the eyebrow "Unser Produkt" → "Aktuelles".
   - Made the section livelier with subtle Coral (`#FB6B4C`) accent hues in the background — two soft radial hue orbs that gently "breathe" (new `@keyframes hueBreathe` / `.hue-breathe` in `sites/xoxocom/app/globals.css`, ~7s, neutralised under `prefers-reduced-motion`), plus an accent-tinted card border, a coral rim-glow shadow, and a faint inner accent wash. Kept intentionally restrained.

3. Both changes deployed live to https://xoxocom-ug.netlify.app and verified in production.

No directive code touched (documenter scope) — `sites/` and the new `assets/` folder are outside the writable boundary; only `directives/progress.md` was updated. The two remaining open items (swap testing Gmail creds → owner creds; AGB legal review) are carried forward unchanged.

**Operational gotcha recorded:** Netlify's `next build` can fail with `EINVAL readlink .next/...` because OneDrive virtualises files. Fix: delete `sites/<slug>/.next` immediately before running `execution/deploy_netlify.py`, and ensure no `node`/`next` process is holding `.next` open (otherwise the delete fails with "Device or resource busy").

---

### 2026-06-17 00:00

**XoXoCom home hero — bespoke animated hero graphic built, integrated, and deployed live. ✅**

1. New component `sites/xoxocom/components/HeroGraph.tsx`:
   - An animated hero graphic rendered as a live in-browser canvas: a 3D-perspective node network in which the shortest path between two far-apart nodes lights up in the brand Coral accent (#FB6B4C) on a ~5-second loop, with a travelling pulse along the lit path.
   - Reads the site's CSS design tokens (`--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`) at runtime, so it adapts to the page background and re-skins automatically when the theme changes.
   - Honours `prefers-reduced-motion`, and is responsive via `ResizeObserver` and `devicePixelRatio`.

2. Integrated into the home hero in `sites/xoxocom/app/page.tsx`:
   - Mounted as an absolute background layer at opacity-80 behind the headline, with a soft radial text-protection scrim so the hero copy stays legible.

3. Implemented as a live canvas animation rather than a baked `.mp4`, specifically so it adapts to the page background / theme. An MP4 can be screen-recorded later if a static asset is needed for ads or social.

4. Verified locally at desktop (1536) and mobile (390) widths and on production; deployed live to https://xoxocom-ug.netlify.app.

This resolves the previously-deferred "Hero exploded-view / hero media" open item. No directive code touched (documenter scope) — `sites/` is outside the writable boundary; only `directives/progress.md` was updated. The two remaining open items (swap testing Gmail creds → owner creds; AGB legal review) are carried forward unchanged.

---

### 2026-06-16 16:00

**Data-integrity feature — prospect de-duplication (unique index + upsert) implemented, run in production, verified live. ✅**

1. New execution script `execution/add_prospects_dedup_constraint.py`:
   - Collapses existing duplicates in the shared `leads.prospects` table, keeping the most recent row per `(campaign_slug, email)`, then adds a UNIQUE index `ux_prospects_campaign_slug_email` on `(campaign_slug, email)`.
   - Idempotent and safe to re-run; runs dedupe + index in a single transaction. Connects directly via `SUPABASE_DB_URL` (DDL privileges; the service key can't run DDL). Shared with the `lm_landing_pages` workspace (same table). Run once: `python execution/add_prospects_dedup_constraint.py`.
   - Uniqueness is per campaign: the same email under a different `campaign_slug` stays a separate row, and NULL-slug legacy rows are left untouched (NULLS DISTINCT).

2. Submit routes switched from plain insert to upsert:
   - `sites/_template/app/api/submit/route.ts` and the `xoxocom` route now `upsert(row, { onConflict: "campaign_slug,email", ignoreDuplicates: true })`. A repeat submission from the same email on the same site is a no-op at the row level (no duplicate row); the contact email still forwards on every submit.
   - The sibling `lm_landing_pages` routes (`agentic-workflows-101` + `_template`) were switched to the same upsert so the new global unique index doesn't break them.

3. Migration already run in production: 6 duplicate rows removed, index created, verified live (double-submit → 1 row).

4. `execution/deploy_netlify.py` now masks secret env values (`SUPABASE_SERVICE_KEY`, `GMAIL_APP_PASSWORD`) when echoing `netlify env:set` commands.

5. Directives updated to match: `capture_contact_submission.md` (insert → upsert in Process, new dedup script in Tools/Scripts, Outputs and Edge Cases reworked — the stale "No de-dupe" case replaced); `deploy_to_netlify.md` (secret-masking note + new edge case for missing unique index).

No directive code touched (documenter scope). New open item added: swap testing Gmail creds → owner creds before real production. Existing legal follow-ups carried forward.

---

### 2026-06-16 15:10

**Process improvement — progress-log maintenance codified in CLAUDE.md.**

1. `CLAUDE.md` updated with Operating Principle 4: Keep the progress log current.
   - Specifies `directives/progress.md` must be updated via the documenter sub-agent in three situations: a step completed but needing follow-up (🟡), work left unfinished or blocked (⛔), and end of a working session (✅).
   - Requires every entry to be timestamped and placed at the top of the log (reverse-chronological). Current Status and Open/Unfinished Items must be refreshed each time.
   - A matching bullet was added to the "Key rules" sub-agent trigger list alongside the existing documenter trigger.

2. Effect: future sessions will update `progress.md` without requiring an explicit instruction each time. This closes the process gap where progress was recorded ad-hoc rather than systematically.

No new open items. No open items resolved (this was a process-gap closure, not a content task).

---

### 2026-06-16 14:30

**Documentation pass — three baseline gaps resolved.**

1. `directives/preview_design_systems.md` updated to document two previously-undocumented execution scripts:
   - `execution/build_font_lab.py` added as Mode C (Font lab): renders a side-by-side HTML specimen of every `awesome-design-md` system's typeface stack to `.tmp/font_lab/index.html`.
   - `execution/build_accent_lab.py` added as Mode D (Accent lab): renders swatches of every system's accent-color palette to `.tmp/accent_lab/index.html`.
   - Both scripts added to Inputs, Tools/Scripts, Process, Outputs, and Error Handling sections.

2. `directives/add_legal_pages.md` updated to document the optional AGB step:
   - New "Optional: AGB" process step added covering when to create the AGB page (site sells a paid product or service), what to create (`app/agb/page.tsx`, `content/agb.md`, FooterLinks AGB entry), and the existing edge-case trigger logic.
   - Noted that the template does not ship an AGB by default — it must be created from scratch.
   - `sites/xoxocom/content/agb.md` is currently a placeholder DRAFT; legal review and sign-off are still required before the page is suitable for production.

Three items from the Open / Unfinished Items checklist are now resolved (see below). Legal follow-ups carried forward.

---

### 2026-06-16 00:00

**Baseline state of repo recorded by documenter on tracker initialization.**

State of `directives/` (6 files):

- `build_website.md` — Master SOP for the end-to-end site build: scaffold → design → legal → deploy. Covers contact-form and brochure-only variants, env var requirements, and the `campaign_slug` migration. Status: ✅ done, accurate against current scripts.
- `design_website.md` — SOP for picking an `awesome-design-md` brand, translating its tokens into `app/globals.css`, iterating on screenshots, and handing off to legal + deploy. Status: ✅ done, accurate.
- `add_legal_pages.md` — SOP for filling operator data into `content/impressum.md` and `content/datenschutz.md`, pruning irrelevant sections, and verifying locally. No execution scripts involved — editing only. Carries three known follow-ups (sub-processors, DPAs, EU region). Status: ✅ done; known follow-ups documented inside directive.
- `deploy_to_netlify.md` — SOP for first and subsequent Netlify deploys, env var table, edge cases for underscore slugs and multi-team accounts. Status: ✅ done, accurate.
- `capture_contact_submission.md` — Reference doc (not an agent action) describing the runtime contract of `/api/submit`: validation → DB insert → email → 200 response. Status: ✅ done, accurate.
- `preview_design_systems.md` — SOP for running the catalog gallery and per-brand full-page previews before committing to a design. Status: ✅ done, accurate.

State of `execution/` (10 scripts):

- `scaffold_site.py` — Clones `sites/_template/` to `sites/<slug>/`, writes `site.config.json`.
- `sync_env_local.py` — Generates `sites/<slug>/.env.local` from root `.env` + `site.config.json`.
- `start_preview_server.py` — Runs `next dev` on a free port inside the site dir.
- `deploy_netlify.py` — Sets Netlify env vars and runs `netlify deploy --prod`.
- `add_campaign_slug_column.py` — One-off idempotent migration adding `campaign_slug text` to `leads.prospects`.
- `design_md_lib.py` — Shared parser and color-role derivation library; not run directly.
- `preview_design_systems.py` — Renders the full 74-brand catalog gallery to `.tmp/awesome_design_gallery/index.html`.
- `build_brand_preview.py` — Renders full-page per-brand HTML previews to `.tmp/brand_previews/`.
- `build_font_lab.py` — Present in `execution/`; no directive references it yet.
- `build_accent_lab.py` — Present in `execution/`; no directive references it yet.

State of `sites/`:

- `sites/_template/` — The canonical Next.js 14 template (Tailwind v4, `marked`, `nodemailer`, Supabase client, four standard pages + legal routes + `FooterLinks` + `LegalShell` + consent notice).
- `sites/xoxocom/` — Live XoXoCom UG site. Extends the template with additional routes (`/produkte`, `/leistungen/ai-transformation`, `/leistungen/expert-consulting`, `/ueber-uns`, `/kontakt`, `/agb`) and localized German content. Impressum and Datenschutz are present; an AGB page and `content/agb.md` have been added beyond the template default.

Follow-up items noted inside directives that carry into future sessions:

- `add_legal_pages.md` — known follow-ups: name sub-processors (Netlify, Supabase, Google) in Datenschutz under Art. 13(1)(e); sign DPAs; confirm Supabase region is EU.

---

## Open / Unfinished Items

- [x] `progress.md` tracker initialized (2026-06-16)
- [x] `execution/build_font_lab.py` undocumented — resolved 2026-06-16: documented as Mode C in `preview_design_systems.md`.
- [x] `execution/build_accent_lab.py` undocumented — resolved 2026-06-16: documented as Mode D in `preview_design_systems.md`.
- [x] AGB page (`app/agb/page.tsx`, `content/agb.md`) not referenced by any directive — resolved 2026-06-16: documented as optional step in `add_legal_pages.md`.
- [x] Prospect-table de-duplication (unique `(campaign_slug, email)` index + upsert-on-conflict) — resolved 2026-06-16: migration run in production (6 dups removed, index live), submit routes upsert, verified live; documented in `capture_contact_submission.md` and `deploy_to_netlify.md`.
- [x] Hero exploded-view / hero media — resolved 2026-06-17: built `sites/xoxocom/components/HeroGraph.tsx` (theme-token-driven animated node-network canvas, shortest-path Coral highlight on a ~5s loop), integrated into the home hero in `sites/xoxocom/app/page.tsx`, deployed live to https://xoxocom-ug.netlify.app.
- [x] Leistungen hero set — resolved 2026-06-17: `HeroGraphCluster` (Business Coaching, clustering-coefficient) and `HeroGraphHubs` (Expert Consulting, centrality & hubs) built, recorded, and deployed; all three service pages now have bespoke animated heroes.
- [x] Commit all unstaged work to git on branch `doe` — resolved 2026-06-18: commit `b2aefc2` ("feat(xoxocom): bilingual DE/EN site with instant language toggle"), 26 files; `.claude/` and `CLAUDE.md` remain gitignored by design.
- [x] Deploy bilingual XoXoCom to Netlify — resolved 2026-06-18: deployed live, cookie-driven SSR verified in production at https://xoxocom-ug.netlify.app.
- [ ] MAtfIT fake-door — `components/LegalShell.tsx` still renders the campaign signature `lm-matfit-fakedoor-3f9c1a` in the legal-pages footer. Edit that component if full visual removal is desired (user only requested landing + thank-you removal).
- [x] AutoResearch SEO — connect canonical domain `www.xoxocom.net` to Netlify — resolved 2026-06-26: apex A → 75.2.60.5; www CNAME → xoxocom-ug.netlify.app; Netlify primary domain set to www.xoxocom.net; TLS cert provisioned (expires 2026-09-27); https://www.xoxocom.net live and verified.
- [x] AutoResearch SEO — set `NEXT_PUBLIC_SITE_URL` Netlify env var — resolved 2026-06-26: not required; `site.config.json` `site_url` is the single source of truth; `NEXT_PUBLIC_SITE_URL` overrides it if set but is not needed.
- [x] AutoResearch SEO — commit SEO infrastructure files (`sites/xoxocom/lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, updated page.tsx files) to git on branch `doe` — resolved 2026-06-25: committed as part of commits 264e865 and 6ea5568, deployed 2026-06-26.
- [x] AutoResearch SEO — set `GOOGLE_SITE_VERIFICATION=<token>` as a Netlify production env var — resolved 2026-06-26: env var set on `xoxocom-ug`, redeployed, verification meta tag confirmed live in production HTML.
- [x] AutoResearch SEO — Google Search Console verification — resolved 2026-06-26: confirmed complete via Bing Webmaster Tools successfully importing the verified `www.xoxocom.net` property from GSC.
- [x] AutoResearch SEO — Bing Webmaster Tools setup — resolved 2026-06-26: site verified via GSC import; sitemap `https://www.xoxocom.net/sitemap.xml` submitted, Status = Success, 0 errors/warnings, 10 URLs discovered.
- [ ] AutoResearch SEO — optional: URL Inspection → Request Indexing in GSC for the homepage and priority pages (/produkte, /leistungen/ai-transformation, /ueber-uns, /kontakt).
- [x] `deploy_to_netlify.md` DNS-ordering-lesson reconciliation — resolved 2026-06-26: directive gained a "Connecting an externally-hosted custom domain" Process subsection and a new Edge Case for the 422 Unprocessable Entity failure with the correct DNS-first sequence.
- [ ] XoXoCom — deploy commit `61c5aea` (site signature removed from footer + head meta) to Netlify production, pending user go-ahead.
- [ ] XoXoCom — commit and deploy the reworded home "About us" copy (`sites/xoxocom/lib/copy.ts`, DE + EN), pending user go-ahead.
- [ ] AutoResearch Speed — capture the live PSI/Lighthouse BASELINE bookend against https://www.xoxocom.net before deploying the optimized (87.43) build — keyless PSI API quota was exhausted 2026-07-07; retry after quota reset or use pagespeed.web.dev manually; record mobile Performance + LCP/TBT/CLS in `execution/autoresearch/program/speed.md`'s Bookends section. Must happen BEFORE the next deploy — deploying first destroys the "before" measurement.
- [ ] AutoResearch Speed — deploy the optimized XoXoCom build (commits `718b515`…`943a165`, score 87.43) via `directives/deploy_to_netlify.md`, then capture the after-bookend in `program/speed.md`.
- [ ] AutoResearch — decide whether to commit the currently-untracked `execution/autoresearch/EXPLAINER.md`, and extend it with a plain-language speed section once before/after PSI numbers exist.
- [ ] AutoResearch Speed — optional runtime-only hygiene: pause hero canvas `requestAnimationFrame` loops via `IntersectionObserver` when scrolled offscreen (byte-invisible, not scored by `score_speed.py`).
- [ ] Optional future: locale-routed `app/[locale]/` with `hreflang` + per-locale metadata — needs user sign-off before a new directive is written.
- [ ] Verify Stop hook is active: user should open the `/hooks` settings panel or restart Claude Code once so the new `.claude/settings.json` is picked up by the settings-file watcher.
- [ ] `execution/deploy_netlify.py` does not yet automate the OneDrive external-build workaround — currently a manual procedure (documented in `deploy_to_netlify.md` Error Handling). Possible future improvement.
- [ ] `hero-centrality-hubs.*` assets regenerated at 1900×620 (native live-site canvas height). Re-record at 1900×790 via a bare full-bleed route if exact dimensional consistency across the exploded-views library is wanted.
- [ ] Swap the testing Gmail credentials for the owner's credentials before real production use.
- [ ] `add_legal_pages.md` known follow-ups: add sub-processor section to Datenschutz for Netlify, Supabase, and Google; sign DPAs with each; confirm Supabase project is on an EU region. Required before operating at scale.
- [ ] `sites/xoxocom/content/agb.md` is a placeholder DRAFT. Requires legal review and sign-off before the `/agb` page is suitable for production (AGB legal review).
