"""
Ensure Chrome is running with --remote-debugging-port=9222 and CDP accessible.

Fully autonomous — no user interaction required. Handles all known failure modes:
- Chrome not running → launch with debug profile
- Chrome running but CDP blocked (default user-data-dir restriction) → kill and relaunch
- Debug profile missing → bootstrap from Profile 1 (xoxocom.net) cookies
- CDP port open but /json/version not responding → kill and relaunch

Uses a dedicated user-data-dir (CHROME_DEBUG_PROFILE_DIR) to bypass Chrome's
security restriction that blocks remote debugging on the default user data directory.
"""

import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DEBUG_PORT = 9222

# Dedicated profile dir — NOT the default Chrome user data dir (which Chrome blocks)
CHROME_DEBUG_PROFILE_DIR = (
    Path(os.environ.get("LOCALAPPDATA", ""))
    / "Google" / "Chrome" / "DebugProfile"
)

# Source profile to bootstrap cookies from (xoxocom.net account = Profile 1)
SOURCE_PROFILE = (
    Path(os.environ.get("LOCALAPPDATA", ""))
    / "Google" / "Chrome" / "User Data" / "Profile 1"
)

# Top-level files to copy when bootstrapping the debug profile
BOOTSTRAP_FILES = ["Preferences"]

# Subdirectories to copy wholesale (Network/ contains Cookies in Chrome 96+)
BOOTSTRAP_DIRS = ["Network"]


def is_cdp_accessible() -> bool:
    """True only when Chrome is running AND the CDP endpoint responds."""
    try:
        with socket.create_connection(("127.0.0.1", DEBUG_PORT), timeout=2):
            pass
        urllib.request.urlopen(
            f"http://127.0.0.1:{DEBUG_PORT}/json/version", timeout=3
        )
        return True
    except Exception:
        return False


def is_port_open() -> bool:
    try:
        with socket.create_connection(("127.0.0.1", DEBUG_PORT), timeout=2):
            return True
    except OSError:
        return False


def kill_chrome() -> None:
    subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
    time.sleep(2.0)


def bootstrap_debug_profile() -> None:
    """
    Create the debug profile directory and seed it with the xoxocom.net
    session cookies from Profile 1 so LinkedIn is already logged in.
    Only copies files that don't exist yet — does not overwrite on re-runs.
    """
    default_dir = CHROME_DEBUG_PROFILE_DIR / "Default"
    default_dir.mkdir(parents=True, exist_ok=True)

    if not SOURCE_PROFILE.exists():
        print(f"Source profile not found at {SOURCE_PROFILE} — skipping bootstrap.")
        return

    for filename in BOOTSTRAP_FILES:
        dest = default_dir / filename
        if not dest.exists():
            src = SOURCE_PROFILE / filename
            if src.exists():
                try:
                    shutil.copy2(src, dest)
                    print(f"  Bootstrapped {filename} from Profile 1.")
                except Exception as e:
                    print(f"  Warning: could not copy {filename}: {e}")

    # Also copy Local State to the profile root (needed for account metadata)
    local_state_dest = CHROME_DEBUG_PROFILE_DIR / "Local State"
    if not local_state_dest.exists():
        local_state_src = SOURCE_PROFILE.parent / "Local State"
        if local_state_src.exists():
            try:
                shutil.copy2(local_state_src, local_state_dest)
            except Exception:
                pass


def launch_chrome() -> None:
    bootstrap_debug_profile()
    subprocess.Popen(
        [
            CHROME_PATH,
            f"--remote-debugging-port={DEBUG_PORT}",
            "--remote-debugging-allow-origins=*",
            f"--user-data-dir={CHROME_DEBUG_PROFILE_DIR}",
            "--no-first-run",
            "--no-default-browser-check",
        ]
    )


def wait_for_cdp(timeout: int = 25) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if is_cdp_accessible():
            return True
        time.sleep(0.5)
    return False


def main() -> None:
    # Fast path: already running and accessible
    if is_cdp_accessible():
        print(f"Chrome CDP ready on port {DEBUG_PORT}.")
        return

    # Port open but CDP blocked → Chrome is running without the right flags
    if is_port_open():
        print(
            "Chrome is running but CDP is not accessible "
            "(missing --remote-debugging-allow-origins or default user-data-dir). "
            "Relaunching with correct flags..."
        )
        kill_chrome()
    else:
        print("Chrome not running. Launching with debug profile...")

    launch_chrome()

    if wait_for_cdp():
        print(f"Chrome CDP ready on port {DEBUG_PORT}.")
    else:
        print(f"ERROR: Chrome CDP did not come up within 25 seconds.")
        sys.exit(1)


if __name__ == "__main__":
    main()
