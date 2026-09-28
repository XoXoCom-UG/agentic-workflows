"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLang } from "@/lib/i18n";

/**
 * Full-width stat band under the hero grid. Kept OUT of the two-column hero
 * grid so the divider line and the four chips span the whole content width
 * (max-w-7xl) on desktop — otherwise the chips wrap inside the left column
 * and DACH drops onto its own row, which reads as disorganized.
 */
export default function HeroStats() {
  const { c } = useLang();
  const reduce = useReducedMotion();

  return (
    <motion.dl
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="mt-16 md:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-8 border-t border-neutral-200 pt-10"
    >
      {c.hero.chips.map((chip) => (
        <div key={chip.label} className="flex flex-col">
          <dt className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900">
            {chip.label}
          </dt>
          <dd className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            {chip.sub}
          </dd>
        </div>
      ))}
    </motion.dl>
  );
}
