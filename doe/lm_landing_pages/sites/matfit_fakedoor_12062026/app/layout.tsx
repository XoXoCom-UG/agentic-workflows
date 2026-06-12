import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
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

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `MAtfIT — Dein KI-Coach für IT-Transformation`,
  description:
    "MAtfIT ist dein KI-Coach für IT-Transformation: fundierte, auf dein Unternehmen zugeschnittene Beratung — von der Tech-Stack-Analyse bis zur umsetzbaren Roadmap. Sichere dir den Frühzugang.",
  other: {
    "x-campaign-signature": site.signature,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="antialiased bg-neutral-950 text-neutral-100 selection:bg-lime-300/30 selection:text-lime-100">
        {children}
      </body>
    </html>
  );
}
