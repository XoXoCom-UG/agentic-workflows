"use client";

import { useLang } from "@/lib/i18n";

type Props = {
  className?: string;
};

export default function FooterLinks({ className }: Props) {
  const { c } = useLang();
  return (
    <nav
      aria-label={c.footer.legalAria}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 ${className ?? ""}`}
    >
      <a href="/impressum" className="transition-colors hover:text-green-600">
        {c.footer.impressum}
      </a>
      <span aria-hidden="true" className="text-neutral-300">
        ·
      </span>
      <a href="/datenschutz" className="transition-colors hover:text-green-600">
        {c.footer.datenschutz}
      </a>
      <span aria-hidden="true" className="text-neutral-300">
        ·
      </span>
      <a href="/" className="transition-colors hover:text-green-600">
        {c.footer.home}
      </a>
    </nav>
  );
}
