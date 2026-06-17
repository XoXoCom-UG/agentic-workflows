import type { Metadata } from "next";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: `Services — ${site.company}`,
  description: `What ${site.company} offers.`,
};

const SERVICES = [
  {
    title: "Service one",
    body: "Describe the offering, who it's for, and the outcome. Replace this placeholder text.",
  },
  {
    title: "Service two",
    body: "A second offering. Keep each card to a single clear promise plus a concrete detail.",
  },
  {
    title: "Service three",
    body: "A third offering. Add or remove cards freely — the grid reflows automatically.",
  },
  {
    title: "Service four",
    body: "Optional fourth card. Use real deliverables and timelines where you can.",
  },
];

export default function ServicesPage() {
  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="max-w-2xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Services
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-fg">
            What we do
          </h1>
          <p className="text-lg text-muted">
            Replace this intro with a one-line framing of how {site.company} helps.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-7 space-y-3"
            >
              <h2 className="text-xl font-semibold text-fg">{s.title}</h2>
              <p className="leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
