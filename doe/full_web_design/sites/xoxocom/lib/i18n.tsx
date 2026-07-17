"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LANG_COOKIE, isLegalPath, type Lang } from "@/lib/copy";

/**
 * Client-side language context. The active language is seeded by the server from
 * the `xoxocom-lang` cookie (see app/layout.tsx) and passed in as `initialLang`,
 * so the first paint — even on a hard load/refresh — already matches the saved
 * preference: no German→English flash. The choice is written back to the cookie
 * (readable by the server on the next request) and reflected on `<html lang>`.
 * Switching is instant; combined with <Link>-based navigation the provider state
 * survives route changes, so there is no per-navigation reload or re-translate.
 */

// Deliberately holds NO copy: components get their strings from server parents
// (props or lib/server-copy.ts), so the bilingual COPY tree stays out of the
// client bundle. This context only tracks/sets the active language.
type LanguageContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children, initialLang = "en" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useRef(false);

  // Keep <html lang> in sync with the page's actual content language: the German-only
  // legal pages stay "de" regardless of the chosen chrome language (matching the
  // server-rendered value from app/layout.tsx), everything else follows `lang`. Runs
  // on both language and route changes — a cheap DOM write, no server round-trip.
  useEffect(() => {
    document.documentElement.lang = isLegalPath(pathname) ? "de" : lang;
  }, [lang, pathname]);

  // Persist the choice in a cookie (so the server renders the right language on the
  // next request). After the cookie is written, router.refresh() re-renders server
  // components with the new cookie — pages whose copy is server-rendered (via
  // lib/server-copy.ts) switch language too, not just the client-context consumers.
  // Skipped on initial mount (the server already rendered with the saved cookie); it
  // depends only on `lang`, so a plain client-side navigation never triggers a refresh.
  useEffect(() => {
    document.cookie = `${LANG_COOKIE}=${lang};path=/;max-age=31536000;samesite=lax`;
    if (mounted.current) {
      router.refresh();
    }
    mounted.current = true;
  }, [lang, router]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((p) => (p === "de" ? "en" : "de")), []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}
