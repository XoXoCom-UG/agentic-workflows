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

XoXoCom site is now bilingual (German + English) with client-side navigation and server-side language rendering. Minor UI fix (2026-06-18 11:15): `LangToggle` is now rendered exactly once — in the header at all breakpoints (desktop, split, and mobile) — sitting next to the hamburger button; the duplicate that previously lived inside the mobile menu panel has been removed. Still local preview only — uncommitted on branch `doe`, not deployed to Netlify.

Previous state: bilingual i18n feature + home-page content fix are on branch `doe` (uncommitted). Business-coaching hero, `record_canvas_animation.py`, Stop hook, and OneDrive deploy workaround all remain deployed-but-uncommitted.

Outstanding items: bilingual feature (including performance fix) uncommitted and undeployed; all previously-listed unstaged files still pending commit; `execution/deploy_netlify.py` does not automate the OneDrive external-build workaround; `hero-centrality-hubs.*` may need re-recording at 1900×790; three legal follow-ups in `add_legal_pages.md`; `sites/xoxocom/content/agb.md` placeholder DRAFT pending legal sign-off; testing Gmail credentials must be swapped for owner credentials before production use.

---

## Progress Log

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
- [ ] Commit all unstaged work to git on branch `doe`. Includes: bilingual i18n feature + home-content bugfix + performance fix (`lib/copy.ts`, `lib/i18n.tsx`, `LangToggle.tsx`, `app/layout.tsx`, `components/SmartLink.tsx`, all seven updated route/content files, updated `SiteHeader`, `Footer`, `FooterLinks`, `ContactForm`, `lib/config.ts`, `components/content/HomeContent.tsx`); `sites/xoxocom/components/HeroGraphCluster.tsx`; `sites/xoxocom/app/leistungen/business-coaching/page.tsx`; `sites/xoxocom/components/HeroGraphHubs.tsx`; `sites/xoxocom/app/leistungen/expert-consulting/page.tsx`; `execution/record_canvas_animation.py`; `assets/exploded-views/hero-cluster-coefficient.webm`; `assets/exploded-views/hero-cluster-coefficient.mp4`; `assets/exploded-views/hero-centrality-hubs.webm` (regenerated); `assets/exploded-views/hero-centrality-hubs.mp4` (regenerated); directive edits; `execution/hooks/ensure_progress_logged.py`; `.claude/settings.json`; `CLAUDE.md` (Stop hook + Operating Principle 4 hardening).
- [ ] Deploy bilingual XoXoCom to Netlify (local preview only as of 2026-06-18 10:00; home content and navigation performance now correct).
- [ ] Optional future: locale-routed `app/[locale]/` with `hreflang` + per-locale metadata — needs user sign-off before a new directive is written.
- [ ] Verify Stop hook is active: user should open the `/hooks` settings panel or restart Claude Code once so the new `.claude/settings.json` is picked up by the settings-file watcher.
- [ ] `execution/deploy_netlify.py` does not yet automate the OneDrive external-build workaround — currently a manual procedure (documented in `deploy_to_netlify.md` Error Handling). Possible future improvement.
- [ ] `hero-centrality-hubs.*` assets regenerated at 1900×620 (native live-site canvas height). Re-record at 1900×790 via a bare full-bleed route if exact dimensional consistency across the exploded-views library is wanted.
- [ ] Swap the testing Gmail credentials for the owner's credentials before real production use.
- [ ] `add_legal_pages.md` known follow-ups: add sub-processor section to Datenschutz for Netlify, Supabase, and Google; sign DPAs with each; confirm Supabase project is on an EU region. Required before operating at scale.
- [ ] `sites/xoxocom/content/agb.md` is a placeholder DRAFT. Requires legal review and sign-off before the `/agb` page is suitable for production (AGB legal review).
