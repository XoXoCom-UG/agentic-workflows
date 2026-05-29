#!/usr/bin/env python3
"""Filter articles by relevance score and recency.

This script is a deterministic filter. Relevance scoring is done by the
orchestrator (Claude Code), which reads the articles and writes a
`relevance_score` (0-100) field onto each one before calling this script.

The script handles the mechanical parts:
  1. Filters articles below --min_relevance_score
  2. Parses published_date and checks it falls within --timeline
     (if `within_timeline` field is already set, that takes precedence)

Usage:
    python execution/classify_articles_llm.py \
        --articles_file ".tmp/new_articles_20260514_120000.json" \
        --theme "AI" \
        --topic "Claude Opus 4.7" \
        --timeline "2 weeks" \
        --min_relevance_score 80

Orchestration flow for Step 5:
  1. Orchestrator reads .tmp/new_articles_*.json
  2. Orchestrator scores each article and writes relevance_score into the file
  3. Orchestrator calls this script to apply the filter
  4. Script outputs .tmp/classified_articles_*.json

Outputs the path to the classified (passing) articles file (last line of stdout).
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


def parse_timeline_cutoff(timeline: str) -> datetime:
    """Convert '2 weeks', '7 days', '1 month' etc. to a UTC cutoff datetime."""
    timeline = timeline.lower().strip()
    now = datetime.now(timezone.utc)
    unit_days = {"day": 1, "week": 7, "month": 30, "year": 365}
    parts = timeline.split()
    if len(parts) >= 2:
        try:
            n = int(parts[0])
            unit = parts[1].rstrip("s")
            days = unit_days.get(unit)
            if days:
                return now - timedelta(days=n * days)
        except ValueError:
            pass
    print(f"WARNING: Could not parse timeline '{timeline}'. Defaulting to 2 weeks.")
    return now - timedelta(days=14)


DATE_FORMATS = [
    "%Y-%m-%d",
    "%Y-%m-%dT%H:%M:%S.%fZ",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S.%f%z",
    "%Y-%m-%dT%H:%M:%S%z",
    "%B %d, %Y",
    "%b %d, %Y",
    "%d %B %Y",
    "%d/%m/%Y",
    "%m/%d/%Y",
]


def parse_date(date_str: str) -> datetime | None:
    if not date_str:
        return None
    date_str = date_str.strip()
    # Handle relative strings like "2 hours ago", "3 days ago"
    ago_match = re.match(r"(\d+)\s+(hour|day|week|month)s?\s+ago", date_str, re.IGNORECASE)
    if ago_match:
        n, unit = int(ago_match.group(1)), ago_match.group(2).lower()
        delta_map = {"hour": timedelta(hours=1), "day": timedelta(days=1), "week": timedelta(weeks=1), "month": timedelta(days=30)}
        return datetime.now(timezone.utc) - delta_map[unit] * n
    # Try Python's built-in ISO parser first (handles most variants)
    try:
        clean = date_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        pass
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(date_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def is_within_timeline(article: dict, cutoff: datetime) -> bool:
    """Return True if the article is within the timeline window."""
    # Respect pre-set field from orchestrator
    if "within_timeline" in article:
        return bool(article["within_timeline"])
    # Fall back to mechanical date parsing
    date_str = article.get("published_date", "")
    parsed = parse_date(date_str)
    if parsed is None:
        return True  # Benefit of the doubt for unparseable dates
    return parsed >= cutoff


def main():
    parser = argparse.ArgumentParser(description="Filter pre-scored articles by threshold and recency")
    parser.add_argument("--articles_file", required=True)
    parser.add_argument("--theme", required=True)
    parser.add_argument("--topic", required=True)
    parser.add_argument("--timeline", required=True, help="e.g. '2 weeks', '7 days'")
    parser.add_argument("--min_relevance_score", type=int, default=80)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    if not os.path.exists(args.articles_file):
        sys.exit(f"ERROR: File not found: {args.articles_file}")

    with open(args.articles_file, encoding="utf-8") as f:
        articles = json.load(f)

    if not articles:
        print("WARNING: Input file is empty. Nothing to filter.")
        Path(".tmp").mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = args.output or f".tmp/classified_articles_{ts}.json"
        with open(out_path, "w") as f:
            json.dump([], f)
        print(out_path)
        return

    # Warn if orchestrator hasn't scored the articles yet
    unscored = [a for a in articles if "relevance_score" not in a]
    if unscored:
        print(f"WARNING: {len(unscored)}/{len(articles)} articles have no relevance_score.")
        print("Expected: orchestrator (Claude Code) to score articles before calling this script.")

    cutoff = parse_timeline_cutoff(args.timeline)
    print(f"Filtering {len(articles)} articles (min score: {args.min_relevance_score}, timeline cutoff: {cutoff.strftime('%Y-%m-%d')})...")

    passing = []
    for article in articles:
        score = article.get("relevance_score", -1)
        if score == -1:
            continue  # Skip unscored articles
        if score >= args.min_relevance_score and is_within_timeline(article, cutoff):
            passing.append(article)

    filtered = len(articles) - len(passing) - len(unscored)
    print(f"Results: {len(passing)} passed, {filtered} filtered out, {len(unscored)} skipped (unscored).")

    Path(".tmp").mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = args.output or f".tmp/classified_articles_{ts}.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(passing, f, indent=2, ensure_ascii=False)

    print(f"Classified articles -> {out_path}")
    print(out_path)


if __name__ == "__main__":
    main()
