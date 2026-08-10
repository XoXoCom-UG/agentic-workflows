import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The AUTHENTICATED Supabase client: anon key plus the visitor's session cookies.
 *
 * This is deliberately a different client from lib/supabase.ts, and the difference is
 * the whole security model of the admin area:
 *
 *   lib/supabase.ts       service role key   bypasses RLS   public reads (views only)
 *   lib/supabase-auth.ts  anon key + session obeys RLS      every admin read and write
 *
 * Admin writes go through the anon client on purpose. The service key would make every
 * RLS policy in blog.posts decorative — a Server Action that forgot its own guard could
 * write anything. With the session client, `auth.uid()` inside a policy is trustworthy,
 * so the database refuses a write from anyone who is not in blog.authors even if every
 * application-level check above it were removed. RLS is the floor, not the decoration.
 *
 * @supabase/ssr notes that cost real debugging time if you get them wrong:
 *
 *  - The cookie API is `{ getAll, setAll }`. The old `{ get, set, remove }` shape is
 *    gone from current releases; code written against it type-errors or silently fails
 *    to persist a session.
 *  - Always `auth.getUser()`, never `auth.getSession()`. getSession() returns whatever
 *    the cookie claims without verifying the JWT against the auth server, so it is not
 *    an authorisation input. getUser() validates.
 *  - `@supabase/auth-helpers-nextjs` is deprecated, frozen, and must never coexist with
 *    this package. Do not add it back.
 */

const ADMIN_SCHEMA = "blog";

function readEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. " +
        "Run: python execution/sync_env_local.py --slug xoxocom",
    );
  }
  return { url, anonKey };
}

/**
 * Per-request client. NOT cached in a module-level variable the way getSupabase() is —
 * it closes over this request's cookie store, so reusing one across requests would
 * hand one visitor another visitor's session.
 */
export async function getAuthedSupabase(): Promise<SupabaseClient> {
  const { url, anonKey } = readEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Next.js forbids setting cookies while rendering a Server Component. That is
          // expected here and safe to swallow: middleware.ts already refreshed the
          // session for this request, so the only thing lost is a redundant re-write.
          // Server Actions and Route Handlers CAN set cookies, which is where sign-in
          // and sign-out actually persist the session.
        }
      },
    },
  });
}

export type Author = { userId: string; email: string; displayName: string };

/**
 * Resolve the signed-in author, or null.
 *
 * Two separate questions, both of which have to be yes:
 *   1. Is there a valid session?            -> auth.getUser()
 *   2. Is that user allowed to write?       -> a row in blog.authors
 *
 * The second is the one that matters. Supabase's anon key ships to the browser by
 * design, so anyone who can read the page can attempt to mint an `authenticated`
 * session. Public signup is disabled in the dashboard, but that is a setting someone
 * can flip; blog.authors is an allowlist that has to be edited with the service key.
 * Membership, not authentication, is what authorises a write.
 *
 * The lookup runs through the session client under RLS (`authors_self_read` restricts
 * SELECT to `user_id = auth.uid()`), so this cannot be used to enumerate colleagues.
 */
export async function getCurrentAuthor(): Promise<Author | null> {
  let supabase: SupabaseClient;
  try {
    supabase = await getAuthedSupabase();
  } catch (err) {
    console.error("[admin] Supabase auth client unavailable", err);
    return null;
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return null;

  const { data, error } = await supabase
    .schema(ADMIN_SCHEMA)
    .from("authors")
    .select("user_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin] blog.authors lookup failed", error);
    return null;
  }
  if (!data) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: (data as { display_name: string }).display_name,
  };
}

/**
 * Same as getCurrentAuthor() but throws instead of returning null.
 *
 * Every Server Action calls this as its first statement. The layout gate in
 * app/admin/layout.tsx is UX — it keeps a signed-out visitor from seeing an editor —
 * but Server Actions are independently addressable HTTP endpoints. A layout check does
 * not protect them, and neither does the fact that the only button pointing at them is
 * behind a login. This is the check that does.
 */
export async function requireAuthor(): Promise<Author> {
  const author = await getCurrentAuthor();
  if (!author) throw new Error("NOT_AUTHORISED");
  return author;
}
