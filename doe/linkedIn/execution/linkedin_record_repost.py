#!/usr/bin/env python3
"""
linkedin_record_repost.py

Appends a successfully reposted LinkedIn post to data/repost_log.json.
Call this only after V2 verification confirms the post appeared on the business page.

Usage:
    python execution/linkedin_record_repost.py \
        --post_url "https://www.linkedin.com/feed/update/urn:li:activity:..." \
        --post_date "2026-05-16T10:30:00+00:00"

Exit codes:
    0 — entry written successfully
    1 — error (see stderr)
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

LOG_FILE = Path("data/repost_log.json")


def main():
    parser = argparse.ArgumentParser(description="Record a completed LinkedIn repost.")
    parser.add_argument("--post_url", required=True, help="URL of the reposted post")
    parser.add_argument("--post_date", required=True, help="ISO 8601 publish date of the original post")
    args = parser.parse_args()

    LOG_FILE.parent.mkdir(exist_ok=True)

    log: list[dict] = []
    if LOG_FILE.exists():
        try:
            log = json.loads(LOG_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            print(f"ERROR: Could not read {LOG_FILE}: {e}", file=sys.stderr)
            sys.exit(1)

    # Avoid duplicate entries
    existing_urls = {entry["post_url"] for entry in log}
    if args.post_url in existing_urls:
        print(f"INFO: {args.post_url} already recorded in {LOG_FILE}. No change.")
        sys.exit(0)

    log.append({
        "post_url": args.post_url,
        "post_date": args.post_date,
        "reposted_at": datetime.now(timezone.utc).isoformat(),
    })

    try:
        LOG_FILE.write_text(json.dumps(log, indent=2), encoding="utf-8")
    except OSError as e:
        print(f"ERROR: Could not write {LOG_FILE}: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Recorded: {args.post_url}\nLog now has {len(log)} entr{'y' if len(log) == 1 else 'ies'}.")


if __name__ == "__main__":
    main()
