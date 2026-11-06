"use client";

import { useState } from "react";
import type { Copy, Lang } from "@/lib/copy";
import SallyFigure from "@/components/sally/SallyFigure";
import SallyChat from "@/components/sally/SallyChat";
import SallyNewsBoard from "@/components/sally/SallyNewsBoard";

/**
 * The /sally hero: news board, Sally herself (with her sticky notes) and her chat.
 * Owns the one piece of state Sally and the chat share: whether she is "talking"
 * (a reply is being written out), which animates her mouth.
 *
 * Layout follows the strategy-board sketch — news on the left, Sally in the middle,
 * the conversation on the right — from xl. Below that Sally and the chat share a row
 * and the news board drops underneath; on phones everything stacks, Sally first.
 */
export default function SallyStage({ t, lang }: { t: Copy["sally"]; lang: Lang }) {
  const [talking, setTalking] = useState(false);

  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,25rem)] xl:items-start">
      <div className="relative mx-auto w-full max-w-[400px] xl:order-2">
        <div aria-hidden className="hue-breathe pointer-events-none absolute inset-[6%] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.3),transparent_68%)] blur-2xl" />
        <SallyFigure talking={talking} className="relative h-auto w-full" />

        <div className="relative -mt-6 grid grid-cols-2 gap-3">
          <div className="-rotate-2 rounded-xl border border-accent/30 bg-surface/95 p-4 shadow-xl shadow-black/40 backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-xs font-bold text-fg">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 text-accent">
                <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1v5.46h-4v-4.84c0-1.15-.02-2.64-1.6-2.64-1.62 0-1.86 1.26-1.86 2.56v4.92h-4v-11Z" />
              </svg>
              {t.notes.linkedinTitle}
            </p>
            <p className="mt-1.5 text-[12px] leading-snug text-muted">{t.notes.linkedinBody}</p>
            <span className="mt-2 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
              {t.notes.linkedinSoon}
            </span>
          </div>
          <a
            href="#warum-sally"
            className="group rotate-2 rounded-xl border border-accent/30 bg-surface/95 p-4 shadow-xl shadow-black/40 backdrop-blur-sm transition hover:border-accent/70"
          >
            <p className="text-xs font-bold text-fg">{t.notes.whyTitle}</p>
            <p className="mt-1.5 text-[12px] leading-snug text-muted">{t.notes.whyBody}</p>
            <span className="mt-2 inline-block text-[12px] font-semibold text-accent group-hover:underline">{t.notes.whyCta} ↓</span>
          </a>
        </div>
      </div>

      <div className="xl:order-3 xl:sticky xl:top-24">
        <SallyChat t={t.chat} greeting={t.greeting} onTalkingChange={setTalking} />
      </div>

      <div className="md:col-span-2 xl:order-1 xl:col-span-1">
        <SallyNewsBoard t={t} lang={lang} />
      </div>
    </div>
  );
}
