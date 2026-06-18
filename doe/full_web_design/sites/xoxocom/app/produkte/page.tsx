import type { Metadata } from "next";
import { site } from "@/lib/config";
import ProdukteContent from "@/components/content/ProdukteContent";

export const metadata: Metadata = {
  title: `Produkte — ${site.company}`,
  description: "Produkte und Projekte von XoXoCom UG, darunter MAtfIT — der A.I. Transformation Coach für Dev-Teams.",
};

export default function ProduktePage() {
  return <ProdukteContent />;
}
