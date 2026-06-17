type Props = {
  className?: string;
};

/** Legal + home navigation. German labels are required for the legal links (§5 DDG / GDPR). */
export default function FooterLinks({ className }: Props) {
  return (
    <nav
      aria-label="Rechtliches"
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted ${className ?? ""}`}
    >
      <a href="/impressum" className="transition-colors hover:text-fg">
        Impressum
      </a>
      <span aria-hidden="true" className="opacity-50">
        ·
      </span>
      <a href="/datenschutz" className="transition-colors hover:text-fg">
        Datenschutz
      </a>
      <span aria-hidden="true" className="opacity-50">
        ·
      </span>
      <a href="/" className="transition-colors hover:text-fg">
        Startseite
      </a>
    </nav>
  );
}
