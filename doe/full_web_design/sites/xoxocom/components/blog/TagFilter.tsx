import SmartLink from "@/components/SmartLink";
import { tagHref, type TagCount } from "@/lib/blog";
import type { Copy } from "@/lib/copy";

type Props = {
  tags: TagCount[];
  active: string[];
  t: Copy["blog"];
};

/**
 * Tag filter for /blog. A server component with zero client JavaScript.
 *
 * Each chip is a link whose href is the current selection with that tag toggled
 * (see tagHref in lib/blog.ts). Clicking one is an RSC navigation, so the language
 * cookie survives, the back button works with no code, and a filtered view is a real
 * shareable URL. A client-side filter would buy nothing here — the page is already
 * dynamic because the root layout reads cookies() — and would put a stateful island
 * on a route that otherwise ships no JS at all.
 *
 * Selected tags narrow by AND: two tags means posts carrying both.
 */
export default function TagFilter({ tags, active, t }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="mt-10 flex flex-wrap items-baseline gap-x-5 gap-y-3 border-y border-border py-5">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {t.filterLabel}
      </span>

      <div className="flex flex-wrap gap-2">
        {tags.map(({ tag, label, count }) => {
          const on = active.includes(tag);
          return (
            <SmartLink
              key={tag}
              href={tagHref(active, tag)}
              aria-pressed={on}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                on
                  ? "border-accent bg-accent/10 font-semibold text-fg"
                  : "border-border text-muted hover:border-accent/60 hover:text-fg",
              ].join(" ")}
            >
              {label}
              <span
                className={`text-xs tabular-nums ${on ? "text-accent" : "text-muted/70"}`}
              >
                {count}
              </span>
            </SmartLink>
          );
        })}

        {active.length > 0 && (
          <SmartLink
            href="/blog"
            className="inline-flex items-center rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-accent transition hover:border-accent"
          >
            {t.filterClear}
          </SmartLink>
        )}
      </div>
    </div>
  );
}
