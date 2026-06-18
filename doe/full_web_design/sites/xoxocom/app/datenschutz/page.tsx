import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { marked } from "marked";
import { buildMetadata } from "@/lib/seo";
import LegalShell from "@/components/LegalShell";

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "Datenschutzerklärung der XoXoCom UG im Überblick",
  description:
    "Datenschutzerklärung der XoXoCom UG: Welche personenbezogenen Daten wir verarbeiten, zu welchem Zweck, auf welcher Rechtsgrundlage und wie lange wir speichern.",
  path: "/datenschutz",
});

export default async function DatenschutzPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "content", "datenschutz.md"),
    "utf8"
  );
  const html = await marked.parse(md);
  return <LegalShell html={html} />;
}
