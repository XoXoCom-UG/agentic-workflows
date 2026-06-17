import type { Metadata } from "next";
import { site } from "@/lib/config";
import HeroGraph from "@/components/HeroGraph";

export const metadata: Metadata = {
  title: `A.I. Transformation — ${site.company}`,
  description: "Agile A.I. Transformation: tiefgreifende Methodik trifft die Power künstlicher Intelligenz — individuell, disruptiv und messbar überlegen.",
};

export default function AiTransformationPage() {
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Leistungen</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.06] tracking-tight text-fg">A.I. Transformation</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted">Individuell, disruptiv und messbar überlegen.</p>
          <div className="pt-2">
            <a href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
              Kontakt aufnehmen
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-12 pb-24">
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-muted">
          <p>
            Wer heute noch nach starren Lehrbüchern arbeitet, hat morgen schon verloren. Wir bieten keine Lösungen von
            der Stange, sondern einzigartige Konzepte, die dort ansetzen, wo klassische Agilität an ihre Grenzen stößt.
          </p>
          <p>
            Unsere Agile A.I. Transformation verbindet tiefgreifende Methodik mit der Power künstlicher Intelligenz zu
            einem hybriden Erfolgsmodell. Wir befähigen Unternehmen, echte Wettbewerbsvorteile durch exklusive Strategien
            zu erlangen, und begleiten Professionals dabei, sich mit Tools und Skills zu bewaffnen, die kein gewöhnliches
            Training bietet. Individuell, disruptiv und messbar überlegen.
          </p>
        </div>
      </section>
    </main>
  );
}
