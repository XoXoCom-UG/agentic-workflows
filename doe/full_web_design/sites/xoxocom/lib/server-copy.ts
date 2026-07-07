import { cookies } from "next/headers";
import { COPY, LANG_COOKIE, type Copy, type Lang } from "./copy";

/**
 * Server-side counterpart of useLang(): resolves the visitor's language from the
 * `xoxocom-lang` cookie and returns the matching copy tree. Content rendered with
 * this ships as HTML only — the bilingual COPY object stays out of that page's
 * client JS. After the client toggle writes the cookie it calls router.refresh(),
 * so server-rendered copy follows the language switch (see lib/i18n.tsx).
 */
export async function getCopy(): Promise<{ lang: Lang; c: Copy }> {
  const store = await cookies();
  const lang: Lang = store.get(LANG_COOKIE)?.value === "en" ? "en" : "de";
  return { lang, c: COPY[lang] };
}
