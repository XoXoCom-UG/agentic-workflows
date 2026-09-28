#!/usr/bin/env python3
"""Start `next dev` for a given site on a free port. Used by build_landing_page directive.

Usage:
    python execution/start_preview_server.py --slug acme
"""

from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SITES = REPO_ROOT / "sites"

PORT_RANGE = range(3000, 3100)


def _in_use(port: int) -> bool:
    # A bind test is unreliable on Windows: listeners created with SO_REUSEADDR
    # (Node/libuv default) don't block competing binds, so the port looks free
    # while `next dev` then dies with EADDRINUSE. Probing with connect() detects
    # any active listener on either stack.
    probes = [(socket.AF_INET, ("127.0.0.1", port))]
    if socket.has_ipv6:
        probes.append((socket.AF_INET6, ("::1", port)))
    for family, addr in probes:
        try:
            with socket.socket(family, socket.SOCK_STREAM) as s:
                s.settimeout(0.25)
                if s.connect_ex(addr) == 0:
                    return True
        except OSError:
            continue
    return False


def find_free_port() -> int:
    for port in PORT_RANGE:
        if not _in_use(port):
            return port
    raise RuntimeError(f"no free port in {PORT_RANGE.start}-{PORT_RANGE.stop - 1}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    args = parser.parse_args()

    site_dir = SITES / args.slug
    if not site_dir.is_dir():
        print(f"site not found: {site_dir}", file=sys.stderr)
        return 2
    if not (site_dir / "package.json").is_file():
        print(f"missing package.json in {site_dir}", file=sys.stderr)
        return 2
    if not (site_dir / "node_modules").is_dir():
        print(f"node_modules missing in {site_dir} — run `npm install` first", file=sys.stderr)
        return 2

    port = find_free_port()
    url = f"http://localhost:{port}"
    print(f"starting next dev for sites/{args.slug} on {url}")
    print(f"(press Ctrl+C to stop)")

    # Inherit stdio so user sees the dev-server output live.
    npx = "npx.cmd" if os.name == "nt" else "npx"
    return subprocess.call(
        [npx, "next", "dev", "-p", str(port)],
        cwd=site_dir,
    )


if __name__ == "__main__":
    sys.exit(main())
