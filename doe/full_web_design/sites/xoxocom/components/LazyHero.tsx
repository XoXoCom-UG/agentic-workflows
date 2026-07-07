"use client";

import dynamic from "next/dynamic";

// Decorative canvas animations — loaded after hydration so their chunks stay out
// of the first-load bundle. dynamic(..., { ssr: false }) is not allowed inside
// server components, so this tiny client wrapper owns the imports; each variant's
// chunk is only fetched on pages that actually render it.
const variants = {
  graph: dynamic(() => import("@/components/HeroGraph"), { ssr: false }),
  hubs: dynamic(() => import("@/components/HeroGraphHubs"), { ssr: false }),
  cluster: dynamic(() => import("@/components/HeroGraphCluster"), { ssr: false }),
} as const;

export default function LazyHero({ variant, className = "" }: { variant: keyof typeof variants; className?: string }) {
  const Hero = variants[variant];
  return <Hero className={className} />;
}
