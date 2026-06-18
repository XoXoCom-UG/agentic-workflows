import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import BusinessCoachingContent from "@/components/content/BusinessCoachingContent";

export const metadata: Metadata = buildMetadata({
  title: "Business Coaching für Teams & Karriere — XoXoCom",
  description:
    "Business Coaching von XoXoCom UG: Wachstum auf allen Ebenen — wir schließen die Lücke zwischen technologischer Innovation und menschlichem Handeln.",
  path: "/leistungen/business-coaching",
});

export default function BusinessCoachingPage() {
  return <BusinessCoachingContent />;
}
