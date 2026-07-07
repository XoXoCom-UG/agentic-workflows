# Research direction — XoXoCom page-weight / speed

> This is the human-owned "program.md" of the AutoResearch contract. It tells the
> agent WHAT to optimize and the rules of the game. The agent never edits this file;
> it edits the site artifacts and is scored by `execution/autoresearch/score/score_speed.py`.

## Goal

Drive the XoXoCom site's speed score (0–100) as high as possible by shrinking what
every visitor must download: first-load JavaScript, fonts, CSS, and HTML. The score is
a deterministic byte-budget audit of a PRODUCTION build (`next build` + `next start`),
served outside OneDrive via `execution/autoresearch/serve_prod.py`. Smaller bytes →
faster LCP/TTI on real phones → better Core Web Vitals → better ranking + fewer bounces.

Baseline (2026-07-07, frozen budgets): per-route JS 149–158 KB gz, shared JS
149 KB gz, critical font ~24 KB (1 file), ~20 script tags per page. The definitive
baseline score is row 1 of `results/speed.tsv`.

Calibration finding (2026-07-07): Manrope is a VARIABLE font — next/font serves the
same unicode-range slices regardless of the `weight` list, and browsers only download
the latin slice (~24 KB) for this de/en site. Reducing weights 5→3 was probed and is a
byte no-op; fonts are already effectively optimal. The scorer therefore measures
"critical" fonts (preloaded + next/font `.p.` priority subsets), and the real levers
are all JavaScript.

## What you may edit (the "train.py")

- Anything under `sites/xoxocom/` — components, `app/**`, `lib/**`,
  `next.config.mjs`, `package.json` (deps must stay pinned via `package-lock.json`)
- Typical levers: `app/layout.tsx` (fonts), `components/content/*Content.tsx` and
  `lib/i18n.tsx` (client → server components), `components/HeroGraph*.tsx`
  (`next/dynamic` lazy mounts), `lib/copy.ts` consumers

## What you may NOT do

- Never edit the scorer (`score/score_speed.py`), its budgets, or this file mid-run —
  recalibrating corrupts `prev_best` comparability in `results/speed.tsv`.
- Never score against `next dev` — the scorer hard-rejects it (`passed=false`).
- Never break experiment #1: `score_speed.py` re-runs `score_seo.py` as a hard gate;
  any change that drops SEO below 100 is auto-reverted regardless of byte savings.
- Never delete or thin out visible copy/content to save bytes. The `ssr_content`
  check guards against content vanishing from server-rendered HTML, and the SEO gate
  guards metadata — but the words themselves are the product; byte wins must come
  from HOW the site ships, not WHAT it says.
- Do not break the language toggle, contact form, or hero animations. The byte scorer
  cannot see runtime behavior — after any i18n/hydration refactor, verify UX manually.

## Scoring rules (summary — see the scorer for exact weights and budgets)

- Per route (70%): first-load JS gzip KB (dominant weight, target 110 / limit 260),
  server-rendered content present without JS (h1 + ≥300 visible chars), CSS KB,
  HTML KB, zero third-party requests, script-tag count (target 10), preload hygiene,
  no blocking head scripts.
- Site level (30%): shared JS across ALL routes (target 95 / limit 220), total font
  KB (target 45), ≤3 font files, compression served, immutable caching on
  `/_next/static/*`.
- Byte checks are linear ramps — every whole KB shaved moves the score.
- Hard gates (`passed=false` → revert): any route non-200, any referenced asset 404,
  dev server detected, SEO score < 100.

## Known constraints (do not fight them)

- `next build` fails intermittently inside OneDrive. ALWAYS build/serve through
  `serve_prod.py` (it mirrors the site to `C:\xoxo-build\xoxocom-speed` and builds
  there). The repo stays the single source of truth.
- The scorer measures bytes, not runtime. Wins that don't change bytes (pausing
  canvas `requestAnimationFrame` when the tab is hidden, removing an unused-but-
  tree-shaken dependency) are still worth doing — as plain commits OUTSIDE the loop,
  with no TSV row.
- Language switching uses the `xoxocom-lang` cookie with ONE URL per page. A
  server-side i18n refactor must keep that contract: read the cookie via `cookies()`
  and keep `LangToggle` client-side (set cookie → `router.refresh()`).

## Hypotheses to try (roughly highest-leverage first)

1. Lazy-load the 3 canvas heroes (`HeroGraph`, `HeroGraphHubs`, `HeroGraphCluster`)
   via `next/dynamic` so their chunks leave the first-load bundle — a contained early
   win that validates the loop end-to-end.
2. Move i18n server-side, ONE page per iteration: convert
   `components/content/*Content.tsx` to server components that read the
   `xoxocom-lang` cookie; the full bilingual copy stops shipping as client JS.
   Biggest `js_kb`/`shared_js_kb` lever. Verify the toggle manually afterwards.
3. Check for client-bundle leakage of server-only deps (`marked`,
   `@supabase/supabase-js`; `nodemailer` is already in `serverExternalPackages`).
4. `next.config.mjs` tuning (`optimizePackageImports`, etc.).

Probed and rejected (do not retry): Manrope weight reduction 5→3 — byte-identical
output (variable font; see calibration finding above).

Out-of-loop hygiene (plain commits, no TSV rows — byte-invisible): remove the unused
`motion` dependency from `package.json`; pause hero `requestAnimationFrame` loops when
the tab is hidden or the canvas is offscreen.

## Bookends (outside the loop)

Before iteration 1 and again after the final deploy, run PageSpeed Insights
(https://pagespeed.web.dev, free) against the live URL and record mobile
Performance + LCP/TBT/CLS below. This validates that byte savings became real
Lighthouse gains — Lighthouse's run-to-run noise is why it is NOT the loop metric.

- Baseline PSI (pre-optimization): _to be recorded_
- Final PSI (post-deploy): _to be recorded_
