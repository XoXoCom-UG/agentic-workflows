# Directive: Design Landing Page (Iteration Loop)

## Goal

Iterate on the visual design of an in-progress landing page until the user approves it. This directive is called by `build_landing_page.md` after the initial scaffold + taste-skill pass. It is a screenshot → critique → edit → reload loop.

## Inputs

- **Slug** of the in-progress site (matches `sites/<slug>/`)
- **The running preview URL** from `execution/start_preview_server.py` (e.g. `http://localhost:3047`)
- **The page's `signature` token** and `visual_fingerprint` (read from `sites/<slug>/site.config.json`)
- **The avoid-list of fingerprints already used by prior sites** (read from every other `sites/*/site.config.json`)

## Tools / Scripts

- `browser-harness` (global CLI on $PATH) — for taking screenshots, clicking through the form, simulating viewport sizes
- Direct file editing in `sites/<slug>/app/`, `sites/<slug>/components/`, Tailwind classes inline
- Optional: `design-taste-frontend` skill if a deeper redesign is needed mid-iteration

## Process

1. **Initial screenshot pass** — Open the preview URL in browser-harness. Capture:
   - Full-page screenshot at 1440×900 (desktop)
   - Full-page screenshot at 390×844 (mobile)
   - Above-the-fold-only screenshot at desktop width (this is what most visitors see first)
   Save to `.tmp/<slug>/iter-0/`.

2. **Self-critique** — Look at the screenshots and call out:
   - Hierarchy: is the value prop legible in under 2 seconds?
   - Form: are all fields visible above the fold on desktop? On mobile?
   - Hero video (if present): is it muted, looped, playing inline? Is it pulling focus from the form or supporting it?
   - Contrast: any CTA button or label that fails WCAG AA?
   - Signature token: is it still visible on the page? Where?
   - Variance: does the design clearly diverge from the avoid-list (palette, layout, motion)?
   List concrete issues, prioritized.

3. **Present screenshots + critique to the user** — Show them the rendered page and your reading of it. Ask for their direction.

4. **Edit** — Apply the agreed changes by editing files in `sites/<slug>/` directly. Reload by saving (Next dev server auto-reloads).

5. **Re-screenshot** — Capture a new full-page screenshot and confirm the change landed as intended. Save to `.tmp/<slug>/iter-N/`.

6. **Repeat** steps 3-5 until the user says ship it.

7. **Pre-flight before deploy** — Run a final pass:
   - Submit the form with a real test email and verify the success flow locally (you should see the request hit `/api/submit`, get a 200 with `redirect_url`, and the browser should navigate to `/thank-you?to=...`).
   - Confirm the `signature` token is still visible.
   - Confirm `site.config.json` has the realized `visual_fingerprint` filled in (not the placeholder).

8. **Hand off to `deploy_to_netlify.md`** on user approval.

## Outputs (Deliverables)

- Final approved `sites/<slug>/` with edits applied
- `sites/<slug>/site.config.json` with `visual_fingerprint` populated to reflect the final realized design
- Screenshots in `.tmp/<slug>/iter-N/` (regenerable, not for delivery)

## Edge Cases

- **User asks for a change that would collapse the design onto a fingerprint already used by another site** (e.g. "make it like the acme one"): push back. Suggest an axis where the two pages can still differ (motion, typography) so they don't read as twins.
- **User asks to remove the `signature` token**: refuse and explain — the token is how they tell different campaigns apart in production. If they insist, save it to `site.config.json` only (no on-page presence) and warn them they're losing visual disambiguation.
- **Preview doesn't reload**: kill the dev server and re-run `start_preview_server.py`. Don't keep editing into a stale server.
- **Form submit fails locally with `db` or `invalid_email`**: that's a `.env.local` issue in `sites/<slug>/`, not a design issue. Re-run `python execution/sync_env_local.py --slug <slug>` from the repo root to regenerate `.env.local` from the current root `.env` and `site.config.json` (which is the source of `DRIVE_LINK` and other per-campaign vars). Surface the network response to the user and pause iteration.
- **Hero video stutters or doesn't autoplay**: check that the `<video>` element has `muted playsInline loop`. Browsers block autoplay without `muted`.

## Error Handling

- Don't auto-retry edits that broke the build. If `next dev` shows a compile error, fix the most recent file you touched first; if it's not obvious, undo the last edit and surface to the user.
- Tailwind v4 changes need a dev server restart in some cases (rare). If a utility class isn't applying, restart the preview before debugging further.
- Browser-harness coordinate clicks pass through iframes — if the site embeds the Drive preview in an iframe for any reason, clicks still work normally.
