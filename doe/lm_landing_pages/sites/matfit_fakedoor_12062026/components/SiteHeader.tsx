"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

export default function SiteHeader() {
  const { c } = useLang();
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
          ? "border-b border-neutral-200/80 bg-white/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12 py-5 grid grid-cols-[1fr_auto_1fr] items-center">
        <div aria-hidden="true" />
        <a
          href="/"
          aria-label={c.header.homeAria}
          className="justify-self-center text-lg font-bold tracking-tight text-neutral-900"
        >
          matfit<span className="text-green-600">.ai</span>
        </a>
        <LangToggle className="justify-self-end" />
      </div>
    </header>
  );
}
