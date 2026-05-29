"use client";

import { motion, useReducedMotion } from "motion/react";

type Concept = {
  number: string;
  title: string;
  tease: string;
};

const concepts: Concept[] = [
  {
    number: "01",
    title: "The Core Agent Loop",
    tease: "What every AI agent has that ChatGPT doesn't.",
  },
  {
    number: "02",
    title: "The DOE Framework",
    tease: "Three layers under every reliable agent. Skip one and it drifts.",
  },
  {
    number: "03",
    title: "MCP",
    tease: "Custom integrations are dead. One protocol. Every tool you already use.",
  },
  {
    number: "04",
    title: "Web scraping for product folks",
    tease: "Walk into refinement with 80 real-user quotes instead of three Slack threads.",
  },
  {
    number: "05",
    title: "Self-annealing",
    tease: "Why senior devs ship an agent on Monday and never touch it again.",
  },
];

export default function ConceptsSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="whats-inside"
      className="relative px-6 md:px-10 lg:px-12 pt-28 md:pt-36 pb-32 md:pb-40"
    >
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl mb-16 md:mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.05] text-zinc-50">
            Five ideas. Two perspectives.
          </h2>
          <p className="mt-5 text-base md:text-lg text-zinc-400 max-w-[52ch] leading-relaxed">
            PM version on one page, PO version on the other. Here is what each
            covers.
          </p>
        </header>

        <ol className="divide-y divide-zinc-800/80">
          {concepts.map((c, idx) => (
            <motion.li
              key={c.number}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4, margin: "0px 0px -40px 0px" }}
              transition={{
                duration: 0.6,
                delay: Math.min(idx * 0.04, 0.16),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-y-2 gap-x-8 py-6 md:py-8">
                <div className="md:col-span-1 font-mono text-sm text-amber-400/90 tabular-nums">
                  {c.number}
                </div>
                <h3 className="md:col-span-6 text-xl md:text-2xl font-medium tracking-tight text-zinc-50">
                  {c.title}
                </h3>
                <p className="md:col-span-5 text-[15px] md:text-base text-zinc-400 leading-snug">
                  {c.tease}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
