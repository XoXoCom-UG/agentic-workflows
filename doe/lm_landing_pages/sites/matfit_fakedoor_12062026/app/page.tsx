import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import LandingContent from "@/components/content/LandingContent";

export const metadata: Metadata = buildMetadata({
  title: "MAtfIT — Dein KI-Coach für IT-Transformation",
  description:
    "MAtfIT ist dein KI-Coach für die IT-Transformation: fundierte Beratung von der Tech-Stack-Analyse bis zur umsetzbaren Roadmap. Sichere dir jetzt den Frühzugang.",
  path: "/",
});

export default function Page() {
  return <LandingContent />;
}
