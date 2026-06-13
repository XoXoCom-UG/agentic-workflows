import { site } from "@/lib/config";
import SiteHeader from "@/components/SiteHeader";
import HeroIntro from "@/components/HeroIntro";
import HeroMockup from "@/components/HeroMockup";
import ValueProps from "@/components/ValueProps";
import LeadForm from "@/components/LeadForm";
import FooterLinks from "@/components/FooterLinks";

export default function Page() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-neutral-950 text-neutral-100">
      {/* HEADER (sticky, translucent on scroll) =========================== */}
      <SiteHeader />

      {/* HERO ============================================================== */}
      <section className="relative isolate overflow-hidden flex items-center">
        {/* Background: top-left lime radial glow + faint grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_15%_0%,rgba(163,230,53,0.12),transparent_60%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px]"
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 pt-16 md:pt-24 pb-20 md:pb-28">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 md:gap-x-16 items-start">
            <HeroIntro />
            <HeroMockup />
          </div>
        </div>

        {/* Bottom-edge fade into the next section */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 z-[2] bg-gradient-to-b from-transparent to-neutral-950"
        />
      </section>

      {/* VALUE PROPS ====================================================== */}
      <ValueProps />

      {/* SIGN-UP / FAKE DOOR ============================================= */}
      <section
        id="form"
        className="relative scroll-mt-20 px-6 md:px-10 lg:px-12 pb-28 md:pb-36"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(163,230,53,0.10),transparent_65%)]"
        />
        <div className="mx-auto max-w-xl">
          <div className="text-center mb-8">
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-lime-300/90">
              Early Access
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-neutral-50">
              Sichere dir den{" "}
              <span className="font-serif italic text-lime-300">Frühzugang</span>.
            </h2>
            <p className="mt-4 text-base text-neutral-400 leading-relaxed">
              Trag dich ein — wir melden uns, sobald MAtfIT startet. Du gehörst
              zu den Ersten, die ihre KI-Transformation mit MAtfIT angehen.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6 md:p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <LeadForm fields={site.fields} submitLabel="Auf die Liste setzen" />
            <p className="mt-4 text-[12px] leading-relaxed text-neutral-500">
              Kein Spam. Nur eine Nachricht zum Launch. Abmeldung jederzeit
              möglich.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER =========================================================== */}
      <footer className="border-t border-neutral-900 px-6 md:px-10 lg:px-12 py-10 mt-auto">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm">
          <div className="text-neutral-500">
            © {new Date().getFullYear()} {site.company} · XoXoCom UG
          </div>
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
