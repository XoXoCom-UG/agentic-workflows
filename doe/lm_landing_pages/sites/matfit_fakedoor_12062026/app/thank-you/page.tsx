import { site } from "@/lib/config";

export default function ThankYouPage() {
  return (
    <main className="relative min-h-[100dvh] flex items-center justify-center px-6 py-20 bg-neutral-950 text-neutral-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_20%,rgba(163,230,53,0.12),transparent_65%)]"
      />

      <div className="max-w-lg text-center space-y-6">
        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-lime-300/90">
          MAt<span className="text-lime-300">fIT</span> · Early Access
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-50">
          Du stehst auf der Liste.
        </h1>
        <p className="text-neutral-300 leading-relaxed">
          Danke für dein Interesse an MAtfIT. Wir melden uns bei dir, sobald es
          losgeht — du gehörst zu den Ersten, die dabei sind.
        </p>
        <p className="text-neutral-400">
          Wir haben dir außerdem eine kurze Bestätigung per E-Mail geschickt.
        </p>
        <p
          className="pt-8 font-mono text-[11px] tracking-[0.16em] text-neutral-700"
          data-signature={site.signature}
        >
          {site.signature}
        </p>
      </div>
    </main>
  );
}
