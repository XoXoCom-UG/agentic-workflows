# Directive: Preview Design Systems

## Goal

Let the user see the `awesome-design-md` brand design systems as rendered HTML before
committing to one — either the whole catalog at a glance, or full-page mockups of
specific brands. This is the visual front end to step 1 of `design_website.md`: browse,
pick a brand, then build the real site with that brand's `DESIGN.md`.

## Inputs

Ask which mode the user wants; do not assume:

- **Catalog gallery** — one page with a small live card for every brand. No input needed. Best for "show me everything / help me choose."
- **Per-brand full-page preview(s)** — a complete one-page marketing mockup per brand. Input: **one or more brand names** (e.g. `stripe`, or `stripe, linear, vercel`). Best for "show me what a site in <brand>'s style looks like." The user may request a single brand or several at once.
- **Font lab** — side-by-side typeface comparison using a single brand's color tokens. Input: **one brand name**; optionally a comma-separated list of Google Font names.
- **Accent lab** — side-by-side accent-color comparison using a single brand's canvas and ink. Input: **one brand name**; optionally a comma-separated list of `Name:#hex` pairs.

Brand names are resolved leniently (`linear` → `linear.app`, `mistral` → `mistral.ai`), so pass what the user typed. The full brand list is the 74-entry catalog in the `awesome-design-md` SKILL.md (also printed by any script on an unknown name).

## Tools / Scripts

- `execution/preview_design_systems.py` — renders the **catalog gallery** of all 74 brands to one self-contained HTML file. Each card shows the brand in its own canvas/ink/accent, a light/dark badge, the description, palette swatches, and a live filter box. Card title = the exact `--design-source` value.
- `execution/build_brand_preview.py` — renders a **full-page preview** (header, hero, trust strip, feature grid, stats band, CTA, footer) per brand, each as its own self-contained HTML file. Accepts `--brands <csv>` or `--all`; writes a contact-sheet `index.html` when more than one brand is built.
- `execution/build_font_lab.py` — renders a **font lab**: holds a chosen brand's canvas/ink/accent tokens fixed and shows the same contextual specimen (eyebrow, headline, subhead, body, buttons) side by side in multiple candidate Google Fonts, so the user can pick a typeface that differentiates their site from the source brand while keeping its color/feel. Accepts `--design-source` (required), `--fonts "Sora,Manrope,Inter"` (default: curated 10), `--headline`, `--eyebrow`.
- `execution/build_accent_lab.py` — renders an **accent lab**: holds a chosen brand's canvas and ink fixed and swaps the accent across multiple candidate colors, each shown in context (eyebrow, headline accent word, CTA, link, stat figures) with hex labeled and contrast auto-checked. Accepts `--design-source` (required), `--accents "Indigo:#6366F1,Emerald:#10B981"` (default: curated 5), `--headline`, `--eyebrow`.
- `execution/design_md_lib.py` — shared parser + color-role derivation used by all four scripts (not run directly).
- `browser-harness` (global CLI) — optional, to open a preview and screenshot it for the user.

No API tokens or `.env` required — all scripts read the local library only.

## Process

### A. Catalog gallery (browse everything)

1. Run `python execution/preview_design_systems.py`.
2. It writes `.tmp/awesome_design_gallery/index.html` and prints a `file://` URL.
3. Give the user the path/URL (optionally open + screenshot via `browser-harness`). They filter by brand or vibe ("dark", "fintech", "editorial", "green") to narrow down.

### B. Per-brand preview(s) (on demand)

1. Confirm the brand name(s) the user wants. One or many.
2. Run:
   - single: `python execution/build_brand_preview.py --brands stripe`
   - several: `python execution/build_brand_preview.py --brands stripe,linear,vercel`
   - all: `python execution/build_brand_preview.py --all`
3. Each preview is written to `.tmp/brand_previews/<brand>/index.html`. When more than one is built, a contact-sheet `.tmp/brand_previews/index.html` links them all.
4. Hand the user the `file://` URL(s) the script prints (optionally open + screenshot the top + a lower section via `browser-harness` so they see it inline).
5. When the user picks a brand to actually build with, proceed to `design_website.md` step 1 using that brand as `--design-source`.

### C. Font lab (differentiate the typeface)

Use this after a brand's colors are chosen but before committing to a display font. The lab renders the brand's canvas/ink/accent unchanged and cycles through candidate Google Fonts so the user can see which typeface fits without requiring the source brand's proprietary font.

1. Confirm the brand name. Ask if the user has specific fonts in mind; if not, use the script's curated 10.
2. Run:
   - default fonts: `python execution/build_font_lab.py --design-source binance`
   - specific fonts: `python execution/build_font_lab.py --design-source binance --fonts "Sora,Manrope,Inter"`
   - custom copy: add `--headline "Your tagline here."` and/or `--eyebrow "Your company"`
3. The script writes `.tmp/font_lab/<brand>/index.html` and prints the `file://` URL. Hand the URL to the user (optionally screenshot via `browser-harness`).
4. When the user selects a font, record it as the `--display` font family in `design_website.md`.

### D. Accent lab (differentiate the accent)

Use this when the user wants the source brand's canvas and ink but a different accent color — for example, keeping a near-black/white palette while swapping away from a branded yellow. Each candidate is shown in context with auto-checked contrast.

1. Confirm the brand name. Ask if the user has specific accent colors in mind; if not, use the script's curated 5.
2. Run:
   - default accents: `python execution/build_accent_lab.py --design-source binance`
   - specific accents: `python execution/build_accent_lab.py --design-source binance --accents "Indigo:#6366F1,Emerald:#10B981"`
   - custom copy: add `--headline "Your tagline here."` and/or `--eyebrow "Your company"`
3. The script writes `.tmp/accent_lab/<brand>/index.html` and prints the `file://` URL. Each specimen shows the hex code and confirms the contrast ratio. Hand the URL to the user.
4. When the user selects an accent, record it as the accent token override in `design_website.md`.

## Outputs (Deliverables)

- **Gallery**: `.tmp/awesome_design_gallery/index.html` (all 74 brands).
- **Per-brand**: `.tmp/brand_previews/<brand>/index.html` for each requested brand, plus `.tmp/brand_previews/index.html` (contact sheet) when multiple.
- **Font lab**: `.tmp/font_lab/<brand>/index.html` — self-contained except the Google Fonts `<link>` tag (requires internet to render the fonts; the file still generates offline).
- **Accent lab**: `.tmp/accent_lab/<brand>/index.html` — fully self-contained; contrast text is computed locally.
- All outputs live under `.tmp/` — regenerable intermediates, not committed. The durable artifacts are the `execution/` scripts.

## Edge Cases

- **Unknown brand name**: the script exits non-zero and prints the full list of available brands. Relay the closest matches to the user and ask which they meant.
- **Ambiguous short name** (e.g. `bmw` when both `bmw` and `bmw-m` exist): exact matches win, so `bmw` resolves to `bmw`; tell the user to type `bmw-m` for the motorsport variant. For a true tie with no exact match, the first alphabetical prefix match is used — confirm with the user if it matters.
- **User wants several previews at once**: pass them all in one `--brands a,b,c` run; the contact sheet is generated automatically. Don't run the script once per brand unless they ask for isolated outputs.
- **Library missing / moved**: pass `--library <path>` to point at the `awesome-design-md/design-md` folder. Default is `~/.claude/awesome-design-md/design-md`.

## Error Handling

- **Proprietary fonts**: previews label the brand's display font but can't load proprietary families (Söhne, figmaSans, etc.), so type falls back to system fonts. Colors and layout are faithful; set expectations that the typeface may differ from the real brand. Stated in each page's footer.
- **Accent is a heuristic**: the accent is the most chromatic color in the palette. For monochrome or prose-format brands it can pick a secondary hue (e.g. Spotify resolves to an orange rather than its signature green). The full palette swatches and the description still show the true brand color — point the user there if the accent looks off.
- **Font lab needs internet to display fonts**: the generated HTML loads Google Fonts via a `<link>` tag. The file generates successfully offline, but the font specimens will fall back to system fonts until the page is opened with an internet connection. This is expected — note it to the user if they're offline.
- **Don't auto-retry `browser-harness`** if its CDP connection drops — re-allow remote debugging in Chrome once, then retry. Generating the HTML never needs the browser; screenshots are a convenience.
