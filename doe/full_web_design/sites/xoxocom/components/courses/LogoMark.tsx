import type { CSSProperties } from "react";

/**
 * Two ways to put a tool's logo on a dark page, shared by CourseArtwork and CourseStack.
 *
 * The split is forced by the source files in public/course-logos/, not by taste:
 *
 *   • claude.svg, n8n.svg, gmail.svg, drive.svg carry their own colours → <ColorMark>
 *     renders them in an <img> and they look like themselves.
 *   • pinecone.svg, mcp.svg, openai.svg are `fill="currentColor"` or have no fill at
 *     all. Inside an <img> there is nothing to inherit from, so they resolve to black
 *     and disappear against #0b0e11. <MonoMark> paints a background colour through the
 *     file's alpha channel as a CSS mask instead, which also lets us tint them with a
 *     brand token (coral on hover, ink at rest).
 *
 * Keep `MONO` in sync when a logo is added: a colour logo rendered as a mask collapses
 * to a filled silhouette, and a mono logo rendered as an <img> is invisible.
 */

export const MONO = new Set(["pinecone", "mcp", "openai"]);

export const LOGO_SRC = (name: string) => `/course-logos/${name}.svg`;

function maskStyle(name: string): CSSProperties {
  const url = `url(${LOGO_SRC(name)})`;
  return {
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}

/** Single-colour logo, tinted via CSS mask. `className` must supply a bg-* colour. */
export function MonoMark({ name, className }: { name: string; className: string }) {
  return <span aria-hidden className={className} style={maskStyle(name)} />;
}

/** Logo that keeps its own brand colours. */
export function ColorMark({ name, className, alt = "" }: { name: string; className: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVG; nothing to optimise
  return <img src={LOGO_SRC(name)} alt={alt} aria-hidden={alt ? undefined : true} className={className} />;
}

/**
 * Picks the right treatment for `name`. `className` sizes it; `tint` is the bg-* colour
 * applied to mono logos only — passing it through to a colour logo would paint a solid
 * block behind the transparent parts of the <img>.
 */
export function LogoMark({ name, className, tint = "bg-fg" }: { name: string; className: string; tint?: string }) {
  return MONO.has(name) ? (
    <MonoMark name={name} className={`${className} ${tint}`} />
  ) : (
    <ColorMark name={name} className={className} />
  );
}
