type Props = {
  /** Pre-rendered HTML from a trusted, in-repo Markdown file (rendered at build time). */
  html: string;
};

/**
 * Chrome for the legal pages. SiteHeader + Footer come from app/layout.tsx,
 * so this only renders the "Rechtliches" eyebrow + the prose article.
 */
export default function LegalShell({ html }: Props) {
  return (
    <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="mb-8 font-mono text-[11px] tracking-[0.22em] uppercase text-accent">
          Rechtliches
        </p>
        {/* Content is our own trusted Markdown rendered at build time, not user input. */}
        <article className="legal-prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}
