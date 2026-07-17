import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import ProdukteContent from "@/components/content/ProdukteContent";

export const metadata: Metadata = buildMetadata({
  title: "Products & MAtfIT — A.I. Solutions by XoXoCom",
  description:
    "Products and projects from XoXoCom UG — including MAtfIT, the A.I. transformation coach that saves dev teams time and supplies them with fresh ideas.",
  path: "/produkte",
});

export default function ProduktePage() {
  return <ProdukteContent />;
}
