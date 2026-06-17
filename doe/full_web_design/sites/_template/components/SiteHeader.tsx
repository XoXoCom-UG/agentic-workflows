"use client";

import { useEffect, useState } from "react";
import { site, nav } from "@/lib/config";

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12 py-5 flex items-center justify-between gap-6">
        <a
          href="/"
          aria-label={site.company}
          className="text-lg font-semibold tracking-tight text-fg"
        >
          {site.company}
        </a>

        <nav
          aria-label="Primary"
          className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-medium text-muted"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-fg"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
