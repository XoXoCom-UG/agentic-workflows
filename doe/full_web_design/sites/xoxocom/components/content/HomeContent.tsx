import { getCopy } from "@/lib/server-copy";
import LazyHero from "@/components/LazyHero";
import SmartLink from "@/components/SmartLink";

export default async function HomeContent() {
  const { c } = await getCopy();
  const t = c.home;

  return (
    <main>
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-28 md:py-36">
        {/* Animated 3D node network — shortest path highlighted in the brand accent.
            Reads CSS tokens at runtime, so it sits seamlessly on the page background. */}
        <LazyHero variant="graph" className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />
        {/* Text-protection scrim: softly darkens the centre so the headline stays crisp
            over the animation, while the network still reads toward the edges. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(46%_56%_at_50%_46%,var(--color-bg)_22%,transparent_82%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-1/3 h-[520px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(251,107,76,0.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl text-center space-y-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.eyebrow}</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight text-fg">
            {t.heroTitlePre}<span className="text-accent">{t.heroTitleAccent}</span>{t.heroTitlePost}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted">{t.heroSub}</p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <SmartLink href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
              {t.ctaPrimary}
            </SmartLink>
            <a href="#leistungen" className="inline-flex items-center rounded-[var(--radius-card)] border border-border px-6 py-3 font-semibold text-fg transition hover:bg-surface">
              {t.ctaSecondary}
            </a>
          </div>
        </div>
      </section>

      {/* Section 2 — Services */}
      <section id="leistungen" className="px-6 md:px-10 lg:px-12 py-20 md:py-28 bg-surface">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.servicesEyebrow}</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-fg">{t.servicesTitle}</h2>
            <p className="mt-4 text-muted">{t.servicesSub}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {t.leistungen.map((l) => (
              <SmartLink key={l.title} href={l.href} className="group flex flex-col rounded-[var(--radius-card)] border border-border bg-bg p-7 transition hover:border-accent/60">
                <h3 className="text-xl font-bold text-fg">{l.title}</h3>
                <p className="mt-1 text-sm font-semibold text-accent">{l.lede}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">{l.body}</p>
                <span className="mt-6 text-sm font-semibold text-fg transition-colors group-hover:text-accent">{t.learnMore}</span>
              </SmartLink>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Latest / MAtfIT */}
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-20 md:py-28">
        {/* Accent hues — soft coral glow to draw the eye and spark curiosity, kept subtle. */}
        <div aria-hidden className="hue-breathe pointer-events-none absolute -left-24 top-4 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.18),transparent_70%)] blur-2xl" />
        <div aria-hidden style={{ animationDelay: "-3.5s" }} className="hue-breathe pointer-events-none absolute -right-20 bottom-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.14),transparent_70%)] blur-2xl" />
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[var(--radius-card)] border border-accent/25 bg-surface/80 p-10 md:p-14 shadow-[0_0_70px_-20px_rgba(251,107,76,0.45)] backdrop-blur-sm">
          {/* Faint inner accent wash for depth. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(251,107,76,0.12),transparent_55%)]" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.newsEyebrow}</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-fg">{t.newsTitle}</h2>
            <p className="mt-5 max-w-2xl text-lg text-muted">{t.newsBody}</p>
            <a href="https://matfit.ai" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
              {t.newsCta}
            </a>
          </div>
        </div>
      </section>

      {/* Section 4 — About teaser */}
      <section className="px-6 md:px-10 lg:px-12 py-20 md:py-28 bg-surface">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">{t.aboutTitle}</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted">{t.aboutBody}</p>
          <SmartLink href="/ueber-uns" className="inline-flex items-center rounded-[var(--radius-card)] border border-border bg-bg px-6 py-3 font-semibold text-fg transition hover:border-accent/60">
            {t.aboutCta}
          </SmartLink>
        </div>
      </section>

      {/* Section 5 — Final CTA */}
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-24 md:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(50%_60%_at_50%_100%,rgba(251,107,76,0.16),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-fg">{t.finalTitle}</h2>
          <p className="text-muted">{t.finalBody}</p>
          <SmartLink href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-7 py-3.5 font-semibold text-accent-fg transition hover:opacity-90">
            {t.finalCta}
          </SmartLink>
        </div>
      </section>
    </main>
  );
}
