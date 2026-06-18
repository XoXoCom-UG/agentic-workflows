import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import HomeContent from "@/components/content/HomeContent";

export const metadata: Metadata = buildMetadata({
  title: "XoXoCom UG — Moderne Arbeitsweisen und A.I. vereinen",
  description:
    "XoXoCom UG verbindet agile Arbeitsweisen mit künstlicher Intelligenz — Coaching, Projekteinsätze und A.I. Transformation für Teams und Unternehmen.",
  path: "/",
});

export default function Startseite() {
  return <HomeContent />;
}
