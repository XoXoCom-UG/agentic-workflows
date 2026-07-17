import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import KontaktContent from "@/components/content/KontaktContent";

export const metadata: Metadata = buildMetadata({
  title: "Contact — XoXoCom UG | Request Your Project",
  description:
    "Get in touch with XoXoCom UG — whether coaching, project work or A.I. transformation. We read every message and reply within one business day.",
  path: "/kontakt",
});

export default function KontaktPage() {
  return <KontaktContent />;
}
