import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { site, SITE_URL } from "@/lib/config";
import { LanguageProvider } from "@/lib/i18n";
import { COPY, LANG_COOKIE, type Lang } from "@/lib/copy";
import { DEFAULT_OG_LOCALE, ALTERNATE_OG_LOCALE, OG_IMAGE, organizationJsonLd } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const DEFAULT_DESCRIPTION =
  "XoXoCom UG verbindet moderne, agile Arbeitsweisen mit künstlicher Intelligenz — Coaching, Projekteinsätze und A.I. Transformation für Teams und Unternehmen.";

// metadataBase resolves every relative canonical/og:url/og:image to an absolute URL.
// The default openGraph/twitter blocks below act as the site-wide fallback; each page
// emits its own complete set via lib/seo.ts buildMetadata().
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.company} — ${site.tagline}`,
    template: `%s`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: site.company,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.company} — ${site.tagline}`,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    siteName: site.company,
    locale: DEFAULT_OG_LOCALE,
    alternateLocale: ALTERNATE_OG_LOCALE,
    type: "website",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${site.company} — ${site.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.company} — ${site.tagline}`,
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
  // Google Search Console verification — set GOOGLE_SITE_VERIFICATION in the env to
  // ship the verification token with a normal deploy (no extra step).
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const saved = cookieStore.get(LANG_COOKIE)?.value;
  const initialLang: Lang = saved === "en" ? "en" : "de";
  // Header copy is passed down as props (server → client), so the bilingual COPY
  // tree itself never ships in the client bundle; on toggle, router.refresh()
  // re-renders this layout with the new cookie and fresh props.
  const c = COPY[initialLang];

  return (
    <html lang={initialLang} className={manrope.variable}>
      <body className="min-h-screen flex flex-col bg-bg text-fg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <LanguageProvider initialLang={initialLang}>
          <SiteHeader nav={c.nav} header={c.header} cta={c.cta} langToggle={c.langToggle} />
          <div className="flex-1">{children}</div>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
