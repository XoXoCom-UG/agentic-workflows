import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { site, SITE_URL } from "@/lib/config";
import { LanguageProvider } from "@/lib/i18n";
import {
  DEFAULT_OG_LOCALE,
  ALTERNATE_OG_LOCALE,
  OG_IMAGE,
  organizationJsonLd,
} from "@/lib/seo";
import "./globals.css";

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

const DEFAULT_TITLE = `${site.company} — ${site.tagline}`;
const DEFAULT_DESCRIPTION =
  "Plane wie mit Top-Beratern — nur schneller und günstiger. MAtfIT ist dein KI-Strategie-Consultant: von der Tech-Stack-Analyse bis zur umsetzbaren Roadmap.";

// metadataBase resolves every relative canonical/og:url/og:image to an absolute URL.
// The default openGraph/twitter blocks below act as the site-wide fallback; each page
// emits its own complete set via lib/seo.ts buildMetadata().
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: site.company,
  alternates: { canonical: "/" },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    siteName: site.company,
    locale: DEFAULT_OG_LOCALE,
    alternateLocale: ALTERNATE_OG_LOCALE,
    type: "website",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
  // Google Search Console verification — set GOOGLE_SITE_VERIFICATION in the env to
  // ship the verification token with a normal deploy (no extra step).
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  other: {
    "x-campaign-signature": site.signature,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased bg-white text-neutral-900 selection:bg-green-600/15 selection:text-green-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
