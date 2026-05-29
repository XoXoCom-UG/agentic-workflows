#!/usr/bin/env python3
"""Create a Google Sheet with standard headers if it doesn't already exist.

Usage:
    # Auto-named from current date: TAM_LinkedIn_Feed_May_2026
    python execution/create_sheet_if_missing.py

    # Explicit name
    python execution/create_sheet_if_missing.py --file_location "TAM_LinkedIn_Feed_May_2026"

    # Pass an existing sheet URL to verify/move it
    python execution/create_sheet_if_missing.py --file_location "https://docs.google.com/spreadsheets/d/..."

    # Override the target folder (falls back to GOOGLE_DRIVE_FOLDER_ID in .env)
    python execution/create_sheet_if_missing.py --folder "Content Feeds"

--file_location (optional): sheet name or URL. Defaults to TAM_LinkedIn_Feed_[Month]_[Year].
--folder (optional): folder name or Drive URL. Defaults to GOOGLE_DRIVE_FOLDER_ID in .env.

Outputs the Google Sheet URL to stdout (last line).
"""

import argparse
import json
import os
import sys
from datetime import datetime

from dotenv import load_dotenv
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

HEADERS = ["Title", "URL", "Source", "Published Date", "Theme", "Topic", "Relevance Score", "Scraped At"]


def get_credentials():
    """Return Google credentials — auto-detects service account vs OAuth2."""
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
        sys.exit(
            "ERROR: No Google credentials found.\n"
            "Either set GOOGLE_APPLICATION_CREDENTIALS in .env (service account or OAuth2 JSON) "
            "or place credentials.json in the project root."
        )

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


def extract_sheet_id(url_or_name: str) -> str | None:
    """Return spreadsheet ID if input looks like a Google Sheets URL."""
    if "docs.google.com/spreadsheets" in url_or_name:
        parts = url_or_name.split("/d/")
        if len(parts) > 1:
            return parts[1].split("/")[0]
    return None


def resolve_folder_id(drive_svc, folder: str) -> str:
    """Resolve a folder name or Drive URL to a folder ID."""
    # Drive folder URL: https://drive.google.com/drive/folders/FOLDER_ID
    if "drive.google.com" in folder and "folders/" in folder:
        return folder.split("folders/")[1].split("?")[0].strip()

    # Plain folder ID (no slashes, long alphanumeric string)
    if "/" not in folder and len(folder) > 20:
        return folder.strip()

    # Folder name — search Drive
    query = f"name='{folder}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = drive_svc.files().list(q=query, fields="files(id,name)").execute()
    files = results.get("files", [])
    if not files:
        sys.exit(f"ERROR: No Drive folder found with name '{folder}'. Check the name or pass a URL instead.")
    if len(files) > 1:
        print(f"WARNING: Multiple folders named '{folder}' found. Using the first one: {files[0]['id']}")
    return files[0]["id"]


def move_to_folder(drive_svc, file_id: str, folder_id: str) -> None:
    """Move a Drive file into the target folder, removing it from all current parents."""
    file_meta = drive_svc.files().get(fileId=file_id, fields="parents").execute()
    current_parents = ",".join(file_meta.get("parents", []))
    drive_svc.files().update(
        fileId=file_id,
        addParents=folder_id,
        removeParents=current_parents,
        fields="id,parents",
    ).execute()
    print(f"Moved sheet to folder {folder_id}.")


def find_sheet_by_name(drive_svc, name: str) -> str | None:
    """Search Drive for a spreadsheet with the given name, return its ID."""
    query = f"name='{name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    results = drive_svc.files().list(q=query, fields="files(id,name)").execute()
    files = results.get("files", [])
    return files[0]["id"] if files else None


def create_sheet(sheets_svc, name: str) -> str:
    """Create a new spreadsheet with standard headers, return its ID."""
    spreadsheet = sheets_svc.spreadsheets().create(body={
        "properties": {"title": name},
        "sheets": [{"properties": {"title": "Feed"}}],
    }).execute()
    sheet_id = spreadsheet["spreadsheetId"]
    tab_id = spreadsheet["sheets"][0]["properties"]["sheetId"]

    sheets_svc.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range="Feed!A1",
        valueInputOption="RAW",
        body={"values": [HEADERS]},
    ).execute()

    sheets_svc.spreadsheets().batchUpdate(
        spreadsheetId=sheet_id,
        body={"requests": [
            {
                "repeatCell": {
                    "range": {"sheetId": tab_id, "startRowIndex": 0, "endRowIndex": 1},
                    "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
                    "fields": "userEnteredFormat.textFormat.bold",
                }
            },
            {
                "updateSheetProperties": {
                    "properties": {"sheetId": tab_id, "gridProperties": {"frozenRowCount": 1}},
                    "fields": "gridProperties.frozenRowCount",
                }
            },
        ]},
    ).execute()

    print(f"Created new sheet: {name}")
    return sheet_id


def sheet_url(sheet_id: str) -> str:
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"


def default_sheet_name() -> str:
    """Generate TAM_LinkedIn_Feed_[Month]_[Year] from today's date."""
    now = datetime.now()
    return f"TAM_LinkedIn_Feed_{now.strftime('%B')}_{now.year}"


def main():
    parser = argparse.ArgumentParser(description="Create Google Sheet if missing")
    parser.add_argument(
        "--file_location", default=None,
        help="Sheet name or URL. Defaults to TAM_LinkedIn_Feed_[Month]_[Year]."
    )
    parser.add_argument(
        "--folder", default=None,
        help="Target Drive folder: name (e.g. 'Content Feeds') or URL (https://drive.google.com/drive/folders/...)"
    )
    args = parser.parse_args()

    creds = get_credentials()
    sheets_svc = build("sheets", "v4", credentials=creds)
    drive_svc = build("drive", "v3", credentials=creds)

    # --folder arg takes precedence; fall back to GOOGLE_DRIVE_FOLDER_ID env var
    file_location = args.file_location or default_sheet_name()
    print(f"Sheet name: {file_location}")

    folder_raw = args.folder or os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "").strip() or None
    folder_id = resolve_folder_id(drive_svc, folder_raw) if folder_raw else None

    # Input is a URL — verify accessibility, optionally move, return
    sheet_id = extract_sheet_id(file_location)
    if sheet_id:
        try:
            sheets_svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            print(f"Sheet already exists: {sheet_url(sheet_id)}")
        except HttpError:
            sys.exit(f"ERROR: Cannot access spreadsheet at {file_location}")
        if folder_id:
            move_to_folder(drive_svc, sheet_id, folder_id)
        print(sheet_url(sheet_id))
        return

    # Input is a name — find existing or create new
    existing_id = find_sheet_by_name(drive_svc, file_location)
    if existing_id:
        print(f"Found existing sheet: {file_location}")
        if folder_id:
            move_to_folder(drive_svc, existing_id, folder_id)
        print(sheet_url(existing_id))
        return

    new_id = create_sheet(sheets_svc, file_location)
    if folder_id:
        move_to_folder(drive_svc, new_id, folder_id)
    print(sheet_url(new_id))


if __name__ == "__main__":
    main()
