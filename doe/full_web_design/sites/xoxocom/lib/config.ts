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

export type NavChild = { label: string; href: string; external?: boolean; desc?: string };
export type NavItem = { label: string; href?: string; children?: NavChild[] };

/** Primary navigation (German). "Leistungen" is a dropdown only (no own page). */
export const nav: NavItem[] = [
  {
    label: "Produkte",
    href: "/produkte",
    children: [
      { label: "MAtfIT", href: "https://matfit.ai", external: true, desc: "A.I. Transformation Coach für Dev-Teams" },
    ],
  },
  {
    label: "Leistungen",
    children: [
      { label: "A.I. Transformation", href: "/leistungen/ai-transformation", desc: "Agile A.I. Transformation für Unternehmen" },
      { label: "Expert Consulting", href: "/leistungen/expert-consulting", desc: "Spezialisten für kritische Schlüsselrollen" },
      { label: "Business Coaching", href: "/leistungen/business-coaching", desc: "Wachstum für Teams und Einzelpersonen" },
    ],
  },
  { label: "Über uns", href: "/ueber-uns" },
];

export const CTA = { label: "Kontaktiere uns", href: "/kontakt" };

export const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/patryk-kwitowski" },
];
