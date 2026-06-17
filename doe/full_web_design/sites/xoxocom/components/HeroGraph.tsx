"use client";

import { useEffect, useRef } from "react";

/**
 * HeroGraph — an animated 3D-render-style node network for the hero.
 *
 * A cloud of nodes floats in perspective space, connected by faint lines. On a
 * ~5s loop the shortest path between two far nodes lights up in the brand accent,
 * a pulse travels along it, then it fades and a new target is chosen. All colours
 * are read from the site's CSS design tokens (--color-bg/-fg/-muted/-accent) at
 * runtime, so the graphic re-skins automatically with the theme and sits
 * seamlessly on the page background. Honours prefers-reduced-motion (static frame).
 */

type Node = { x: number; y: number; z: number };
type Projected = { sx: number; sy: number; scale: number; depth: number; alpha: number };

const NODE_COUNT = 34;
const CYCLE_MS = 5000; // one shortest-path highlight cycle

// ---- small helpers -------------------------------------------------------

function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Parse #rgb / #rrggbb (or rgb()) into [r,g,b]; falls back to a coral-ish grey. */
function toRgb(color: string): [number, number, number] {
  const c = color.trim();
  if (c.startsWith("#")) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/(\d+(?:\.\d+)?)/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [251, 107, 76];
}

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---- graph construction --------------------------------------------------

/** Deterministic PRNG so the layout is stable across renders (no Math.random flicker). */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildGraph() {
  const rng = makeRng(20240617);
  const nodes: Node[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    // Spread across x; flatter in y/z for a wide "exploded slab" feel.
    nodes.push({
      x: (rng() * 2 - 1) * 1.35,
      y: (rng() * 2 - 1) * 0.78,
      z: (rng() * 2 - 1) * 0.85,
    });
  }

  const dist = (a: Node, b: Node) =>
    Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

  // Edges: each node links to its k nearest neighbours (keeps the graph connected
  // and the mesh sparse/pretty). Store as an undirected adjacency map.
  const K = 3;
  const adj: Map<number, Map<number, number>> = new Map();
  const addEdge = (i: number, j: number, w: number) => {
    if (!adj.has(i)) adj.set(i, new Map());
    if (!adj.has(j)) adj.set(j, new Map());
    adj.get(i)!.set(j, w);
    adj.get(j)!.set(i, w);
  };
  for (let i = 0; i < nodes.length; i++) {
    const order = nodes
      .map((n, j) => ({ j, d: dist(nodes[i], n) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d);
    for (let k = 0; k < K && k < order.length; k++) addEdge(i, order[k].j, order[k].d);
  }

  const edges: [number, number][] = [];
  adj.forEach((m, i) => m.forEach((_, j) => { if (i < j) edges.push([i, j]); }));

  return { nodes, adj, edges, dist };
}

/** Dijkstra shortest path over the weighted adjacency. Returns node-index list. */
function shortestPath(adj: Map<number, Map<number, number>>, start: number, goal: number): number[] {
  const n = adj.size;
  const distTo = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const done = new Array(n).fill(false);
  distTo[start] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && distTo[i] < best) { best = distTo[i]; u = i; }
    if (u === -1) break;
    if (u === goal) break;
    done[u] = true;
    adj.get(u)?.forEach((w, v) => {
      if (distTo[u] + w < distTo[v]) { distTo[v] = distTo[u] + w; prev[v] = u; }
    });
  }
  const path: number[] = [];
  for (let at = goal; at !== -1; at = prev[at]) path.unshift(at);
  return path[0] === start ? path : [];
}

// ---- component -----------------------------------------------------------

export default function HeroGraph({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, adj, edges } = buildGraph();

    // Endpoints: the leftmost node, and a rotating set of far-right targets.
    const start = nodes.reduce((m, n, i) => (n.x < nodes[m].x ? i : m), 0);
    const goals = nodes
      .map((n, i) => ({ i, x: n.x }))
      .sort((a, b) => b.x - a.x)
      .slice(0, 4)
      .map((o) => o.i);

    let colors = {
      accent: toRgb(readToken("--color-accent", "#fb6b4c")),
      fg: toRgb(readToken("--color-fg", "#eaecef")),
      muted: toRgb(readToken("--color-muted", "#8c8f92")),
    };
    const refreshColors = () => {
      colors = {
        accent: toRgb(readToken("--color-accent", "#fb6b4c")),
        fg: toRgb(readToken("--color-fg", "#eaecef")),
        muted: toRgb(readToken("--color-muted", "#8c8f92")),
      };
    };

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); refreshColors(); });
    ro.observe(canvas);

    // Subtle pointer parallax (fine pointers only).
    let tiltX = 0, tiltY = 0, targetTX = 0, targetTY = 0;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetTY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.5;
      targetTX = ((e.clientY - rect.top) / rect.height - 0.5) * -0.32;
    };
    if (finePointer) window.addEventListener("mousemove", onMove, { passive: true });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const project = (n: Node, ry: number, rx: number): Projected => {
      // rotate around Y then X
      let x = n.x * Math.cos(ry) - n.z * Math.sin(ry);
      let z = n.x * Math.sin(ry) + n.z * Math.cos(ry);
      let y = n.y * Math.cos(rx) - z * Math.sin(rx);
      z = n.y * Math.sin(rx) + z * Math.cos(rx);
      const focal = 3.4;
      const scale = focal / (focal - z);
      const spread = Math.min(W, H * 1.6) * 0.42;
      const sx = W / 2 + x * scale * spread;
      const sy = H / 2 + y * scale * spread;
      // depth 0..1 (1 = nearest). Fade nodes near the centre so the headline stays clean.
      const depth = smoothstep(-1.2, 1.2, z);
      const cdist = Math.hypot((sx - W / 2) / (W / 2), (sy - H / 2) / (H / 2));
      const centerFade = 0.25 + 0.75 * smoothstep(0.18, 0.95, cdist);
      return { sx, sy, scale, depth, alpha: centerFade };
    };

    let raf = 0;
    let t0 = 0;
    let cycle = 0;
    let path = shortestPath(adj, start, goals[0]);

    const draw = (now: number) => {
      if (!t0) t0 = now;
      const elapsed = now - t0;
      const cycleIdx = Math.floor(elapsed / CYCLE_MS);
      if (cycleIdx !== cycle) {
        cycle = cycleIdx;
        path = shortestPath(adj, start, goals[cycle % goals.length]);
      }
      const tt = (elapsed % CYCLE_MS) / CYCLE_MS; // 0..1 within cycle

      // Highlight envelope: draw-in (0.12->0.62), hold (->0.82), fade (->1.0).
      const drawFrac = easeInOut(smoothstep(0.12, 0.62, tt));
      const fade = 1 - smoothstep(0.82, 1.0, tt);
      const pathAlpha = fade;

      // Continuous slow auto-rotation for the 3D-render feel.
      const ry = reduced ? 0.6 : elapsed * 0.00016;
      tiltX += (targetTX - tiltX) * 0.05;
      tiltY += (targetTY - tiltY) * 0.05;
      const rx = -0.22 + tiltX;
      const ryTotal = ry + tiltY;

      ctx.clearRect(0, 0, W, H);

      const P = nodes.map((n) => project(n, ryTotal, rx));
      const onPath = new Set(path);
      const pathEdge = new Set<string>();
      for (let i = 0; i < path.length - 1; i++) pathEdge.add(`${Math.min(path[i], path[i + 1])}-${Math.max(path[i], path[i + 1])}`);

      // 1. Base mesh edges (faint).
      ctx.lineWidth = 1;
      for (const [i, j] of edges) {
        const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (pathEdge.has(key)) continue;
        const a = P[i], b = P[j];
        const al = 0.10 * Math.min(a.alpha, b.alpha) * (0.5 + 0.5 * Math.max(a.depth, b.depth));
        ctx.strokeStyle = rgba(colors.muted, al);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // 2. Shortest-path edges (accent), drawn progressively along the path.
      const segCount = Math.max(1, path.length - 1);
      const drawnLen = drawFrac * segCount;
      ctx.lineCap = "round";
      for (let s = 0; s < segCount; s++) {
        const segFrac = Math.min(1, Math.max(0, drawnLen - s));
        if (segFrac <= 0) break;
        const a = P[path[s]], b = P[path[s + 1]];
        const ex = a.sx + (b.sx - a.sx) * segFrac;
        const ey = a.sy + (b.sy - a.sy) * segFrac;
        ctx.strokeStyle = rgba(colors.accent, 0.9 * pathAlpha);
        ctx.lineWidth = 2;
        ctx.shadowColor = rgba(colors.accent, 0.8 * pathAlpha);
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // 3. Travelling pulse along the drawn portion of the path.
      if (path.length > 1 && pathAlpha > 0.05) {
        const pos = drawFrac * segCount;
        const seg = Math.min(segCount - 1, Math.floor(pos));
        const f = pos - seg;
        const a = P[path[seg]], b = P[path[seg + 1]];
        const px = a.sx + (b.sx - a.sx) * f;
        const py = a.sy + (b.sy - a.sy) * f;
        ctx.fillStyle = rgba(colors.accent, pathAlpha);
        ctx.shadowColor = rgba(colors.accent, pathAlpha);
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 4. Nodes (painter's order: far first).
      const order = nodes.map((_, i) => i).sort((i, j) => P[i].depth - P[j].depth);
      for (const i of order) {
        const p = P[i];
        const isPath = onPath.has(i);
        const r = (isPath ? 2.6 : 1.7) * (0.7 + 0.6 * p.depth);
        if (isPath) {
          const a = 0.95 * pathAlpha;
          ctx.fillStyle = rgba(colors.accent, a);
          ctx.shadowColor = rgba(colors.accent, 0.7 * pathAlpha);
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = rgba(colors.fg, 0.55 * p.alpha * (0.5 + 0.5 * p.depth));
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (finePointer) window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
    />
  );
}
