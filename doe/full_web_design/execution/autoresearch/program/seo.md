# Research direction — XoXoCom SEO completeness

> This is the human-owned "program.md" of the AutoResearch contract. It tells the
> agent WHAT to optimize and the rules of the game. The agent never edits this file;
> it edits the site artifacts and is scored by `execution/autoresearch/score/score_seo.py`.

## Goal

Drive the XoXoCom site's SEO-completeness score (0–100) as close to 100 as possible by
making the site fully discoverable and rich when shared. The score is a deterministic
audit of the rendered HTML of every public route plus two site-level checks
(`/sitemap.xml`, `/robots.txt`). Higher = more complete.

## What you may edit (the "train.py")

- `sites/xoxocom/app/sitemap.ts` and `sites/xoxocom/app/robots.ts` (create them)
- `sites/xoxocom/app/layout.tsx` — `metadataBase`, default Open Graph / Twitter, title
  template, JSON-LD `Organization`, Google Search Console verification slot
- Per-page `metadata` exports under `sites/xoxocom/app/**/page.tsx`
- `sites/xoxocom/app/opengraph-image.tsx` (a branded default OG image via `next/og`)
- `sites/xoxocom/lib/seo.ts` (a metadata helper) and `sites/xoxocom/lib/config.ts`

## What you may NOT do

- Never edit the scorer (`score/score_seo.py`) or this file.
- Never hardcode the domain. The canonical base URL comes from `site.config.json`
  (`site_url`) / `NEXT_PUBLIC_SITE_URL`. Keep every canonical/OG URL config-driven.
- Keep titles/descriptions sourced from `lib/copy.ts` where possible so they stay
  bilingual and in sync; do not invent contradictory copy.
- Do not break the build. A change that fails `passed` (route not 200, sitemap/robots
  missing) is reverted regardless of score.

## Scoring rules (summary — see the scorer for exact weights)

- Per route (70% of score): unique title (~30–60 chars), unique description (~120–160),
  exactly one `<h1>`, canonical on the configured domain, correct `<html lang>`, full
  Open Graph set (`og:title/description/image/url/type/locale`) + `og:locale:alternate`,
  a Twitter card, JSON-LD, and alt text on every image.
- Site level (30%): valid `/sitemap.xml` listing all routes; `/robots.txt` that
  references the sitemap.

## Known constraint (do not fight it)

Language is switched client-side via the `xoxocom-lang` cookie; there is ONE URL per
page (German by default). True per-language `hreflang` needs distinct URLs (locale
routing) — out of scope here. Signal bilingual availability with `og:locale` (de_DE) +
`og:locale:alternate` (en_US) instead. Locale-routed hreflang is a future phase.

## Hypotheses to try (roughly highest-leverage first)

1. Add `app/robots.ts` + `app/sitemap.ts` (the two site-level checks = 30% of score).
2. Set `metadataBase` + default Open Graph/Twitter + title template in `layout.tsx`.
3. Add a branded `app/opengraph-image.tsx` so every page gets `og:image`.
4. Add JSON-LD `Organization` to the root layout.
5. Enrich each page's `metadata` (canonical, openGraph, unique 120–160-char descriptions).
6. Tune title/description lengths into the ideal bands; ensure uniqueness across routes.
