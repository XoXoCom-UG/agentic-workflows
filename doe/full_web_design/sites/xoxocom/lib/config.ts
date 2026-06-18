import config from "@/site.config.json";

export type VisualFingerprint = {
  palette: string | null;
  layout: string | null;
  motion: string | null;
  typography: string | null;
};

export type SiteConfig = {
  slug: string;
  company: string;
  tagline: string;
  design_source: string | null;
  language: string;
  pages: string[];
  has_contact_form: boolean;
  contact_email: string;
  signature: string;
  visual_fingerprint: VisualFingerprint;
};

export const site: SiteConfig = config as SiteConfig;

// Navigation, CTA, and all user-facing copy now live in `lib/copy.ts` (bilingual)
// and are consumed via the language context in `lib/i18n.tsx`.

export const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/xoxocom/" },
];
