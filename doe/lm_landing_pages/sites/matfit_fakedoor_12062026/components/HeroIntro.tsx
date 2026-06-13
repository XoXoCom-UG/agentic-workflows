"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const chips: { label: string; sub: string }[] = [
  { label: "Ein Tool", sub: "statt vieler" },
  { label: "DACH", sub: "Markt-Fokus" },
  { label: "Roadmaps", sub: "KI-gestützt" },
];

export default function HeroIntro() {
  const reduce = useReducedMotion();
  const initial = reduce ? "shown" : "hidden";

  return (
    <motion.div
      className="md:col-span-6"
      variants={container}
      initial={initial}
      animate="shown"
    >
      <motion.p
        variants={item}
        className="font-mono text-[11px] sm:text-xs tracking-[0.22em] uppercase text-lime-300/90"
      >
        Dein KI-Coach für die IT-Transformation
      </motion.p>

      <motion.h1
        variants={item}
        className="mt-6 text-[2.75rem] sm:text-5xl lg:text-6xl font-semibold uppercase leading-[0.98] tracking-[-0.02em] text-neutral-50 text-balance"
      >
        Starte deine
        <br />
        <span className="text-lime-300">KI-Transformation</span>
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-7 text-lg md:text-xl text-neutral-300 max-w-[46ch] leading-[1.55]"
      >
        MAtfIT ist dein KI-Coach für IT-Transformation — fundierte, auf dein
        Projekt & Team zugeschnittene Beratung. Von der Tech-Stack-Analyse bis zur
        umsetzbaren Roadmap.{" "}
        <span className="text-neutral-100">Ein Tool statt vieler.</span>
      </motion.p>

      <motion.div variants={item} className="mt-9 flex flex-col items-start gap-3">
        <a
          href="#form"
          className="inline-flex items-center justify-center rounded-xl bg-lime-400 px-8 py-4 text-base font-semibold tracking-wide text-neutral-950 shadow-[0_20px_50px_-15px_rgba(163,230,53,0.55)] transition hover:bg-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
        >
          Jetzt Frühzugang sichern
        </a>
        <p className="text-sm text-neutral-400">
          Sichere dir deinen Platz auf der Early-Access-Liste.
        </p>
      </motion.div>

      <motion.dl
        variants={item}
        className="mt-12 flex flex-wrap gap-x-10 gap-y-6 border-t border-neutral-800/80 pt-8"
      >
        {chips.map((c) => (
          <div key={c.label} className="flex flex-col">
            <dt className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-50">
              {c.label}
            </dt>
            <dd className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
              {c.sub}
            </dd>
          </div>
        ))}
      </motion.dl>
    </motion.div>
  );
}
