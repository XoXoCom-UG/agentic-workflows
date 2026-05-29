# Design Landing Page (Iterative)

## Goal

Iteratively design and refine `landing_page/index.html` based on user feedback, with a live local browser preview after every change. Run this workflow only when the user explicitly requests to create, update, or redesign the lead magnet landing page. Do not start it automatically.

---

## Inputs

- **design_request** — The user's description of what they want changed or built (e.g. "center the hero", "change the background colour to navy", "use the MP4 from lead_magnet_assets as the hero background")
- **asset_path** *(optional)* — Path to any file in `lead_magnet_assets/` to be referenced in the page (e.g. a video or image)

---

## Tools / Scripts

| Tool | Purpose |
|------|---------|
| `python -m http.server 8080` | Serves the `doe/` root locally so both `landing_page/` and `lead_magnet_assets/` resolve correctly |
| `landing_page/index.html` | The single-file landing page (HTML + CSS + JS) — the only file edited during this workflow |

No execution scripts are called during the design phase. This workflow is purely frontend iteration.

---

## Process

### Step 1 — Start local preview server (once per session)
From the `doe/` root directory, start the HTTP server in the background:
```bash
python -m http.server 8080
```
Open `http://localhost:8080/landing_page/index.html` in the browser.

Only start the server if it is not already running. Do not start it unless the user has explicitly asked to work on the landing page.

### Step 2 — Apply the requested change
Edit `landing_page/index.html` directly. The file is self-contained (HTML + `<style>` + `<script>`) — no build step, no framework.

Common change types:
- **Layout / spacing** — CSS flexbox/grid adjustments in `<style>`
- **Video / image background** — `<video>` or `<img>` source update + CSS positioning
- **Colour / typography** — CSS custom properties in `:root { ... }`
- **Copy** — Update text directly in the HTML
- **Gradient / mask** — CSS `mask-image` or overlay adjustments
- **Form behaviour** — JS changes inside `<script>`

### Step 3 — Show the result
After saving the file, tell the user to refresh the browser (or use browser-harness to reload and capture a screenshot if available). Present what changed in one sentence.

### Step 4 — Iterate
Wait for the user's next design input. Repeat Steps 2–3 for each change.

### Step 5 — User approves
When the user says the design is approved (e.g. "looks good", "ship it", "deploy it"), stop iterating. Do not deploy — deployment is handled by the separate Netlify deploy step documented in the plan.

---

## Outputs (Deliverables)

- **`landing_page/index.html`** — Updated, user-approved file ready for Netlify deployment

> No cloud deliverable is produced during this workflow. Deployment happens separately, only on explicit user approval.

---

## Edge Cases

**Video doesn't play in browser.** Modern browsers block autoplay unless `muted` is set on the `<video>` element. Ensure `autoplay muted loop playsinline` attributes are all present. If it still fails, the browser may require a user interaction — add a click-to-unmute overlay.

**Video path resolves to 404.** The server must be started from the `doe/` root (not from `landing_page/`), so that `../lead_magnet_assets/` resolves correctly. If the path is wrong, adjust the `<source src="...">` to match.

**Port 8080 already in use.** Try port 8081 or 3000. Update the browser URL accordingly.

**User requests a change that needs a new asset.** Check `lead_magnet_assets/` for the file first. If it doesn't exist, ask the user to place it there before referencing it in the HTML.

**User asks to deploy mid-iteration.** Confirm the design is finalised first. Then follow the Netlify deployment steps in the plan — do not deploy a work-in-progress.

---

## Error Handling

- Keep all styles and scripts inline in `index.html`. Do not split into separate `.css` or `.js` files — it complicates Netlify deployment for a single-page deliverable.
- Never overwrite the `API_ENDPOINT` constant in the `<script>` block during design iterations. That value is set at deployment time.
- Do not commit or push `landing_page/` to the repository until the user approves the design.
