"use client";

import { useEffect, useState } from "react";

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
          ? "border-b border-neutral-800/70 bg-neutral-950/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12 py-5 flex items-center justify-center">
        <a
          href="/"
          aria-label="MAtfIT"
          className="font-mono text-lg font-bold tracking-[0.18em] text-neutral-50"
        >
          MAt<span className="text-lime-300">fIT</span>
        </a>
      </div>
    </header>
  );
}
