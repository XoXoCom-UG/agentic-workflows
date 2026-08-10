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
  site_url: string;
  design_source: string | null;
  language: string;
  pages: string[];
  has_contact_form: boolean;
  /**
   * Whether this site has the blog + /admin surface. Read by
   * execution/sync_env_local.py and execution/deploy_netlify.py to decide whether the
   * NEXT_PUBLIC_SUPABASE_* pair needs to be provisioned. Optional so the site.config.json
   * files written before the blog existed stay valid.
   */
  has_blog?: boolean;
  contact_email: string;
  signature: string;
  visual_fingerprint: VisualFingerprint;
};

export const site: SiteConfig = config as SiteConfig;

/**
 * Canonical, absolute base URL for the live site — the single source of truth for
 * every canonical/Open Graph/sitemap URL. Config-driven (`site.config.json`) with an
 * env override (`NEXT_PUBLIC_SITE_URL`) so switching to the real connected domain is a
 * one-line change, never a find-and-replace. No trailing slash.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL || site.site_url || "https://www.xoxocom.net"
).replace(/\/+$/, "");

// Navigation, CTA, and all user-facing copy now live in `lib/copy.ts` (bilingual)
// and are consumed via the language context in `lib/i18n.tsx`.

export const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/xoxocom/" },
];
