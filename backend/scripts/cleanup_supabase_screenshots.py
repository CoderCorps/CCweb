#!/usr/bin/env python3
"""
Supabase Storage Cleanup Script for CoderCorps Issue Screenshots
Deletes issue report screenshot images older than 7 days from Supabase Storage bucket.
"""

import os
import sys
import json
import datetime
import urllib.request
from typing import List, Dict, Any

DAYS_THRESHOLD = 7
SECONDS_THRESHOLD = DAYS_THRESHOLD * 86400

def parse_iso8601(date_str: str) -> datetime.datetime:
    """Parses ISO 8601 date string to timezone-aware datetime."""
    try:
        if date_str.endswith("Z"):
            date_str = date_str[:-1] + "+00:00"
        return datetime.datetime.fromisoformat(date_str)
    except Exception:
        return datetime.datetime.now(datetime.timezone.utc)

def cleanup_expired_screenshots():
    supabase_url = os.getenv("SUPABASE_URL", "").strip("'\" ").rstrip("/")
    supabase_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or "").strip("'\" ")
    bucket = os.getenv("SUPABASE_BUCKET", "issue-screenshots").strip("'\" ")

    if not supabase_url or not supabase_key:
        print("[CLEANUP NOTICE]: Missing SUPABASE_URL or SUPABASE_KEY / SUPABASE_SERVICE_ROLE_KEY. Skipping cloud cleanup.")
        return

    print(f"[CLEANUP START]: Inspecting Supabase Storage bucket '{bucket}' at {supabase_url}...")

    # 1. LIST ALL OBJECTS IN BUCKET
    list_url = f"{supabase_url}/storage/v1/object/list/{bucket}"
    list_payload = json.dumps({
        "prefix": "",
        "limit": 1000,
        "offset": 0,
        "sortBy": {"column": "created_at", "order": "asc"}
    }).encode("utf-8")

    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apiKey": supabase_key,
        "Content-Type": "application/json"
    }

    try:
        req = urllib.request.Request(list_url, data=list_payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            objects: List[Dict[str, Any]] = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[CLEANUP ERROR]: Failed to list objects in bucket '{bucket}': {e}")
        sys.exit(1)

    if not objects:
        print(f"[CLEANUP SUCCESS]: Bucket '{bucket}' is empty. No files to delete.")
        return

    now_utc = datetime.datetime.now(datetime.timezone.utc)
    expired_prefixes: List[str] = []

    print(f"[CLEANUP INSPECT]: Found {len(objects)} object(s) in bucket '{bucket}'. Evaluating age > {DAYS_THRESHOLD} days...")

    for obj in objects:
        name = obj.get("name")
        created_str = obj.get("created_at") or obj.get("updated_at")
        if not name or not created_str:
            continue

        created_dt = parse_iso8601(created_str)
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=datetime.timezone.utc)

        age_seconds = (now_utc - created_dt).total_seconds()
        age_days = age_seconds / 86400.0

        if age_seconds > SECONDS_THRESHOLD:
            print(f"  ❌ EXPIRED: {name} (Created: {created_str}, Age: {age_days:.1f} days)")
            expired_prefixes.append(name)
        else:
            print(f"  ✅ KEEP: {name} (Created: {created_str}, Age: {age_days:.1f} days)")

    if not expired_prefixes:
        print(f"[CLEANUP SUCCESS]: Zero files older than {DAYS_THRESHOLD} days found. Clean exit.")
        return

    # 2. DELETE EXPIRED OBJECTS IN BULK
    delete_url = f"{supabase_url}/storage/v1/object/{bucket}"
    delete_payload = json.dumps({"prefixes": expired_prefixes}).encode("utf-8")

    try:
        req = urllib.request.Request(delete_url, data=delete_payload, headers=headers, method="DELETE")
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status in (200, 204):
                print(f"[CLEANUP SUCCESS]: Deleted {len(expired_prefixes)} expired screenshot(s) older than {DAYS_THRESHOLD} days from Supabase Storage bucket '{bucket}'!")
            else:
                body = resp.read().decode("utf-8")
                print(f"[CLEANUP RESPONSE]: Status {resp.status} - {body}")
    except Exception as e:
        print(f"[CLEANUP ERROR]: Failed to delete objects from bucket '{bucket}': {e}")
        sys.exit(1)

if __name__ == "__main__":
    cleanup_expired_screenshots()
