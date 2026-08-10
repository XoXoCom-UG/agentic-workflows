/**
 * URL slug generation for blog posts and tags.
 *
 * FROZEN DECISION — German umlauts transliterate the German way:
 *
 *     ä -> ae     ö -> oe     ü -> ue     ß -> ss
 *
 * Not the Unicode-normalisation way (ä -> a). "Ueber uns" is how a German reader
 * expects to see it written without the umlaut, and it keeps `für` and `fur`
 * distinguishable. This choice is permanent: changing it later silently changes the
 * slug a title generates, which means new posts get different URLs than old ones for
 * the same title, and any already-published URL that gets regenerated 404s. If you
 * ever do change it, every live slug must be checked by hand.
 *
 * The output shape is constrained by the database, not by taste:
 * `blog.posts.posts_slug_format` is CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'), so a
 * slug that survives this function still has to be non-empty, lowercase, and free of
 * leading, trailing, or doubled hyphens. The trigger `blog.normalize_post()` lowercases
 * and trims again server-side, so this function is a convenience for the author, never
 * the enforcement point.
 *
 * Deliberately NOT shared with the heading-id slugifier in lib/markdown-render.ts.
 * Heading ids are regenerated from the heading text on every render and only ever
 * appear as in-page anchors; post slugs are permanent public URLs stored in a column.
 * Different lifetimes, different rules — do not unify them.
 *
 * Pure, dependency-free, and safe in a client component (the editor uses it to
 * suggest a slug as the author types the title).
 */

const TRANSLITERATIONS: Array<[RegExp, string]> = [
  [/ä/g, "ae"],
  [/ö/g, "oe"],
  [/ü/g, "ue"],
  [/ß/g, "ss"],
  // Æ/Ø/Å and friends are not part of the two publishing languages; NFD below reduces
  // any remaining accented Latin (é -> e, ñ -> n) which is the right default for them.
];

/** Longest slug we will generate. Titles are capped at 120 chars by the DB anyway. */
const MAX_SLUG_LENGTH = 80;

export function slugify(input: string): string {
  let s = input.toLowerCase();
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    s = s.replace(pattern, replacement);
  }
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // drop combining marks NFD left behind
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // slice() can leave a trailing hyphen if it cut mid-separator.
    .replace(/-+$/g, "");
}

/**
 * Given a slug and the slugs already taken, return the first free variant.
 * `post`, then `post-2`, `post-3`, … The caller supplies the taken set from a database
 * read; the UNIQUE index on blog.posts.slug is still the real arbiter, so a create
 * that loses a race gets a constraint error and the action reports it rather than
 * silently overwriting.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || "post";
  if (!used.has(root)) return root;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  // 999 posts sharing one title is not a real scenario, but returning something
  // invalid would be worse than returning something ugly.
  return `${root}-${used.size + 1}`;
}
