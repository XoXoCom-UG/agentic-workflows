"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal, scroll-snapped rail for the course cards.
 *
 * Deliberately NOT a JS-driven slider: the rail is a plain overflow-x container, so it
 * works with a trackpad, a touch swipe, the keyboard and a screen reader before any of
 * this component's JavaScript runs, and the cards are real links either way. The script
 * adds two things on top — arrow buttons, and the arrows' enabled state.
 *
 * The arrows are hidden entirely when everything already fits (the launch case: one
 * course). Controls that can't do anything are worse than no controls, and this stays
 * correct as the catalog grows, on resize, and when a language toggle changes card
 * heights — hence the ResizeObserver rather than a one-shot measurement.
 */
export default function CourseCarousel({
  children,
  ariaLabel,
  prevLabel,
  nextLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const wasOverflowing = useRef(false);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    // 1px of slack: fractional layout widths make scrollWidth exceed clientWidth by a
    // hair on plenty of zoom levels, which would otherwise show dead arrows forever.
    const slack = 1;
    const max = el.scrollWidth - el.clientWidth;
    const nowOverflowing = max > slack;

    // `justify-center` is what makes a short catalog sit in the middle of the page, but
    // a centred flex container that overflows is centred in BOTH directions: the browser
    // parks the scroll position halfway, so the first card starts half-cut off the left
    // edge. That happens on the very first paint too, because the server-rendered markup
    // always carries the class. Snapping to the start the first time we see overflow
    // costs nothing when it doesn't (scrollLeft is already 0) and is invisible when it
    // does. Deliberately only on the transition, so it never fights a real scroll.
    if (nowOverflowing && !wasOverflowing.current) el.scrollLeft = 0;
    wasOverflowing.current = nowOverflowing;

    setOverflowing(nowOverflowing);
    setAtStart(el.scrollLeft <= slack);
    setAtEnd(el.scrollLeft >= max - slack);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Cards can change height/width independently of the rail (font swap, language
    // toggle), so watch the first child too — the rail's own box may not move.
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // Step by one card + gap, falling back to 80% of the viewport width for the rail.
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : Math.round(el.clientWidth * 0.8);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const arrowClass =
    "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-fg transition-all hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border disabled:hover:text-fg";

  return (
    <div>
      {overflowing && (
        <div className="mb-5 flex justify-end gap-2">
          <button type="button" aria-label={prevLabel} disabled={atStart} onClick={() => scrollByCard(-1)} className={arrowClass}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" aria-label={nextLabel} disabled={atEnd} onClick={() => scrollByCard(1)} className={arrowClass}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* The negative margin + padding pair lets a card's hover lift and glow spill past
          the content column without being clipped by overflow-x-auto, and keeps the
          first card flush with the page gutter. */}
      <div
        ref={railRef}
        onScroll={measure}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        // scroll-px must match px, or scroll-snap aligns the first card's edge with the
        // scrollport edge *inside* the padding and settles at scrollLeft ≈ 16–24 instead
        // of 0 — which both eats the left gutter and leaves the "previous" arrow looking
        // enabled while the rail is, to the eye, already at the start.
        className={`-mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 scroll-px-6 py-4 [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 md:-mx-4 md:px-4 md:scroll-px-4 [&::-webkit-scrollbar]:hidden ${
          // Centre the cards only while they all fit. `justify-center` on a container
          // that DOES overflow pushes the first card off the left edge, where no amount
          // of scrolling brings it back — so this flips off the moment the rail scrolls.
          overflowing ? "" : "justify-center"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
