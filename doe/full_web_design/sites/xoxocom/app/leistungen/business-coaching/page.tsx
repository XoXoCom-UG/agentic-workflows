import type { Metadata } from "next";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: `Business Coaching — ${site.company}`,
  description: "Wachstum auf allen Ebenen: Wir coachen Teams und Einzelpersonen und schließen die Lücke zwischen technologischer Innovation und menschlichem Handeln.",
};

export default function BusinessCoachingPage() {
  return (
    <main>
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-24 md:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-1/3 h-[460px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(251,107,76,0.16),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Leistungen</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.06] tracking-tight text-fg">Business Coaching</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted">Wachstum auf allen Ebenen.</p>
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
            Wir coachen Teams und Einzelpersonen, um die Lücke zwischen technologischer Innovation und menschlichem
            Handeln zu schließen. Ob als strategischer Partner für Ihr Unternehmen oder als persönlicher Mentor für
            Ihre Karriere – wir befähigen Sie, in der neuen Arbeitswelt nicht nur mitzuhalten, sondern voranzugehen.
          </p>
        </div>
      </section>
    </main>
  );
}
