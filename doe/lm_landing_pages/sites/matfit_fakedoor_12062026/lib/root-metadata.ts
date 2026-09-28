import type { Metadata } from "next";
import { site, SITE_URL } from "@/lib/config";
import {
  DEFAULT_OG_LOCALE,
  ALTERNATE_OG_LOCALE,
  OG_IMAGE,
} from "@/lib/seo";

/**
 * Site-wide default metadata, shared by both root layouts (marketing + legal).
 * Each page still emits its own complete set via lib/seo.ts buildMetadata(); this
 * is only the fallback and the source of metadataBase (which resolves every
 * relative canonical / og:url / og:image to an absolute URL on the canonical domain).
 */

const DEFAULT_TITLE = `${site.company} — ${site.tagline}`;
const DEFAULT_DESCRIPTION =
  "MAtfIT is your AI strategy consultant. It analyzes your tech stack and hands you the ideas and roadmap — consultant-grade insight, without the bill.";

export const rootMetadata: Metadata = {
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
