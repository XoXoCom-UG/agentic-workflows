import type { Metadata } from "next";
import { site } from "@/lib/config";
import HeroGraphHubs from "@/components/HeroGraphHubs";

export const metadata: Metadata = {
  title: `Expert Consulting — ${site.company}`,
  description: "Projekteinsätze: Wir besetzen kritische Schlüsselrollen mit Spezialisten, die methodische Exzellenz und technisches Know-how vereinen.",
};

const ROLES = ["Product Owner", "Scrum Master", "Software Engineer", "A.I. Specialist", "Team Coach", "Transformation Agent"];

export default function ExpertConsultingPage() {
  return (
    <main>
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-24 md:py-32">
        {/* Animated 3D node network visualising centrality & hubs — the highlight
            alternates between a provincial hub (links contained in one community)
            and a connector hub (links bridging separate communities). Reads CSS
            tokens at runtime, so it sits seamlessly on the page background. */}
        <HeroGraphHubs className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />
        {/* Text-protection scrim: softly darkens the centre so the headline stays crisp
            over the animation, while the network still reads toward the edges. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(46%_56%_at_50%_46%,var(--color-bg)_22%,transparent_82%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-1/3 h-[460px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(251,107,76,0.16),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Leistungen</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.06] tracking-tight text-fg">Expert Consulting</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted">Projekteinsätze – die passenden Puzzleteile für Ihren Projekterfolg.</p>
          <div className="pt-2">
            <a href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
              Kontakt aufnehmen
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-12 pb-24">
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-lg leading-relaxed text-muted">
            Wir finden nicht nur Experten, sondern die passenden Puzzleteile für Ihren Projekterfolg. Wir unterstützen
            Sie bei der Besetzung kritischer Schlüsselrollen mit Spezialisten, die methodische Exzellenz und technisches
            Know-how vereinen:
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <li key={r} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-fg">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {r}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
