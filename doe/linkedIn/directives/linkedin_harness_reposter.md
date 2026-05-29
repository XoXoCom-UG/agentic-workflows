# LinkedIn Business Account Reposter (Browser Harness)

## Goal
Repost a specific LinkedIn post from a personal account to a business/organization
page using the browser harness — direct CDP control of the user's already-logged-in
Chrome. No session files, no Playwright, no separate browser process.

This is the preferred approach over `linkedin_business_account_reposter.md`
(Playwright version) because it uses the user's real browser fingerprint and
requires no authentication setup.

## Inputs
- **[OPTIONAL] Post URL**: The full URL of the LinkedIn post to repost
  (e.g., `https://www.linkedin.com/posts/username_activity-123456789`).
  If omitted, the agent automatically fetches the earliest post from Patrick's profile
  within the last 7 days (see Step 1 below).
- **[OPTIONAL] Business Account Name**: Name of the target LinkedIn organization/business page
  (e.g., "XoXoCom UG (Haftungsbeschränkt)"). If omitted, read `LINKEDIN_BUSINESS_ACCOUNT_NAME`
  from `.env`. If that is also unset, ask the user before proceeding.
- **[OPTIONAL] Commentary**: Text to prepend to the repost. If omitted, the repost
  still uses "Mit Kommentar teilen" flow (required for business page targeting)
  but leaves the text field empty.
- **[OPTIONAL] Scheduled Time**: Delay posting until this time (e.g., "2026-05-15 09:00 CET").
  If omitted, post immediately.

## Prerequisites
- User must be an admin of the target business page (XoXoCom UG)
- Everything else (Chrome launch, profile, session) is handled automatically by `launch_chrome_debug.py`

## Tools
- **`execution/linkedin_fetch_profile_posts.py`** — Connects to Chrome CDP and navigates to
  Patrick's recent-activity page to find the earliest **unposted** post within the last 7 days.
  Skips any URL already recorded in `data/repost_log.json`. Writes the result to
  `.tmp/patrick_latest_post.json`. Exit code 0 = found, 1 = error, 2 = all posts in the window
  already reposted (nothing to do).
- **`execution/linkedin_record_repost.py`** — Appends a successfully reposted post URL and
  timestamp to `data/repost_log.json`. Call only after V2 verification confirms success.
- **`execution/launch_chrome_debug.py`** — Fully autonomous Chrome launcher. No user input ever required. Handles:
  - Chrome not running → launches with debug profile automatically
  - Chrome running without correct flags (CDP blocked) → kills and relaunches automatically
  - Uses dedicated `DebugProfile` user-data-dir to bypass Chrome's default-profile CDP restriction
  - Bootstraps `DebugProfile` with xoxocom.net session cookies from `Profile 1` on first run
  - Verifies CDP via `/json/version` endpoint (not just port open) before declaring ready
  - Safe to run repeatedly — fast no-op when CDP is already accessible
- **browser-harness** — Run inline during the conversation. No execution/ scripts needed.
- **Domain skill**: `Developer/browser-harness/agent-workspace/domain-skills/linkedin/repost.md`
  — Read this file before navigating. It documents the full repost flow, button labels
  (German and English), and known traps.

## Rate Limiting Rules (ALWAYS ENFORCE)
- Minimum **30 seconds** between consecutive reposts
- Maximum **5 reposts per hour**
- Maximum **20 reposts per day**
- If limits are approached, notify user and halt until the window resets

## Process

### Step 0: Ensure Chrome is ready (fully autonomous)
Run `execution/launch_chrome_debug.py` before any browser-harness call. It is fully
autonomous — no user interaction required under any circumstances. It will:
1. Check if CDP is already accessible on port 9222 via `/json/version` → if yes, exits immediately
2. If Chrome is running but CDP is blocked → kills Chrome and relaunches with correct flags
3. If Chrome is not running → launches directly into the `DebugProfile` (xoxocom.net session)
4. Waits up to 25 seconds for CDP to become accessible before declaring failure

```
python execution/launch_chrome_debug.py
```

If it exits with code 0 and prints "Chrome CDP ready", proceed. If it exits with code 1,
check that Chrome is installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`.

### Step 1: Auto-discover Post URL (skip if user provided one)

If no Post URL was supplied, run:

```
python execution/linkedin_fetch_profile_posts.py
```

This script:
1. Connects to the running Chrome session via CDP (port 9222)
2. Navigates to `PATRICK_LINKEDIN_PROFILE_URL` from `.env`
   (default: `https://www.linkedin.com/in/patryk-kwitowski/recent-activity/all/`)
3. Scrolls to load posts and extracts all post URLs + timestamps
4. Filters to posts published within the last 7 days
5. Reads `data/repost_log.json` and skips any post URLs already recorded there (oldest → newest)
6. Picks the **earliest unposted** post in the window
7. Writes the result to `.tmp/patrick_latest_post.json`

**Exit code 2** means all posts in the window have already been reposted — stop immediately and
report "All posts from the last 7 days have already been reposted. Nothing to do this run."

On success, read the post URL from the output file:
```python
import json
result = json.loads(open(".tmp/patrick_latest_post.json").read())
post_url = result["post_url"]
# e.g. "https://www.linkedin.com/posts/patryk-kwitowski_..."
```

If the script exits with code 1, read its stderr for the exact reason and stop before
proceeding. Do not guess a URL — surface the error to the user.

### Step 2: Read the domain skill
Before touching the browser, read the domain skill file in full:
`Developer/browser-harness/agent-workspace/domain-skills/linkedin/repost.md`

This file documents the full UI flow, German/English label variants, and fallbacks
for known tricky states (greyed "Fertig" button, "Speichern" appearing disabled, etc.).

### Step 3: Validate inputs
Check before opening any browser tab:
- Post URL is now known (either user-supplied or fetched in Step 1). Confirm it matches a
  valid LinkedIn post pattern: `https://www.linkedin.com/posts/...` or
  `https://www.linkedin.com/feed/update/...`
- Business Account Name: if not provided by user, read `LINKEDIN_BUSINESS_ACCOUNT_NAME` from `.env`; if still unset, stop and ask
- If Scheduled Time provided: verify it is in the future. If in the past, stop and ask.

### Step 4: Navigate to the post

```python
new_tab(post_url)
wait_for_load()
capture_screenshot()
```

Verify the post loaded (not a login wall / authwall redirect). If redirected to
`/login` or `/authwall`, the DebugProfile session has expired — auto-login using
credentials from `.env` (`LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD`):

```python
# Auto-login flow (only triggered on authwall redirect)
goto_url("https://www.linkedin.com/login")
wait_for_load()
# Fill email
pos = js("(() => { const el = document.getElementById('username'); const r = el.getBoundingClientRect(); return JSON.stringify({cx: Math.round(r.x+r.width/2), cy: Math.round(r.y+r.height/2)}); })()")
click_at_xy(cx, cy)
type_text(LINKEDIN_EMAIL)
# Fill password
pos = js("(() => { const el = document.getElementById('password'); const r = el.getBoundingClientRect(); return JSON.stringify({cx: Math.round(r.x+r.width/2), cy: Math.round(r.y+r.height/2)}); })()")
click_at_xy(cx, cy)
type_text(LINKEDIN_PASSWORD)
# Submit
js("document.querySelector('[type=submit]').click()")
wait_for_load()
wait(3.0)
capture_screenshot()
# Verify logged in — should show LinkedIn feed, not login page
# Then navigate back to the original post URL
new_tab(post_url)
wait_for_load()
```

After auto-login, continue the repost flow normally. Do NOT ask the user for credentials —
read them from `.env`.

### Step 5: Execute the repost flow

Follow the steps in the domain skill exactly:
1. Click Repost button
2. Select "Mit Kommentar teilen" (always — even without commentary)
3. Open Post Settings via "Auf Alle posten"
4. Open identity picker
5. Select target business page radio
6. Click "Speichern" (JS fallback if visually disabled)
7. Dismiss Post Settings — try "Fertig", use "Zurück" fallback if needed
8. Verify compose modal header shows business page name (not personal name)
9. Insert commentary if provided
10. Click "Posten" (or use Schedule flow if scheduled_time provided)

Take a screenshot after each meaningful action to verify state before proceeding.
Do not assume a click worked without visual confirmation.

### Step 6: Verify and self-anneal

The toast alone is not enough — it confirms LinkedIn accepted the submission but does
not prove the post appeared on the business page. Always run the full verification
sequence documented in the domain skill (V1–V4):

1. **V1 — Capture toast**: Take screenshot immediately after clicking Posten.
   Toast "Reposten erfolgreich." must be visible and compose modal must be closed.
2. **V2 — Verify on business page**: Navigate to
   `https://www.linkedin.com/company/112182326/admin/page-posts/published/` (use the
   numeric company ID — the slug `/company/xoxocom/` redirects to `/company/unavailable/`
   for some admin accounts). Dismiss cookie consent banner if it appears (JS-click
   'Akzeptieren'). Wait 3 seconds, take screenshot. The repost must appear at the top,
   showing "[Business Page] hat dies repostet" above the original post content.
   NOTE: LinkedIn uses "hat dies repostet" (not "hat das geteilt") in the German UI.
3. **V3 — Self-anneal retry loop**: If V2 fails, wait 30 seconds and re-execute the
   full repost flow (Steps 4–6). Maximum **3 total attempts**. On each attempt, run
   V1 and V2 again before considering success.
4. **V4 — Failure report**: If all 3 attempts fail, stop and report: post URL,
   target account, attempts made, what was observed on the business page feed.

- **Success**: V2 confirms post visible on XoXoCom feed. Proceed to Step 6.5.
- **Failure**: Report the specific step and verification result with screenshot description.

### Step 6.5: Record the repost (only on confirmed success)

After V2 confirms the post is visible on the business page, run:

```
python execution/linkedin_record_repost.py \
  --post_url "<post_url from .tmp/patrick_latest_post.json>" \
  --post_date "<post_date from .tmp/patrick_latest_post.json>"
```

This appends the post URL and timestamp to `data/repost_log.json` so future runs skip it.
Do NOT call this script on failed attempts or if V2 was not verified.

After the log is updated, report:
"Reposted successfully to [Business Account Name]. Verified on business page. Posted at: [timestamp]."

## Outputs (Deliverables)
- Confirmation message with status, business account name, and timestamp.
- New post URL if LinkedIn displays it in the success toast.

## Edge Cases
- **No posts found in last 7 days (auto-discovery mode)**: `linkedin_fetch_profile_posts.py`
  exits with code 1 and prints the most recently seen timestamp. Stop and notify the user:
  "No posts from Patrick found within the last 7 days. Most recent timestamp seen: [X].
  Please provide a post URL manually or confirm Patrick hasn't posted recently."
  Do not proceed without a valid post URL.
- **All posts in the window already reposted (exit code 2)**: `linkedin_fetch_profile_posts.py`
  exits with code 2. Stop immediately and report: "All posts from the last 7 days have already
  been reposted. Nothing to do this run." Do not proceed.
- **Login wall on navigation**: Auto-login using `LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD` from `.env` (see Step 4). Do NOT ask the user. After successful login, navigate back to the post and continue.
- **Business page not in identity picker**: User is not an admin of that page.
  Stop and notify; do not retry.
- **Post already reposted**: LinkedIn may block duplicate reposts. Detect from
  warning text in the modal, notify user, and exit cleanly.
- **"Fertig" greyed out**: Use the JS dispatchEvent fallback documented in the domain skill.
  LinkedIn persists the selected identity when navigating back.
- **Compose modal still shows personal name after returning from Post Settings**:
  Identity switch failed. Re-enter Post Settings and retry steps 4–7 once more.
  If it fails again, stop and report.
- **Scheduled time field not found**: Fall back to immediate posting and notify user.
- **UI labels differ (English account)**: The domain skill lists English equivalents.
  Use screenshot to identify the correct button if labels don't match.

## Error Handling

### Accidental personal-account repost (highest priority failure)
If after clicking "Mit Kommentar teilen" a `"Reposten erfolgreich."` toast appears
instead of the compose modal, "Direkt teilen" was clicked — the post was reposted
to the personal account, not XoXoCom. Execute the full recovery flow immediately:

1. **Delete the personal repost** — follow the domain skill's "Error recovery" section
   (R1–R3): re-open the repost dropdown, find "Repost löschen", click it, confirm.
   Fallback: navigate to the personal account's `/recent-activity/shares/` page and
   delete from the "..." menu there.
2. **Verify deletion** — confirm the repost count decremented and "Reposten" is no
   longer highlighted on the post.
3. **Wait 5 seconds**, then **retry the full repost flow** from Step 3 (navigate to
   post), using DOM-coordinate queries for every click.
4. **If deletion fails on first attempt** — stop, do not retry deletion. Report to
   the user: which post, which account, what was tried.

### Other failures
- Never retry a failed step more than once automatically — surface the error with
  a screenshot description and ask the user how to proceed.
- Do not guess at selectors. Always query DOM coordinates before clicking.

## Security Notes
- This workflow uses the DebugProfile Chrome session. Credentials are read from `.env` only when the session has expired and auto-login is triggered.
- Never log, print, or expose `LINKEDIN_PASSWORD` to any output, file, or toast.
- Never log or print any LinkedIn cookie values.
- `.env` is in `.gitignore` — credentials are never committed.
