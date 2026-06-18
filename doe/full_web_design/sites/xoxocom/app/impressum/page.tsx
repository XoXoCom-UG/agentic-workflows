import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { marked } from "marked";
import { buildMetadata } from "@/lib/seo";
import LegalShell from "@/components/LegalShell";

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "Impressum — Rechtliche Angaben der XoXoCom UG",
  description:
    "Impressum der XoXoCom UG — Anbieterkennzeichnung, vertretungsberechtigte Personen und rechtliche Pflichtangaben gemäß den gesetzlichen Anforderungen.",
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
