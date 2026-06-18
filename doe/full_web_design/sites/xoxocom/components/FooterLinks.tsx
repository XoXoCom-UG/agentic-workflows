import SmartLink from "@/components/SmartLink";

type Props = {
  className?: string;
  ariaLabel?: string;
};

/** Legal navigation: Impressum · AGB · Datenschutz. Labels stay German (the legal
 *  pages are German for legal validity); only the nav's aria-label localizes.
 *  Required §5 DDG / GDPR. */
export default function FooterLinks({ className, ariaLabel = "Rechtliches" }: Props) {
  const items = [
    { href: "/impressum", label: "Impressum" },
    { href: "/agb", label: "AGB" },
    { href: "/datenschutz", label: "Datenschutz" },
  ];
  return (
    <nav aria-label={ariaLabel} className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted ${className ?? ""}`}>
      {items.map((it, i) => (
        <span key={it.href} className="flex items-center gap-x-4">
          <SmartLink href={it.href} className="transition-colors hover:text-fg">
            {it.label}
          </SmartLink>
          {i < items.length - 1 && <span aria-hidden="true" className="opacity-40">·</span>}
        </span>
      ))}
    </nav>
  );
}
