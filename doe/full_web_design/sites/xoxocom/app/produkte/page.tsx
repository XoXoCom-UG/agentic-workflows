import type { Metadata } from "next";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: `Produkte — ${site.company}`,
  description: "Produkte und Projekte von XoXoCom UG, darunter MAtfIT — der A.I. Transformation Coach für Dev-Teams.",
};

const PRODUCTS = [
  {
    title: "MAtfIT",
    desc: "Ein A.I. Transformation Coach, der jedes Dev-Team mit Zeitersparnis, Optimierungsideen sowie Beratung zu Innovationen und Markttrends bereichert.",
    cta: { label: "Jetzt probieren", href: "https://matfit.ai", external: true },
  },
];

export default function ProduktePage() {
  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Produkte</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg">Was wir bauen</h1>
          <p className="text-lg text-muted">Eigene Produkte und Projekte, mit denen wir A.I. in den Arbeitsalltag bringen.</p>
        </header>

        <div className="mt-12 grid gap-6">
          {PRODUCTS.map((p) => (
            <article key={p.title} className="rounded-[var(--radius-card)] border border-border bg-surface p-8 md:p-10">
              <h2 className="text-2xl font-bold text-fg">{p.title}</h2>
              <p className="mt-4 max-w-2xl text-muted">{p.desc}</p>
              <a
                href={p.cta.href}
                target={p.cta.external ? "_blank" : undefined}
                rel={p.cta.external ? "noopener noreferrer" : undefined}
                className="mt-7 inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90"
              >
                {p.cta.label}
              </a>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
