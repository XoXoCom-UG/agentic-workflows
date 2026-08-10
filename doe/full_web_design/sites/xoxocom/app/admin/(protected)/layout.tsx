import { headers } from "next/headers";
import { redirect } from "next/navigation";

import SmartLink from "@/components/SmartLink";
import { signOut } from "@/app/admin/actions";
import { getCurrentAuthor } from "@/lib/supabase-auth";

/**
 * THE GATE. Everything in this route group is unreachable without a valid session whose
 * user has a row in blog.authors.
 *
 * This is a server component, not middleware, on purpose. Next.js has shipped a
 * middleware-bypass CVE (CVE-2025-29927) in which a crafted header skipped middleware
 * entirely; a gate that lives in the render path cannot be skipped that way. middleware.ts
 * only refreshes the session cookie.
 *
 * It is still not the last line of defence. Server Actions are independently addressable
 * endpoints that do not pass through this layout, so each one re-checks with
 * requireAuthor(), and RLS on blog.posts refuses the write underneath that.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const author = await getCurrentAuthor();

  if (!author) {
    // Preserve where they were headed so a deep link survives the round trip. The
    // pathname comes from middleware.ts via x-pathname; safeNext() in actions.ts
    // re-validates it on the way back, so a forged header cannot become a redirect.
    const pathname = (await headers()).get("x-pathname") ?? "/admin";
    redirect(`/admin/login?error=signedout&next=${encodeURIComponent(pathname)}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-baseline gap-4">
          <SmartLink href="/admin" className="text-lg font-extrabold tracking-tight">
            Blog admin
          </SmartLink>
          <SmartLink
            href="/admin/topics"
            className="text-sm text-muted transition hover:text-fg"
          >
            Topics
          </SmartLink>
          <SmartLink
            href="/blog"
            className="text-sm text-muted transition hover:text-fg"
          >
            View blog
          </SmartLink>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{author.displayName}</span>
          {/* A form, not a link: sign-out clears a cookie, and a GET that mutates state
              gets fired by link prefetchers and browser scanners. */}
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-semibold text-muted transition hover:text-fg"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {children}
    </div>
  );
}
