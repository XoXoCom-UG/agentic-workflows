import type { Metadata } from "next";
import { site } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${site.lead_magnet_title} — ${site.company}`,
  description: `Get ${site.lead_magnet_title} from ${site.company}.`,
  other: {
    "x-campaign-signature": site.signature,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
