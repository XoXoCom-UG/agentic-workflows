#!/usr/bin/env python3
"""Scrape news articles via Apify Google Search Scraper.

Usage:
    python execution/scrape_apify_news.py --theme "AI" --topic "Claude Opus 4.7" --max_items 10
    python execution/scrape_apify_news.py --theme "LinkedIn" --topic "algorithm updates" --max_items 50 --location "Germany"
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv()

PRIMARY_ACTOR = "apify/google-search-scraper"
NEWS_ACTOR = "lukaskrivka/google-news-scraper"


def get_client() -> ApifyClient:
    token = os.environ.get("APIFY_API_TOKEN", "").strip()
    if not token:
        sys.exit("ERROR: APIFY_API_TOKEN not set in .env")
    return ApifyClient(token)


def build_query(theme: str, topic: str, location: str | None) -> str:
    query = f"{theme} {topic}"
    if location:
        query += f" {location}"
    return query


def try_news_actor(client: ApifyClient, query: str, max_items: int) -> list[dict] | None:
    """Attempt the dedicated Google News scraper actor."""
    try:
        run = client.actor(NEWS_ACTOR).call(run_input={
            "query": query,
            "maxItems": max_items,
        })
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        if items:
            return items
    except Exception as e:
        print(f"News actor unavailable ({e}), using search scraper fallback.")
    return None


def try_search_actor(client: ApifyClient, query: str, max_items: int) -> list[dict]:
    """Use the reliable google-search-scraper. Returns flat list of organic results."""
    pages = max(1, max_items // 10)
    run = client.actor(PRIMARY_ACTOR).call(run_input={
        "queries": query,
        "maxPagesPerQuery": pages,
        "resultsPerPage": min(10, max_items),
        "mobileResults": False,
        "languageCode": "en",
        "includeUnfilteredResults": False,
    })
    # google-search-scraper returns one item per page, with organicResults nested
    pages_data = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    flat = []
    for page in pages_data:
        organic = page.get("organicResults", [])
        if organic:
            flat.extend(organic)
        elif page.get("url"):
            # Already a flat result (other actor format)
            flat.append(page)
    return flat


def normalize(items: list[dict], theme: str, topic: str) -> list[dict]:
    results = []
    for item in items:
        url = item.get("url") or item.get("link") or item.get("href", "")
        if not url:
            continue
        results.append({
            "title": item.get("title") or item.get("headline", ""),
            "url": url,
            "source": item.get("source") or item.get("displayedUrl") or item.get("domain", ""),
            "published_date": item.get("date") or item.get("publishedAt") or item.get("time", ""),
            "theme": theme,
            "topic": topic,
            "snippet": item.get("description") or item.get("snippet") or item.get("text", ""),
        })
    return results


def main():
    parser = argparse.ArgumentParser(description="Scrape news articles via Apify")
    parser.add_argument("--theme", required=True, help="Target theme (e.g. 'AI')")
    parser.add_argument("--topic", required=True, help="Specific topic (e.g. 'Claude Opus 4.7')")
    parser.add_argument("--location", default=None, help="Geographic filter (e.g. 'Germany')")
    parser.add_argument("--max_items", type=int, default=10)
    parser.add_argument("--output", default=None, help="Override output file path")
    args = parser.parse_args()

    Path(".tmp").mkdir(exist_ok=True)
    client = get_client()
    query = build_query(args.theme, args.topic, args.location)

    print(f"Scraping up to {args.max_items} articles for: '{query}'")

    raw = try_news_actor(client, query, args.max_items)
    if raw is None:
        raw = try_search_actor(client, query, args.max_items)

    articles = normalize(raw, args.theme, args.topic)
    articles = articles[:args.max_items]

    if not articles:
        print("WARNING: No articles found. Try broadening the topic or timeline.")

    if args.output:
        out_path = args.output
    elif args.max_items <= 10:
        out_path = ".tmp/test_articles.json"
    else:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = f".tmp/articles_{ts}.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)

    print(f"Scraped {len(articles)} articles ->{out_path}")
    # Print path as last line for machine-readable consumption
    print(out_path)


if __name__ == "__main__":
    main()
