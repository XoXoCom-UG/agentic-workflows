import { site } from "@/lib/config";

const FEATURES = [
  {
    title: "Clear positioning",
    body: "Lead with the one outcome you deliver. Replace this with the concrete result a visitor gets.",
  },
  {
    title: "Built to convert",
    body: "Every page points toward a single next step. Swap in your own proof, numbers, and specifics.",
  },
  {
    title: "Fast and accessible",
    body: "Statically rendered, responsive, and WCAG-minded out of the box. Edit freely — structure holds.",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="px-6 md:px-10 lg:px-12 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            {site.company}
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight tracking-tight text-fg">
            {site.tagline}
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted">
            This is the template home page. Replace this paragraph with a sharp,
            specific summary of what {site.company} does and for whom.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href="/contact"
              className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90"
            >
              Get in touch
            </a>
            <a
              href="/services"
              className="inline-flex items-center rounded-[var(--radius-card)] border border-border px-6 py-3 font-semibold text-fg transition hover:bg-surface"
            >
              What we do
            </a>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24 bg-surface">
        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[var(--radius-card)] border border-border bg-bg p-7 space-y-3"
            >
              <h2 className="text-lg font-semibold text-fg">{f.title}</h2>
              <p className="text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg">
            Ready to start?
          </h2>
          <p className="text-muted">
            Tell us what you&apos;re building. We&apos;ll get back to you within one business day.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90"
          >
            Contact {site.company}
          </a>
        </div>
      </section>
    </main>
  );
}
