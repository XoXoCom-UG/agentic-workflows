import config from "@/site.config.json";

export type VisualFingerprint = {
  palette: string | null;
  layout: string | null;
  motion: string | null;
  typography: string | null;
};

export type SiteConfig = {
  /** lowercase, underscore-separated; directory name + SITE_SLUG env + campaign_slug DB value */
  slug: string;
  /** display + legal name of the operator */
  company: string;
  /** one-line value proposition, used in the hero + meta description */
  tagline: string;
  /** which awesome-design-md brand DESIGN.md this site's tokens were derived from */
  design_source: string | null;
  /** route slugs to scaffold; "home" maps to "/", the rest to "/<slug>" */
  pages: string[];
  /** whether the contact page wires the Supabase + Gmail submission flow */
  has_contact_form: boolean;
  /** operator inbox that receives contact-form notifications */
  contact_email: string;
  /** visible build token (web-<slug>-<6char>) — kept on the page for production disambiguation */
  signature: string;
  visual_fingerprint: VisualFingerprint;
};

export const site: SiteConfig = config as SiteConfig;

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  about: "About",
  services: "Services",
  contact: "Contact",
};

export function labelForPage(slug: string): string {
  return (
    PAGE_LABELS[slug] ??
    slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Top-nav entries derived from site.pages. "home" is rendered as the logo link, so it is excluded here. */
export const nav: { href: string; label: string }[] = site.pages
  .filter((p) => p !== "home")
  .map((p) => ({ href: `/${p}`, label: labelForPage(p) }));
