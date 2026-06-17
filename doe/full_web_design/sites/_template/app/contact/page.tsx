import type { Metadata } from "next";
import { site } from "@/lib/config";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: `Contact — ${site.company}`,
  description: `Get in touch with ${site.company}.`,
};

// Default contact fields. Email is always required; "message" renders as a textarea.
const CONTACT_FIELDS = ["first_name", "email", "company", "message"];

export default function ContactPage() {
  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Contact
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-fg">
            Let&apos;s talk
          </h1>
          <p className="text-lg text-muted">
            Tell us what you&apos;re working on. We read every message and reply within
            one business day.
          </p>
          <p className="text-sm text-muted">
            Or email us directly at{" "}
            <a href={`mailto:${site.contact_email}`} className="underline hover:text-fg">
              {site.contact_email}
            </a>
            .
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
          {site.has_contact_form ? (
            <ContactForm fields={CONTACT_FIELDS} />
          ) : (
            <p className="text-muted">
              Reach us at{" "}
              <a
                href={`mailto:${site.contact_email}`}
                className="underline hover:text-fg"
              >
                {site.contact_email}
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
