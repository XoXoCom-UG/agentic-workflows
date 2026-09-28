import { ColorMark, MonoMark } from "@/components/courses/LogoMark";

/**
 * The course cover graphic — drawn, not photographed, so it costs one HTTP request per
 * logo and stays crisp at any size.
 *
 * Composition: the two tools the course is actually about (n8n and Pinecone) sit large
 * on the centre axis, joined by a flowing link that reads as a retrieval pipeline; the
 * surrounding ecosystem (Claude, MCP, OpenAI, Gmail, Drive) sits small and faint behind
 * them, wired into that axis.
 *
 * ── Why the geometry lives in ONE table ──────────────────────────────────────────────
 * The tiles are HTML (they contain <img>/masked logos), the connectors are SVG. The
 * first version positioned the tiles in percentages and drew the lines to separately
 * hand-written viewBox coordinates. Those two sets of numbers disagreed by a few units,
 * which is all it takes: every line stopped short of, or stabbed through, the tile it
 * was supposed to meet, and the whole panel read as floating fragments.
 *
 * So NODES below is the single source of truth. Tile positions are derived from it, and
 * so are the line endpoints, via edgePoint() — which solves for the exact point where
 * the line crosses the tile's boundary. Move a logo and its wires follow. Add one and
 * it is one row, not a row plus a guessed <path>.
 *
 * This only works because the scale is uniform: the panel is locked to 16:10 and the
 * viewBox is 160×100, so one unit is the same distance across and down, and a tile that
 * is `size` units wide is also `size` units tall. Changing either ratio breaks that and
 * the tiles would stop being square.
 *
 * The two logo treatments (<ColorMark> vs <MonoMark>) and why the difference is
 * load-bearing rather than cosmetic are documented in components/courses/LogoMark.tsx.
 *
 * Hover states are written as `group-hover:` and are driven by the `group` class on the
 * card that wraps this (components/courses/CourseCard.tsx). Rendered outside a group —
 * as on the detail page — they simply never fire, which is the intended still version.
 */

/** Tile footprints, in viewBox units. 30.4 = 19% of 160; 15.2 = 9.5%. */
const HUB_SIZE = 30.4;
const CHIP_SIZE = 15.2;

type Node = {
  name: string;
  /** Tile centre, in viewBox units. */
  x: number;
  y: number;
  /** Tile width AND height, in viewBox units (the scale is uniform — see above). */
  size: number;
  /** True for logos that must be drawn as a tinted CSS mask; see LogoMark.tsx. */
  mono?: boolean;
};

const N8N: Node = { name: "n8n", x: 48, y: 52, size: HUB_SIZE };
const PINECONE: Node = { name: "pinecone", x: 112, y: 48, size: HUB_SIZE, mono: true };
const HUBS: Node[] = [N8N, PINECONE];

/** The ecosystem, each wired to the hub it belongs with. */
const CHIPS: (Node & { to: Node })[] = [
  { name: "claude", x: 21.6, y: 24, size: CHIP_SIZE, to: N8N },
  { name: "mcp", x: 77.6, y: 17, size: CHIP_SIZE, mono: true, to: PINECONE },
  // Boxed in from two sides: the card overlays an arrow badge in the top-right corner
  // (CourseCard.tsx) occupying roughly x≥139, y≤21, while the Pinecone hub's own corner
  // reaches x=127.2, y=32.8. Sitting low AND far right clears the badge without the two
  // tiles touching — which would leave their connector no visible run at all.
  { name: "openai", x: 140, y: 33, size: CHIP_SIZE, mono: true, to: PINECONE },
  { name: "drive", x: 25.6, y: 80, size: CHIP_SIZE, to: N8N },
  { name: "gmail", x: 95.2, y: 83, size: CHIP_SIZE, to: PINECONE },
];

/**
 * The point where the straight line from `a` towards `b` crosses `a`'s tile boundary,
 * pulled `overlap` units back INSIDE the tile so the line ends underneath it.
 *
 * The overlap is the part that matters visually. Ending exactly on the boundary leaves a
 * hairline gap at most zoom levels, and the tiles are rounded, so a diagonal approach
 * meets the corner's curve and gaps even wider. Tucking the end under an opaque tile
 * makes the join exact at every size instead of only at the one it was eyeballed at.
 */
function edgePoint(a: Node, b: Node, overlap: number): [number, number] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // For a square, the boundary along a direction sits at half-size divided by the
  // larger direction component — a Chebyshev radius. Using the plain half-size would
  // overshoot past the corner on every diagonal.
  const toEdge = a.size / 2 / Math.max(Math.abs(ux), Math.abs(uy));
  const t = Math.max(toEdge - overlap, 0);
  return [a.x + ux * t, a.y + uy * t];
}

/** Both ends of a connector, each tucked under its own tile. */
function connect(a: Node, b: Node, overlap = 1.6) {
  const [ax, ay] = edgePoint(a, b, overlap);
  const [bx, by] = edgePoint(b, a, overlap);
  return { ax, ay, bx, by };
}

/** Percentage helpers: the tiles are HTML, so they need CSS units, not viewBox units. */
const pctX = (x: number) => `${(x / 160) * 100}%`;
const pctY = (y: number) => `${y}%`;
const pctSize = (s: number) => `${(s / 160) * 100}%`;

const TILE_BASE =
  "absolute -translate-x-1/2 -translate-y-1/2 aspect-square overflow-hidden transition-all duration-500";

export default function CourseArtwork({ className = "" }: { className?: string }) {
  // The retrieval link: a gentle S from hub to hub. Endpoints come from the same
  // geometry as the tiles; the control points bow it out by a fixed amount either side.
  const spine = connect(N8N, PINECONE);
  const bow = 9;
  const reach = (spine.bx - spine.ax) * 0.38;
  const spinePath =
    `M${spine.ax} ${spine.ay} ` +
    `C ${spine.ax + reach} ${spine.ay - bow}, ${spine.bx - reach} ${spine.by + bow}, ` +
    `${spine.bx} ${spine.by}`;

  return (
    <div className={`relative overflow-hidden bg-bg ${className}`}>
      {/* 1 — canvas: a cool graphite fall-off from the top-left, so the panel has a
             light source instead of being flatly black. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(130%_115%_at_14%_-5%,#1a212a_0%,#11161c_42%,#0b0e11_100%)]"
      />

      {/* 2 — engineering dot-grid, faded out at the edges so it never fights the logos. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.55] [background-image:radial-gradient(rgba(234,236,239,0.13)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(75%_75%_at_50%_45%,#000_35%,transparent_100%)]"
      />

      {/* 3 — coral atmosphere. The left orb breathes (shared .hue-breathe keyframes from
             globals.css); the right one holds steady so the panel doesn't pulse as a whole. */}
      <div
        aria-hidden
        className="hue-breathe absolute -left-[12%] top-[8%] h-[70%] w-[55%] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.30),transparent_70%)] blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="absolute -right-[10%] bottom-[-8%] h-[65%] w-[50%] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.16),transparent_70%)] blur-2xl transition-opacity duration-500 group-hover:opacity-90"
      />

      {/* 4 — the wiring. Drawn before the tiles so every line end is painted over by the
             tile it runs under. viewBox is exactly 16:10, the ratio the container is
             locked to, so `preserveAspectRatio="none"` scales it without distorting
             stroke widths or turning the square tiles into rectangles. */}
      <svg
        aria-hidden
        viewBox="0 0 160 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="course-link" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb6b4c" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#fb6b4c" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fb6b4c" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Ecosystem wired into the axis — quiet, structural. */}
        <g stroke="rgba(234,236,239,0.16)" strokeWidth="0.45" fill="none" strokeLinecap="round">
          {CHIPS.map((chip) => {
            const { ax, ay, bx, by } = connect(chip, chip.to);
            return <path key={chip.name} d={`M${ax} ${ay} L${bx} ${by}`} />;
          })}
        </g>

        {/* The retrieval link itself: query out, context back. Drawn twice — a static
            coral bed, plus a dashed overlay that flows along the identical path. */}
        <path d={spinePath} fill="none" stroke="url(#course-link)" strokeWidth="1.1" strokeLinecap="round" />
        <path d={spinePath} fill="none" stroke="#fb6b4c" strokeWidth="1.1" strokeLinecap="round" className="dash-flow" />
      </svg>

      {/* 5 — ecosystem tiles. Opaque backgrounds, deliberately: they are what hides the
             tucked-under line ends, so a translucent fill would put the seam back. */}
      {CHIPS.map((chip) => (
        <div
          key={chip.name}
          aria-hidden
          style={{ left: pctX(chip.x), top: pctY(chip.y), width: pctSize(chip.size) }}
          className={`${TILE_BASE} rounded-[22%] border border-border/70 bg-surface group-hover:border-accent/25`}
        >
          <div className="flex h-full w-full items-center justify-center">
            {chip.mono ? (
              <MonoMark name={chip.name} className="h-[52%] w-[52%] bg-fg/45" />
            ) : (
              <ColorMark name={chip.name} className="h-[52%] w-[52%] opacity-45 saturate-[0.65]" />
            )}
          </div>
        </div>
      ))}

      {/* 6 — the two headliners. Larger, brighter, coral-rimmed: the eye lands here first
             and the ecosystem reads as context rather than as a competing list. */}
      {HUBS.map((hub) => (
        <div
          key={hub.name}
          aria-hidden
          style={{ left: pctX(hub.x), top: pctY(hub.y), width: pctSize(hub.size) }}
          className={`${TILE_BASE} rounded-[26%] border border-accent/35 bg-surface shadow-[0_0_38px_-8px_rgba(251,107,76,0.55)] group-hover:border-accent/70 group-hover:shadow-[0_0_54px_-6px_rgba(251,107,76,0.85)]`}
        >
          <div className="flex h-full w-full items-center justify-center">
            {hub.mono ? (
              <MonoMark
                name={hub.name}
                className="h-[56%] w-[56%] bg-fg transition-colors duration-500 group-hover:bg-accent"
              />
            ) : (
              <ColorMark name={hub.name} className="h-[54%] w-[54%]" />
            )}
          </div>
        </div>
      ))}

      {/* 7 — floor vignette, so the panel settles into the card instead of ending abruptly. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/80 to-transparent" />
    </div>
  );
}
