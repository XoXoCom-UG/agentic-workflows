"use client";

import { useLang } from "@/lib/i18n";

/** Segmented DE | EN language switch, styled for the light green/neutral palette. */
export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, c } = useLang();
  const base = "px-2 py-1 text-xs font-semibold rounded-md transition-colors";
  return (
    <div
      role="group"
      aria-label={c.langToggle.aria}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/80 p-0.5 backdrop-blur-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang("de")}
        aria-pressed={lang === "de"}
        className={`${base} ${lang === "de" ? "bg-green-600 text-white" : "text-neutral-500 hover:text-neutral-900"}`}
      >
        {c.langToggle.de}
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`${base} ${lang === "en" ? "bg-green-600 text-white" : "text-neutral-500 hover:text-neutral-900"}`}
      >
        {c.langToggle.en}
      </button>
    </div>
  );
}
