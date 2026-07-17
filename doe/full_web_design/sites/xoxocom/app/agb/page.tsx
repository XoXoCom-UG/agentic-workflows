import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { marked } from "marked";
import { buildMetadata } from "@/lib/seo";
import LegalShell from "@/components/LegalShell";

// Rendered per request so middleware's x-pathname header is present and the root
// layout can pin <html lang="de"> for this German-only legal page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "AGB — Allgemeine Geschäftsbedingungen XoXoCom",
  description:
    "Allgemeine Geschäftsbedingungen der XoXoCom UG: Vertragsgrundlagen, Leistungsumfang, Zahlungsbedingungen und Haftung für unsere Coaching- und Beratungsangebote.",
  path: "/agb",
  // German-only legal page: advertise German as the primary OG locale.
  locale: "de_DE",
  alternateLocale: "en_US",
});

export default async function AgbPage() {
  const md = await fs.readFile(path.join(process.cwd(), "content", "agb.md"), "utf8");
  const html = await marked.parse(md);
  return <LegalShell html={html} />;
}
