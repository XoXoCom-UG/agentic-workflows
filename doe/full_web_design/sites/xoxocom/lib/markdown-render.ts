import { Marked, type Tokens } from "marked";

/**
 * The Markdown -> HTML step, with NO sanitisation and NO `server-only` guard.
 *
 * This module exists so the admin editor's live preview can run the byte-identical
 * renderer that production runs. If the preview used its own `marked` call, the two
 * would drift the first time a renderer rule changed here, and an author would be
 * writing against a preview that lies.
 *
 * Import rules:
 *   - Public rendering path  -> lib/markdown.ts (this module + sanitize-html)
 *   - Admin preview (client) -> this module directly
 *
 * The preview is therefore unsanitised. That is deliberate and safe: it is your own
 * draft, in your own authenticated browser, never served to a visitor. The security
 * boundary is on the render path, where lib/markdown.ts sanitises before anything
 * reaches dangerouslySetInnerHTML on a public page.
 *
 * Do NOT add sanitize-html here. It is a ~50 KB dependency and pulling it into a
 * client component would put it in the browser bundle for no security gain.
 */

const HEADING_SHIFT = 1;
const MAX_HEADING_LEVEL = 6;
const WORDS_PER_MINUTE = 200;

/** Strip tags from already-rendered inline HTML, for heading ids and word counts. */
export function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function headingId(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks left by NFD (ü -> u)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * A DEDICATED Marked instance. `marked.use()` mutates the global singleton, and
 * app/impressum|datenschutz|agb/page.tsx parse their Markdown with that singleton.
 * Configuring the global would shift the legal pages' headings and rewrite their
 * links — a silent, site-wide regression. This module never touches it.
 *
 * marked v14 note: every renderer method takes a single token object, not positional
 * args. A v4-style `heading(text, level)` signature still type-checks in places and
 * then silently misbehaves — see package.json for the pinned major.
 */
const postMarked = new Marked({ gfm: true, breaks: false });

postMarked.use({
  renderer: {
    /**
     * Headings shift down one level (`#` -> <h2>). The page shell owns the <h1>, so an
     * author writing `# Title` out of habit can never produce a second <h1>. That is a
     * structural guarantee, not a house style rule, and it protects the `single_h1`
     * check in execution/autoresearch/score/score_seo.py.
     */
    heading(
      this: { parser: { parseInline: (t: Tokens.Generic[]) => string } },
      { tokens, depth }: Tokens.Heading,
    ) {
      const level = Math.min(depth + HEADING_SHIFT, MAX_HEADING_LEVEL);
      const inner = this.parser.parseInline(tokens);
      // Ids make deep links (and a future table of contents) work. globals.css sets
      // scroll-margin-top so an anchored heading clears the sticky header.
      return `<h${level} id="${headingId(plainText(inner))}">${inner}</h${level}>\n`;
    },

    link(
      this: { parser: { parseInline: (t: Tokens.Generic[]) => string } },
      { href, title, tokens }: Tokens.Link,
    ) {
      const inner = this.parser.parseInline(tokens);
      const attrs = [`href="${href}"`];
      if (title) attrs.push(`title="${title}"`);
      if (isExternal(href)) attrs.push('target="_blank"', 'rel="noopener noreferrer"');
      return `<a ${attrs.join(" ")}>${inner}</a>`;
    },

    image({ href, title, text }: Tokens.Image) {
      // alt is always emitted, even when the author wrote `![](url)`. A single missing
      // alt fails the `all_img_have_alt` SEO check for the whole article route.
      const attrs = [`src="${href}"`, `alt="${text ?? ""}"`, 'loading="lazy"', 'decoding="async"'];
      if (title) attrs.push(`title="${title}"`);
      return `<img ${attrs.join(" ")}>`;
    },
  },
});

/**
 * Markdown -> HTML, UNSANITISED. Only two callers are legitimate:
 * lib/markdown.ts (which sanitises) and the admin preview (which is never public).
 */
export function renderMarkdownUnsanitised(md: string): string {
  if (!md?.trim()) return "";
  return postMarked.parse(md, { async: false }) as string;
}

/**
 * Stored on the post row rather than computed on read: the index query would
 * otherwise have to select every body just to count words.
 */
export function readingMinutes(md: string): number {
  const words = plainText(md).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
