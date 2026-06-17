import type { Metadata } from "next";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: `Über uns — ${site.company}`,
  description: "XoXoCom UG ist ein junges Team, das sich auf die wirtschaftliche und technische Beratung von A.I.-Implementierung spezialisiert hat.",
};

export default function UeberUnsPage() {
  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Über uns</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg">Menschen, Methodik und A.I.</h1>
        </header>

        <div className="space-y-5 text-lg leading-relaxed text-muted">
          <p>
            Wir sind ein junges Team, das sich auf die wirtschaftliche und technische Beratung von
            A.I.-Implementierung spezialisiert hat. Wir verbinden agile Arbeitsweisen mit künstlicher
            Intelligenz – und schließen die Lücke zwischen technologischer Innovation und menschlichem Handeln.
          </p>
          <p>
            Ob als strategischer Partner für Unternehmen oder als persönlicher Mentor für Professionals: Wir
            befähigen Menschen und Organisationen, in der neuen Arbeitswelt nicht nur mitzuhalten, sondern
            voranzugehen – individuell, disruptiv und messbar überlegen.
          </p>
        </div>

        <div className="pt-2">
          <a href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
            Jetzt Kontakt aufnehmen
          </a>
        </div>
      </div>
    </main>
  );
}
