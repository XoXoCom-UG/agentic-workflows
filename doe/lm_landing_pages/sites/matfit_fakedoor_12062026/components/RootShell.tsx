import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import type { Lang } from "@/lib/copy";
import { organizationJsonLd } from "@/lib/seo";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Shared document shell used by BOTH root layouts. The app has two root layouts
 * (one per route group) so the German-only legal pages render <html lang="de">
 * while the English marketing pages render <html lang="en">. Everything else —
 * fonts, JSON-LD, the language provider — is identical, so it lives here to stay
 * in sync. `lang` also seeds the client language context (initialLang) so the
 * first client paint matches the server-rendered <html lang> exactly.
 */
export default function RootShell({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-white text-neutral-900 selection:bg-green-600/15 selection:text-green-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
