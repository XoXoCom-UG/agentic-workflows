import { NextResponse, type NextRequest } from "next/server";

/**
 * Exposes the request pathname to server components (the root layout) via an
 * `x-pathname` request header. Next.js does not give the root layout the current
 * path, but the layout needs it to pin the German legal pages to `<html lang="de">`
 * while the rest of the site defaults to English (see app/layout.tsx + lib/copy.ts
 * isLegalPath). Header-only passthrough — no redirects, no rewrites.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on page routes only; skip static assets and file-based metadata routes.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image).*)",
  ],
};
