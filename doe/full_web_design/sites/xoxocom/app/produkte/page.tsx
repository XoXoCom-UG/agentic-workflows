import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import ProdukteContent from "@/components/content/ProdukteContent";

export const metadata: Metadata = buildMetadata({
  title: "Produkte & MAtfIT — A.I.-Lösungen von XoXoCom",
  description:
    "Produkte und Projekte von XoXoCom UG — darunter MAtfIT, der A.I. Transformation Coach, der Dev-Teams Zeit spart und mit Innovationsideen versorgt.",
  path: "/produkte",
});

export default function ProduktePage() {
  return <ProdukteContent />;
}
