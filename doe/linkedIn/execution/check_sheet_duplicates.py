#!/usr/bin/env python3
"""Filter out articles already present in a Google Sheet (by URL).

Usage:
    python execution/check_sheet_duplicates.py \
        --sheet_url "https://docs.google.com/spreadsheets/d/..." \
        --articles_file ".tmp/articles_20260514_120000.json"

Outputs the path to the deduplicated file (last line of stdout).
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

URL_COLUMN_INDEX = 1  # Column B (0-indexed) in the standard schema


def get_credentials():
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()

    oauth_path = None
    if creds_path and os.path.exists(creds_path):
        with open(creds_path) as f:
            data = json.load(f)
        if data.get("type") == "service_account":
            return service_account.Credentials.from_service_account_file(creds_path, scopes=SCOPES)
        oauth_path = creds_path
    elif os.path.exists("credentials.json"):
        oauth_path = "credentials.json"

    if not oauth_path:
        sys.exit("ERROR: No Google credentials found (GOOGLE_APPLICATION_CREDENTIALS or credentials.json).")

    token_path = "token.json"
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(oauth_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, "w") as f:
            f.write(creds.to_json())
    return creds


def extract_sheet_id(url: str) -> str:
    if "docs.google.com/spreadsheets" not in url:
        sys.exit(f"ERROR: '{url}' does not look like a Google Sheets URL.")
    parts = url.split("/d/")
    if len(parts) < 2:
        sys.exit(f"ERROR: Cannot extract sheet ID from '{url}'.")
    return parts[1].split("/")[0]


def fetch_existing_urls(sheets_svc, sheet_id: str) -> set[str]:
    """Read all rows from the sheet and collect URLs from column B."""
    result = sheets_svc.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range="Feed!B:B",
    ).execute()
    rows = result.get("values", [])
    # Skip header row, flatten, strip whitespace
    return {row[0].strip() for row in rows[1:] if row and row[0].strip()}


def main():
    parser = argparse.ArgumentParser(description="Deduplicate articles against Google Sheet")
    parser.add_argument("--sheet_url", required=True, help="Google Sheets URL")
    parser.add_argument("--articles_file", required=True, help="Path to scraped articles JSON")
    parser.add_argument("--output", default=None, help="Override output file path")
    args = parser.parse_args()

    if not os.path.exists(args.articles_file):
        sys.exit(f"ERROR: Articles file not found: {args.articles_file}")

    with open(args.articles_file, encoding="utf-8") as f:
        articles = json.load(f)

    if not articles:
        print("WARNING: Input articles file is empty.")
        Path(".tmp").mkdir(exist_ok=True)
        out_path = args.output or f".tmp/new_articles_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump([], f)
        print(f"0 new articles -> {out_path}")
        print(out_path)
        return

    creds = get_credentials()
    sheets_svc = build("sheets", "v4", credentials=creds)
    sheet_id = extract_sheet_id(args.sheet_url)

    print(f"Fetching existing URLs from sheet {sheet_id}...")
    existing_urls = fetch_existing_urls(sheets_svc, sheet_id)
    print(f"Found {len(existing_urls)} existing URLs in sheet.")

    new_articles = [a for a in articles if a.get("url", "").strip() not in existing_urls]
    dupes = len(articles) - len(new_articles)
    print(f"Filtered {dupes} duplicates. {len(new_articles)} new articles remain.")

    Path(".tmp").mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = args.output or f".tmp/new_articles_{ts}.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(new_articles, f, indent=2, ensure_ascii=False)

    print(f"New articles -> {out_path}")
    print(out_path)


if __name__ == "__main__":
    main()
