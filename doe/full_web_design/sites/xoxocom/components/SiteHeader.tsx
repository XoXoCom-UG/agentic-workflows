"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/config";
import type { Copy, NavItem } from "@/lib/copy";
import LangToggle from "@/components/LangToggle";
import SmartLink from "@/components/SmartLink";

// All copy arrives as props from the server-rendered layout (in the language the
// cookie selected), so the bilingual copy tree stays out of the client bundle.
// After a toggle the provider's router.refresh() re-renders the layout server-side,
// which supplies fresh props in the new language.
type SiteHeaderProps = {
  nav: NavItem[];
  header: Copy["header"];
  cta: Copy["cta"];
  langToggle: Copy["langToggle"];
};

function DesktopNavEntry({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);

  if (!item.children) {
    return (
      <SmartLink href={item.href ?? "#"} className="px-1 py-2 text-sm font-medium text-muted transition-colors hover:text-fg">
        {item.label}
      </SmartLink>
    );
  }

  const chevron = (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
  const triggerClass = "flex items-center gap-1 px-1 py-2 text-sm font-medium text-muted transition-colors hover:text-fg";

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      {item.href ? (
        <SmartLink href={item.href} aria-haspopup="true" aria-expanded={open} className={triggerClass}>
          {item.label}
          {chevron}
        </SmartLink>
      ) : (
        <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)} className={triggerClass}>
          {item.label}
          {chevron}
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full pt-2 z-50">
          <div className="min-w-[260px] rounded-[var(--radius-card)] border border-border bg-surface p-2 shadow-2xl shadow-black/40">
            {item.children.map((c) => (
              <SmartLink
                key={c.href}
                href={c.href}
                target={c.external ? "_blank" : undefined}
                rel={c.external ? "noopener noreferrer" : undefined}
                className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-bg"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                  {c.label}
                  {c.external && (
                    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" className="text-muted">
                      <path d="M3.5 3.5h5v5M8.5 3.5L3.5 8.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {c.desc && <span className="mt-0.5 block text-xs text-muted">{c.desc}</span>}
              </SmartLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader({ nav, header, cta, langToggle }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-close the mobile menu once the viewport grows to the desktop breakpoint.
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || mobileOpen ? "border-b border-border bg-bg/85 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12 py-4 flex items-center justify-between gap-6">
        <SmartLink href="/" aria-label={`${site.company} — ${header.homeAria}`} className="text-lg font-extrabold tracking-tight text-fg" onClick={close}>
          Xo<span className="text-accent">Xo</span>Com
        </SmartLink>

        {/* Desktop navigation */}
        <nav aria-label={header.navAria} className="hidden md:flex items-center gap-7">
          {nav.map((item) => (
            <DesktopNavEntry key={item.label} item={item} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Language toggle lives only in the header — at every breakpoint
              (desktop, split, mobile). It is deliberately NOT repeated in the
              mobile hamburger menu. */}
          <LangToggle t={langToggle} />
          <SmartLink
            href={cta.href}
            className="hidden md:inline-flex items-center rounded-[var(--radius-card)] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90"
          >
            {cta.label}
          </SmartLink>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-fg transition-colors hover:bg-surface"
            aria-label={mobileOpen ? header.menuClose : header.menuOpen}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3.5 7h17M3.5 12h17M3.5 17h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-border bg-bg/95 backdrop-blur-md">
          <nav aria-label={header.mobileNavAria} className="mx-auto max-w-7xl px-6 py-5 flex flex-col">
            {nav.map((item) => (
              <div key={item.label} className="border-b border-border/60 py-2 last:border-0">
                {item.href ? (
                  <SmartLink href={item.href} onClick={close} className="block py-2 text-base font-semibold text-fg">
                    {item.label}
                  </SmartLink>
                ) : (
                  <p className="py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                )}
                {item.children && (
                  <div className="ml-1 flex flex-col border-l border-border pl-4">
                    {item.children.map((c) => (
                      <SmartLink
                        key={c.href}
                        href={c.href}
                        target={c.external ? "_blank" : undefined}
                        rel={c.external ? "noopener noreferrer" : undefined}
                        onClick={close}
                        className="py-2 text-sm text-muted transition-colors hover:text-fg"
                      >
                        {c.label}
                      </SmartLink>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <SmartLink
              href={cta.href}
              onClick={close}
              className="mt-5 inline-flex items-center justify-center rounded-[var(--radius-card)] bg-accent px-5 py-3 font-semibold text-accent-fg transition hover:opacity-90"
            >
              {cta.label}
            </SmartLink>
          </nav>
        </div>
      )}
    </header>
  );
}
