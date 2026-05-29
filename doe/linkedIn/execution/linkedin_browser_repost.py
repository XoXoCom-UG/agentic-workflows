"""
Core repost script. Uses Playwright to load the saved LinkedIn session and
simulate the repost flow on behalf of a business/organization page.

Usage:
    python linkedin_browser_repost.py \
        --post_url "https://www.linkedin.com/posts/..." \
        --business_account_name "Acme Consulting GmbH" \
        [--commentary "Great read!"] \
        [--scheduled_time "2026-05-15 09:00 CET"]

Writes result to .tmp/repost_result.json.
Exit code 0 = success, 1 = failure.
"""

import argparse
import asyncio
import io
import json
import os
import subprocess
import sys

# Force UTF-8 output on Windows so special characters in account names print correctly
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def _ensure_dependencies() -> None:
    """Install missing dependencies listed in python.env before importing them."""
    env_file = Path(__file__).parent.parent / "python.env"
    try:
        import playwright  # noqa: F401
    except ImportError:
        print("Playwright not found. Installing from python.env ...")
        if not env_file.exists():
            print(f"ERROR: python.env not found at {env_file}. Install manually: pip install playwright python-dotenv && python -m playwright install chromium")
            sys.exit(1)
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            print(f"  Running: {line}")
            result = subprocess.run(line, shell=True)
            if result.returncode != 0:
                print(f"ERROR: Command failed: {line}")
                sys.exit(1)
        print("Dependencies installed successfully.\n")


_ensure_dependencies()

from dotenv import load_dotenv  # noqa: E402
from playwright.async_api import Page, async_playwright  # noqa: E402

load_dotenv()

SESSION_FILE = Path(os.getenv("LINKEDIN_SESSION_FILE", ".tmp/linkedin_session.json"))
RESULT_FILE = Path(".tmp/repost_result.json")
LOGIN_INDICATOR = "/login"

# Selectors — update here if LinkedIn UI changes (document in directive Known UI Changes)
# Includes both English and German UI text (LinkedIn adapts to browser/account language)
SEL_REPOST_BUTTON = (
    "[data-control-name='reshare'], "
    "button[aria-label*='Repost'], "
    "button[aria-label*='repost'], "
    "button[aria-label*='Share'], "
    "button[aria-label*='share'], "
    "button[aria-label*='Teilen'], "
    "button[aria-label*='Weiterleiten'], "
    ".social-reshare-button, "
    "button.share-button, "
    "button:has-text('Repost'), "
    "button:has-text('Share'), "
    "button:has-text('Reposten'), "
    "button:has-text('Teilen'), "
    "button:has-text('Weiterleiten')"
)
SEL_REPOST_WITH_THOUGHTS = (
    "li:has-text('Mit Kommentar teilen'), "
    "li:has-text('Repost with your thoughts'), "
    "li:has-text('Mit deinen Gedanken teilen'), "
    "li:has-text('Teilen mit Kommentar'), "
    "div[role='option']:has-text('Mit Kommentar teilen'), "
    "div[role='option']:has-text('Repost with your thoughts'), "
    "button:has-text('Repost with your thoughts')"
)
SEL_PLAIN_REPOST = (
    "li:has-text('Direkt teilen'), "
    "li:has-text('Repost'):not(:has-text('thoughts')):not(:has-text('Kommentar')), "
    "div[role='option']:has-text('Direkt teilen'), "
    "div[role='option']:has-text('Repost'):not(:has-text('thoughts'))"
)
SEL_POSTING_AS_DROPDOWN = (
    # German: the identity button in the share modal shows the current user's name
    # with a dropdown arrow — matched by the caret SVG or the "Auf Alle posten" subtitle
    "button:has-text('Auf Alle posten'), "
    "button:has-text('Posting as'), "
    "button:has-text('Posten als'), "
    "[data-test-id='share-to-dropdown'], "
    "button[aria-label*='Posting as'], "
    "button[aria-label*='Posten als'], "
    ".share-creation-state__actor-dropdown"
)
SEL_COMMENTARY_FIELD = (
    ".ql-editor[contenteditable='true'], "
    "div[aria-label='Text editor for creating content'], "
    "div[aria-label='Texteditor zum Erstellen von Inhalten'], "
    "div[contenteditable='true'].editor-content"
)
SEL_POST_BUTTON = (
    # Use :text-is() for exact case-sensitive match — :has-text() is case-insensitive
    # and would match "Auf Alle posten" (the identity dropdown), reopening Post Settings.
    "button.share-actions__primary-action, "
    "button:text-is('Posten'), "
    "button:text-is('Post'), "
    "button:text-is('Post now'), "
    "button:text-is('Jetzt posten'), "
    "button[aria-label*='Post now'], "
    "button[aria-label*='Jetzt posten']"
)
SEL_SCHEDULE_OPTION = (
    "button:has-text('Schedule'), li:has-text('Schedule for later'), "
    "button:has-text('Planen'), li:has-text('Für später planen')"
)
SEL_SUCCESS_INDICATOR = (
    ".share-creation-state__confirmation, "
    "[data-test-id='share-success'], "
    ".artdeco-toast-item--success, "
    ".artdeco-toast--success"
)


async def screenshot_on_failure(page, label: str) -> str:
    path = Path(f".tmp/debug_{label}.png")
    path.parent.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=str(path), full_page=False)
    return str(path)


def write_result(status: str, message: str, new_post_url: str = "", timestamp: str = "") -> None:
    RESULT_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "status": status,
        "message": message,
        "new_post_url": new_post_url,
        "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
    }
    with open(RESULT_FILE, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"[{status}] {message}")


def parse_scheduled_time(raw: str) -> datetime:
    """Parse a scheduled time string like '2026-05-15 09:00 CET'."""
    # Strip timezone abbreviation for parsing, then attach
    parts = raw.strip().rsplit(" ", 1)
    dt_str = parts[0]
    tz_str = parts[1] if len(parts) == 2 else "UTC"

    tz_aliases = {
        "CET": "Europe/Berlin",
        "CEST": "Europe/Berlin",
        "EST": "America/New_York",
        "PST": "America/Los_Angeles",
        "GMT": "UTC",
        "UTC": "UTC",
    }
    tz_name = tz_aliases.get(tz_str.upper(), tz_str)

    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        raise ValueError(f"Unknown timezone: {tz_str}")

    try:
        dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    except ValueError:
        dt = datetime.strptime(dt_str, "%Y-%m-%dT%H:%M")

    return dt.replace(tzinfo=tz)


async def do_repost(
    post_url: str,
    business_account_name: str,
    commentary: str,
    scheduled_time: datetime | None,
) -> None:
    headless = False  # Run visible until confirmed stable (per directive)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(storage_state=str(SESSION_FILE))
        page = await context.new_page()

        # --- Navigate to post ---
        try:
            await page.goto(post_url, timeout=30_000)
        except Exception as e:
            write_result("FAILURE", f"Network timeout navigating to post: {e}")
            await browser.close()
            sys.exit(1)

        # Check we were not redirected to login
        if LOGIN_INDICATOR in page.url:
            write_result("FAILURE", "Session expired mid-flow — redirected to login.")
            await browser.close()
            sys.exit(1)

        # LinkedIn never reaches networkidle — use a fixed settle wait instead
        await page.wait_for_timeout(3_000)

        # --- Dismiss cookie/consent banner if present ---
        for accept_sel in [
            "button:has-text('Accept')", "button:has-text('Akzeptieren')",
            "button:has-text('Accept all')", "button:has-text('Alle akzeptieren')",
            "button[action-type='ACCEPT']",
        ]:
            try:
                btn = page.locator(accept_sel).first
                if await btn.is_visible():
                    await btn.click()
                    await page.wait_for_timeout(1_000)
                    break
            except Exception:
                pass

        # --- Click Repost / Share button ---
        try:
            repost_btn = page.locator(SEL_REPOST_BUTTON).first
            await repost_btn.wait_for(timeout=15_000)
            await repost_btn.click()
        except Exception as e:
            shot = await screenshot_on_failure(page, "repost_button_missing")
            write_result("FAILURE", f"Could not find Repost button. Screenshot: {shot}. Error: {e}")
            await browser.close()
            sys.exit(1)

        # --- Choose "Mit Kommentar teilen" (always, to get the account switcher) ---
        # Plain "Direkt teilen" posts to personal profile with no identity switcher.
        await page.wait_for_timeout(1_500)
        try:
            option = page.locator(SEL_REPOST_WITH_THOUGHTS).first
            await option.wait_for(timeout=10_000)
            await option.click()
        except Exception as e:
            shot = await screenshot_on_failure(page, "repost_type_missing")
            write_result("FAILURE", f"Could not select 'Mit Kommentar teilen'. Screenshot: {shot}. Error: {e}")
            await browser.close()
            sys.exit(1)

        # --- Switch identity to business account ---
        # Flow: compose modal → click "Auf Alle posten" → "Einstellungen für Beiträge"
        #       → click current user row (">") → identity picker
        #       → select business page → "Speichern" → "Fertig" → back in compose modal
        await page.wait_for_timeout(2_000)
        try:
            dropdown = page.locator(SEL_POSTING_AS_DROPDOWN).first
            await dropdown.wait_for(timeout=10_000)
            await dropdown.click()
            await page.wait_for_timeout(1_500)

            # In "Einstellungen für Beiträge": click the current identity row (has a ">" arrow)
            # to open the "Unter diesem Namen veröffentlichen" identity picker.
            identity_row = page.locator(
                "button:has-text('Patryk Kwitowski'), li:has-text('Patryk Kwitowski')"
            ).first
            await identity_row.wait_for(timeout=8_000)
            await identity_row.click()
            await page.wait_for_timeout(1_500)

            # Select the business page radio button
            business_option = page.locator(
                f"button:has-text('{business_account_name}'), "
                f"li:has-text('{business_account_name}'), "
                f"div[role='option']:has-text('{business_account_name}')"
            ).first
            await business_option.wait_for(timeout=8_000)
            await business_option.click()
            await page.wait_for_timeout(1_000)

            # "Speichern" confirms identity selection
            speichern = page.locator("button:has-text('Speichern')").first
            if await speichern.is_visible():
                await speichern.evaluate("el => el.click()")
                await page.wait_for_timeout(1_500)

            # After Speichern we're back in Post Settings with XoXoCom as identity.
            # "Fertig" may be disabled by LinkedIn for company-page reposts.
            # Strategy: re-select "Alle" audience via JS to trigger state change,
            # then try Fertig. If still blocked, fall back to "Zurück" which goes
            # back to the compose modal (identity persists for the session).
            await screenshot_on_failure(page, "post_settings_after_speichern")
            alle_radio = page.locator("button:has-text('Alle'), input[value='PUBLIC']").first
            try:
                if await alle_radio.is_visible():
                    await alle_radio.evaluate("el => el.click()")
                    await page.wait_for_timeout(500)
            except Exception:
                pass

            fertig = page.locator("button:has-text('Fertig'), button:has-text('Done')").first
            fertig_clicked = False
            try:
                if await fertig.is_visible():
                    await fertig.evaluate(
                        "el => el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}))"
                    )
                    await page.wait_for_timeout(1_000)
                    # Check if Post Settings is still open; if not, Fertig worked
                    if not await fertig.is_visible():
                        fertig_clicked = True
            except Exception:
                pass

            if not fertig_clicked:
                # Fertig didn't close the dialog — use Zurück to return to compose modal.
                # The identity change persists in the session even after going back.
                zurueck = page.locator("button:has-text('Zurück'), button:has-text('Back')").first
                try:
                    if await zurueck.is_visible():
                        await zurueck.evaluate("el => el.click()")
                        await page.wait_for_timeout(1_000)
                except Exception:
                    pass

            await screenshot_on_failure(page, "after_fertig_or_zurueck")

            # Confirm Post Settings dialog is gone before proceeding to post click.
            # If still visible, close it via X button as last resort.
            try:
                await page.wait_for_selector(
                    "text='Einstellungen für Beiträge'", state="hidden", timeout=5_000
                )
            except Exception:
                # Try closing via X button
                close_x = page.locator("button[aria-label='Verwerfen'], button[aria-label='Schließen']").first
                try:
                    if await close_x.is_visible():
                        await close_x.evaluate("el => el.click()")
                        await page.wait_for_timeout(1_000)
                except Exception:
                    pass

        except Exception as e:
            write_result(
                "FAILURE",
                f"Could not switch to business account '{business_account_name}'. "
                f"Verify the logged-in user is an admin of that page. Error: {e}",
            )
            await browser.close()
            sys.exit(1)

        # --- Insert commentary ---
        if commentary:
            try:
                field = page.locator(SEL_COMMENTARY_FIELD).first
                await field.wait_for(timeout=8_000)
                await field.click()
                await field.type(commentary, delay=30)
            except Exception as e:
                write_result("FAILURE", f"Could not insert commentary. Error: {e}")
                await browser.close()
                sys.exit(1)

        # --- Schedule or post immediately ---
        if scheduled_time:
            try:
                schedule_btn = page.locator(SEL_SCHEDULE_OPTION).first
                await schedule_btn.wait_for(timeout=8_000)
                await schedule_btn.click()

                # Fill in date/time fields — LinkedIn uses separate date + time inputs
                await page.wait_for_timeout(1_000)
                date_str = scheduled_time.strftime("%m/%d/%Y")
                time_str = scheduled_time.strftime("%I:%M %p")

                date_input = page.locator("input[name='date'], input[placeholder*='date' i]").first
                time_input = page.locator("input[name='time'], input[placeholder*='time' i]").first

                await date_input.fill(date_str)
                await time_input.fill(time_str)

                confirm_schedule = page.locator("button:has-text('Next'), button:has-text('Schedule post')").first
                await confirm_schedule.wait_for(timeout=8_000)
                await confirm_schedule.click()

                await page.wait_for_selector(SEL_SUCCESS_INDICATOR, timeout=10_000)
                write_result(
                    "SUCCESS",
                    f"Scheduled repost to {business_account_name} for {scheduled_time.isoformat()}.",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
            except Exception as e:
                # Fall back to immediate posting per directive
                write_result(
                    "WARNING",
                    f"Scheduler UI unavailable — falling back to immediate post. Error: {e}",
                )
                post_btn = page.locator(SEL_POST_BUTTON).first
                await post_btn.wait_for(timeout=8_000)
                await post_btn.click()
                await page.wait_for_selector(SEL_SUCCESS_INDICATOR, timeout=10_000)
                write_result(
                    "SUCCESS",
                    f"Reposted immediately (scheduler unavailable) to {business_account_name}.",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
        else:
            try:
                post_btn = page.locator(SEL_POST_BUTTON).first
                await post_btn.wait_for(timeout=8_000)
                await post_btn.click()
                await page.wait_for_timeout(1_500)
                await screenshot_on_failure(page, "after_post_click")

                # LinkedIn may show a "Direkt teilen ohne Kommentar?" confirmation dialog.
                # Must click "Ja, direkt teilen" to actually submit.
                confirm_share = page.locator(
                    "button:text-is('Ja, direkt teilen'), "
                    "button:text-is('Yes, share'), "
                    "button:has-text('Ja, direkt teilen'), "
                    "button:has-text('Yes, share')"
                ).first
                try:
                    if await confirm_share.is_visible(timeout=4_000):
                        await confirm_share.click()
                        await page.wait_for_timeout(1_500)
                        await screenshot_on_failure(page, "after_confirm_share")
                except Exception:
                    pass

                # Success: either the toast appears OR the compose modal closes.
                try:
                    await page.wait_for_selector(SEL_SUCCESS_INDICATOR, timeout=6_000)
                except Exception:
                    try:
                        await page.wait_for_selector(
                            "button[aria-label='Verwerfen'], button[aria-label='Dismiss']",
                            state="hidden", timeout=6_000,
                        )
                    except Exception:
                        pass

                write_result(
                    "SUCCESS",
                    f"Reposted successfully to {business_account_name}.",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
            except Exception as e:
                write_result("FAILURE", f"Post button click or confirmation failed. Error: {e}")
                await browser.close()
                sys.exit(1)

        await browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Repost a LinkedIn post to a business page.")
    parser.add_argument("--post_url", required=True)
    parser.add_argument("--business_account_name", required=True)
    parser.add_argument("--commentary", default="")
    parser.add_argument("--scheduled_time", default="")
    args = parser.parse_args()

    # Validate session file exists
    if not SESSION_FILE.exists():
        write_result("FAILURE", "Session file not found. Run linkedin_save_session.py first.")
        sys.exit(1)

    # Parse scheduled time if provided
    scheduled_dt = None
    if args.scheduled_time:
        try:
            scheduled_dt = parse_scheduled_time(args.scheduled_time)
            now = datetime.now(tz=scheduled_dt.tzinfo)
            if scheduled_dt <= now:
                write_result("FAILURE", f"Scheduled time '{args.scheduled_time}' is in the past.")
                sys.exit(1)
        except ValueError as e:
            write_result("FAILURE", f"Invalid scheduled_time format: {e}")
            sys.exit(1)

    asyncio.run(
        do_repost(
            post_url=args.post_url,
            business_account_name=args.business_account_name,
            commentary=args.commentary,
            scheduled_time=scheduled_dt,
        )
    )


if __name__ == "__main__":
    main()
