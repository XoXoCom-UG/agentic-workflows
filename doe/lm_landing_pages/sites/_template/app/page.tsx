import { site } from "@/lib/config";
import HeroVideo from "@/components/HeroVideo";
import LeadForm from "@/components/LeadForm";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col">
      <section className="relative flex-1 flex items-center justify-center px-6 py-20 overflow-hidden">
        {site.hero_video ? <HeroVideo src={site.hero_video} /> : null}

        <div className="relative z-10 w-full max-w-5xl grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-widest opacity-70">
              {site.company}
            </p>
            <h1 className="text-4xl md:text-6xl font-semibold leading-tight tracking-tight">
              {site.lead_magnet_title}
            </h1>
            <p className="text-lg opacity-80 max-w-md">
              Drop your details, and we&apos;ll send {site.lead_magnet_title} straight to your inbox.
            </p>
          </div>

          <div className="bg-white/95 dark:bg-black/70 backdrop-blur rounded-2xl p-6 md:p-8 shadow-xl">
            <LeadForm fields={site.fields} />
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs opacity-60">
        <span>© {new Date().getFullYear()} {site.company}</span>
        <span className="mx-2">·</span>
        <span data-signature={site.signature}>{site.signature}</span>
      </footer>
    </main>
  );
}
