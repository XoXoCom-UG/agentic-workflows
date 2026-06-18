import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { marked } from "marked";
import { buildMetadata } from "@/lib/seo";
import LegalShell from "@/components/LegalShell";

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "AGB — Allgemeine Geschäftsbedingungen XoXoCom",
  description:
    "Allgemeine Geschäftsbedingungen der XoXoCom UG: Vertragsgrundlagen, Leistungsumfang, Zahlungsbedingungen und Haftung für unsere Coaching- und Beratungsangebote.",
  path: "/agb",
});

export default async function AgbPage() {
  const md = await fs.readFile(path.join(process.cwd(), "content", "agb.md"), "utf8");
  const html = await marked.parse(md);
  return <LegalShell html={html} />;
}
