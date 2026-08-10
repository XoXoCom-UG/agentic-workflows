import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Two jobs, and the split between them is deliberate.
 *
 * 1. EVERY ROUTE — expose the request pathname to server components (the root layout)
 *    via an `x-pathname` request header. Next.js does not give the root layout the
 *    current path, but the layout needs it to pin the German legal pages to
 *    `<html lang="de">` while the rest of the site defaults to English (see
 *    app/layout.tsx + lib/copy.ts isLegalPath), and to drop the public chrome on
 *    /admin. Header-only passthrough — no redirects, no rewrites.
 *
 * 2. /admin ONLY — refresh the Supabase session cookie. Access tokens are short-lived;
 *    without a refresh on navigation an author gets signed out mid-edit. Refreshing
 *    requires writing cookies onto the response, which a Server Component cannot do,
 *    which is why it has to happen here.
 *
 * MIDDLEWARE REFRESHES; THE LAYOUT AUTHORISES. There is no access decision in this
 * file. app/admin/layout.tsx resolves the session, checks blog.authors membership, and
 * redirects — and every Server Action re-checks independently. Next.js has shipped a
 * middleware-bypass CVE before (CVE-2025-29927), so middleware must never be the only
 * gate on anything that matters. Treat this as a cookie-plumbing layer.
 */

const ADMIN_PREFIX = "/admin";

/**
 * A function, not a hoisted constant. The Supabase setAll adapter mutates
 * request.cookies, and the response has to be rebuilt from the post-mutation headers
 * or the refreshed session is invisible to the render that follows.
 */
function withPathname(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return headers;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes: header passthrough only. The prefix gate is what stops every
  // marketing page paying for an auth round-trip at the edge on every request.
  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next({ request: { headers: withPathname(request) } });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Missing env is a misconfiguration, not a reason to 500 the request. The layout
  // will fail closed and send the visitor to the login page.
  if (!url || !anonKey) {
    return NextResponse.next({ request: { headers: withPathname(request) } });
  }

  let response = NextResponse.next({ request: { headers: withPathname(request) } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request: { headers: withPathname(request) } });
        // Iterate and .set() each cookie individually. Supabase's own docs suggest
        // `response.cookies.setAll(toSet)`, but ResponseCookies has no setAll method —
        // it is an open documentation bug (supabase/supabase discussion #34842) and the
        // suggested call throws at runtime.
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh only. getUser() is what triggers the token exchange; the return value is
  // intentionally ignored here — see the note above about where authorisation lives.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on page routes only; skip static assets and file-based metadata routes.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image).*)",
  ],
};
