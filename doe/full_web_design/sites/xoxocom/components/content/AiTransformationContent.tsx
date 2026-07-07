"use client";

import { useLang } from "@/lib/i18n";
import dynamic from "next/dynamic";

// Decorative canvas animation — loaded after hydration so its chunk stays out of
// the first-load bundle; ssr:false is safe (absolute overlay, no layout impact).
const HeroGraph = dynamic(() => import("@/components/HeroGraph"), { ssr: false });
import SmartLink from "@/components/SmartLink";

export default function AiTransformationContent() {
  const { c } = useLang();
  const t = c.aiTransformation;

  return (
    <main>
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-24 md:py-32">
        {/* Animated 3D node network — shortest path highlighted in the brand accent.
            Reads CSS tokens at runtime, so it sits seamlessly on the page background. */}
        <HeroGraph className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />
        {/* Text-protection scrim: softly darkens the centre so the headline stays crisp
            over the animation, while the network still reads toward the edges. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(46%_56%_at_50%_46%,var(--color-bg)_22%,transparent_82%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-1/3 h-[460px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(251,107,76,0.16),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{c.leistungenEyebrow}</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.06] tracking-tight text-fg">{t.title}</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted">{t.sub}</p>
          <div className="pt-2">
            <SmartLink href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
              {c.leistungenHeroCta}
            </SmartLink>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-12 pb-24">
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-muted">
          {t.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>
    </main>
  );
}
