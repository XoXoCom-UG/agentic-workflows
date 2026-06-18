import type { Metadata } from "next";
import { site } from "@/lib/config";
import ExpertConsultingContent from "@/components/content/ExpertConsultingContent";

export const metadata: Metadata = {
  title: `Expert Consulting — ${site.company}`,
  description: "Projekteinsätze: Wir besetzen kritische Schlüsselrollen mit Spezialisten, die methodische Exzellenz und technisches Know-how vereinen.",
};

export default function ExpertConsultingPage() {
  return <ExpertConsultingContent />;
}
