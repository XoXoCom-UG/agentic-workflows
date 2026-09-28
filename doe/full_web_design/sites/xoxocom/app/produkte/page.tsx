import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import ProdukteContent from "@/components/content/ProdukteContent";

export const metadata: Metadata = buildMetadata({
  title: "Products & Agentix Projects — A.I. by XoXoCom",
  description:
    "Products and projects from XoXoCom UG — including Agentix Projects, where dev teams train A.I. project-agents that save them time.",
  path: "/produkte",
});

export default function ProduktePage() {
  return <ProdukteContent />;
}
