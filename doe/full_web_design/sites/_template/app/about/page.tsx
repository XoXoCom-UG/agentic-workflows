import type { Metadata } from "next";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: `About — ${site.company}`,
  description: `About ${site.company}.`,
};

export default function AboutPage() {
  return (
    <main className="px-6 md:px-10 lg:px-12 py-20 md:py-28">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            About
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-fg">
            We&apos;re {site.company}.
          </h1>
        </header>

        <div className="space-y-5 text-lg leading-relaxed text-muted">
          <p>
            Replace this with your story: why the company exists, the problem it
            solves, and who it serves. Keep it concrete — specifics beat adjectives.
          </p>
          <p>
            Add a second paragraph on your approach or principles. The two-column
            stats row below is optional — delete it or fill it with real numbers.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4 pt-4">
          {[
            ["2019", "Founded"],
            ["120+", "Projects"],
            ["12", "Team"],
            ["4.9★", "Rating"],
          ].map(([stat, label]) => (
            <div key={label} className="space-y-1">
              <dd className="text-3xl font-semibold text-fg">{stat}</dd>
              <dt className="text-sm text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
