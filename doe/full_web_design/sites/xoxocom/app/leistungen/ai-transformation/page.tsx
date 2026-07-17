import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import AiTransformationContent from "@/components/content/AiTransformationContent";

export const metadata: Metadata = buildMetadata({
  title: "A.I. Transformation — Consulting by XoXoCom UG",
  description:
    "Agile A.I. transformation by XoXoCom UG: deep methodology meets the power of artificial intelligence — individual, disruptive and measurably superior.",
  path: "/leistungen/ai-transformation",
});

export default function AiTransformationPage() {
  return <AiTransformationContent />;
}
