import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import AiTransformationContent from "@/components/content/AiTransformationContent";

export const metadata: Metadata = buildMetadata({
  title: "A.I. Transformation — Beratung von XoXoCom UG",
  description:
    "Agile A.I. Transformation von XoXoCom UG: tiefgreifende Methodik trifft die Power künstlicher Intelligenz — individuell, disruptiv und messbar überlegen.",
  path: "/leistungen/ai-transformation",
});

export default function AiTransformationPage() {
  return <AiTransformationContent />;
}
