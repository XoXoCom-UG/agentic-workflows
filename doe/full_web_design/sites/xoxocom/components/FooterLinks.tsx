type Props = {
  className?: string;
};

/** Legal navigation (German): Impressum · AGB · Datenschutz. Required §5 DDG / GDPR. */
export default function FooterLinks({ className }: Props) {
  const items = [
    { href: "/impressum", label: "Impressum" },
    { href: "/agb", label: "AGB" },
    { href: "/datenschutz", label: "Datenschutz" },
  ];
  return (
    <nav aria-label="Rechtliches" className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted ${className ?? ""}`}>
      {items.map((it, i) => (
        <span key={it.href} className="flex items-center gap-x-4">
          <a href={it.href} className="transition-colors hover:text-fg">
            {it.label}
          </a>
          {i < items.length - 1 && <span aria-hidden="true" className="opacity-40">·</span>}
        </span>
      ))}
    </nav>
  );
}
