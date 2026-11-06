"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Sally, drawn in SVG: a humanoid robot with a bob-cut "helmet", a face screen and a
 * headset (she is the one who talks to people). Everything is painted from the theme
 * tokens, so she sits on the dark canvas without a single hard-coded background.
 *
 * Life comes from three cheap effects, all paused by the global reduced-motion rule:
 *  - she floats (CSS, .sally-float)
 *  - her eyes follow the pointer and blink at random intervals (state below)
 *  - her mouth moves while `talking` is true (CSS, .sally-talk)
 */
export default function SallyFigure({ talking = false, className }: { talking?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  // Eyes follow the pointer, clamped to a few units so they never leave the screen.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.32);
      const len = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, len / 400);
      setLook({ x: (dx / len) * 7 * reach, y: (dy / len) * 5 * reach });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Random blinking, every 2.5–6 s.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, 2500 + Math.random() * 3500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  const skin = `sally-skin-${uid}`;
  const hair = `sally-hair-${uid}`;
  const screen = `sally-screen-${uid}`;
  const glow = `sally-glow-${uid}`;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 520"
      className={className}
      role="img"
      aria-label="Sally"
    >
      <defs>
        <linearGradient id={skin} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef0f3" />
          <stop offset="1" stopColor="#a9b1bc" />
        </linearGradient>
        <linearGradient id={hair} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7a59" />
          <stop offset="1" stopColor="#9c3424" />
        </linearGradient>
        <radialGradient id={screen} cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#151a20" />
          <stop offset="1" stopColor="var(--color-bg)" />
        </radialGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="sally-float">
        {/* Shoulders and torso */}
        <path
          d="M40 520 C40 420 90 379 150 372 L250 372 C310 379 360 420 360 520 Z"
          fill={`url(#${skin})`}
          stroke="#6f7884"
          strokeWidth="2"
        />
        {/* Coral collar */}
        <path d="M150 372 L200 426 L250 372" fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
        {/* Name badge */}
        <g transform="translate(262 428)">
          <rect x="-34" y="-13" width="68" height="26" rx="8" fill="var(--color-bg)" stroke="var(--color-accent)" strokeOpacity="0.6" strokeWidth="1.5" />
          <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="2.5" fill="var(--color-fg)" fontFamily="var(--font-sans)">
            SALLY
          </text>
        </g>
        {/* Panel seams on the torso */}
        <path d="M108 450 Q112 490 108 520 M292 450 Q288 490 292 520" stroke="#8d95a0" strokeWidth="2" fill="none" />

        {/* Neck */}
        <rect x="176" y="316" width="48" height="64" rx="12" fill="#7d8692" />
        <path d="M180 340 H220 M180 356 H220" stroke="#5c6470" strokeWidth="2" />

        {/* Hair / helmet — back layer, a bob cut that frames the face */}
        <path
          d="M200 58 C110 58 72 120 74 200 C76 262 70 318 96 352 C110 340 116 318 118 300 L282 300 C284 318 290 340 304 352 C330 318 324 262 326 200 C328 120 290 58 200 58 Z"
          fill={`url(#${hair})`}
          stroke="#7a2a1d"
          strokeWidth="2"
        />

        {/* Antenna */}
        <line x1="200" y1="60" x2="200" y2="22" stroke="var(--color-border)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="200" cy="18" r="9" fill="var(--color-accent)" filter={`url(#${glow})`} className="sally-pulse" />

        {/* Head */}
        <rect x="104" y="96" width="192" height="226" rx="80" fill={`url(#${skin})`} stroke="#6f7884" strokeWidth="2" />

        {/* Fringe over the forehead */}
        <path
          d="M108 170 C112 110 150 82 200 82 C258 82 292 112 294 168 C270 140 236 128 214 132 C226 142 230 150 230 150 C200 128 150 132 108 170 Z"
          fill={`url(#${hair})`}
        />
        <path d="M128 140 C150 112 186 100 222 104" fill="none" stroke="#ffd0c4" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />

        {/* Face screen */}
        <rect x="128" y="172" width="144" height="118" rx="44" fill={`url(#${screen})`} stroke="#000" strokeOpacity="0.35" strokeWidth="2" />

        {/* Eyes — follow the pointer, blink by collapsing vertically */}
        <g transform={`translate(${look.x} ${look.y})`} style={{ transition: "transform 120ms ease-out" }}>
          {[168, 232].map((cx) => (
            <g key={cx} transform={`translate(${cx} 218) scale(1 ${blink ? 0.08 : 1})`} style={{ transition: "transform 70ms" }}>
              <ellipse rx="13" ry="17" fill="var(--color-accent)" filter={`url(#${glow})`} />
              <circle cx="4" cy="-6" r="4" fill="#fff" opacity="0.85" />
            </g>
          ))}
        </g>

        {/* Cheeks */}
        <ellipse cx="148" cy="252" rx="11" ry="6" fill="var(--color-accent)" opacity="0.22" />
        <ellipse cx="252" cy="252" rx="11" ry="6" fill="var(--color-accent)" opacity="0.22" />

        {/* Mouth: a smile at rest, an animated opening while talking */}
        {talking ? (
          <ellipse cx="200" cy="262" rx="14" ry="8" fill="var(--color-accent)" className="sally-talk" />
        ) : (
          <path d="M184 256 Q200 272 216 256" fill="none" stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" />
        )}

        {/* Headset: band, ear cups, mic boom */}
        <path d="M96 210 C92 130 140 74 200 74 C260 74 308 130 304 210" fill="none" stroke="#3a424d" strokeWidth="6" strokeLinecap="round" />
        <rect x="82" y="188" width="30" height="66" rx="14" fill="#2b3139" stroke="var(--color-border)" strokeWidth="2" />
        <rect x="288" y="188" width="30" height="66" rx="14" fill="#2b3139" stroke="var(--color-border)" strokeWidth="2" />
        <circle cx="97" cy="221" r="5" fill="var(--color-accent)" className="sally-pulse" />
        <circle cx="303" cy="221" r="5" fill="var(--color-accent)" className="sally-pulse" />
        <path d="M300 250 C300 292 270 302 238 300" fill="none" stroke="#3a424d" strokeWidth="5" strokeLinecap="round" />
        <circle cx="236" cy="300" r="7" fill="var(--color-accent)" filter={talking ? `url(#${glow})` : undefined} />
      </g>
    </svg>
  );
}
