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
  title: "Datenschutzerklärung der XoXoCom UG im Überblick",
  description:
    "Datenschutzerklärung der XoXoCom UG: Welche personenbezogenen Daten wir verarbeiten, zu welchem Zweck, auf welcher Rechtsgrundlage und wie lange wir speichern.",
  path: "/datenschutz",
  // German-only legal page: advertise German as the primary OG locale.
  locale: "de_DE",
  alternateLocale: "en_US",
});

export default async function DatenschutzPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "content", "datenschutz.md"),
    "utf8"
  );
  const html = await marked.parse(md);
  return <LegalShell html={html} />;
}
