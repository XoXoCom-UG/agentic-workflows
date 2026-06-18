import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { marked } from "marked";
import { buildMetadata } from "@/lib/seo";
import LegalShell from "@/components/LegalShell";

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "Impressum — MAtfIT, dein KI-Coach für IT-Transformation",
  description:
    "Impressum und Anbieterkennzeichnung der XoXoCom UG (haftungsbeschränkt), Betreiberin von MAtfIT — deinem KI-Coach für die IT-Transformation.",
  path: "/impressum",
});

export default async function ImpressumPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "content", "impressum.md"),
    "utf8"
  );
  const html = await marked.parse(md);
  return <LegalShell html={html} />;
}
