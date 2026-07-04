"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLang } from "@/lib/i18n";

/* Coded recreation of the current matfit.ai product UI (light theme, green
   accent) — sidebar + "Was möchtest du heute lösen?" home screen. Kept as
   markup (not a PNG) so it stays crisp on every viewport and always matches
   the brand palette. Product strings are German, mirroring the real app. */

const RECENT_CHATS = [
  "Wir nutzen VS Code…",
  "Cloud-Migration planen…",
  "Ich bin Software-Architekt…",
  "Welche Wettbewerber…",
];

const SUGGESTION_PILLS = ["Cloud Migration", "Make.com vs Zapier", "ERP-Auswahl"];

export default function HeroMockup() {
  const { c } = useLang();
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="md:col-span-6 relative md:mt-20 lg:mt-24"
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Green glow behind the frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_60%_40%,rgba(34,197,94,0.16),transparent_70%)] blur-2xl"
      />

      {/* Browser frame */}
      <div
        role="img"
        aria-label={c.heroMockup.alt}
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_40px_120px_-30px_rgba(23,23,23,0.25)]"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-neutral-300" />
          <span className="h-3 w-3 rounded-full bg-neutral-300" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
          <span className="ml-3 font-mono text-[11px] tracking-wide text-neutral-400">
            {c.heroMockup.browserLabel}
          </span>
        </div>

        {/* App: sidebar + main */}
        <div aria-hidden="true" className="flex select-none text-left">
          {/* Sidebar */}
          <div className="hidden sm:flex w-[34%] max-w-[190px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/80 p-3">
            <div className="text-[13px] font-bold tracking-tight text-neutral-900">
              matfit<span className="text-green-600">.ai</span>
            </div>
            <div className="mt-3 rounded-lg bg-gradient-to-b from-green-500 to-green-600 px-2.5 py-1.5 text-center text-[10px] font-semibold text-white shadow-sm">
              + Neues Projekt
            </div>
            <div className="mt-3 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[9px] text-neutral-400">
              Projekte suchen…
            </div>
            <div className="mt-4 text-[8px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Schnelle Fragen
            </div>
            <div className="mt-1.5 space-y-1">
              {RECENT_CHATS.map((chat) => (
                <div
                  key={chat}
                  className="truncate rounded-md px-2 py-1 text-[9px] text-neutral-500"
                >
                  {chat}
                </div>
              ))}
            </div>
          </div>

          {/* Main pane */}
          <div className="flex min-w-0 flex-1 flex-col items-center px-5 pb-5 pt-7 sm:px-7">
            <div className="text-[8px] font-semibold uppercase tracking-[0.2em] text-green-600">
              KI-gestützte IT-Beratung
            </div>
            <div className="mt-2 text-center text-lg font-bold leading-tight tracking-tight text-neutral-900 sm:text-xl">
              Was möchtest du
              <br />
              <span className="text-green-600">heute lösen?</span>
            </div>
            <div className="mt-1.5 text-center text-[9px] leading-relaxed text-neutral-500">
              Transformation Concepts. Roadmaps. IT-Know-how.
            </div>

            {/* Action cards */}
            <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-gradient-to-b from-green-500 to-green-600 p-3 text-white shadow-[0_12px_30px_-12px_rgba(34,197,94,0.6)]">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-[11px] font-semibold">
                  +
                </div>
                <div className="mt-2 text-[10px] font-semibold">Starte Projekt</div>
                <div className="mt-0.5 text-[8px] leading-snug text-white/80">
                  Geführtes Interview → Konzept → Roadmap.
                </div>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-neutral-100 text-[10px] text-neutral-500">
                  💬
                </div>
                <div className="mt-2 text-[10px] font-semibold text-neutral-900">
                  Schnelle Frage
                </div>
                <div className="mt-0.5 text-[8px] leading-snug text-neutral-500">
                  Frag alles — IT-Architektur, Tools, Strategie.
                </div>
              </div>
            </div>

            {/* Suggestion pills */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
              {SUGGESTION_PILLS.map((pill) => (
                <div
                  key={pill}
                  className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[8px] font-medium text-neutral-600"
                >
                  {pill}
                </div>
              ))}
            </div>

            {/* Input bar */}
            <div className="mt-4 flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
              <span className="text-[9px] text-neutral-400">Ask anything…</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-green-500 to-green-600 text-[10px] text-white">
                ↑
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
