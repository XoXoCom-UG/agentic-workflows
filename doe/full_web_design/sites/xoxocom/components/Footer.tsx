import { site, SOCIALS } from "@/lib/config";
import { getCopy } from "@/lib/server-copy";
import FooterLinks from "@/components/FooterLinks";

/** Site-wide footer (rendered once in app/layout.tsx). Copyright (left),
 *  socials (middle), legal links (right) — per the brief. Server component:
 *  it has no interactivity, so its copy ships as HTML only. */
export default async function Footer() {
  const { c } = await getCopy();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12 py-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: copyright */}
        <p className="text-sm text-muted order-2 md:order-1">
          © {year} {site.company}. {c.footer.rights}
        </p>

        {/* Middle: socials */}
        <div className="flex items-center gap-4 order-1 md:order-2">
          {SOCIALS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="text-muted transition-colors hover:text-accent"
            >
              {s.label === "LinkedIn" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0z" />
                </svg>
              ) : (
                s.label
              )}
            </a>
          ))}
        </div>

        {/* Right: legal */}
        <div className="order-3 flex flex-col gap-2 md:items-end">
          <FooterLinks className="md:justify-end" ariaLabel={c.footer.legalAria} />
        </div>
      </div>
    </footer>
  );
}
