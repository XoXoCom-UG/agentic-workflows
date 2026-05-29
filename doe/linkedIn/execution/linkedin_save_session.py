"""
One-time script: opens a visible browser so the user can log in to LinkedIn
manually (including 2FA), then saves the session cookies to .tmp/linkedin_session.json.
Run this before linkedin_browser_repost.py for the first time, or whenever
linkedin_check_session.py reports the session has expired.
"""

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path


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
from playwright.async_api import async_playwright  # noqa: E402

load_dotenv()

SESSION_FILE = Path(os.getenv("LINKEDIN_SESSION_FILE", ".tmp/linkedin_session.json"))
LOGIN_URL = "https://www.linkedin.com/login"
FEED_URL = "https://www.linkedin.com/feed/"
MAX_WAIT_SECONDS = 120


async def save_session() -> None:
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        email = os.getenv("LINKEDIN_EMAIL", "")
        password = os.getenv("LINKEDIN_PASSWORD", "")

        await page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30_000)

        if email and password:
            try:
                await page.wait_for_selector("#username", timeout=15_000)
                await page.fill("#username", email)
                await page.fill("#password", password)
                await page.click('[type="submit"]')
            except Exception:
                # Auto-fill failed — browser is still open for manual login
                print("Could not auto-fill credentials. Please log in manually in the browser window.")

        print(
            f"Browser is open. Complete login and any 2FA steps, then wait "
            f"for the LinkedIn feed to load.\n"
            f"You have {MAX_WAIT_SECONDS} seconds."
        )

        try:
            await page.wait_for_url(
                lambda url: "feed" in url or "mynetwork" in url or "jobs" in url,
                timeout=MAX_WAIT_SECONDS * 1000,
            )
        except Exception:
            print(
                "Timed out waiting for feed URL. If you are still logged in, "
                "the session will still be saved."
            )

        cookies = await context.cookies()
        storage = await context.storage_state()

        with open(SESSION_FILE, "w") as f:
            json.dump(storage, f, indent=2)

        print(f"Session saved to {SESSION_FILE}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(save_session())
