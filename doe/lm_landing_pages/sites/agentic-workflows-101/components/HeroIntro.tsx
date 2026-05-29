"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

type Props = {
  eyebrowBrand: string;
  eyebrowLabel: string;
};

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export default function HeroIntro({ eyebrowBrand, eyebrowLabel }: Props) {
  const reduce = useReducedMotion();
  const initial = reduce ? "shown" : "hidden";

  return (
    <motion.div
      className="md:col-span-7"
      variants={container}
      initial={initial}
      animate="shown"
    >
      <motion.p
        variants={item}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.18em] uppercase text-zinc-400"
      >
        <span className="text-amber-400/90">{eyebrowBrand}</span>
        <span className="text-zinc-700" aria-hidden="true">/</span>
        <span>{eyebrowLabel}</span>
      </motion.p>

      <motion.h1
        variants={item}
        className="mt-6 text-[2.5rem] leading-[1.05] md:text-6xl lg:text-[4.25rem] lg:leading-[1.04] font-medium tracking-[-0.022em] text-zinc-50 max-w-[14ch]"
      >
        Speak <span className="italic text-amber-300/90">fluent</span> AI with your eng team.
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-7 text-lg md:text-xl text-zinc-300 max-w-[44ch] leading-[1.5]"
      >
        Two one-pagers that translate the agentic-workflows stack into the
        language you speak in sprint planning.{" "}
        <span className="text-zinc-100">One for PMs.</span>{" "}
        <span className="text-zinc-100">One for POs.</span>
      </motion.p>
    </motion.div>
  );
}
