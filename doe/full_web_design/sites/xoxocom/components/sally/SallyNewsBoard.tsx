"use client";

import { useState } from "react";
import type { Copy, Lang, SallyPost } from "@/lib/copy";
import SmartLink from "@/components/SmartLink";

type Category = SallyPost["category"];

/** Sally's news board: two tabs ("from the company" / "from the team"), newest first. */
export default function SallyNewsBoard({ t, lang }: { t: Copy["sally"]; lang: Lang }) {
  const [tab, setTab] = useState<Category>("company");
  const [open, setOpen] = useState<string | null>(null);

  const posts = t.posts
    .filter((p) => p.category === tab)
    .sort((a, b) => b.date.localeCompare(a.date));

  const fmt = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const tabs: Category[] = ["company", "team"];

  return (
    <section aria-labelledby="sally-news-title" className="rounded-[var(--radius-card)] border border-border bg-surface/70 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-full bg-accent sally-pulse" />
        <h2 id="sally-news-title" className="text-sm font-bold uppercase tracking-[0.16em] text-fg">{t.newsTitle}</h2>
      </div>

      <div role="tablist" aria-label={t.newsTitle} className="mt-4 grid grid-cols-2 gap-1 rounded-[var(--radius-card)] bg-bg p-1">
        {tabs.map((c) => (
          <button
            key={c}
            role="tab"
            type="button"
            aria-selected={tab === c}
            onClick={() => { setTab(c); setOpen(null); }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === c ? "bg-surface text-fg" : "text-muted hover:text-fg"}`}
          >
            {t.tabs[c]}
          </button>
        ))}
      </div>

      <ul role="tabpanel" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        {posts.map((p) => {
          const key = `${p.date}-${p.title}`;
          const expanded = open === key;
          return (
            <li key={key} className="rounded-xl border border-border bg-bg/70 p-4">
              <time dateTime={p.date} className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {fmt.format(new Date(`${p.date}T12:00:00`))}
              </time>
              <h3 className="mt-1 text-sm font-bold text-fg">{p.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-muted ${expanded ? "" : "line-clamp-2"}`}>{p.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : key)}
                  className="text-xs font-semibold text-fg transition hover:text-accent"
                >
                  {expanded ? t.showLess : t.showMore}
                </button>
                {expanded && p.href && p.linkLabel && (
                  <SmartLink
                    href={p.href}
                    target={p.href.startsWith("http") ? "_blank" : undefined}
                    rel={p.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {p.linkLabel} →
                  </SmartLink>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
