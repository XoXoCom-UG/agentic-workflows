import { getCopy } from "@/lib/server-copy";
import SmartLink from "@/components/SmartLink";

export default async function UeberUnsContent() {
  const { c } = await getCopy();
  const t = c.ueberUns;

  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg">{t.title}</h1>
        </header>

        <div className="space-y-5 text-lg leading-relaxed text-muted">
          {t.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="pt-2">
          <SmartLink href="/kontakt" className="inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90">
            {t.cta}
          </SmartLink>
        </div>
      </div>
    </main>
  );
}
