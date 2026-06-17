import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { site } from "@/lib/config";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${site.company} — ${site.tagline}`,
  description:
    "XoXoCom UG verbindet moderne, agile Arbeitsweisen mit künstlicher Intelligenz — Coaching, Projekteinsätze und A.I. Transformation für Teams und Unternehmen.",
  other: {
    "x-site-signature": site.signature,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={manrope.variable}>
      <body className="min-h-screen flex flex-col bg-bg text-fg">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
