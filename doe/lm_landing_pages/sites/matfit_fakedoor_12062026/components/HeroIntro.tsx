"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { useLang } from "@/lib/i18n";

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export default function HeroIntro() {
  const { c } = useLang();
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
        className="text-[11px] sm:text-xs font-semibold tracking-[0.22em] uppercase text-green-600"
      >
        {c.hero.eyebrow}
      </motion.p>

      <motion.h1
        variants={item}
        className="mt-6 text-[2.75rem] sm:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-[-0.02em] text-neutral-900 text-balance"
      >
        {c.hero.titleLine1}
        <br />
        <span className="text-green-600">{c.hero.titleAccent}</span>
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-7 text-lg md:text-xl text-neutral-500 max-w-[46ch] leading-[1.55]"
      >
        {c.hero.subPre}
        <span className="font-medium text-neutral-900">{c.hero.subStrong}</span>
      </motion.p>

      <motion.div variants={item} className="mt-9 flex flex-col items-start gap-3">
        <a
          href="#form"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-green-500 to-green-600 px-8 py-4 text-base font-semibold tracking-wide text-white shadow-[0_20px_50px_-15px_rgba(34,197,94,0.55)] transition hover:from-green-400 hover:to-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        >
          {c.hero.cta}
        </a>
        <p className="text-sm text-neutral-500">{c.hero.ctaNote}</p>
      </motion.div>

      <motion.dl
        variants={item}
        className="mt-12 flex flex-wrap gap-x-10 gap-y-6 border-t border-neutral-200 pt-8"
      >
        {c.hero.chips.map((chip) => (
          <div key={chip.label} className="flex flex-col">
            <dt className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">
              {chip.label}
            </dt>
            <dd className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
              {chip.sub}
            </dd>
          </div>
        ))}
      </motion.dl>
    </motion.div>
  );
}
