import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import HomeContent from "@/components/content/HomeContent";

export const metadata: Metadata = buildMetadata({
  title: "XoXoCom UG — Modern Ways of Working Meet A.I.",
  description:
    "XoXoCom UG combines agile ways of working with artificial intelligence — coaching, project placements and A.I. transformation for teams and companies.",
  path: "/",
});

export default function Startseite() {
  return <HomeContent />;
}
