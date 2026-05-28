#!/usr/bin/env python3
"""Deploy sites/<slug>/ to Netlify with per-site env vars set from site.config.json + repo .env.

Usage:
    python execution/deploy_netlify.py --slug acme

Pre-requisites:
    - `netlify login` once per machine
    - `cd sites/<slug> && netlify link --name lm-<slug>` for first deploy of a new slug
    - Repo .env has: SUPABASE_URL, SUPABASE_SERVICE_KEY, LEAD_COLUMNS,
                     GMAIL_USER, GMAIL_APP_PASSWORD
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv not installed. Run: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent
SITES = REPO_ROOT / "sites"

REPO_ENV_VARS = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "LEAD_COLUMNS", "GMAIL_USER", "GMAIL_APP_PASSWORD"]
CONFIG_TO_ENV = {
    "slug": "CAMPAIGN_SLUG",
    "drive_link": "DRIVE_LINK",
    "lead_magnet_title": "LEAD_MAGNET_TITLE",
    "company": "COMPANY_NAME",
}


def run(cmd: list[str], cwd: Path) -> None:
    """Run a command, inheriting stdio. Raise on non-zero exit."""
    print(f"$ {' '.join(cmd)}  (cwd={cwd})")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--skip-install", action="store_true", help="skip `npm install`")
    args = parser.parse_args()

    site_dir = SITES / args.slug
    config_path = site_dir / "site.config.json"
    if not config_path.is_file():
        print(f"missing {config_path}", file=sys.stderr)
        return 2

    load_dotenv(REPO_ROOT / ".env")

    config = json.loads(config_path.read_text(encoding="utf-8"))
    missing_cfg = [k for k in CONFIG_TO_ENV if not config.get(k)]
    if missing_cfg:
        print(f"site.config.json missing required fields: {missing_cfg}", file=sys.stderr)
        return 2

    missing_env = [k for k in REPO_ENV_VARS if not os.environ.get(k)]
    if missing_env:
        print(f"repo .env missing required vars: {missing_env}", file=sys.stderr)
        return 2

    npm = "npm.cmd" if os.name == "nt" else "npm"
    netlify = "netlify.cmd" if os.name == "nt" else "netlify"

    if not args.skip_install:
        run([npm, "install"], cwd=site_dir)

    # Set per-site env vars on Netlify.
    for cfg_key, env_key in CONFIG_TO_ENV.items():
        run([netlify, "env:set", env_key, str(config[cfg_key]), "--context", "production"], cwd=site_dir)
    for env_key in REPO_ENV_VARS:
        run([netlify, "env:set", env_key, os.environ[env_key], "--context", "production"], cwd=site_dir)

    # Deploy.
    run([netlify, "deploy", "--prod"], cwd=site_dir)

    print()
    print(f"deployed sites/{args.slug} to Netlify (run `netlify open` from {site_dir} to view)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
