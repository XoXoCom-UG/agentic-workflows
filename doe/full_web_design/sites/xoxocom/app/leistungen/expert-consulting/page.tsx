import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import ExpertConsultingContent from "@/components/content/ExpertConsultingContent";

export const metadata: Metadata = buildMetadata({
  title: "Expert Consulting & Projekteinsätze — XoXoCom",
  description:
    "Projekteinsätze von XoXoCom UG: Wir besetzen kritische Schlüsselrollen mit Spezialisten, die methodische Exzellenz und technisches Know-how vereinen.",
  path: "/leistungen/expert-consulting",
});

export default function ExpertConsultingPage() {
  return <ExpertConsultingContent />;
}
