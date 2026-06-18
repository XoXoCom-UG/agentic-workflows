import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import KontaktContent from "@/components/content/KontaktContent";

export const metadata: Metadata = buildMetadata({
  title: "Kontakt — XoXoCom UG | Jetzt Projekt anfragen",
  description:
    "Nimm Kontakt mit XoXoCom UG auf — ob Coaching, Projekteinsatz oder A.I. Transformation. Wir lesen jede Nachricht und antworten innerhalb eines Werktags.",
  path: "/kontakt",
});

export default function KontaktPage() {
  return <KontaktContent />;
}
