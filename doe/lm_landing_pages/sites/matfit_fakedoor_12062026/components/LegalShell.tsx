import { site } from "@/lib/config";
import SiteHeader from "@/components/SiteHeader";
import FooterLinks from "@/components/FooterLinks";

type Props = {
  /** Pre-rendered HTML (from a trusted, in-repo Markdown file). */
  html: string;
};

export default function LegalShell({ html }: Props) {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-neutral-950 text-neutral-100">
      <SiteHeader />

      <section className="relative flex-1 px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(163,230,53,0.08),transparent_60%)]"
        />
        <div className="mx-auto max-w-3xl">
          <p className="mb-8 font-mono text-[11px] tracking-[0.22em] uppercase text-lime-300/90">
            Rechtliches
          </p>
          {/* Content is our own trusted Markdown rendered at build time. */}
          <article
            className="legal-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>

      <footer className="border-t border-neutral-900 px-6 md:px-10 lg:px-12 py-10 mt-auto">
        <div className="mx-auto max-w-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <FooterLinks />
          <div
            className="font-mono text-[11px] tracking-[0.16em] text-neutral-700"
            data-signature={site.signature}
          >
            {site.signature}
          </div>
        </div>
      </footer>
    </main>
  );
}
