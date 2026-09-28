import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import LandingContent from "@/components/content/LandingContent";

export const metadata: Metadata = buildMetadata({
  title: "MAtfIT — Your AI Strategy Consultant",
  description:
    "MAtfIT is your AI strategy consultant. It analyzes your tech stack and hands you the ideas and roadmap — consultant-grade insight, without the bill.",
  path: "/",
});

export default function Page() {
  return <LandingContent />;
}
