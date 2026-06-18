import type { Metadata } from "next";
import { site } from "@/lib/config";
import BusinessCoachingContent from "@/components/content/BusinessCoachingContent";

export const metadata: Metadata = {
  title: `Business Coaching — ${site.company}`,
  description: "Wachstum auf allen Ebenen: Wir coachen Teams und Einzelpersonen und schließen die Lücke zwischen technologischer Innovation und menschlichem Handeln.",
};

export default function BusinessCoachingPage() {
  return <BusinessCoachingContent />;
}
