# LinkedIn Business Account Reposter

## Goal
Repost a specific post from a main LinkedIn personal account to one of the
person's LinkedIn business (organization) pages using browser automation.
The agent simulates the exact manual flow a human would perform.

## Inputs
- **Post URL**: The full URL of the LinkedIn post to be reposted
  (e.g., `https://www.linkedin.com/posts/username_activity-123456789`)
- **Business Account Name**: The name of the target LinkedIn organization/business page
  (e.g., "Acme Consulting GmbH")
- **[OPTIONAL] Commentary**: Additional text to prepend to the repost.
  If omitted, repost with no added commentary.
- **[OPTIONAL] Scheduled Time**: If provided, delay the post until this time
  (e.g., "2026-05-15 09:00 CET"). If omitted, post immediately.

## Tools/Scripts
- `execution/linkedin_save_session.py` — One-time script to log in manually
  and save the browser session cookies to `.tmp/linkedin_session.json`
- `execution/linkedin_check_session.py` — Verifies saved session is still
  valid before attempting a repost. Re-triggers session save if expired.
- `execution/linkedin_browser_repost.py` — Core script. Uses Playwright to
  load the saved session and simulate the repost flow.

## Dependencies

### Claude Code permissions (stored in `.claude/settings.json`)
- All three LinkedIn scripts are pre-approved via `permissions.allow` rules so
  the agent can run them without prompting the user each time.

### Runtime credentials (stored in `.env`)
- `LINKEDIN_EMAIL` — Account login email
- `LINKEDIN_PASSWORD` — Account login password
- `LINKEDIN_SESSION_FILE` — Path to saved session file
  (default: `.tmp/linkedin_session.json`)

### Python packages (stored in `python.env`)
- `python.env` lives at the project root and contains the install commands:
  ```
  pip install playwright python-dotenv
  python -m playwright install chromium
  ```
- All three scripts check for Playwright at startup. If it is not installed,
  they automatically read `python.env` line by line and execute each command
  before proceeding. No manual setup step is required on first run.

## Rate Limiting Rules (ALWAYS ENFORCE)
- Minimum **30 seconds** between consecutive script runs
- Maximum **5 reposts per hour**
- Maximum **20 reposts per day**
- If limits are approached, notify user and halt until the window resets
- Never run linkedin_browser_repost.py in a loop without a delay

## Process

### Step 0: Session Check
- Run `execution/linkedin_check_session.py`.
- Script loads `.tmp/linkedin_session.json` and makes a lightweight
  authenticated request to verify the session is still active.
- **If session is valid** → proceed to Step 1.
- **If session is expired or file missing**:
  - Notify user: "LinkedIn session has expired. Please run
    `linkedin_save_session.py` to log in and save a fresh session."
  - Run `execution/linkedin_save_session.py` (opens a visible browser
    window so the user can log in manually, including any 2FA).
  - Once complete, re-run `linkedin_check_session.py` to confirm.
  - Then proceed to Step 1.

### Step 1: Validate Inputs
- **Agent (You) checks:**
  - Post URL matches a valid LinkedIn post pattern:
    `https://www.linkedin.com/posts/...` or
    `https://www.linkedin.com/feed/update/...`
  - Business Account Name is a non-empty string.
  - If Scheduled Time is provided, verify it is in the future.
    If it is in the past, stop and ask user to provide a valid time.
- If any input is invalid → stop and notify user before running any script.

### Step 2: Browser Repost
- Run `execution/linkedin_browser_repost.py` with:
  - `--post_url`
  - `--business_account_name`
  - `--commentary` (if provided)
  - `--scheduled_time` (if provided)
- Script executes the following steps via Playwright:
  1. Launch browser in **headless=False** mode (visible) until confirmed
     stable — switch to headless=True only after 5+ successful runs
  2. Load session from `LINKEDIN_SESSION_FILE`
  3. Navigate to `--post_url`
  4. Click the Repost / Share button
  5. Select "Repost with your thoughts" if commentary provided,
     otherwise select plain "Repost"
  6. Click the "Posting as" dropdown and switch to `--business_account_name`
  7. If commentary provided, insert it into the text field
  8. If `--scheduled_time` provided, use the schedule option and set the time;
     otherwise click "Post"
  9. Confirm success by detecting the post confirmation UI element
  10. Save new post URL to `.tmp/repost_result.json` if returned by LinkedIn
- Output: `.tmp/repost_result.json` with status, timestamp, and new post URL.

### Step 3: Confirm & Report
- **Agent (You) reads `.tmp/repost_result.json`.**
- Report outcome to user:
  - ✅ Success: "Reposted successfully to [Business Account Name].
    New post URL: [url if available]. Posted at: [timestamp]."
  - ❌ Failure: Report the specific failure reason (see Edge Cases below)
    and recommended next action.

## Outputs (Deliverables)
- Confirmation message with status, business account name, and timestamp.
- New post URL if returned by LinkedIn.
- Local `.tmp/repost_result.json` is an intermediate — not a deliverable.

## Edge Cases
- **"Posting as" dropdown missing business account**: The logged-in account
  may not be an admin of that page. Stop and notify user to verify admin
  permissions on the business page before retrying.
- **Post already reposted**: LinkedIn may prevent duplicate reposts of the
  same content. If detected, notify user and skip without error.
- **2FA prompt during session save**: `linkedin_save_session.py` runs in
  visible mode specifically to allow the user to complete 2FA manually.
  The script waits up to 120 seconds for the user to finish before proceeding.
- **Scheduled time conflict**: If LinkedIn's scheduler UI is unavailable or
  the time field is not found, fall back to immediate posting and notify user.
- **Selector broken (LinkedIn UI changed)**: If Playwright cannot find an
  expected element, log the failure with the missing selector name to
  `.tmp/repost_result.json`. Agent updates the script with corrected
  selectors and documents the change under `## Known UI Changes` below.
- **Session cookie rejected mid-flow**: If LinkedIn redirects to login page
  during the repost flow, treat session as expired. Return to Step 0.

## Error Handling
- **Playwright not installed**: All three scripts auto-install from `python.env`
  at startup. If `python.env` is missing, the script exits with a message
  telling the user to run `pip install playwright python-dotenv && python -m playwright install chromium` manually.
- **Element not found errors**: Log the selector that failed. Do not retry
  more than once automatically — surface the error to the user instead.
- **Network timeout**: Retry once with a 10-second wait. If it fails again,
  report to user.

## Security Notes
- Never log or print `LINKEDIN_PASSWORD` to console or any file.
- `.tmp/linkedin_session.json` contains active session cookies —
  treat it like a password. It is listed in `.gitignore`.
- `.env` is listed in `.gitignore`.

## Known UI Changes
_(Agent appends entries here when LinkedIn UI changes break selectors)_

### 2026-05-15 — German UI + full flow mapping

LinkedIn's UI adapts to the account's language. On German-language accounts all
button labels differ from English. The complete confirmed repost flow is:

1. **Repost button** on the post action bar → German label: `"Reposten"`
2. **Dropdown option** for repost with comment → `"Mit Kommentar teilen"`
   (sub-label: "Patryks Beitrag mit eigenem Kommentar teilen")
   Plain repost option → `"Direkt teilen"` — does NOT show an account switcher,
   always posts to the personal profile. Always use "Mit Kommentar teilen" when
   targeting a business page.
3. **Compose modal** opens with `"Patryk Kwitowski\nAuf Alle posten"` button.
   Clicking this button opens **"Einstellungen für Beiträge"** (Post Settings).
4. **"Einstellungen für Beiträge"** shows the current identity at the top with a
   `>` arrow. Clicking it opens **"Unter diesem Namen veröffentlichen"**
   (identity picker) listing all pages the user admins.
5. **Identity picker** lists: personal profile + all page admin accounts.
   Select the target page radio button, then click **"Speichern"** (Save).
   Use JS `el.click()` on Speichern — it may appear disabled but is functional.
6. Back in **"Einstellungen für Beiträge"**, "Fertig" may appear greyed/disabled
   in some cases (e.g. company-page reposts). Confirmed working strategy:
   - Re-select "Alle" audience radio via JS to trigger state change
   - Try "Fertig" via `dispatchEvent(MouseEvent)` and check if dialog closed
   - If "Fertig" didn't close the dialog, click **"Zurück"** via JS instead —
     this returns to the compose modal with the business page identity already active
     (LinkedIn persists the selected identity even when navigating back)
7. Verify the compose modal header shows the business page name (e.g. "XoXoCom UG
   (Haftungsbes...)") before clicking **"Posten"** to submit immediately.