#!/usr/bin/env python3
"""
linkedin_fetch_profile_posts.py

Connects to the running Chrome debug session (port 9222) via Playwright CDP,
navigates to Patrick's LinkedIn recent-activity page, and finds the earliest
post published within the last 7 days that has NOT yet been reposted.

Requires Chrome to be running with CDP on port 9222.
Run `python execution/launch_chrome_debug.py` first if Chrome is not ready.

Usage:
    python execution/linkedin_fetch_profile_posts.py [--profile_url URL] [--no-skip-reposted]

Output:
    .tmp/patrick_latest_post.json
    {
        "post_url": "https://www.linkedin.com/posts/...",
        "post_date": "2026-05-16T10:30:00+00:00",
        "found_at": "2026-05-22T...",
        "total_posts_in_window": 3,
        "already_reposted_count": 1,
        "skipped_urls": ["https://..."]
    }

Exit codes:
    0 — success (unposted post found and written to .tmp/patrick_latest_post.json)
    1 — failure (see stderr for details)
    2 — all posts in the 7-day window have already been reposted (nothing to do)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

CDP_URL = "http://localhost:9222"
DEFAULT_PROFILE_URL = os.getenv(
    "PATRICK_LINKEDIN_PROFILE_URL",
    "https://www.linkedin.com/in/patryk-kwitowski/recent-activity/all/",
)
TMP_DIR = Path(".tmp")
OUT_FILE = TMP_DIR / "patrick_latest_post.json"
REPOST_LOG = Path("data/repost_log.json")
MAX_SCROLL_ATTEMPTS = 5
SCROLL_PAUSE_MS = 2000


def load_reposted_urls() -> set[str]:
    """Return the set of post URLs already recorded in data/repost_log.json."""
    if not REPOST_LOG.exists():
        return set()
    try:
        log = json.loads(REPOST_LOG.read_text(encoding="utf-8"))
        return {entry["post_url"] for entry in log if "post_url" in entry}
    except (json.JSONDecodeError, OSError):
        return set()


def parse_relative_date(text: str) -> datetime | None:
    """Parse LinkedIn relative timestamps (English and German) into absolute UTC datetimes."""
    text = text.lower().strip()
    now = datetime.now(timezone.utc)

    # Each tuple: (regex pattern, per-unit timedelta)
    # Order matters — longer/more-specific patterns first to avoid partial matches.
    patterns = [
        # English
        (r"(\d+)\s+months?", timedelta(days=30)),
        (r"(\d+)\s+weeks?", timedelta(weeks=1)),
        (r"(\d+)\s+days?", timedelta(days=1)),
        (r"(\d+)\s+hours?", timedelta(hours=1)),
        (r"(\d+)\s+minutes?", timedelta(minutes=1)),
        (r"(\d+)\s+seconds?", timedelta(seconds=1)),
        # German long form: "vor 3 Monaten / Wochen / Tagen / Stunden / Minuten"
        (r"vor\s+(\d+)\s+monat", timedelta(days=30)),
        (r"vor\s+(\d+)\s+woch", timedelta(weeks=1)),
        (r"vor\s+(\d+)\s+tag", timedelta(days=1)),
        (r"vor\s+(\d+)\s+stund", timedelta(hours=1)),
        (r"vor\s+(\d+)\s+minut", timedelta(minutes=1)),
        (r"vor\s+(\d+)\s+sekund", timedelta(seconds=1)),
    ]

    for pattern, unit_delta in patterns:
        m = re.search(pattern, text)
        if m:
            return now - (unit_delta * int(m.group(1)))

    return None


def extract_posts(page) -> list[dict]:
    """Extract post URLs and raw timestamp strings from the current page DOM.

    LinkedIn's recent-activity page does not expose /posts/ links directly.
    Post URLs are reconstructed from analytics/post-summary links which contain
    the activity URN, e.g.:
      /analytics/post-summary/urn:li:activity:7460947110750937088/
    These map to:
      https://www.linkedin.com/feed/update/urn:li:activity:7460947110750937088/
    """
    return page.evaluate("""
        () => {
            const seen = new Set();
            const results = [];

            // Strategy 1: reconstruct post URLs from analytics/post-summary links
            document.querySelectorAll('a[href*="/analytics/post-summary/"]').forEach(link => {
                const match = link.href.match(/\\/analytics\\/post-summary\\/(urn:li:activity:[0-9]+)/);
                if (!match) return;
                const postUrl = 'https://www.linkedin.com/feed/update/' + match[1] + '/';
                if (seen.has(postUrl)) return;
                seen.add(postUrl);

                // Walk up to find the post container for timestamp
                const container = link.closest(
                    '.occludable-update, [data-urn], .feed-shared-update-v2, .profile-creator-shared-feed-update__container'
                );
                let timeIso = '';
                let timeText = '';
                if (container) {
                    const timeEl = container.querySelector('time[datetime]');
                    if (timeEl) { timeIso = timeEl.getAttribute('datetime') || ''; timeText = timeEl.textContent.trim(); }
                    if (!timeText) {
                        const subEl = container.querySelector(
                            '.feed-shared-actor__sub-description, [class*="actor__sub-description"]'
                        );
                        if (subEl) timeText = subEl.textContent.trim();
                    }
                }
                results.push({ url: postUrl, time_iso: timeIso, time_text: timeText });
            });

            // Strategy 2: direct /posts/ or /feed/update/ links (fallback for future DOM changes)
            if (results.length === 0) {
                document.querySelectorAll(
                    'a[href*="/posts/"], a[href*="/feed/update/urn%3Ali%3Aactivity"], a[href*="/feed/update/urn:li:activity"]'
                ).forEach(link => {
                    const href = link.href;
                    if (!href.match(/linkedin\\.com\\/(posts\\/|feed\\/update\\/)/)) return;
                    if (seen.has(href)) return;
                    seen.add(href);
                    const container = link.closest(
                        '.occludable-update, [data-urn], .feed-shared-update-v2, .profile-creator-shared-feed-update__container'
                    );
                    let timeIso = '', timeText = '';
                    if (container) {
                        const timeEl = container.querySelector('time[datetime]');
                        if (timeEl) { timeIso = timeEl.getAttribute('datetime') || ''; timeText = timeEl.textContent.trim(); }
                        if (!timeText) {
                            const subEl = container.querySelector('.feed-shared-actor__sub-description, [class*="actor__sub-description"]');
                            if (subEl) timeText = subEl.textContent.trim();
                        }
                    }
                    results.push({ url: href, time_iso: timeIso, time_text: timeText });
                });
            }

            return results;
        }
    """)


def main():
    parser = argparse.ArgumentParser(
        description="Find the earliest LinkedIn post from Patrick within the last 7 days that has not yet been reposted."
    )
    parser.add_argument(
        "--profile_url",
        default=DEFAULT_PROFILE_URL,
        help="LinkedIn recent-activity URL to scrape",
    )
    parser.add_argument(
        "--no-skip-reposted",
        action="store_true",
        help="Ignore repost_log.json and return the earliest post regardless of history",
    )
    args = parser.parse_args()

    already_reposted: set[str] = set() if args.no_skip_reposted else load_reposted_urls()
    if already_reposted:
        print(f"Repost log loaded: {len(already_reposted)} URL(s) already reposted — will skip.")

    TMP_DIR.mkdir(exist_ok=True)

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            print(
                f"ERROR: Cannot connect to Chrome CDP at {CDP_URL}.\n"
                f"Run 'python execution/launch_chrome_debug.py' first.\nDetails: {e}",
                file=sys.stderr,
            )
            sys.exit(1)

        # Use the existing context which carries the logged-in session cookies
        context = browser.contexts[0] if browser.contexts else browser.new_context()
        page = context.new_page()

        try:
            print(f"Navigating to: {args.profile_url}")
            page.goto(args.profile_url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(3000)

            if any(x in page.url for x in ["/login", "/authwall", "checkpoint"]):
                print(
                    "ERROR: LinkedIn session expired or auth wall detected.\n"
                    "Run 'python execution/launch_chrome_debug.py' to refresh the session.",
                    file=sys.stderr,
                )
                sys.exit(1)

            # Scroll incrementally to trigger lazy-loading of older posts
            all_posts: list[dict] = []
            for _ in range(MAX_SCROLL_ATTEMPTS):
                page.keyboard.press("End")
                page.wait_for_timeout(SCROLL_PAUSE_MS)
                posts = extract_posts(page)
                if len(posts) > len(all_posts):
                    all_posts = posts
                else:
                    break  # No new posts loaded after scroll — stop early

            if not all_posts:
                print(
                    "ERROR: No posts found on the page. LinkedIn may have changed its DOM "
                    "structure, or Patrick has no recent activity.",
                    file=sys.stderr,
                )
                sys.exit(1)

            print(f"Found {len(all_posts)} post link(s) on the page total.")

            # Filter to posts within the last 7 days
            cutoff = datetime.now(timezone.utc) - timedelta(days=7)
            valid: list[dict] = []

            for post in all_posts:
                dt: datetime | None = None

                # Try ISO datetime attribute first (most accurate)
                if post["time_iso"]:
                    try:
                        raw = post["time_iso"].replace("Z", "+00:00")
                        dt = datetime.fromisoformat(raw)
                    except ValueError:
                        pass

                # Fall back to parsing relative text
                if dt is None and post["time_text"]:
                    dt = parse_relative_date(post["time_text"])

                # Ensure timezone-aware for comparison
                if dt is not None and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)

                if dt is not None and dt >= cutoff:
                    valid.append({
                        "post_url": post["url"],
                        "post_date": dt.isoformat(),
                        "time_text": post["time_text"],
                    })
                elif dt is not None:
                    # Page is reverse-chronological; once we hit a post older than 7 days,
                    # all subsequent posts will also be outside the window.
                    break

            if not valid:
                sample = all_posts[0]["time_text"] if all_posts else "none"
                print(
                    f"ERROR: No posts from Patrick found within the last 7 days.\n"
                    f"Most recent post timestamp seen: '{sample}'",
                    file=sys.stderr,
                )
                sys.exit(1)

            # Sort ascending by date (oldest first)
            valid.sort(key=lambda x: x["post_date"])

            # Skip posts already recorded in the repost log
            skipped_urls: list[str] = []
            candidate = None
            for post in valid:
                if post["post_url"] in already_reposted:
                    skipped_urls.append(post["post_url"])
                else:
                    candidate = post
                    break

            if candidate is None:
                print(
                    f"All {len(valid)} post(s) in the last 7 days have already been reposted.\n"
                    f"Nothing to do this run.",
                    file=sys.stderr,
                )
                sys.exit(2)

            result = {
                "post_url": candidate["post_url"],
                "post_date": candidate["post_date"],
                "found_at": datetime.now(timezone.utc).isoformat(),
                "total_posts_in_window": len(valid),
                "already_reposted_count": len(skipped_urls),
                "skipped_urls": skipped_urls,
            }

            OUT_FILE.write_text(json.dumps(result, indent=2))
            print(
                f"\nSuccess: {len(valid)} post(s) in the last 7 days"
                + (f", {len(skipped_urls)} already reposted (skipped)." if skipped_urls else ".")
                + f"\nEarliest unposted: {result['post_url']}\n"
                f"  Date           : {candidate['post_date']}  ({candidate['time_text']})\n"
                f"Output written   : {OUT_FILE}"
            )

        finally:
            page.close()
            browser.close()  # disconnects from CDP without killing Chrome


if __name__ == "__main__":
    main()
