#!/usr/bin/env python3
"""Record an on-page <canvas> animation to a reusable webm + mp4 clip.

Why this exists: our hero graphics (e.g. the HeroGraph node-network) are LIVE
canvas animations, not video files. To reuse one elsewhere (ads, social, a
static fallback) we need a clean recording. Doing that by hand hides three
non-obvious traps, which this script bakes in so the next capture is one command:

  1. requestAnimationFrame throttling — when the controlled Chrome window is
     backgrounded the page reports visibilityState=hidden and rAF drops to ~1/s,
     so a naive recording captures a frozen frame. Fix: keep a CDP screencast
     running for the duration, which forces Chrome to keep producing frames.
  2. Transparent canvas — the hero canvas paints no background, so a raw capture
     comes out on black. Fix: composite each frame onto the brand background
     (read from the --color-bg token unless --bg is given) in an offscreen canvas
     and record THAT.
  3. Odd pixel dimensions — H.264 rejects odd width/height (e.g. 1901), silently
     killing the mp4. Fix: the ffmpeg step crops to the nearest even dimensions.

It is a browser-automation script, not a pure function: it needs the
browser-harness daemon and a page where the target canvas is mounted (a local
dev server from start_preview_server.py, or the deployed URL). ffmpeg must be on
PATH for the mp4 step.

Usage:
    # record the xoxocom hero from the live site into assets/exploded-views/
    python execution/record_canvas_animation.py \
        --url https://xoxocom-ug.netlify.app --name hero-node-network

    # or from a local preview, custom length, explicit output path
    python execution/record_canvas_animation.py \
        --url http://localhost:3000 --seconds 6 --out assets/exploded-views/demo.webm

Outputs: <out>.webm (VP9) and the sibling <out>.mp4 (H.264, even dims).
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIR = REPO_ROOT / "assets" / "exploded-views"

# The recording runs INSIDE browser-harness (helpers like new_tab/js/cdp are
# pre-imported there). We pipe this snippet to it over stdin. String config is
# injected as JSON (@@*_JSON@@) so quotes/backslashes in a URL, selector, path,
# or colour can't break the Python literal or the in-page JS; numeric config is
# argparse-typed so plain @@TOKENS@@ are safe. The in-page JS is assembled from
# those Python vars at runtime (so JS braces need no escaping). The snippet writes
# the .webm itself and prints a "REC_OK <bytes> <path>" marker we parse back here.
SNIPPET = r'''
import time, base64, os, json

URL = @@URL_JSON@@
SELECTOR = @@SELECTOR_JSON@@
DURATION_MS = @@DURATION_MS@@
FPS = @@FPS@@
BITRATE = @@BITRATE@@
BG = @@BG_JSON@@
OUT = @@OUT_JSON@@
SETTLE = @@SETTLE@@

JS = r"""
(() => {
  const src = document.querySelector($$SELECTOR$$);
  if (!src) return 'NO_TARGET';
  if (!src.width || !src.height) return 'NO_SIZE';
  const W = src.width, H = src.height;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const cx = comp.getContext('2d');
  const bg = ($$BG$$) || (getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()) || '#000000';
  window.__go = true;
  (function loop(){ if (!window.__go) return; cx.fillStyle = bg; cx.fillRect(0,0,W,H); cx.drawImage(src,0,0); requestAnimationFrame(loop); })();
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const stream = comp.captureStream($$FPS$$);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: $$BITRATE$$ });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  window.__recDone = false; window.__recB64 = '';
  rec.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let binv = ''; const CH = 0x8000;
    for (let i=0;i<buf.length;i+=CH) binv += String.fromCharCode.apply(null, buf.subarray(i,i+CH));
    window.__recB64 = btoa(binv); window.__recDone = true; window.__go = false;
  };
  rec.start();
  setTimeout(()=>rec.stop(), $$DURMS$$);
  return JSON.stringify({W,H,mime});
})()
"""
# Substitute numeric tokens first, then user-supplied ones (BG, SELECTOR) LAST, so a
# value that happens to contain a "$$...$$" token can't collide with a later pass.
JS = (JS.replace("$$FPS$$", str(FPS))
        .replace("$$BITRATE$$", str(BITRATE))
        .replace("$$DURMS$$", str(DURATION_MS))
        .replace("$$BG$$", json.dumps(BG))
        .replace("$$SELECTOR$$", json.dumps(SELECTOR)))

ensure_real_tab()
new_tab(URL)
wait_for_load()
# Remember exactly the tab we opened so we can close only it at the end (no tab leak,
# and we never touch a tab the user owns).
REC_TID = None
try:
    REC_TID = cdp("Target.getTargetInfo")["targetInfo"]["targetId"]
except Exception:
    pass
# Screencast keeps frames flowing even if the window is backgrounded (defeats rAF throttling).
cdp("Page.startScreencast", format="jpeg", quality=30, everyNthFrame=1)
time.sleep(SETTLE)

setup = js(JS)
print("SETUP:", setup)
if "NO_TARGET" in str(setup):
    print("REC_ERR no canvas matched selector:", SELECTOR)
elif "NO_SIZE" in str(setup):
    print("REC_ERR canvas has no backing size (animation may not have mounted):", SELECTOR)
else:
    # Wait out the recording, then poll for MediaRecorder.onstop to finish encoding the
    # blob to base64 (can take a while for long/large clips — don't assume a fixed budget).
    time.sleep(DURATION_MS / 1000.0 + 0.5)
    for _ in range(60):
        if js("String(window.__recDone)") == "true":
            break
        time.sleep(0.3)
    if js("String(window.__recDone)") != "true":
        print("REC_ERR recorder did not finish (rAF may be throttled / tab hidden)")
    else:
        n = int(js("String((window.__recB64||'').length)"))
        parts = []; CH = 1_000_000; i = 0
        while i < n:
            parts.append(js("(window.__recB64||'').slice(%d,%d)" % (i, i + CH)))
            i += CH
        data = base64.b64decode("".join(parts))
        os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
        with open(OUT, "wb") as f:
            f.write(data)
        print("REC_OK", len(data), OUT)

try:
    cdp("Page.stopScreencast")
except Exception:
    pass
# Close only the tab we opened, freeing it in the daemon's browser.
if REC_TID:
    try:
        cdp("Target.closeTarget", targetId=REC_TID)
    except Exception:
        pass
'''


def build_snippet(url: str, selector: str, duration_ms: int, fps: int, bitrate: int, bg: str, out: Path, settle: float) -> str:
    # String values go in as JSON literals (valid Python AND safe to embed); numerics
    # are argparse-typed ints/floats, so str() is injection-free.
    return (
        SNIPPET.replace("@@URL_JSON@@", json.dumps(url))
        .replace("@@SELECTOR_JSON@@", json.dumps(selector))
        .replace("@@DURATION_MS@@", str(duration_ms))
        .replace("@@FPS@@", str(fps))
        .replace("@@BITRATE@@", str(bitrate))
        .replace("@@BG_JSON@@", json.dumps(bg))
        .replace("@@OUT_JSON@@", json.dumps(str(out)))
        .replace("@@SETTLE@@", str(settle))
    )


def to_mp4(webm: Path) -> Path:
    """Transcode the webm to a faststart H.264 mp4, forcing even dimensions."""
    mp4 = webm.with_suffix(".mp4")
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(webm),
        "-vf", "crop=trunc(iw/2)*2:trunc(ih/2)*2",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264", "-crf", "20",
        str(mp4),
    ]
    subprocess.run(cmd, check=True)
    return mp4


def main() -> int:
    p = argparse.ArgumentParser(description="Record an on-page canvas animation to webm + mp4.")
    p.add_argument("--url", required=True, help="page URL where the canvas is mounted (local preview or deployed)")
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--out", help="output .webm path (the .mp4 is written alongside)")
    group.add_argument("--name", help="basename; writes to assets/exploded-views/<name>.{webm,mp4}")
    p.add_argument("--selector", default="canvas", help="CSS selector for the canvas (default: canvas)")
    p.add_argument("--seconds", type=float, default=12.0, help="recording length in seconds; ~2 animation cycles (default: 12)")
    p.add_argument("--fps", type=int, default=30, help="capture frame rate (default: 30)")
    p.add_argument("--bitrate", type=int, default=8_000_000, help="video bitrate in bits/s (default: 8M)")
    p.add_argument("--bg", default="", help="background color; default reads the page's --color-bg token")
    p.add_argument("--settle", type=float, default=2.5, help="seconds to wait after load before recording (default: 2.5)")
    p.add_argument("--no-mp4", action="store_true", help="skip the mp4 transcode (keep webm only)")
    args = p.parse_args()

    if args.out:
        out = Path(args.out)
        if out.suffix.lower() != ".webm":
            out = out.with_suffix(".webm")
    else:
        out = DEFAULT_DIR / f"{args.name}.webm"
    if not out.is_absolute():
        out = (REPO_ROOT / out).resolve()

    harness = shutil.which("browser-harness")
    if not harness:
        print("browser-harness not found on PATH. See the browser-harness SKILL for setup.", file=sys.stderr)
        return 2
    if not args.no_mp4 and not shutil.which("ffmpeg"):
        print("ffmpeg not found on PATH (needed for the mp4 step). Use --no-mp4 to skip.", file=sys.stderr)
        return 2

    duration_ms = int(round(args.seconds * 1000))
    snippet = build_snippet(args.url, args.selector, duration_ms, args.fps, args.bitrate, args.bg, out, args.settle)

    # Budget = settle + capture + base-overhead + ~3s per estimated 1MB base64 chunk the
    # snippet must read back over CDP (scales with bitrate * length).
    est_chunks = (args.seconds * args.bitrate / 8) / 1_000_000
    timeout = args.settle + args.seconds + 90 + int(est_chunks * 3)
    print(f"recording {args.seconds}s of '{args.selector}' at {args.url} -> {out}")
    try:
        # browser-harness forces its stdout to UTF-8; decode as UTF-8 (not the cp1252
        # system default) or a non-ASCII path in its output would crash the decode.
        proc = subprocess.run([harness], input=snippet, text=True, encoding="utf-8",
                              capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        print("browser-harness timed out — is the daemon up and the URL reachable?", file=sys.stderr)
        return 1

    if proc.stdout:
        print(proc.stdout.strip())
    if "REC_OK" not in (proc.stdout or ""):
        if proc.stderr:
            print(proc.stderr.strip(), file=sys.stderr)
        print("recording failed — see output above.", file=sys.stderr)
        return 1

    if not out.is_file() or out.stat().st_size == 0:
        print(f"expected webm at {out} but it is missing/empty", file=sys.stderr)
        return 1
    print(f"ok: wrote {out} ({out.stat().st_size} bytes)")

    if not args.no_mp4:
        try:
            mp4 = to_mp4(out)
        except subprocess.CalledProcessError as exc:
            print(f"ffmpeg transcode failed: {exc}", file=sys.stderr)
            return 1
        print(f"ok: wrote {mp4} ({mp4.stat().st_size} bytes)")

    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
