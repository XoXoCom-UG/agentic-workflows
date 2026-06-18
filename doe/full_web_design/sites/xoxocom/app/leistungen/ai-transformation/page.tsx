import type { Metadata } from "next";
import { site } from "@/lib/config";
import AiTransformationContent from "@/components/content/AiTransformationContent";

export const metadata: Metadata = {
  title: `A.I. Transformation — ${site.company}`,
  description: "Agile A.I. Transformation: tiefgreifende Methodik trifft die Power künstlicher Intelligenz — individuell, disruptiv und messbar überlegen.",
};

export default function AiTransformationPage() {
  return <AiTransformationContent />;
}
