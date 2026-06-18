import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { site } from "@/lib/config";
import { LanguageProvider } from "@/lib/i18n";
import { LANG_COOKIE, type Lang } from "@/lib/copy";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${site.company} — ${site.tagline}`,
  description:
    "XoXoCom UG verbindet moderne, agile Arbeitsweisen mit künstlicher Intelligenz — Coaching, Projekteinsätze und A.I. Transformation für Teams und Unternehmen.",
  other: {
    "x-site-signature": site.signature,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const saved = cookieStore.get(LANG_COOKIE)?.value;
  const initialLang: Lang = saved === "en" ? "en" : "de";

  return (
    <html lang={initialLang} className={manrope.variable}>
      <body className="min-h-screen flex flex-col bg-bg text-fg">
        <LanguageProvider initialLang={initialLang}>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
