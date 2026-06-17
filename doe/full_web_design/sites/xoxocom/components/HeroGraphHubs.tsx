"use client";

import { useEffect, useRef } from "react";

/**
 * HeroGraphHubs — an animated 3D-render-style node network that visualises the
 * graph-theory theme of *centrality & hubs*.
 *
 * Nodes are organised into a few spatially separated communities (modules). A
 * node's degree centrality is encoded in its radius, so the high-degree *hubs*
 * read as larger even at rest. On a loop the highlight rotates between the two
 * canonical hub roles (Guimerà–Amaral):
 *   • a PROVINCIAL hub — high degree but its links stay inside its own community;
 *     its neighbourhood fans into a soft, self-contained "territory".
 *   • a CONNECTOR hub — its links bridge across separate communities; the
 *     cross-module bridges light up and pulses travel out to the modules it ties
 *     together.
 * A small arc-gauge by the focal node sweeps to its normalised centrality.
 *
 * Sibling of HeroGraph (shortest path) and HeroGraphCluster (clustering
 * coefficient). All colours are read from the site's CSS design tokens
 * (--color-bg/-fg/-muted/-accent) at runtime, so the graphic re-skins
 * automatically with the theme. Honours prefers-reduced-motion (static frame).
 */

type Node = { x: number; y: number; z: number; m: number };
type Projected = { sx: number; sy: number; scale: number; depth: number; alpha: number };
type Focal = {
  v: number;
  kind: "provincial" | "connector";
  neighbours: number[];
  crossNeighbours: number[]; // neighbours in a different module (connector bridges)
  bridgedModules: number[]; // distinct other modules this node reaches
  centrality: number; // degree / maxDegree, 0..1
};

const MODULE_COUNT = 4;
const PER_MODULE = 9;
const NODE_COUNT = MODULE_COUNT * PER_MODULE;
const CYCLE_MS = 5600; // one hub-highlight cycle
const FOCAL_COUNT = 6; // how many hubs to rotate through

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
 * Build a modular ("community-structured") graph: a handful of spatially
 * separated blobs, dense within each blob and joined by a few inter-module
 * bridges. This is exactly the structure that produces distinct hub roles —
 * provincial hubs sit deep inside a module, connector hubs sit on the bridges.
 */
function buildGraph() {
  const rng = makeRng(20240617);

  // Module centres spread across a wide, flat slab.
  const centres: Node[] = [
    { x: -1.18, y: -0.34, z: 0.22, m: 0 },
    { x: -0.42, y: 0.44, z: -0.42, m: 1 },
    { x: 0.52, y: -0.42, z: 0.36, m: 2 },
    { x: 1.2, y: 0.3, z: -0.2, m: 3 },
  ];

  const nodes: Node[] = [];
  for (let m = 0; m < MODULE_COUNT; m++) {
    for (let i = 0; i < PER_MODULE; i++) {
      nodes.push({
        x: centres[m].x + (rng() * 2 - 1) * 0.36,
        y: centres[m].y + (rng() * 2 - 1) * 0.32,
        z: centres[m].z + (rng() * 2 - 1) * 0.32,
        m,
      });
    }
  }

  const dist = (a: Node, b: Node) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const adj: Set<number>[] = nodes.map(() => new Set<number>());
  const edges: [number, number][] = [];
  const addEdge = (i: number, j: number) => {
    if (i === j || adj[i].has(j)) return;
    adj[i].add(j);
    adj[j].add(i);
    edges.push([Math.min(i, j), Math.max(i, j)]);
  };

  // Within-module edges: link each node to its 3 nearest peers in the same module.
  const K = 3;
  for (let i = 0; i < nodes.length; i++) {
    const order = nodes
      .map((n, j) => ({ j, d: dist(nodes[i], n) }))
      .filter((o) => o.j !== i && nodes[o.j].m === nodes[i].m)
      .sort((a, b) => a.d - b.d);
    for (let k = 0; k < K && k < order.length; k++) addEdge(i, order[k].j);
  }

  // Gateway per module: the node nearest the global origin (inner-facing), which
  // makes the best bridgehead toward the other modules.
  const gateways: number[] = [];
  for (let m = 0; m < MODULE_COUNT; m++) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].m !== m) continue;
      const d = Math.hypot(nodes[i].x, nodes[i].y, nodes[i].z);
      if (d < bestD) { bestD = d; best = i; }
    }
    gateways.push(best);
  }

  // Bridges: a ring across all modules (each gateway → 2 other modules) plus one
  // diagonal, so some connectors span 2 modules and some span 3 — a clear spread
  // of participation for the highlight to roam over.
  for (let m = 0; m < MODULE_COUNT; m++) addEdge(gateways[m], gateways[(m + 1) % MODULE_COUNT]);
  addEdge(gateways[0], gateways[2]);

  return { nodes, adj, edges, gateways };
}

/**
 * Classify every node by degree centrality and the spread of its links across
 * modules, then pick the focal hubs: alternating connector and provincial hubs
 * so the highlight contrasts the two roles cycle to cycle.
 */
function pickFocals(nodes: Node[], adj: Set<number>[]) {
  const maxDeg = nodes.reduce((mx, _, i) => Math.max(mx, adj[i].size), 1);

  const analyse = (v: number): Focal => {
    const neighbours = [...adj[v]];
    const crossNeighbours = neighbours.filter((n) => nodes[n].m !== nodes[v].m);
    const bridgedModules = [...new Set(crossNeighbours.map((n) => nodes[n].m))];
    return {
      v,
      kind: bridgedModules.length > 0 ? "connector" : "provincial",
      neighbours,
      crossNeighbours,
      bridgedModules,
      centrality: adj[v].size / maxDeg,
    };
  };

  const all = nodes.map((_, i) => analyse(i));

  // Connector hubs: those that bridge modules, strongest participation first.
  const connectors = all
    .filter((f) => f.bridgedModules.length > 0)
    .sort((a, b) => b.bridgedModules.length - a.bridgedModules.length || b.centrality - a.centrality);

  // Provincial hubs: purely-local nodes, one per module, highest within-module degree.
  const provincials: Focal[] = [];
  for (let m = 0; m < MODULE_COUNT; m++) {
    const cand = all
      .filter((f) => nodes[f.v].m === m && f.bridgedModules.length === 0)
      .sort((a, b) => b.centrality - a.centrality)[0];
    if (cand) provincials.push(cand);
  }

  // Interleave connector / provincial for role contrast across the loop.
  const chosen: Focal[] = [];
  for (let i = 0; i < FOCAL_COUNT; i++) {
    const pool = i % 2 === 0 ? connectors : provincials;
    const pick = pool[Math.floor(i / 2)];
    if (pick && !chosen.some((c) => c.v === pick.v)) chosen.push(pick);
  }
  // Top-up from whatever remains if interleaving ran short.
  for (const f of [...connectors, ...provincials]) {
    if (chosen.length >= FOCAL_COUNT) break;
    if (!chosen.some((c) => c.v === f.v)) chosen.push(f);
  }
  return chosen;
}

// ---- component -----------------------------------------------------------

export default function HeroGraphHubs({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, adj, edges } = buildGraph();
    const focals = pickFocals(nodes, adj);
    if (focals.length === 0) return;

    // Degree per node → resting radius (centrality encoding).
    const maxDeg = nodes.reduce((mx, _, i) => Math.max(mx, adj[i].size), 1);
    const centrality = nodes.map((_, i) => adj[i].size / maxDeg);

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
      const focalIn = smoothstep(0.0, 0.14, tt);            // hub ignites
      const spokes = easeInOut(smoothstep(0.12, 0.5, tt));  // spokes draw to neighbours
      const emphasis = easeInOut(smoothstep(0.34, 0.74, tt)); // territory fill / bridge pulses
      const fade = 1 - smoothstep(0.86, 1.0, tt);             // whole cluster fades out
      const live = focalIn * fade;

      // Continuous slow auto-rotation for the 3D-render feel.
      const ry = reduced ? 0.6 : elapsed * 0.00016;
      tiltX += (targetTX - tiltX) * 0.05;
      tiltY += (targetTY - tiltY) * 0.05;
      const rx = -0.22 + tiltX;
      const ryTotal = ry + tiltY;

      ctx.clearRect(0, 0, W, H);

      const P = nodes.map((n) => project(n, ryTotal, rx));
      const fp = P[focal.v];
      const onCluster = new Set<number>([focal.v, ...focal.neighbours]);
      const neighbourSet = new Set(focal.neighbours);

      // Edge keys belonging to the active hub's spokes, so we can skip them in the
      // base mesh and redraw them lit.
      const ek = (i: number, j: number) => `${Math.min(i, j)}-${Math.max(i, j)}`;
      const spokeEdge = new Set<string>();
      for (const nb of focal.neighbours) spokeEdge.add(ek(focal.v, nb));

      // 1. Base mesh edges (faint), excluding the active hub's spokes.
      ctx.lineWidth = 1;
      for (const [i, j] of edges) {
        if (spokeEdge.has(ek(i, j))) continue;
        const a = P[i], b = P[j];
        const al = 0.09 * Math.min(a.alpha, b.alpha) * (0.5 + 0.5 * Math.max(a.depth, b.depth));
        ctx.strokeStyle = rgba(colors.muted, al);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // 2. PROVINCIAL hub: fan-fill the neighbourhood into a soft, self-contained
      //    territory (neighbours sorted by screen-angle around the focal node).
      if (focal.kind === "provincial" && focal.neighbours.length >= 2 && live > 0.02) {
        const ring = focal.neighbours
          .map((n) => ({ n, ang: Math.atan2(P[n].sy - fp.sy, P[n].sx - fp.sx) }))
          .sort((a, b) => a.ang - b.ang)
          .map((o) => o.n);
        ctx.fillStyle = rgba(colors.accent, 0.06 * emphasis * live);
        for (let i = 0; i < ring.length; i++) {
          const pa = P[ring[i]], pb = P[ring[(i + 1) % ring.length]];
          ctx.beginPath();
          ctx.moveTo(fp.sx, fp.sy);
          ctx.lineTo(pa.sx, pa.sy);
          ctx.lineTo(pb.sx, pb.sy);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 3. CONNECTOR hub: soft halo over the centroid of each module it bridges to,
      //    showing the separate groups being tied together.
      if (focal.kind === "connector" && live > 0.02) {
        for (const m of focal.bridgedModules) {
          let cx = 0, cy = 0, cnt = 0;
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].m === m) { cx += P[i].sx; cy += P[i].sy; cnt++; }
          }
          if (!cnt) continue;
          cx /= cnt; cy /= cnt;
          const rad = 46 * emphasis;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rad));
          g.addColorStop(0, rgba(colors.accent, 0.1 * emphasis * live));
          g.addColorStop(1, rgba(colors.accent, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, rad), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Spokes: focal → each neighbour, drawn progressively outward. Cross-module
      //    bridges (connector role) are drawn brighter and thicker.
      ctx.lineCap = "round";
      const crossSet = new Set(focal.crossNeighbours);
      for (let ni = 0; ni < focal.neighbours.length; ni++) {
        const nb = focal.neighbours[ni];
        const stagger = focal.neighbours.length > 1 ? ni / focal.neighbours.length : 0;
        const f = smoothstep(stagger * 0.5, stagger * 0.5 + 0.5, spokes);
        if (f <= 0.001) continue;
        const p = P[nb];
        const ex = fp.sx + (p.sx - fp.sx) * f;
        const ey = fp.sy + (p.sy - fp.sy) * f;
        const isBridge = crossSet.has(nb);
        ctx.strokeStyle = rgba(colors.accent, (isBridge ? 0.85 : 0.6) * live);
        ctx.lineWidth = isBridge ? 2.1 : 1.6;
        ctx.shadowColor = rgba(colors.accent, (isBridge ? 0.7 : 0.45) * live);
        ctx.shadowBlur = isBridge ? 10 : 6;
        ctx.beginPath();
        ctx.moveTo(fp.sx, fp.sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // 5. Travelling pulses along the connector bridges, riding out to the modules.
      if (focal.kind === "connector" && live > 0.05) {
        const ride = (emphasis * 1.0) % 1; // 0..1 position along bridge
        for (const nb of focal.crossNeighbours) {
          const p = P[nb];
          const px = fp.sx + (p.sx - fp.sx) * ride;
          const py = fp.sy + (p.sy - fp.sy) * ride;
          ctx.fillStyle = rgba(colors.accent, 0.95 * live * (1 - ride * 0.3));
          ctx.shadowColor = rgba(colors.accent, 0.8 * live);
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // 6. Centrality gauge: an arc by the focal hub sweeping to its normalised
      //    degree centrality. A faint full ring is the "1.0" reference.
      if (live > 0.05) {
        const gr = 13 * (0.7 + 0.6 * fp.depth);
        ctx.lineWidth = 2;
        ctx.strokeStyle = rgba(colors.muted, 0.18 * live);
        ctx.beginPath();
        ctx.arc(fp.sx, fp.sy, gr, 0, Math.PI * 2);
        ctx.stroke();
        const sweep = focal.centrality * Math.PI * 2 * emphasis;
        ctx.strokeStyle = rgba(colors.accent, 0.9 * live);
        ctx.shadowColor = rgba(colors.accent, 0.7 * live);
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(fp.sx, fp.sy, gr, -Math.PI / 2, -Math.PI / 2 + sweep);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 7. Nodes (painter's order: far first). Radius encodes degree centrality, so
      //    hubs read as larger even before the highlight reaches them.
      const order = nodes.map((_, i) => i).sort((i, j) => P[i].depth - P[j].depth);
      for (const i of order) {
        const p = P[i];
        const isFocal = i === focal.v;
        const isNeighbour = neighbourSet.has(i);
        const inCluster = onCluster.has(i);
        const baseR = (1.5 + 2.2 * centrality[i]) * (isFocal ? 1.2 : 1);
        const r = baseR * (0.7 + 0.6 * p.depth);
        if (inCluster) {
          const reveal = isFocal ? focalIn : smoothstep(0, 0.5, spokes);
          const a = (isFocal ? 1 : 0.9) * live * reveal;
          ctx.fillStyle = rgba(colors.accent, a);
          ctx.shadowColor = rgba(colors.accent, 0.7 * live * reveal);
          ctx.shadowBlur = isFocal ? 16 : 9;
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
