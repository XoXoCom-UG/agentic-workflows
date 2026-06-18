"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Drop-in replacement for <a>. Internal routes ("/…") render a Next <Link> for
 * instant client-side navigation — so the in-memory LanguageProvider state
 * survives the navigation and the new page paints in the active language with no
 * reload and no flash. External URLs, mailto:, tel:, and #hash links fall back to
 * a plain <a> (all extra props — className, target, rel, onClick, aria-* — pass
 * straight through in both cases).
 */
type Props = ComponentProps<"a"> & { href: string };

export default function SmartLink({ href, children, ...rest }: Props) {
  const isInternalRoute = href.startsWith("/") && !href.startsWith("//");
  if (isInternalRoute) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
