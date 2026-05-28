#!/usr/bin/env python3
"""List .mp4 files in exploded_views/ as JSON. Used by build_landing_page directive."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = REPO_ROOT / "exploded_views"


def list_videos() -> list[dict]:
    if not ASSETS_DIR.is_dir():
        return []
    out: list[dict] = []
    for path in sorted(ASSETS_DIR.glob("*.mp4")):
        stat = path.stat()
        out.append(
            {
                "filename": path.name,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            }
        )
    return out


if __name__ == "__main__":
    json.dump(list_videos(), sys.stdout, indent=2)
    sys.stdout.write("\n")
