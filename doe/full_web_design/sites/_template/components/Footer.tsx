import { site } from "@/lib/config";
import FooterLinks from "@/components/FooterLinks";

/**
 * Site-wide footer rendered once in app/layout.tsx, so legal pages are reachable
 * from every route within one click. Holds the visible `signature` build token.
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12 py-12 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2 max-w-sm">
          <p className="text-base font-semibold text-fg">{site.company}</p>
          <p className="text-sm text-muted">{site.tagline}</p>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <FooterLinks className="md:justify-end" />
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} {site.company}
          </p>
          <p className="text-xs text-muted/70" data-signature={site.signature}>
            {site.signature}
          </p>
        </div>
      </div>
    </footer>
  );
}
