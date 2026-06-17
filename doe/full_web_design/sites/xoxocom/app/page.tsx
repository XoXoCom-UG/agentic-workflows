import { site } from "@/lib/config";
import HeroGraph from "@/components/HeroGraph";

const LEISTUNGEN = [
  {
    title: "Business Coaching",
    lede: "Wachstum auf allen Ebenen",
    body: "Wir coachen Teams und Einzelpersonen, um die Lücke zwischen technologischer Innovation und menschlichem Handeln zu schließen. Ob als strategischer Partner für Ihr Unternehmen oder als persönlicher Mentor für Ihre Karriere – wir befähigen Sie, in der neuen Arbeitswelt nicht nur mitzuhalten, sondern voranzugehen.",
    href: "/leistungen/business-coaching",
  },
  {
    title: "Projekteinsätze",
    lede: "Die passenden Puzzleteile für Ihren Projekterfolg",
    body: "Wir finden nicht nur Experten, sondern die passenden Puzzleteile für Ihren Projekterfolg. Wir unterstützen Sie bei der Besetzung kritischer Schlüsselrollen mit Spezialisten, die methodische Exzellenz und technisches Know-how vereinen:",
    roles: ["Agile Coach", "Scrum Master", "Product Owner & Manager", "Software Engineer & Architect", "Projekt Manager & Leiter"],
    href: "/leistungen/expert-consulting",
  },
  {
    title: "A.I. Transformation",
    lede: "Individuell, disruptiv und messbar überlegen",
    body: "Wer heute noch nach starren Lehrbüchern arbeitet, hat morgen schon verloren. Wir bieten keine Lösungen von der Stange, sondern einzigartige Konzepte, die dort ansetzen, wo klassische Agilität an ihre Grenzen stößt. Unsere Agile A.I. Transformation verbindet tiefgreifende Methodik mit der Power künstlicher Intelligenz zu einem hybriden Erfolgsmodell.",
    href: "/leistungen/ai-transformation",
  },
];

export default function Startseite() {
  return (
    <main>
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-28 md:py-36">
        {/* Animated 3D node network — shortest path highlighted in the brand accent.
            Reads CSS tokens at runtime, so it sits seamlessly on the page background. */}
        <HeroGraph className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />
        {/* Text-protection scrim: softly darkens the centre so the headline stays crisp
            over the animation, while the network still reads toward the edges. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(46%_56%_at_50%_46%,var(--color-bg)_22%,transparent_82%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-1/3 h-[520px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(251,107,76,0.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl text-center space-y-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{site.company}</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight text-fg">
            Moderne Arbeitsweisen und <span className="text-accent">A.I.</span> gewinnbringend vereinen
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted">
            Wir verbinden agile Methodik mit künstlicher Intelligenz – damit Teams und Unternehmen schneller, klüger und messbar überlegen arbeiten.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
              Kontakt aufnehmen
            </a>
            <a href="#leistungen" className="inline-flex items-center rounded-[var(--radius-card)] border border-border px-6 py-3 font-semibold text-fg transition hover:bg-surface">
              Unsere Leistungen
            </a>
          </div>
        </div>
      </section>

      {/* Section 2 — Unsere Leistungen */}
      <section id="leistungen" className="px-6 md:px-10 lg:px-12 py-20 md:py-28 bg-surface">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Was wir tun</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-fg">Unsere Leistungen</h2>
            <p className="mt-4 text-muted">Ein Überblick über die Bereiche, in denen wir Teams und Unternehmen begleiten.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {LEISTUNGEN.map((l) => (
              <a key={l.title} href={l.href} className="group flex flex-col rounded-[var(--radius-card)] border border-border bg-bg p-7 transition hover:border-accent/60">
                <h3 className="text-xl font-bold text-fg">{l.title}</h3>
                <p className="mt-1 text-sm font-semibold text-accent">{l.lede}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">{l.body}</p>
                {l.roles && (
                  <ul className="mt-4 space-y-1.5">
                    {l.roles.map((r) => (
                      <li key={r} className="flex items-center gap-2 text-sm text-fg">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {r}
                      </li>
                    ))}
                  </ul>
                )}
                <span className="mt-6 text-sm font-semibold text-fg transition-colors group-hover:text-accent">Mehr erfahren →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Aktuelles / MAtfIT */}
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-20 md:py-28">
        {/* Accent hues — soft coral glow to draw the eye and spark curiosity, kept subtle. */}
        <div aria-hidden className="hue-breathe pointer-events-none absolute -left-24 top-4 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.18),transparent_70%)] blur-2xl" />
        <div aria-hidden style={{ animationDelay: "-3.5s" }} className="hue-breathe pointer-events-none absolute -right-20 bottom-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.14),transparent_70%)] blur-2xl" />
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[var(--radius-card)] border border-accent/25 bg-surface/80 p-10 md:p-14 shadow-[0_0_70px_-20px_rgba(251,107,76,0.45)] backdrop-blur-sm">
          {/* Faint inner accent wash for depth. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(251,107,76,0.12),transparent_55%)]" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Aktuelles</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-fg">MAtfIT</h2>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              Wir entwickeln einen A.I. Transformation Coach, der jedes Dev-Team mit Zeitersparnis, Optimierungsideen sowie Beratung zu Innovationen und Markttrends bereichert.
            </p>
            <a href="https://matfit.ai" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
              Jetzt probieren
            </a>
          </div>
        </div>
      </section>

      {/* Section 4 — Über uns teaser */}
      <section className="px-6 md:px-10 lg:px-12 py-20 md:py-28 bg-surface">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">Ein junges Team mit großem Anspruch</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted">
            Wir sind ein junges Team, das sich auf die wirtschaftliche und technische Beratung von A.I.-Implementierung spezialisiert hat.
          </p>
          <a href="/ueber-uns" className="inline-flex items-center rounded-[var(--radius-card)] border border-border bg-bg px-6 py-3 font-semibold text-fg transition hover:border-accent/60">
            Lerne uns kennen
          </a>
        </div>
      </section>

      {/* Section 5 — Final CTA */}
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-24 md:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(50%_60%_at_50%_100%,rgba(251,107,76,0.16),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-fg">Lass uns zusammenarbeiten</h2>
          <p className="text-muted">Erzähl uns von deinem Vorhaben – wir melden uns innerhalb eines Werktags.</p>
          <a href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-7 py-3.5 font-semibold text-accent-fg transition hover:opacity-90">
            Lass uns zusammenarbeiten
          </a>
        </div>
      </section>
    </main>
  );
}
