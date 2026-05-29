import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { site } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${site.lead_magnet_title} | ${site.company}`,
  description: `Get ${site.lead_magnet_title} from ${site.company}.`,
  other: {
    "x-campaign-signature": site.signature,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-zinc-950 text-zinc-100 selection:bg-amber-400/30 selection:text-amber-100">
        {children}
      </body>
    </html>
  );
}
