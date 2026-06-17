# Directive: Design Website (awesome-design-md → tokens → iterate)

## Goal

Give an in-progress multi-page site a coherent, premium look by translating one
`awesome-design-md` brand `DESIGN.md` into the site's design tokens, applying it across
every page, then iterating on screenshots until the user approves. Called by
`build_website.md` after scaffolding. The whole site re-skins from one token block in
`app/globals.css`, so the design work is "pick a system, translate its tokens, then refine."

## Inputs

- **Slug** of the in-progress site (`sites/<slug>/`)
- **The desired vibe** — the look the user described (industry, mood, light/dark, editorial vs. product). Used to pick the brand.
- **The `awesome-design-md` library** — 74 brand DESIGN.md specs. Skill: `awesome-design-md` (`~/.claude/skills/awesome-design-md/SKILL.md`); library at `~/.claude/awesome-design-md/design-md/<brand>/DESIGN.md`.
- **The site's `signature` token** (read from `sites/<slug>/site.config.json`)

## Tools / Scripts

- `awesome-design-md` skill — invoke it to choose and read the brand DESIGN.md
- `browser-harness` (global CLI on `$PATH`) — screenshots, viewport sizes, clicking through nav and the form
- `execution/record_canvas_animation.py` — records a live `<canvas>` hero animation to `assets/exploded-views/<concept-name>.webm` + `.mp4`. Required whenever a new hero video/canvas graphic is produced. Needs `browser-harness` daemon running and `ffmpeg` on PATH.
- Direct file editing in `sites/<slug>/app/`, `sites/<slug>/components/`, and especially `sites/<slug>/app/globals.css` (the token block)

## Process

1. **Pick the brand** — From the user's desired vibe, choose the closest brand in the `awesome-design-md` catalog. Present 2–3 candidates with one-line rationale and confirm with the user before committing. (Do not guess silently — the choice sets the whole site's identity.)

2. **Read the full DESIGN.md** — Read the entire `DESIGN.md` for the chosen brand, not just the catalog blurb. Note its exact color hexes, type families + scale, spacing, radii, component rules, and brand voice.

3. **Copy the DESIGN.md into the site** — Copy the chosen `DESIGN.md` to `sites/<slug>/DESIGN.md` so the design system travels with the codebase (the skill's recommended workflow). Record the brand name in `site.config.json.design_source`.

4. **Translate tokens** — Edit `sites/<slug>/app/globals.css` `@theme` block: replace `--color-bg / -fg / -muted / -surface / -border / -accent / -accent-fg`, the `--font-*` stacks, and `--radius-card` with the brand's values. This is the highest-leverage step — every component reads these tokens (`bg-bg`, `text-fg`, `bg-accent`, etc.), so the site re-skins from here. If the brand needs web fonts, wire them via `next/font` in `app/layout.tsx` and point the `--font-*` vars at the CSS variables it exposes.

5. **Apply component + voice rules** — Walk each page (`app/page.tsx`, `app/about`, `app/services`, `app/contact`, and the legal pages) and adjust layout, spacing, type scale, and copy tone to match the DESIGN.md's component specs and voice. Replace placeholder copy with the operator's real content. Honor the brand's do's/don'ts. Keep the `signature` token in the footer.

6. **Screenshot pass** — With `browser-harness`, capture each route at 1440×900 (desktop) and 390×844 (mobile). Save to `.tmp/<slug>/iter-0/`.

7. **Self-critique** — For each page: is the hierarchy legible in under 2 seconds? Does the nav work and highlight the right structure? Do colors/contrast pass WCAG AA? Does the realized look actually match the chosen DESIGN.md (palette, type, spacing, radii)? Is the `signature` still visible? List concrete, prioritized issues.

8. **Present + iterate** — Show screenshots + critique to the user, get direction, edit files, reload (Next auto-reloads on save), re-screenshot to `.tmp/<slug>/iter-N/`. Repeat until the user says ship it.

9. **Record hero animation** — This step is mandatory whenever a hero canvas/video graphic exists. Run `execution/record_canvas_animation.py` to capture approximately 12 seconds (about 2 full animation cycles) of the hero `<canvas>` at its native on-page resolution (cropped to even dimensions for H.264) and save to `assets/exploded-views/<concept-name>.webm` + `.mp4`. The concept name follows the animation's subject (e.g., `hero-node-network` for a shortest-path home hero, `hero-cluster-coefficient` for a clustering business-coaching hero). The script: navigates to the page (local preview or deployed URL), opens a CDP screencast to prevent Chrome from throttling `requestAnimationFrame` when the window is backgrounded, waits for the animation to settle, composites each canvas frame onto the `--color-bg` background in an offscreen canvas, uses `MediaRecorder` with VP9 to capture the stream, then passes the raw webm to ffmpeg (libx264/yuv420p, even dimensions enforced via crop filter) to produce the mp4 sibling. This recording must happen before the Netlify deploy; it is a reusable deliverable asset, not a `.tmp/` intermediate.

   Example command (from repo root):
   `python execution/record_canvas_animation.py --url http://localhost:3000 --name hero-cluster-coefficient --seconds 12`

   Do not pass paths with non-ASCII characters through the shell heredoc that browser-harness uses. The `--bg` flag overrides background color detection; by default the script reads the page's `--color-bg` CSS token.

10. **Pre-flight before deploy** — Run `npm run build` to confirm it compiles. For a contact-form site, submit the form locally with a real test email and confirm a 200 from `/api/submit` + the inline success state. Confirm `site.config.json` has `design_source` and `visual_fingerprint` filled in.

11. **Hand off** — to `add_legal_pages.md` (fill operator data), then `deploy_to_netlify.md` on approval.

## Outputs (Deliverables)

- `sites/<slug>/app/globals.css` with the brand's tokens
- `sites/<slug>/DESIGN.md` — the chosen brand spec, copied in
- Final approved `sites/<slug>/` pages with real copy
- `site.config.json` with `design_source` + realized `visual_fingerprint`
- `assets/exploded-views/<concept-name>.webm` + `.mp4` — reusable hero recording (deliverable library, not `.tmp/`). Produced whenever a hero canvas/video graphic is built.
- Screenshots in `.tmp/<slug>/iter-N/` (regenerable, not delivered)

## Edge Cases

- **No brand fits the vibe**: pick the closest base (palette/structure) and adapt its tokens; record the base in `design_source` with a note. Do not invent a system from scratch — the point of `awesome-design-md` is a proven token set.
- **Brand is dark-mode but the site needs light (or vice-versa)**: invert the neutral tokens (`bg`/`fg`/`surface`/`border`) while keeping the brand's accent; the `.legal-prose` block reads the same tokens, so legal pages follow automatically.
- **User asks to remove the `signature` token**: explain it disambiguates sites in production. If they insist, keep it in `site.config.json` only and warn them.
- **Preview doesn't reload / a class won't apply**: Tailwind v4 occasionally needs a dev-server restart. Kill and re-run `start_preview_server.py` before debugging further.
- **A page outside the template's four exists**: design it to the same tokens and add it to the nav (`pages` in `site.config.json`).

## Error Handling

- Don't auto-retry edits that broke the build. If `next dev` shows a compile error, fix the most recent file you touched; if not obvious, undo the last edit and surface to the user.
- Web-font flashes (FOUT): use `next/font` with `display: "swap"` and set the `--font-*` token to its CSS variable rather than importing a raw `@font-face` in `globals.css`.
- Keep edits token-first. Reach for per-component overrides only when a brand rule genuinely can't be expressed through the shared tokens — otherwise the next rebrand drifts.
- **`record_canvas_animation.py` — canvas not found or no size**: the script prints `REC_ERR no canvas matched selector` or `REC_ERR canvas has no backing size`. Confirm the hero component has mounted and the canvas has a non-zero width/height (check with a screenshot first). A `--settle` value of 2.5s is the default; increase it if the animation takes longer to initialise.
- **`record_canvas_animation.py` — rAF throttling / frozen recording**: the script detects this and prints `REC_ERR recorder did not finish`. Ensure the browser-harness daemon is running and the screencast is not being blocked. The CDP `Page.startScreencast` call is what keeps Chrome producing frames while the window is backgrounded; if it fails, the MediaRecorder captures a static image.
- **`record_canvas_animation.py` — ffmpeg not found**: install ffmpeg and confirm it is on PATH, or pass `--no-mp4` to produce only the webm.
- **Non-ASCII characters in the output path**: the browser-harness heredoc does not handle non-ASCII safely. Keep `assets/exploded-views/` names ASCII-only.
