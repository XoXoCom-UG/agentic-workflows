"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLang } from "@/lib/i18n";

export default function ValueProps() {
  const { c } = useLang();
  const reduce = useReducedMotion();

  return (
    <section
      id="features"
      className="relative px-6 md:px-10 lg:px-12 pt-16 md:pt-24 pb-24 md:pb-32"
    >
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl mb-16 md:mb-20">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-green-600">
            {c.valueProps.eyebrow}
          </p>
          <h2 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-neutral-900">
            {c.valueProps.titlePre}
            <span className="text-green-600">{c.valueProps.titleAccent}</span>.
          </h2>
          <p className="mt-5 text-base md:text-lg text-neutral-500 max-w-[54ch] leading-relaxed">
            {c.valueProps.sub}
          </p>
        </header>

        <ol className="divide-y divide-neutral-200">
          {c.valueProps.items.map((p, idx) => (
            <motion.li
              key={p.number}
              className="group"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={reduce ? undefined : { scale: 1.015 }}
              viewport={{ once: true, amount: 0.4, margin: "0px 0px -40px 0px" }}
              transition={{
                duration: 0.6,
                delay: Math.min(idx * 0.04, 0.16),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-y-2 gap-x-8 -mx-4 md:-mx-6 px-4 md:px-6 py-6 md:py-8 rounded-2xl transition-colors duration-300 group-hover:bg-neutral-50 group-hover:shadow-[0_18px_50px_-24px_rgba(34,197,94,0.3)]">
                <div className="md:col-span-1 text-sm font-semibold text-green-600 tabular-nums">
                  {p.number}
                </div>
                <h3 className="md:col-span-4 text-xl md:text-2xl font-medium tracking-tight text-neutral-900">
                  {p.title}
                </h3>
                <p className="md:col-span-7 text-[15px] md:text-base text-neutral-500 leading-snug transition-colors duration-300 group-hover:text-neutral-700">
                  {p.body}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
