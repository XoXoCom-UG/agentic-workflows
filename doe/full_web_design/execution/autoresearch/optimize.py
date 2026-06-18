#!/usr/bin/env python3
"""AutoResearch loop driver for the DOE repo (the deterministic "harness" half).

This is the orchestration glue of Karpathy's AutoResearch pattern, adapted to a website
instead of an ML model. It pairs a fixed scorer (score/<metric>.py) with an AI-edited
artifact set and a plain-English direction file (program/<metric>.md), and runs the
keep-or-revert loop: read direction + history -> (agent edits) -> build/serve -> score
-> record -> keep if the number improved, else revert.

It is intentionally creativity-free: it never decides WHAT to change (the agent does
that). It only measures, records, and gates. Two run modes:

  Mode A (default, safe — "Claude is the loop"):
    1. `python optimize.py state --metric seo`          # dump direction + history + weak spots
    2. <the agent makes ONE edit to the site artifacts>
    3. `python optimize.py evaluate --metric seo --serve --hypothesis "added robots.ts"`
       -> scores, appends a results row, prints KEEP or REVERT. The agent then commits
          (keep) or `git checkout -- <files>` (revert) deliberately. No destructive git
          side effects.

  Mode B (autonomous, unattended — `--auto-git`):
    `optimize.py` itself commits on improvement and `git reset --hard` on regression,
    exactly like the original overnight loop. Destructive; requires a clean tree to
    start. Use with the /loop or schedule skills for hands-off runs.

Free + zero-install: standard library only. The "experiment" is `next dev` + an HTML
audit (CPU, seconds) — no GPU, no Modal, no paid API. Cost is Claude tokens already owned.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
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
SCORERS = HERE / "score"
RESULTS = HERE / "results"
PROGRAMS = HERE / "program"
SITES = REPO_ROOT / "sites"

PORT_RANGE = range(3000, 3100)
SERVER_READY_TIMEOUT = 120  # seconds to wait for `next dev` to answer


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


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, text=True)


def working_tree_clean() -> bool:
    return git("status", "--porcelain").stdout.strip() == ""


def current_sha() -> str:
    return git("rev-parse", "--short", "HEAD").stdout.strip()


def run_scorer(metric: str, base_url: str) -> dict:
    scorer = SCORERS / f"score_{metric}.py"
    if not scorer.is_file():
        raise SystemExit(f"no scorer for metric '{metric}': {scorer} not found")
    proc = subprocess.run([sys.executable, str(scorer), "--base-url", base_url],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"scorer failed (exit {proc.returncode}):\n{proc.stderr}")
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    if not lines:
        raise SystemExit(f"scorer produced no output:\n{proc.stderr}")
    return json.loads(lines[-1])


def serve_and_score(metric: str, slug: str) -> dict:
    """Start `next dev` for the site, score against it, then tear the server down."""
    site_dir = SITES / slug
    if not (site_dir / "node_modules").is_dir():
        raise SystemExit(f"node_modules missing in {site_dir} — run `npm install` there first")
    port = find_free_port()
    base_url = f"http://localhost:{port}"
    npx = "npx.cmd" if os.name == "nt" else "npx"
    popen_kwargs: dict = {"cwd": site_dir, "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
    if os.name == "nt":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
    else:
        # own process group so we can signal the whole tree (next dev + compile workers)
        popen_kwargs["preexec_fn"] = os.setsid  # type: ignore[attr-defined]
    print(f"[optimize] starting next dev on {base_url} …", file=sys.stderr)
    server = subprocess.Popen([npx, "next", "dev", "-p", str(port)], **popen_kwargs)
    try:
        if not wait_until_ready(base_url, SERVER_READY_TIMEOUT):
            raise SystemExit(f"next dev did not become ready within {SERVER_READY_TIMEOUT}s")
        # Pre-warm the root until it actually returns 200 — next dev compiles lazily, and
        # the scorer's per-route fetch additionally retries transient failures.
        for _ in range(30):
            try:
                with urllib.request.urlopen(base_url, timeout=10) as resp:
                    if resp.status == 200:
                        break
            except (urllib.error.URLError, OSError, TimeoutError):
                pass
            time.sleep(2.0)
        return run_scorer(metric, base_url)
    finally:
        print("[optimize] stopping next dev …", file=sys.stderr)
        if os.name == "nt":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(server.pid)], capture_output=True)
        else:
            try:
                os.killpg(os.getpgid(server.pid), signal.SIGTERM)
                server.wait(timeout=10)
            except (ProcessLookupError, subprocess.TimeoutExpired):
                try:
                    os.killpg(os.getpgid(server.pid), signal.SIGKILL)
                except ProcessLookupError:
                    pass


def read_results(metric: str) -> list[dict]:
    path = RESULTS / f"{metric}.tsv"
    if not path.is_file():
        return []
    rows = []
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines:
        return []
    header = lines[0].split("\t")
    for ln in lines[1:]:
        if ln.strip():
            rows.append(dict(zip(header, ln.split("\t"))))
    return rows


def best_score(rows: list[dict]) -> float:
    kept = [float(r["score"]) for r in rows if r.get("decision") == "kept" and r.get("score")]
    return max(kept) if kept else 0.0


def append_row(metric: str, hypothesis: str, score: float, prev_best: float,
               decision: str, sha: str) -> None:
    path = RESULTS / f"{metric}.tsv"
    if not path.exists():
        path.write_text("iter\ttimestamp\thypothesis\tscore\tprev_best\tdecision\tcommit\n",
                        encoding="utf-8")
    rows = read_results(metric)
    iter_n = len(rows) + 1
    ts = _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    hyp = hypothesis.replace("\t", " ").replace("\n", " ")
    with path.open("a", encoding="utf-8") as f:
        f.write(f"{iter_n}\t{ts}\t{hyp}\t{score}\t{prev_best}\t{decision}\t{sha}\n")


# --------------------------------------------------------------------------- commands
def cmd_state(args: argparse.Namespace) -> int:
    program = PROGRAMS / f"{args.metric}.md"
    if program.is_file():
        print("=" * 70)
        print(f"RESEARCH DIRECTION  ({program})")
        print("=" * 70)
        print(program.read_text(encoding="utf-8"))
    rows = read_results(args.metric)
    print("=" * 70)
    print(f"HISTORY  ({len(rows)} iterations, best kept score = {best_score(rows):.2f})")
    print("=" * 70)
    for r in rows[-10:]:
        print(f"  #{r.get('iter'):>3}  {r.get('score'):>6}  {r.get('decision'):<8}  {r.get('hypothesis')}")
    if args.base_url:
        print("\n[optimize] running a live score for weak-spot hints …")
        result = run_scorer(args.metric, args.base_url)
        print(f"  live score: {result['score']}  passed={result['passed']}")
        weak = sorted((v, k) for k, v in result["subscores"].items() if k.startswith("route::"))
        print("  weakest per-route checks (fix these first):")
        for v, k in weak[:8]:
            print(f"    {k.replace('route::','')}: {v:.0%} of routes pass")
    return 0


def cmd_evaluate(args: argparse.Namespace) -> int:
    metric = args.metric
    if args.auto_git and not working_tree_clean():
        raise SystemExit("--auto-git requires a clean working tree to start "
                         "(commit or stash first; the loop manages git itself).")

    result = (serve_and_score(metric, args.slug) if args.serve
              else run_scorer(metric, args.base_url))
    score, passed = float(result["score"]), bool(result["passed"])
    rows = read_results(metric)
    prev = best_score(rows)
    improved = passed and score > prev
    decision = "kept" if improved else "reverted"

    print(json.dumps({"score": score, "passed": passed, "prev_best": prev,
                      "improved": improved, "decision": decision}))

    if args.auto_git:
        if improved:
            # Scope staging to intentional content dirs — the score takes 60–120s during
            # which OneDrive sync could otherwise sweep unrelated files into the commit.
            git("add", "--", "sites", "execution", "directives")
            msg = f"autoresearch({metric}): {args.hypothesis} [score {score} > {prev}]".replace('"', "'")
            git("commit", "-m", msg)
            sha = current_sha()
        else:
            git("reset", "--hard", "HEAD")
            sha = current_sha()
        append_row(metric, args.hypothesis, score, prev, decision, sha)
        print(f"[optimize] {decision.upper()} (auto-git): score {score} vs best {prev}", file=sys.stderr)
    else:
        # Mode A: record the result; the agent commits (keep) or reverts deliberately.
        append_row(metric, args.hypothesis, score, prev, decision, current_sha())
        verb = "KEEP — commit this change" if improved else \
               ("REVERT — score did not improve" if passed else "REVERT — hard gate failed (passed=false)")
        print(f"[optimize] recommendation: {verb}  (score {score} vs best {prev})", file=sys.stderr)
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="AutoResearch keep-or-revert loop driver.")
    sub = p.add_subparsers(dest="command", required=True)

    ps = sub.add_parser("state", help="Print research direction + history (+ optional live weak-spots).")
    ps.add_argument("--metric", default="seo")
    ps.add_argument("--base-url", default=None, help="If set, also run a live score for weak-spot hints.")
    ps.set_defaults(func=cmd_state)

    pe = sub.add_parser("evaluate", help="Score the current site, record the result, keep/revert.")
    pe.add_argument("--metric", default="seo")
    pe.add_argument("--hypothesis", required=True, help="One line describing the change just made.")
    pe.add_argument("--slug", default="xoxocom")
    pe.add_argument("--base-url", default="http://localhost:3000",
                    help="Score against an already-running server (ignored if --serve).")
    pe.add_argument("--serve", action="store_true", help="Start/stop `next dev` automatically around the score.")
    pe.add_argument("--auto-git", action="store_true",
                    help="Mode B: commit on improvement / git reset --hard on regression (destructive; clean tree required).")
    pe.set_defaults(func=cmd_evaluate)

    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
