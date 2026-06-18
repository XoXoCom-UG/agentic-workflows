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
  site_url: string;
  tagline: string;
  lead_magnet_title: string;
  drive_link: string;
  fields: string[];
  hero_video: string | null;
  signature: string;
  visual_fingerprint: VisualFingerprint;
};

export const site: SiteConfig = config as SiteConfig;

/**
 * Canonical, absolute base URL for the live site — the single source of truth for
 * every canonical/Open Graph/sitemap URL. Config-driven (`site.config.json`) with an
 * env override (`NEXT_PUBLIC_SITE_URL`) so switching to a different connected domain is
 * a one-line change, never a find-and-replace. No trailing slash.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL || site.site_url || "https://matfit.ai"
).replace(/\/+$/, "");

export const SOCIALS: { label: string; href: string }[] = [];
