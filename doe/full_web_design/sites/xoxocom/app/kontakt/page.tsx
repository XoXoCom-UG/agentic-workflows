import type { Metadata } from "next";
import { site } from "@/lib/config";
import KontaktContent from "@/components/content/KontaktContent";

export const metadata: Metadata = {
  title: `Kontakt — ${site.company}`,
  description: "Nimm Kontakt mit XoXoCom UG auf — wir melden uns innerhalb eines Werktags.",
};

export default function KontaktPage() {
  return <KontaktContent />;
}
