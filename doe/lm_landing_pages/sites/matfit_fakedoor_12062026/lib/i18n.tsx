"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { COPY, type Copy, type Lang } from "@/lib/copy";

/**
 * Client-side language context. The initial language is chosen per route on the
 * server (`initialLang`, from app/layout.tsx) so the first paint matches the
 * server-rendered `<html lang>` exactly — English on marketing pages, German on
 * the German-only legal pages. A saved preference in localStorage is applied
 * after mount. Switching is instant — no reload, no route change. `c` is the
 * resolved copy tree for the active language.
 */

const STORAGE_KEY = "matfit-lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  c: Copy;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Apply any saved preference after mount (keeps SSR output deterministic).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "de" || saved === "en") setLangState(saved);
    } catch {
      /* localStorage unavailable (private mode etc.) — keep default */
    }
  }, []);

  // Persist + reflect the choice on <html lang> for a11y/SEO.
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((p) => (p === "de" ? "en" : "de")), []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, c: COPY[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}
