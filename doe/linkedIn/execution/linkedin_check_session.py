"""
Verifies that the saved LinkedIn session is still active by making a lightweight
authenticated request. Exits with code 0 if valid, code 1 if expired or missing.

The agent reads the exit code to decide whether to re-run linkedin_save_session.py.
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
CHECK_URL = "https://www.linkedin.com/feed/"
LOGIN_INDICATOR = "/login"


async def check_session() -> bool:
    if not SESSION_FILE.exists():
        print("SESSION_MISSING: Session file not found.")
        return False

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(storage_state=str(SESSION_FILE))
        page = await context.new_page()

        try:
            response = await page.goto(CHECK_URL, timeout=30_000)
            final_url = page.url

            if LOGIN_INDICATOR in final_url:
                print("SESSION_EXPIRED: Redirected to login page.")
                await browser.close()
                return False

            # Give the page a moment to settle, then re-check URL
            await page.wait_for_timeout(3_000)
            final_url = page.url
            if LOGIN_INDICATOR in final_url or "authwall" in final_url:
                print("SESSION_EXPIRED: Redirected to login/authwall after load.")
                await browser.close()
                return False

            print("SESSION_VALID: LinkedIn session is active.")
            await browser.close()
            return True

        except Exception as e:
            print(f"SESSION_ERROR: {e}")
            await browser.close()
            return False


if __name__ == "__main__":
    valid = asyncio.run(check_session())
    sys.exit(0 if valid else 1)
