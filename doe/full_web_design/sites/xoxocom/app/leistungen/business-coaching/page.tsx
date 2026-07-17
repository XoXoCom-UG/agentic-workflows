import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import BusinessCoachingContent from "@/components/content/BusinessCoachingContent";

export const metadata: Metadata = buildMetadata({
  title: "Business Coaching for Teams & Careers — XoXoCom",
  description:
    "Business coaching by XoXoCom UG: growth on every level — we close the gap between technological innovation and human action for lasting results.",
  path: "/leistungen/business-coaching",
});

export default function BusinessCoachingPage() {
  return <BusinessCoachingContent />;
}
