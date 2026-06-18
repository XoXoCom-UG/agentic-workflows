"use client";

import { site } from "@/lib/config";
import { useLang } from "@/lib/i18n";
import FooterLinks from "@/components/FooterLinks";

export default function ThankYouContent() {
  const { c } = useLang();

  return (
    <main className="relative min-h-[100dvh] flex items-center justify-center px-6 py-20 bg-neutral-950 text-neutral-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_20%,rgba(163,230,53,0.12),transparent_65%)]"
      />

      <div className="max-w-lg text-center space-y-6">
        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-lime-300/90">
          MAt<span className="text-lime-300">fIT</span> · {c.thankYou.eyebrowSuffix}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-50">
          {c.thankYou.title}
        </h1>
        <p className="text-neutral-300 leading-relaxed">{c.thankYou.body}</p>
        <p className="text-neutral-400">{c.thankYou.emailNote}</p>
        <FooterLinks className="justify-center pt-6" />
        <p
          className="pt-4 font-mono text-[11px] tracking-[0.16em] text-neutral-700"
          data-signature={site.signature}
        >
          {site.signature}
        </p>
      </div>
    </main>
  );
}
