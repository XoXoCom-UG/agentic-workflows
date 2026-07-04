"use client";

import { useLang } from "@/lib/i18n";
import FooterLinks from "@/components/FooterLinks";

export default function ThankYouContent() {
  const { c } = useLang();

  return (
    <main className="relative min-h-[100dvh] flex items-center justify-center px-6 py-20 bg-white text-neutral-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_20%,rgba(34,197,94,0.10),transparent_65%)]"
      />

      <div className="max-w-lg text-center space-y-6">
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-900">
          matfit<span className="text-green-600">.ai</span>{" "}
          <span className="text-green-600">· {c.thankYou.eyebrowSuffix}</span>
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
          {c.thankYou.title}
        </h1>
        <p className="text-neutral-600 leading-relaxed">{c.thankYou.body}</p>
        <p className="text-neutral-500">{c.thankYou.emailNote}</p>
        <FooterLinks className="justify-center pt-6" />
      </div>
    </main>
  );
}
