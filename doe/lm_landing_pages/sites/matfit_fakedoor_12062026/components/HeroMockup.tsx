"use client";

import { motion, useReducedMotion } from "motion/react";

export default function HeroMockup() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="md:col-span-6 relative md:mt-20 lg:mt-24"
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Lime glow behind the frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_60%_40%,rgba(163,230,53,0.18),transparent_70%)] blur-2xl"
      />

      {/* Browser frame */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/60 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-neutral-800/70 bg-neutral-900/80 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-neutral-700" />
          <span className="h-3 w-3 rounded-full bg-neutral-700" />
          <span className="h-3 w-3 rounded-full bg-lime-400/70" />
          <span className="ml-3 font-mono text-[11px] tracking-wide text-neutral-500">
            matfit.app
          </span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/product-mockup.png"
          alt="MAtfIT Produkt-Oberfläche: stelle jede Frage zu SaaS, KI und DACH-Strategie"
          className="block w-full"
          width={1105}
          height={588}
          loading="eager"
        />
      </div>
    </motion.div>
  );
}
