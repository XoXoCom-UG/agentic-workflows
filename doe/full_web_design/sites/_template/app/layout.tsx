import type { Metadata } from "next";
import { site } from "@/lib/config";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: `${site.company} — ${site.tagline}`,
  description: site.tagline,
  other: {
    "x-site-signature": site.signature,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-bg text-fg">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
