import type { Metadata } from "next";
import ThankYouContent from "@/components/content/ThankYouContent";

// Post-conversion page — keep it out of the index and the sitemap.
export const metadata: Metadata = {
  title: "You're on the list — MAtfIT",
  robots: { index: false, follow: true },
};

export default function ThankYouPage() {
  return <ThankYouContent />;
}
