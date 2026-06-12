"use client";

import { motion, useReducedMotion } from "motion/react";

type Prop = {
  number: string;
  title: string;
  body: string;
};

const props: Prop[] = [
  {
    number: "01",
    title: "Tech-Stack-Analyse",
    body: "Analysiere deinen Tech-Stack hinsichtlich aktueller KI-Implementierung — und entdecke, wo der größte Hebel liegt.",
  },
  {
    number: "02",
    title: "Trend-Abgleich",
    body: "Abgleich mit aktuellen und zukünftigen Trends im Markt. Bleib deinen Wettbewerbern einen Schritt voraus.",
  },
  {
    number: "03",
    title: "Umsetzung nach Business Value",
    body: "Plane deine Umsetzung priorisiert nach echtem Business Value — nicht nach dem lautesten Hype.",
  },
  {
    number: "04",
    title: "Stories & Teilschritte",
    body: "Heruntergebrochen auf konkrete Stories und Teilschritte, die dein Team sofort einplanen kann.",
  },
  {
    number: "05",
    title: "Requirements-Prüfung",
    body: "Aufwandsschätzung, Manpower, Know-how, Technik und Budget — vorab geprüft, bevor du startest.",
  },
];

export default function ValueProps() {
  const reduce = useReducedMotion();

  return (
    <section
      id="features"
      className="relative px-6 md:px-10 lg:px-12 pt-16 md:pt-24 pb-24 md:pb-32"
    >
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl mb-16 md:mb-20">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-lime-300/90">
            Ein Coach. Der gesamte Pfad.
          </p>
          <h2 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.05] text-neutral-50">
            Von der Analyse bis zur{" "}
            <span className="font-serif italic text-lime-300">Umsetzung</span>.
          </h2>
          <p className="mt-5 text-base md:text-lg text-neutral-400 max-w-[54ch] leading-relaxed">
            MAtfIT begleitet dich Schritt für Schritt durch deine
            KI-Transformation — fundiert, konkret und auf dein Unternehmen
            zugeschnitten.
          </p>
        </header>

        <ol className="divide-y divide-neutral-800/80">
          {props.map((p, idx) => (
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
              <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-y-2 gap-x-8 -mx-4 md:-mx-6 px-4 md:px-6 py-6 md:py-8 rounded-2xl transition-colors duration-300 group-hover:bg-neutral-900/50 group-hover:shadow-[0_18px_50px_-24px_rgba(163,230,53,0.35)]">
                <div className="md:col-span-1 font-mono text-sm text-lime-300/90 tabular-nums">
                  {p.number}
                </div>
                <h3 className="md:col-span-4 text-xl md:text-2xl font-medium tracking-tight text-neutral-50">
                  {p.title}
                </h3>
                <p className="md:col-span-7 text-[15px] md:text-base text-neutral-400 leading-snug transition-colors duration-300 group-hover:text-neutral-300">
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
