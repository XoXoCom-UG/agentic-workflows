#!/usr/bin/env python3
"""Stop hook: enforce end-of-session documentation.

Fires when the model tries to stop. If work has changed since
`directives/progress.md` was last updated (by mtime), block the stop ONCE and
tell the model to call the 'documenter' sub-agent to update progress.md and
reconcile the directives. Once progress.md is the newest file, the stop is
allowed through.

Loop-safe: if `stop_hook_active` is true on stdin, we already reminded this
turn, so exit 0 immediately and let the model stop.

No git dependency — pure mtime comparison. Repo root is resolved from this
file's location so the non-ASCII OneDrive path is never hardcoded.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# execution/hooks/ensure_progress_logged.py -> repo root is two parents up.
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROGRESS = REPO_ROOT / "directives" / "progress.md"

# Dirs whose changes should be reflected in progress.md before a session ends.
WATCH_DIRS = ["sites", "components", "execution", "assets", "directives"]

# Files/dirs that should never count as "work" for staleness (avoid self-trigger
# loops and noise from regenerable caches).
EXCLUDE_NAMES = {"progress.md"}
EXCLUDE_DIR_PARTS = {
    "node_modules", ".next", ".netlify", "__pycache__", ".git", ".tmp",
    "hooks",  # this hook's own dir — editing the hook isn't "session work"
}


def newest_work_mtime() -> float:
    """Newest mtime of any file under the watched dirs, pruning excluded dirs
    during the walk (so we never descend into node_modules/.next/etc.)."""
    newest = 0.0
    for d in WATCH_DIRS:
        base = REPO_ROOT / d
        if not base.is_dir():
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            # Prune excluded dirs in-place so os.walk skips descending into them.
            dirnames[:] = [dn for dn in dirnames if dn not in EXCLUDE_DIR_PARTS]
            for fn in filenames:
                if fn in EXCLUDE_NAMES:
                    continue
                try:
                    m = (Path(dirpath) / fn).stat().st_mtime
                except OSError:
                    continue
                if m > newest:
                    newest = m
    return newest


def main() -> int:
    # Read hook input; tolerate empty/invalid stdin.
    raw = sys.stdin.read() if not sys.stdin.isatty() else ""
    try:
        data = json.loads(raw) if raw.strip() else {}
    except (ValueError, TypeError):
        data = {}

    # Already reminded once this turn — let the stop proceed (no infinite loop).
    if data.get("stop_hook_active") is True:
        return 0

    # If progress.md doesn't exist yet, that's definitely undocumented.
    progress_mtime = -1.0
    if PROGRESS.is_file():
        try:
            progress_mtime = PROGRESS.stat().st_mtime
        except OSError:
            progress_mtime = -1.0

    newest = newest_work_mtime()

    stale = (progress_mtime < 0) or (newest > progress_mtime)
    if stale:
        reason = (
            "Work has changed since directives/progress.md was last updated. "
            "Before ending the session, call the 'documenter' sub-agent to update "
            "directives/progress.md (and reconcile any affected directives) with "
            "what was done this session, then stop."
        )
        print(json.dumps({"decision": "block", "reason": reason}))
        return 0

    # progress.md is current — allow the stop.
    return 0


if __name__ == "__main__":
    sys.exit(main())
