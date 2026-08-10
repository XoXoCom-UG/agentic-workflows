import type { Metadata } from "next";

/**
 * Shell for everything under /admin, INCLUDING the login page. It deliberately holds no
 * access check — that lives in app/admin/(protected)/layout.tsx, because a gate here
 * would also gate /admin/login and produce a redirect loop.
 *
 * Route layout:
 *   app/admin/layout.tsx              this file — chrome + noindex, no gate
 *   app/admin/login/page.tsx          reachable signed out
 *   app/admin/(protected)/layout.tsx  the gate
 *   app/admin/(protected)/**          everything that requires an author
 *
 * The (protected) group is a grouping only: it does not appear in any URL, so the list
 * still lives at /admin.
 *
 * The public site chrome is dropped for these routes in app/layout.tsx — App Router
 * gives a nested route no way to escape the root layout, so the root layout checks the
 * pathname instead.
 */
export const metadata: Metadata = {
  // Inherited by every admin page. Belt to the braces of the /admin Disallow in
  // app/robots.ts: robots.txt asks a crawler not to fetch the page, noindex tells one
  // that fetched it anyway not to index it. Neither is a substitute for the auth gate —
  // they only keep the login form out of search results.
  robots: { index: false, follow: false },
  title: "Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg text-fg">{children}</div>;
}
