type Props = {
  className?: string;
};

export default function FooterLinks({ className }: Props) {
  return (
    <nav
      aria-label="Rechtliches"
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 ${className ?? ""}`}
    >
      <a href="/impressum" className="transition-colors hover:text-lime-300">
        Impressum
      </a>
      <span aria-hidden="true" className="text-neutral-700">
        ·
      </span>
      <a href="/datenschutz" className="transition-colors hover:text-lime-300">
        Datenschutz
      </a>
      <span aria-hidden="true" className="text-neutral-700">
        ·
      </span>
      <a href="/" className="transition-colors hover:text-lime-300">
        Startseite
      </a>
    </nav>
  );
}
