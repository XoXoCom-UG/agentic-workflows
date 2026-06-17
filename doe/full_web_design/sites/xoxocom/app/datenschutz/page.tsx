import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { marked } from "marked";
import { site } from "@/lib/config";
import LegalShell from "@/components/LegalShell";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `Datenschutzerklärung — ${site.company}`,
  description: `Datenschutzerklärung der ${site.company}.`,
};

export default async function DatenschutzPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "content", "datenschutz.md"),
    "utf8"
  );
  const html = await marked.parse(md);
  return <LegalShell html={html} />;
}
