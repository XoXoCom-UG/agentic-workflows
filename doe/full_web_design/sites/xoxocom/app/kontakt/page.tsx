import type { Metadata } from "next";
import { site } from "@/lib/config";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: `Kontakt — ${site.company}`,
  description: "Nimm Kontakt mit XoXoCom UG auf — wir melden uns innerhalb eines Werktags.",
};

export default function KontaktPage() {
  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-start">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Kontakt</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg">Lass uns sprechen</h1>
          <p className="text-lg text-muted">
            Erzähl uns von deinem Vorhaben – ob Coaching, Projekteinsatz oder A.I. Transformation.
            Wir lesen jede Nachricht und antworten innerhalb eines Werktags.
          </p>
          <div className="space-y-2 pt-2 text-sm">
            <p className="text-muted">
              E-Mail:{" "}
              <a href={`mailto:${site.contact_email}`} className="text-fg underline hover:text-accent">{site.contact_email}</a>
            </p>
            <p className="text-muted">
              Vollständige Anschrift und rechtliche Angaben findest du im{" "}
              <a href="/impressum" className="text-fg underline hover:text-accent">Impressum</a>.
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
