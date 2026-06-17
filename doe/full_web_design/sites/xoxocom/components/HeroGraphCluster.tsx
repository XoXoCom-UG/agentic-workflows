"use client";

import { useEffect, useRef } from "react";

/**
 * HeroGraphCluster — an animated 3D-render-style node network that visualises the
 * graph-theory *local clustering coefficient*.
 *
 * A cloud of nodes floats in perspective space, connected by a faint mesh. On a
 * loop a focal node lights up in the brand accent; its direct neighbours (the
 * "ego network") light up and radial spokes draw out to them. Then every pair of
 * neighbours that are themselves connected forms a triangle with the focal node —
 * those triangles fill softly and a small arc-gauge by the focal node sweeps to the
 * node's clustering coefficient C = 2·(links among neighbours) / k·(k−1). The
 * cluster holds, fades, and a new focal node is chosen.
 *
 * Sibling of HeroGraph (which highlights a shortest path). All colours are read
 * from the site's CSS design tokens (--color-bg/-fg/-muted/-accent) at runtime, so
 * the graphic re-skins automatically with the theme. Honours prefers-reduced-motion
 * (renders a single static cluster frame).
 */

type Node = { x: number; y: number; z: number };
type Projected = { sx: number; sy: number; scale: number; depth: number; alpha: number };
type Focal = { v: number; neighbours: number[]; triangles: [number, number][]; coeff: number };

const NODE_COUNT = 36;
const CYCLE_MS = 5600; // one clustering-coefficient highlight cycle
const FOCAL_COUNT = 5; // how many focal nodes to rotate through

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

/**
 * Build a random-geometric graph: connect every pair of nodes within a radius R.
 * Geometric graphs have naturally high clustering (nearby nodes share neighbours),
 * which is exactly what we want to put on display. R is picked from the distribution
 * of pairwise distances to target an average degree of ~5.
 */
function buildGraph() {
  const rng = makeRng(20240617);
  const nodes: Node[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: (rng() * 2 - 1) * 1.35,
      y: (rng() * 2 - 1) * 0.78,
      z: (rng() * 2 - 1) * 0.85,
    });
  }

  const dist = (a: Node, b: Node) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

  // Choose R so ~ (TARGET_DEG / (n-1)) of all pairs are linked.
  const TARGET_DEG = 5;
  const pair: number[] = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) pair.push(dist(nodes[i], nodes[j]));
  pair.sort((a, b) => a - b);
  const frac = TARGET_DEG / (nodes.length - 1);
  const R = pair[Math.min(pair.length - 1, Math.floor(frac * pair.length))];

  const adj: Set<number>[] = nodes.map(() => new Set<number>());
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (dist(nodes[i], nodes[j]) <= R) {
        adj[i].add(j);
        adj[j].add(i);
        edges.push([i, j]);
      }
    }
  }

  // Guarantee no node is fully isolated: link any lone node to its nearest peer.
  for (let i = 0; i < nodes.length; i++) {
    if (adj[i].size === 0) {
      let best = -1, bestD = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        if (j === i) continue;
        const d = dist(nodes[i], nodes[j]);
        if (d < bestD) { bestD = d; best = j; }
      }
      if (best >= 0) { adj[i].add(best); adj[best].add(i); edges.push([Math.min(i, best), Math.max(i, best)]); }
    }
  }

  return { nodes, adj, edges };
}

/**
 * For a node, find its neighbours, the edges *among* those neighbours (each of which
 * forms a triangle with the node), and the resulting local clustering coefficient.
 */
function analyseNode(adj: Set<number>[], v: number): Focal {
  const neighbours = [...adj[v]];
  const k = neighbours.length;
  const triangles: [number, number][] = [];
  for (let a = 0; a < neighbours.length; a++) {
    for (let b = a + 1; b < neighbours.length; b++) {
      if (adj[neighbours[a]].has(neighbours[b])) triangles.push([neighbours[a], neighbours[b]]);
    }
  }
  const coeff = k < 2 ? 0 : (2 * triangles.length) / (k * (k - 1));
  return { v, neighbours, triangles, coeff };
}

/**
 * Pick the focal nodes to rotate through: prefer nodes that both have a meaningful
 * neighbourhood and at least a couple of closed triangles (so the coefficient reads
 * clearly), and spread them out in x so the highlight roams across the canvas.
 */
function pickFocals(nodes: Node[], adj: Set<number>[]): Focal[] {
  const candidates = nodes
    .map((_, i) => analyseNode(adj, i))
    .filter((f) => f.neighbours.length >= 3 && f.triangles.length >= 2)
    .sort((a, b) => b.triangles.length * b.coeff - a.triangles.length * a.coeff);

  const chosen: Focal[] = [];
  for (const c of candidates) {
    if (chosen.length >= FOCAL_COUNT) break;
    // Avoid two focal nodes sitting almost on top of each other.
    const tooClose = chosen.some((f) => Math.abs(nodes[f.v].x - nodes[c.v].x) < 0.45);
    if (!tooClose) chosen.push(c);
  }
  // Top-up if the spread filter was too strict.
  for (const c of candidates) {
    if (chosen.length >= FOCAL_COUNT) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  // Order left-to-right so the focus sweeps across rather than jumping around.
  return chosen.sort((a, b) => nodes[a.v].x - nodes[b.v].x);
}

// ---- component -----------------------------------------------------------

export default function HeroGraphCluster({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, adj, edges } = buildGraph();
    const focals = pickFocals(nodes, adj);
    if (focals.length === 0) return;

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
      const y = n.y * Math.cos(rx) - z * Math.sin(rx);
      z = n.y * Math.sin(rx) + z * Math.cos(rx);
      const focal = 3.4;
      const scale = focal / (focal - z);
      const spread = Math.min(W, H * 1.6) * 0.42;
      const sx = W / 2 + x * scale * spread;
      const sy = H / 2 + y * scale * spread;
      const depth = smoothstep(-1.2, 1.2, z);
      const cdist = Math.hypot((sx - W / 2) / (W / 2), (sy - H / 2) / (H / 2));
      const centerFade = 0.25 + 0.75 * smoothstep(0.18, 0.95, cdist);
      return { sx, sy, scale, depth, alpha: centerFade };
    };

    let raf = 0;
    let t0 = 0;
    let cycle = -1;
    let focal: Focal = focals[0];

    const draw = (now: number) => {
      if (!t0) t0 = now;
      const elapsed = now - t0;
      const cycleIdx = Math.floor(elapsed / CYCLE_MS);
      if (cycleIdx !== cycle) {
        cycle = cycleIdx;
        focal = focals[cycle % focals.length];
      }
      const tt = (elapsed % CYCLE_MS) / CYCLE_MS; // 0..1 within cycle

      // Phase envelopes.
      const focalIn = smoothstep(0.0, 0.14, tt);          // focal node ignites
      const spokes = easeInOut(smoothstep(0.12, 0.46, tt)); // spokes draw to neighbours
      const triFrac = easeInOut(smoothstep(0.30, 0.72, tt)); // triangles close / gauge fills
      const fade = 1 - smoothstep(0.86, 1.0, tt);            // whole cluster fades out
      const live = focalIn * fade;

      // Continuous slow auto-rotation for the 3D-render feel.
      const ry = reduced ? 0.6 : elapsed * 0.00016;
      tiltX += (targetTX - tiltX) * 0.05;
      tiltY += (targetTY - tiltY) * 0.05;
      const rx = -0.22 + tiltX;
      const ryTotal = ry + tiltY;

      ctx.clearRect(0, 0, W, H);

      const P = nodes.map((n) => project(n, ryTotal, rx));
      const onCluster = new Set<number>([focal.v, ...focal.neighbours]);
      const neighbourSet = new Set(focal.neighbours);

      // Edge keys that belong to the active cluster (focal→neighbour spokes and
      // neighbour↔neighbour triangle sides) so we can skip them in the base mesh.
      const clusterEdge = new Set<string>();
      const ek = (i: number, j: number) => `${Math.min(i, j)}-${Math.max(i, j)}`;
      for (const nb of focal.neighbours) clusterEdge.add(ek(focal.v, nb));
      for (const [a, b] of focal.triangles) clusterEdge.add(ek(a, b));

      // 1. Base mesh edges (faint), excluding the active cluster's edges.
      ctx.lineWidth = 1;
      for (const [i, j] of edges) {
        if (clusterEdge.has(ek(i, j))) continue;
        const a = P[i], b = P[j];
        const al = 0.09 * Math.min(a.alpha, b.alpha) * (0.5 + 0.5 * Math.max(a.depth, b.depth));
        ctx.strokeStyle = rgba(colors.muted, al);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      const fp = P[focal.v];

      // 2. Triangle fills: each closed triangle (focal + two linked neighbours) is a
      //    unit of "clustering". Fill softly as the triangles close, staggered.
      const triCount = Math.max(1, focal.triangles.length);
      for (let ti = 0; ti < focal.triangles.length; ti++) {
        const stagger = focal.triangles.length > 1 ? ti / focal.triangles.length : 0;
        const f = smoothstep(stagger * 0.6, stagger * 0.6 + 0.4, triFrac);
        if (f <= 0.001) continue;
        const [a, b] = focal.triangles[ti];
        const pa = P[a], pb = P[b];
        ctx.fillStyle = rgba(colors.accent, 0.07 * f * live);
        ctx.beginPath();
        ctx.moveTo(fp.sx, fp.sy);
        ctx.lineTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.closePath();
        ctx.fill();
        // neighbour↔neighbour side of the triangle, lit in accent.
        ctx.strokeStyle = rgba(colors.accent, 0.55 * f * live);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // 3. Spokes: focal → each neighbour, drawn progressively outward.
      ctx.lineCap = "round";
      for (let ni = 0; ni < focal.neighbours.length; ni++) {
        const nb = focal.neighbours[ni];
        const stagger = focal.neighbours.length > 1 ? ni / focal.neighbours.length : 0;
        const f = smoothstep(stagger * 0.5, stagger * 0.5 + 0.5, spokes);
        if (f <= 0.001) continue;
        const p = P[nb];
        const ex = fp.sx + (p.sx - fp.sx) * f;
        const ey = fp.sy + (p.sy - fp.sy) * f;
        ctx.strokeStyle = rgba(colors.accent, 0.7 * live);
        ctx.lineWidth = 1.8;
        ctx.shadowColor = rgba(colors.accent, 0.6 * live);
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(fp.sx, fp.sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // 4. Clustering-coefficient gauge: a small arc by the focal node sweeping from
      //    the top clockwise to C·360°. A faint full ring shows the "100%" reference.
      if (live > 0.05) {
        const gr = 13 * (0.7 + 0.6 * fp.depth);
        ctx.lineWidth = 2;
        ctx.strokeStyle = rgba(colors.muted, 0.18 * live);
        ctx.beginPath();
        ctx.arc(fp.sx, fp.sy, gr, 0, Math.PI * 2);
        ctx.stroke();
        const sweep = focal.coeff * Math.PI * 2 * triFrac;
        ctx.strokeStyle = rgba(colors.accent, 0.9 * live);
        ctx.shadowColor = rgba(colors.accent, 0.7 * live);
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(fp.sx, fp.sy, gr, -Math.PI / 2, -Math.PI / 2 + sweep);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 5. Nodes (painter's order: far first).
      const order = nodes.map((_, i) => i).sort((i, j) => P[i].depth - P[j].depth);
      for (const i of order) {
        const p = P[i];
        const isFocal = i === focal.v;
        const isNeighbour = neighbourSet.has(i);
        const inCluster = onCluster.has(i);
        const baseR = isFocal ? 3.2 : isNeighbour ? 2.5 : 1.7;
        const r = baseR * (0.7 + 0.6 * p.depth);
        if (inCluster) {
          const reveal = isFocal ? focalIn : smoothstep(0, 0.5, spokes);
          const a = (isFocal ? 1 : 0.92) * live * reveal;
          ctx.fillStyle = rgba(colors.accent, a);
          ctx.shadowColor = rgba(colors.accent, 0.7 * live * reveal);
          ctx.shadowBlur = isFocal ? 16 : 10;
        } else {
          ctx.fillStyle = rgba(colors.fg, 0.5 * p.alpha * (0.5 + 0.5 * p.depth));
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

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
