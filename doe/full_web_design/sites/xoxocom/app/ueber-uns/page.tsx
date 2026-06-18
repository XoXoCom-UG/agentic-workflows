import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import UeberUnsContent from "@/components/content/UeberUnsContent";

export const metadata: Metadata = buildMetadata({
  title: "Über uns — Das Team hinter XoXoCom UG",
  description:
    "XoXoCom UG ist ein junges Team für die wirtschaftliche und technische Beratung von A.I.-Implementierung — agile Methodik vereint mit künstlicher Intelligenz.",
  path: "/ueber-uns",
});

export default function UeberUnsPage() {
  return <UeberUnsContent />;
}
