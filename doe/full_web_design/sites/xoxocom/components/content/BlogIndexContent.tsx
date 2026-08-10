import SmartLink from "@/components/SmartLink";
import PostRow from "@/components/blog/PostRow";
import TagFilter from "@/components/blog/TagFilter";
import {
  listPosts,
  listTags,
  parseTagsParam,
  type PostSummary,
  type TagCount,
} from "@/lib/blog";
import type { Lang } from "@/lib/copy";
import { getCopy } from "@/lib/server-copy";

export type BlogSearchParams = { tags?: string | string[]; lang?: string | string[] };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * /blog — the B3 editorial index.
 *
 * Language handling is strict with an escape hatch. Posts are single-language, so the
 * index shows only posts matching the reader's toggle. Silently mixing languages would
 * break that model; dead-ending a German reader when everything published so far is in
 * English would be worse. So when the active language is empty but the other one is
 * not, we say so and offer ?lang=all.
 *
 * Every filtered variant (?tags=, ?lang=) is noindex with canonical /blog — see
 * generateMetadata in app/blog/page.tsx. They are near-duplicates, and letting a
 * crawler enumerate tag permutations is exactly the faceted-navigation trap.
 */
export default async function BlogIndexContent({
  searchParams,
}: {
  searchParams: BlogSearchParams;
}) {
  const { lang, c } = await getCopy();
  const t = c.blog;

  const langParam = first(searchParams.lang);
  const showAll = langParam === "all";
  const view: Lang = langParam === "de" || langParam === "en" ? langParam : lang;

  // ?lang=all merges both languages; otherwise a single language is the whole world.
  const [posts, tags]: [PostSummary[], TagCount[]] = showAll
    ? await Promise.all([
        Promise.all([listPosts({ lang: "en" }), listPosts({ lang: "de" })]).then(
          ([en, de]) =>
            [...en, ...de].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        ),
        Promise.all([listTags("en"), listTags("de")]).then(([en, de]) => {
          const merged = new Map<string, TagCount>();
          for (const tc of [...en, ...de]) {
            const prev = merged.get(tc.tag);
            merged.set(tc.tag, prev ? { ...prev, count: prev.count + tc.count } : tc);
          }
          return [...merged.values()].sort(
            (a, b) => b.count - a.count || a.label.localeCompare(b.label),
          );
        }),
      ])
    : await Promise.all([listPosts({ lang: view }), listTags(view)]);

  // Unknown tags are discarded rather than rendered: ?tags=<junk> must not produce a
  // distinct page, and an active chip the reader cannot see is worse than none.
  const known = new Set(tags.map((x) => x.tag));
  const active = parseTagsParam(searchParams.tags).filter((x) => known.has(x));

  const visible = active.length
    ? posts.filter((p) => active.every((tag) => p.tags.includes(tag)))
    : posts;

  // Distinguishing the three empty states is the whole point — "nothing here" and
  // "nothing matches your filter" and "nothing in your language" need different exits.
  const nothingPublished = posts.length === 0 && !showAll;
  const otherLangHasPosts =
    nothingPublished && (await listPosts({ lang: view === "de" ? "en" : "de" })).length > 0;

  return (
    <main className="px-6 py-20 md:px-10 md:py-28 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            {t.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-fg md:text-5xl">
            {t.title}
          </h1>
          <p className="mt-4 text-lg text-muted">{t.sub}</p>
        </header>

        <TagFilter tags={tags} active={active} t={t} />

        {visible.length > 0 ? (
          <div className="mt-2">
            {visible.map((post) => (
              <PostRow
                key={post.slug}
                post={post}
                lang={lang}
                t={t}
                showLangPill={showAll}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-border px-6 py-14 text-center">
            <p className="text-muted">
              {active.length
                ? t.emptyFiltered
                : otherLangHasPosts
                  ? t.emptyForLang
                  : t.empty}
            </p>

            {active.length > 0 && (
              <SmartLink
                href="/blog"
                className="inline-flex items-center rounded-full border border-dashed border-border px-4 py-1.5 text-sm text-accent transition hover:border-accent"
              >
                {t.filterClear}
              </SmartLink>
            )}

            {otherLangHasPosts && active.length === 0 && (
              <SmartLink
                href="/blog?lang=all"
                className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-sm text-fg transition hover:border-accent/60"
              >
                {t.showOtherLanguage}
              </SmartLink>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
