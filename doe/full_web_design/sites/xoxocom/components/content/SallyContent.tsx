import { getCopy } from "@/lib/server-copy";
import SmartLink from "@/components/SmartLink";
import SallyStage from "@/components/sally/SallyStage";

export default async function SallyContent() {
  const { c, lang } = await getCopy();
  const t = c.sally;

  return (
    <main>
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 pt-10 pb-20 md:pt-14 md:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-1/3 h-[560px] bg-[radial-gradient(55%_60%_at_60%_0%,rgba(251,107,76,0.16),transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.eyebrow}</p>
          <div className="mt-6">
            <SallyStage t={t} lang={lang} />
          </div>
        </div>
      </section>

      <section id="warum-sally" className="scroll-mt-20 border-t border-border px-6 md:px-10 lg:px-12 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.why.eyebrow}</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-fg">{t.why.title}</h2>
            <p className="mt-4 text-lg text-muted">{t.why.sub}</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.why.points.map((p, i) => (
              <article key={p.title} className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
                <span className="text-sm font-bold text-accent">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-bold text-fg">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </article>
            ))}
          </div>
          <SmartLink
            href="https://agentix-projects.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90"
          >
            {t.why.cta}
          </SmartLink>
        </div>
      </section>
    </main>
  );
}
