import type { Metadata } from "next";
import { site } from "@/lib/config";
import UeberUnsContent from "@/components/content/UeberUnsContent";

export const metadata: Metadata = {
  title: `Über uns — ${site.company}`,
  description: "XoXoCom UG ist ein junges Team, das sich auf die wirtschaftliche und technische Beratung von A.I.-Implementierung spezialisiert hat.",
};

export default function UeberUnsPage() {
  return <UeberUnsContent />;
}
