import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import ExpertConsultingContent from "@/components/content/ExpertConsultingContent";

export const metadata: Metadata = buildMetadata({
  title: "Expert Consulting & Project Work — XoXoCom",
  description:
    "Project work from XoXoCom UG: we fill critical key roles with specialists who unite methodological excellence with deep technical know-how.",
  path: "/leistungen/expert-consulting",
});

export default function ExpertConsultingPage() {
  return <ExpertConsultingContent />;
}
