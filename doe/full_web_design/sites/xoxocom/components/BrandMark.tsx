import { useId } from "react";

/**
 * The XoXoCom mark: "Twin-Cross Bot, filled" (Concept B, revision 2 of the 2026-09 mark study).
 *
 * A solid notched head with antennae and legs, drawn in `currentColor`. The two cross
 * eyes are CUT OUT through an SVG mask rather than painted in the background colour,
 * so they always show whatever the mark sits on — the dark header, a coral button, a
 * light page — without a second colour to keep in sync.
 *
 * The mask id comes from useId() so several marks on one page never share (and
 * clobber) a single <mask>. Same geometry as app/icon.svg and assets/logo/.
 */
export default function BrandMark({ className, title }: { className?: string; title?: string }) {
  const maskId = `xoxo-eyes-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 96 110"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="110">
          <rect width="96" height="110" fill="#fff" />
          <g stroke="#000" strokeWidth="7" strokeLinecap="round">
            <line x1="30.5" y1="48.5" x2="41.5" y2="59.5" />
            <line x1="41.5" y1="48.5" x2="30.5" y2="59.5" />
            <line x1="54.5" y1="48.5" x2="65.5" y2="59.5" />
            <line x1="65.5" y1="48.5" x2="54.5" y2="59.5" />
          </g>
        </mask>
      </defs>
      <g stroke="currentColor" strokeWidth="6.5" strokeLinecap="round">
        <line x1="34" y1="26" x2="27" y2="8" />
        <line x1="62" y1="26" x2="69" y2="8" />
        <line x1="34" y1="83" x2="28" y2="103" />
        <line x1="62" y1="83" x2="68" y2="103" />
      </g>
      <path
        d="M32 24 H64 A17 17 0 0 1 81 41 V48 H88 V62 H81 V67 A17 17 0 0 1 64 84 H32 A17 17 0 0 1 15 67 V62 H8 V48 H15 V41 A17 17 0 0 1 32 24 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
