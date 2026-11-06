import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { COPY } from "@/lib/copy";
import SallyContent from "@/components/content/SallyContent";

// English is the site default, so the English copy is what crawlers index.
export const metadata: Metadata = buildMetadata({
  title: COPY.en.sally.metaTitle,
  description: COPY.en.sally.metaDescription,
  path: "/sally",
});

export default function SallyPage() {
  return <SallyContent />;
}
