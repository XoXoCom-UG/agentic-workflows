import argparse
import json
import os
import sys

import psycopg2
from dotenv import load_dotenv
from supabase import create_client

TABLE_DDL = """
CREATE TABLE IF NOT EXISTS leads (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name  text        NOT NULL,
    last_name   text        NOT NULL,
    email       text        NOT NULL,
    created_at  timestamptz DEFAULT now()
);
"""


def _db_url() -> str:
    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        raise EnvironmentError("SUPABASE_DB_URL must be set in .env")
    return url


def ensure_table() -> None:
    """Create the leads table if it does not already exist."""
    conn = psycopg2.connect(_db_url())
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(TABLE_DDL)
    finally:
        conn.close()


def insert_lead(first_name: str, last_name: str, email: str) -> dict:
    load_dotenv()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise EnvironmentError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")

    ensure_table()

    client = create_client(url, key)
    result = (
        client.table("leads")
        .insert({"first_name": first_name, "last_name": last_name, "email": email})
        .execute()
    )

    row_id = result.data[0]["id"] if result.data else None
    return {"status": "ok", "id": row_id}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Insert a lead into Supabase")
    parser.add_argument("--first-name", required=True)
    parser.add_argument("--last-name", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    try:
        result = insert_lead(args.first_name, args.last_name, args.email)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}), file=sys.stderr)
        sys.exit(1)
