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
  lead_magnet_title: string;
  drive_link: string;
  fields: string[];
  hero_video: string | null;
  signature: string;
  visual_fingerprint: VisualFingerprint;
};

export const site: SiteConfig = config as SiteConfig;
