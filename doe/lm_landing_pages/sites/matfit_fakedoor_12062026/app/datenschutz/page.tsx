import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { marked } from "marked";
import LegalShell from "@/components/LegalShell";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — MAtfIT",
  description: "Datenschutzerklärung der XoXoCom UG (haftungsbeschränkt).",
};

export default async function DatenschutzPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "content", "datenschutz.md"),
    "utf8"
  );
  const html = await marked.parse(md);
  return <LegalShell html={html} />;
}
