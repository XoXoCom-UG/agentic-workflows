#!/usr/bin/env python3
"""Build & serve a site's PRODUCTION bundle from outside OneDrive.

Why this exists: byte-accurate speed scoring requires `next build` + `next start`
(dev bundles are unminified and meaningless), but `next build` fails intermittently
inside OneDrive — it dehydrates/locks `.next/server` files between write and read
(documented in directives/deploy_to_netlify.md, Error Handling). The known manual
workaround is "robocopy the site to C:\\xoxo-build\\<slug> and build there"; this
script automates it so the AutoResearch speed loop (and future deploys) can rely on it.

Subcommands:
    up     --slug xoxocom   robocopy /MIR -> npm ci (hash-cached) -> next build ->
                            next start on a free port in 3100-3199. Prints ONE JSON
                            line: {"base_url": ..., "port": ..., "pid": ...}
    down   --slug xoxocom   kill the recorded server process tree; silent if none.
    status --slug xoxocom   report recorded state + probe "/" for HTTP 200.

The repo copy under sites/<slug> stays the single source of truth; the external copy
is a disposable build artifact (never committed, always regenerable). Incremental
robocopy /MIR keeps re-runs cheap (~2-5 s) and mirrors deletions, so a `git checkout`
revert in the repo is faithfully reflected in the next build.

Ports 3100-3199 deliberately avoid optimize.py's dev range (3000-3099) so a speed
evaluation can never collide with a dev-server SEO run.

Free + zero-install: standard library only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
SITES = REPO_ROOT / "sites"

# Outside any OneDrive-synced tree. POSIX fallback keeps the script usable elsewhere.
DEFAULT_BUILD_ROOT = Path("C:/xoxo-build") if os.name == "nt" else Path.home() / "xoxo-build"

PORT_RANGE = range(3100, 3200)   # optimize.py --serve owns 3000-3099
SERVER_READY_TIMEOUT = 120       # seconds to wait for `next start` to answer
STATE_FILE = ".serve_state.json"     # pid/port of the running server (in the build copy)
INSTALL_HASH_FILE = ".install_hash"  # sha256 of package-lock.json at last `npm ci`


# --------------------------------------------------------------------------- utils
def find_free_port() -> int:
    for port in PORT_RANGE:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError(f"no free port in {PORT_RANGE.start}-{PORT_RANGE.stop - 1}")


def wait_until_ready(base_url: str, timeout: int) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(base_url, timeout=5) as resp:
                if resp.status < 500:
                    return True
        except urllib.error.HTTPError:
            return True  # any HTTP response means the server is up
        except (urllib.error.URLError, OSError, TimeoutError):
            time.sleep(1.0)
    return False


def log(msg: str) -> None:
    print(f"[serve_prod] {msg}", file=sys.stderr)


def build_dir(build_root: Path, slug: str) -> Path:
    return build_root / f"{slug}-speed"


def read_state(dest: Path) -> dict | None:
    path = dest / STATE_FILE
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def kill_tree(pid: int) -> None:
    """Kill the recorded server's process tree — but only after confirming the PID
    still belongs to a node/npm process, so a recycled PID never takes down an
    unrelated program."""
    if os.name == "nt":
        check = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
                               capture_output=True, text=True, encoding="utf-8", errors="replace")
        image = check.stdout.split(",")[0].strip('" ').lower() if "," in check.stdout else ""
        if not any(name in image for name in ("node", "npm", "npx", "cmd")):
            log(f"pid {pid} is no longer our server ({image or 'gone'}) — skipping kill")
            return
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            pass


def kill_orphans_on_ports() -> None:
    """Recover from a lost/corrupt state file: find node.exe processes still LISTENing
    in our reserved port range (3100-3199) and kill them. Only targets processes whose
    image is node.exe, so nothing else in the range can be harmed."""
    if os.name != "nt":
        return
    proc = subprocess.run(["netstat", "-ano", "-p", "TCP"],
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    pids: set[int] = set()
    for line in proc.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 5 and parts[0] == "TCP" and "LISTENING" in line:
            try:
                port = int(parts[1].rsplit(":", 1)[1])
                if port in PORT_RANGE:
                    pids.add(int(parts[-1]))
            except (ValueError, IndexError):
                continue
    for pid in sorted(pids):
        check = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
                               capture_output=True, text=True, encoding="utf-8", errors="replace")
        image = check.stdout.split(",")[0].strip('" ').lower() if "," in check.stdout else ""
        if "node" in image:
            log(f"killing orphaned {image} pid={pid} in reserved port range")
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)


# --------------------------------------------------------------------------- steps
def sync_copy(site_dir: Path, dest: Path) -> None:
    """Mirror the repo site into the external build dir. /MIR propagates deletions
    (so a git revert in the repo is honored); /XD-excluded dirs and /XF-excluded
    files are protected from the mirror on the destination side."""
    dest.mkdir(parents=True, exist_ok=True)
    if os.name == "nt":
        cmd = ["robocopy", str(site_dir), str(dest), "/MIR",
               "/XD", "node_modules", ".next", ".netlify",
               "/XF", STATE_FILE, INSTALL_HASH_FILE,
               "/NFL", "/NDL", "/NP", "/NJH"]
        proc = subprocess.run(cmd, capture_output=True, text=True,
                              encoding="utf-8", errors="replace")
        if proc.returncode >= 8:  # robocopy: 0-7 = success variants, >=8 = failure
            raise SystemExit(f"robocopy failed (exit {proc.returncode}):\n{proc.stdout}\n{proc.stderr}")
    else:
        cmd = ["rsync", "-a", "--delete",
               "--exclude", "node_modules", "--exclude", ".next", "--exclude", ".netlify",
               "--exclude", STATE_FILE, "--exclude", INSTALL_HASH_FILE,
               f"{site_dir}/", f"{dest}/"]
        proc = subprocess.run(cmd, capture_output=True, text=True,
                              encoding="utf-8", errors="replace")
        if proc.returncode != 0:
            raise SystemExit(f"rsync failed (exit {proc.returncode}):\n{proc.stderr}")


def ensure_install(dest: Path) -> None:
    """`npm ci` in the copy, but only when node_modules is missing or the lockfile
    changed — installs are pinned by the committed package-lock.json."""
    lock = dest / "package-lock.json"
    if not lock.is_file():
        raise SystemExit(f"no package-lock.json in {dest} — the site must commit one for pinned installs")
    lock_hash = hashlib.sha256(lock.read_bytes()).hexdigest()
    hash_file = dest / INSTALL_HASH_FILE
    prev_hash = hash_file.read_text(encoding="utf-8").strip() if hash_file.is_file() else ""
    if (dest / "node_modules").is_dir() and prev_hash == lock_hash:
        log("npm install: cached (lockfile unchanged)")
        return
    npm = "npm.cmd" if os.name == "nt" else "npm"
    log("npm ci (first run or lockfile changed — may take a few minutes) …")
    proc = subprocess.run([npm, "ci"], cwd=dest, capture_output=True, text=True,
                          encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        raise SystemExit(f"npm ci failed (exit {proc.returncode}):\n{proc.stderr[-3000:]}")
    hash_file.write_text(lock_hash, encoding="utf-8")


def next_build(dest: Path) -> None:
    npx = "npx.cmd" if os.name == "nt" else "npx"
    log("next build …")
    proc = subprocess.run([npx, "next", "build"], cwd=dest, capture_output=True, text=True,
                          encoding="utf-8", errors="replace")
    (dest / "build.log").write_text(proc.stdout + "\n--- stderr ---\n" + proc.stderr, encoding="utf-8")
    if proc.returncode != 0:
        tail = "\n".join((proc.stdout + "\n" + proc.stderr).strip().splitlines()[-30:])
        raise SystemExit(f"next build failed (exit {proc.returncode}); tail of output:\n{tail}\n"
                         f"(full log: {dest / 'build.log'})")
    log("next build OK")


def next_start(dest: Path) -> dict:
    port = find_free_port()
    base_url = f"http://localhost:{port}"
    npx = "npx.cmd" if os.name == "nt" else "npx"
    serve_log = (dest / "serve.log").open("w", encoding="utf-8")
    popen_kwargs: dict = {"cwd": dest, "stdout": serve_log, "stderr": subprocess.STDOUT}
    if os.name == "nt":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
    else:
        popen_kwargs["preexec_fn"] = os.setsid  # type: ignore[attr-defined]
    log(f"next start on {base_url} …")
    server = subprocess.Popen([npx, "next", "start", "-p", str(port)], **popen_kwargs)
    if not wait_until_ready(base_url, SERVER_READY_TIMEOUT):
        kill_tree(server.pid)
        raise SystemExit(f"next start did not become ready within {SERVER_READY_TIMEOUT}s "
                         f"(see {dest / 'serve.log'})")
    # Confirm "/" actually returns 200 (prod serves eagerly, so one check suffices).
    status = 0
    try:
        with urllib.request.urlopen(base_url, timeout=10) as resp:
            status = resp.status
    except (urllib.error.URLError, OSError, TimeoutError):
        pass
    if status != 200:
        kill_tree(server.pid)
        raise SystemExit(f"server is up but '/' returned {status or 'no response'} "
                         f"(see {dest / 'serve.log'})")
    state = {"pid": server.pid, "port": port, "base_url": base_url}
    (dest / STATE_FILE).write_text(json.dumps(state), encoding="utf-8")
    return state


# --------------------------------------------------------------------------- commands
def cmd_down(args: argparse.Namespace) -> int:
    dest = build_dir(args.build_root, args.slug)
    state = read_state(dest)
    if not state:
        log("no recorded server — sweeping reserved ports for orphans")
        kill_orphans_on_ports()
        return 0
    log(f"stopping server pid={state['pid']} (port {state['port']}) …")
    kill_tree(int(state["pid"]))
    (dest / STATE_FILE).unlink(missing_ok=True)
    log("stopped")
    return 0


def cmd_up(args: argparse.Namespace) -> int:
    if not re.fullmatch(r"[a-z0-9_-]+", args.slug):
        raise SystemExit(f"invalid slug '{args.slug}' (lowercase letters, digits, - and _ only)")
    site_dir = SITES / args.slug
    if not site_dir.is_dir():
        raise SystemExit(f"no such site: {site_dir}")
    dest = build_dir(args.build_root, args.slug)

    cmd_down(args)  # idempotent: clear any previous instance first
    log(f"syncing {site_dir} -> {dest} …")
    sync_copy(site_dir, dest)
    ensure_install(dest)
    next_build(dest)
    state = next_start(dest)
    log(f"ready: {state['base_url']}")
    print(json.dumps(state))
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    dest = build_dir(args.build_root, args.slug)
    state = read_state(dest)
    if not state:
        print(json.dumps({"running": False}))
        return 0
    status = 0
    try:
        with urllib.request.urlopen(state["base_url"], timeout=5) as resp:
            status = resp.status
    except (urllib.error.URLError, OSError, TimeoutError):
        pass
    print(json.dumps({"running": status == 200, **state, "http_status": status}))
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Build & serve a site's production bundle outside OneDrive.")
    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument("--slug", default="xoxocom")
    shared.add_argument("--build-root", type=Path, default=DEFAULT_BUILD_ROOT,
                        help=f"External (non-OneDrive) workspace root (default: {DEFAULT_BUILD_ROOT})")
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("up", parents=[shared],
                   help="sync, build, and serve; prints {'base_url', 'port', 'pid'}").set_defaults(func=cmd_up)
    sub.add_parser("down", parents=[shared], help="stop the recorded server").set_defaults(func=cmd_down)
    sub.add_parser("status", parents=[shared], help="report recorded state + live probe").set_defaults(func=cmd_status)
    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
