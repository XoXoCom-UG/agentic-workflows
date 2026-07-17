import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import UeberUnsContent from "@/components/content/UeberUnsContent";

export const metadata: Metadata = buildMetadata({
  title: "About Us — The Team Behind XoXoCom UG",
  description:
    "XoXoCom UG is a young team for the business and technical consulting of A.I. implementation — agile methodology combined with artificial intelligence.",
  path: "/ueber-uns",
});

export default function UeberUnsPage() {
  return <UeberUnsContent />;
}
