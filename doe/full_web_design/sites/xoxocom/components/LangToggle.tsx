"use client";

import { useLang } from "@/lib/i18n";
import type { Copy } from "@/lib/copy";

/** Segmented DE | EN language switch. Reflects + sets the active language.
 *  Labels arrive as props from the server-rendered layout so the copy tree
 *  stays out of the client bundle. */
export default function LangToggle({ t, className = "" }: { t: Copy["langToggle"]; className?: string }) {
  const { lang, setLang } = useLang();
  const base = "px-2 py-1 text-xs font-semibold rounded-md transition-colors";
  return (
    <div
      role="group"
      aria-label={t.aria}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface/60 p-0.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang("de")}
        aria-pressed={lang === "de"}
        className={`${base} ${lang === "de" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
      >
        {t.de}
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`${base} ${lang === "en" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
      >
        {t.en}
      </button>
    </div>
  );
}
