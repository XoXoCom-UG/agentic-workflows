import { getCopy } from "@/lib/server-copy";
import SmartLink from "@/components/SmartLink";

export default async function ProdukteContent() {
  const { c } = await getCopy();
  const t = c.produkte;

  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg">{t.title}</h1>
          <p className="text-lg text-muted">{t.sub}</p>
        </header>

        <div className="mt-12 grid gap-6">
          {t.products.map((p) => (
            <article key={p.title} className="rounded-[var(--radius-card)] border border-border bg-surface p-8 md:p-10">
              <h2 className="text-2xl font-bold text-fg">{p.title}</h2>
              <p className="mt-2 font-semibold text-accent">{p.tagline}</p>
              <p className="mt-4 max-w-2xl text-muted">{p.desc}</p>
              <SmartLink
                href={p.href}
                target={p.external ? "_blank" : undefined}
                rel={p.external ? "noopener noreferrer" : undefined}
                className="mt-7 inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90"
              >
                {p.ctaLabel}
              </SmartLink>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
