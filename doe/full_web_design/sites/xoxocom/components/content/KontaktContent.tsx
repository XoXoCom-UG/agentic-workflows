import { site } from "@/lib/config";
import { getCopy } from "@/lib/server-copy";
import ContactForm from "@/components/ContactForm";
import SmartLink from "@/components/SmartLink";

export default async function KontaktContent() {
  const { c } = await getCopy();
  const t = c.kontakt;

  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-start">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg">{t.title}</h1>
          <p className="text-lg text-muted">{t.intro}</p>
          <div className="space-y-2 pt-2 text-sm">
            <p className="text-muted">
              {t.emailLabel}{" "}
              <a href={`mailto:${site.contact_email}`} className="text-fg underline hover:text-accent">{site.contact_email}</a>
            </p>
            <p className="text-muted">
              {t.impressumPre}
              <SmartLink href="/impressum" className="text-fg underline hover:text-accent">{t.impressumLink}</SmartLink>.
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
          <ContactForm t={c.contact} />
        </div>
      </div>
    </main>
  );
}
