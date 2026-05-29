#!/usr/bin/env python3
"""Append classified articles to a Google Sheet, grouped by topic.

Grouping rules:
  - If the topic already exists in the sheet: insert new rows directly after
    the last existing row for that topic (no separator).
  - If the topic is new: insert 2 blank separator rows, then the new articles.
  - If the sheet has no data rows yet (just the header): write directly, no separator.

Usage:
    python execution/update_sheet.py \
        --articles_file ".tmp/classified_articles_20260514_120000.json" \
        --sheet_url "https://docs.google.com/spreadsheets/d/..."

Outputs the Google Sheet URL (last line of stdout).
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

TOPIC_COL = 5   # 0-based index of "Topic" column (column F)


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


def get_tab_id(sheets_svc, sheet_id: str) -> int:
    """Return the sheetId (tab ID) of the 'Feed' tab."""
    spreadsheet = sheets_svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
    for sheet in spreadsheet["sheets"]:
        if sheet["properties"]["title"] == "Feed":
            return sheet["properties"]["sheetId"]
    return spreadsheet["sheets"][0]["properties"]["sheetId"]


def read_all_rows(sheets_svc, sheet_id: str) -> list[list]:
    """Read all rows from the Feed sheet (including header)."""
    result = sheets_svc.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range="Feed!A:H",
    ).execute()
    return result.get("values", [])


def find_topic_last_row_index(rows: list[list], topic: str) -> int | None:
    """Return the 0-based values-array index of the last row matching the topic.
    Returns None if the topic is not found.
    Skips the header row (index 0).
    """
    topic_lower = topic.strip().lower()
    last_idx = None
    for i, row in enumerate(rows):
        if i == 0:
            continue  # skip header
        if len(row) > TOPIC_COL and row[TOPIC_COL].strip().lower() == topic_lower:
            last_idx = i
    return last_idx


def insert_blank_rows(sheets_svc, sheet_id: str, tab_id: int, start_index: int, count: int) -> None:
    """Insert `count` blank rows at `start_index` (0-based sheet row index).
    Rows at and below start_index shift down.
    """
    sheets_svc.spreadsheets().batchUpdate(
        spreadsheetId=sheet_id,
        body={"requests": [{
            "insertDimension": {
                "range": {
                    "sheetId": tab_id,
                    "dimension": "ROWS",
                    "startIndex": start_index,
                    "endIndex": start_index + count,
                },
                "inheritFromBefore": False,
            }
        }]},
    ).execute()


def write_rows_at(sheets_svc, sheet_id: str, row_1based: int, rows: list[list]) -> None:
    """Write rows starting at a specific 1-based row number."""
    sheets_svc.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=f"Feed!A{row_1based}",
        valueInputOption="RAW",
        body={"values": rows},
    ).execute()


def article_to_row(article: dict, scraped_at: str) -> list:
    return [
        article.get("title", ""),
        article.get("url", ""),
        article.get("source", ""),
        article.get("published_date", ""),
        article.get("theme", ""),
        article.get("topic", ""),
        str(article.get("relevance_score", "")),
        scraped_at,
    ]


def main():
    parser = argparse.ArgumentParser(description="Append articles to Google Sheet, grouped by topic")
    parser.add_argument("--articles_file", required=True)
    parser.add_argument("--sheet_url", required=True)
    args = parser.parse_args()

    if not os.path.exists(args.articles_file):
        sys.exit(f"ERROR: File not found: {args.articles_file}")

    with open(args.articles_file, encoding="utf-8") as f:
        articles = json.load(f)

    if not articles:
        print("No articles to upload. Sheet unchanged.")
        print(args.sheet_url)
        return

    creds = get_credentials()
    sheets_svc = build("sheets", "v4", credentials=creds)
    sheet_id = extract_sheet_id(args.sheet_url)
    tab_id = get_tab_id(sheets_svc, sheet_id)

    scraped_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    new_rows = [article_to_row(a, scraped_at) for a in articles]
    topic = articles[0].get("topic", "")

    existing_rows = read_all_rows(sheets_svc, sheet_id)
    data_row_count = len(existing_rows) - 1  # excluding header

    topic_last_idx = find_topic_last_row_index(existing_rows, topic)

    if topic_last_idx is not None:
        # Topic exists — insert new rows directly after its last row
        # topic_last_idx is 0-based in values array => sheet row index = topic_last_idx
        # Insert N rows at sheet row index topic_last_idx + 1 (0-based), i.e. after that row
        insert_index = topic_last_idx + 1  # 0-based sheet row index to insert at
        insert_blank_rows(sheets_svc, sheet_id, tab_id, insert_index, len(new_rows))
        write_rows_at(sheets_svc, sheet_id, insert_index + 1, new_rows)  # +1 = 1-based
        print(f"Topic '{topic}' already exists. Inserted {len(new_rows)} rows after its last entry.")

    elif data_row_count == 0:
        # Sheet is empty (header only) — write directly, no separator
        write_rows_at(sheets_svc, sheet_id, 2, new_rows)
        print(f"Sheet was empty. Wrote {len(new_rows)} rows for new topic '{topic}'.")

    else:
        # New topic — insert 2 blank rows at the end, then the new articles
        end_index = len(existing_rows)  # 0-based index after last row = insert point
        insert_blank_rows(sheets_svc, sheet_id, tab_id, end_index, 2 + len(new_rows))
        write_rows_at(sheets_svc, sheet_id, end_index + 3, new_rows)  # +1 header offset +2 blanks
        print(f"New topic '{topic}'. Added 2-row separator + {len(new_rows)} rows.")

    print(args.sheet_url)


if __name__ == "__main__":
    main()
