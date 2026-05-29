import { site } from "@/lib/config";
import HeroVideo from "@/components/HeroVideo";
import LeadForm from "@/components/LeadForm";
import ConceptsSection from "@/components/ConceptsSection";
import HeroIntro from "@/components/HeroIntro";

export default function Page() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-zinc-950 text-zinc-100">
      {/* HERO ============================================================= */}
      <section className="relative isolate overflow-hidden min-h-[100dvh] flex items-center">
        {/* Layer 1: video */}
        {site.hero_video ? <HeroVideo src={site.hero_video} /> : null}

        {/* Layer 2: additional scrim on top of HeroVideo's bg-black/40
            Stronger on the left where copy sits, softer on the right where the form sits.
            Gradient overlay improves legibility without flattening the video. */}
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-r from-zinc-950/90 via-zinc-950/70 to-zinc-950/60"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-b from-zinc-950/40 via-transparent to-zinc-950/80"
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-12 pt-24 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-end">
            {/* Left: copy column (7 of 12) */}
            <HeroIntro
              eyebrowBrand={site.company}
              eyebrowLabel="One-page cheat sheets"
            />

            {/* Right: form column (5 of 12) */}
            <aside className="md:col-span-5">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-md p-6 md:p-7 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
                <LeadForm
                  fields={site.fields}
                  submitLabel="Get the cheat sheets"
                />

                <p className="mt-4 text-[12px] text-zinc-500 leading-relaxed">
                  One page per role. Six minutes to read. Designed to print and tape
                  next to your monitor.
                </p>
              </div>
            </aside>
          </div>
        </div>

        {/* Bottom-edge fade so the section transitions smoothly into the next */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 z-[2] bg-gradient-to-b from-transparent to-zinc-950 pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* BELOW-FOLD ======================================================= */}
      <ConceptsSection />

      {/* FOOTER =========================================================== */}
      <footer className="border-t border-zinc-900 px-6 md:px-10 lg:px-12 py-10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm">
          <div className="text-zinc-500">
            © {new Date().getFullYear()} {site.company}. All rights reserved.
          </div>
          <div
            className="font-mono text-[11px] tracking-[0.16em] text-zinc-600"
            data-signature={site.signature}
          >
            {site.signature}
          </div>
        </div>
      </footer>
    </main>
  );
}
