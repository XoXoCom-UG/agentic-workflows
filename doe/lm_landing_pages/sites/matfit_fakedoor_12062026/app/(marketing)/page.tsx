import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import LandingContent from "@/components/content/LandingContent";

export const metadata: Metadata = buildMetadata({
  title: "MAtfIT — Dein KI-Strategie-Consultant",
  description:
    "Plane wie mit Top-Beratern — nur schneller und günstiger. MAtfIT ist dein KI-Strategie-Consultant: von der Tech-Stack-Analyse bis zur umsetzbaren Roadmap.",
  path: "/",
});

export default function Page() {
  return <LandingContent />;
}
