import { redirect } from "next/navigation";

import { signIn } from "@/app/admin/actions";
import { getCurrentAuthor } from "@/lib/supabase-auth";

/**
 * Sign-in for authors. A server component whose <form> posts straight to a Server
 * Action, so it ships ZERO client JavaScript — no useState, no onSubmit, and it works
 * with JS disabled. Errors come back as a query parameter rather than client state,
 * which is what keeps it that way.
 *
 * Email and password rather than magic links: magic links need working Auth SMTP, and
 * the accounts here are created by hand in the Supabase dashboard, so there is no
 * self-service flow that a mail dependency would buy us.
 *
 * Admin copy is English-only. It is an internal tool for three people; putting it in
 * lib/copy.ts would double that file for no visitor-facing benefit.
 */

const ERRORS: Record<string, string> = {
  invalid: "That email and password combination did not work.",
  missing: "Enter both your email address and your password.",
  notauthor:
    "That account is valid but is not on the author list, so it cannot reach the blog " +
    "admin. Ask for it to be added.",
  // Set by app/admin/(protected)/layout.tsx when it turns an unauthenticated visitor away.
  signedout: "Please sign in to continue.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  // Already signed in and allowed: skip the form. Without this, a bookmarked login URL
  // shows an authenticated author a sign-in prompt, which reads as "you got logged out".
  if (await getCurrentAuthor()) redirect("/admin");

  const message = error ? (ERRORS[error] ?? ERRORS.invalid) : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          XoXoCom
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Blog admin</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with your XoXoCom email address.
        </p>

        {message && (
          <p
            role="alert"
            className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-sm text-fg"
          >
            {message}
          </p>
        )}

        <form action={signIn} className="mt-6 flex flex-col gap-4">
          {/* Carried through so a deep link like /admin/edit/<id> resumes after sign-in.
              Validated server-side in safeNext() — never trusted as given. */}
          <input type="hidden" name="next" value={next ?? "/admin"} />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="username"
              autoFocus
              className="rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2.5 text-fg outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2.5 text-fg outline-none focus:border-accent"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-[var(--radius-card)] bg-accent px-5 py-2.5 font-semibold text-accent-fg transition hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <p className="mt-8 text-xs text-muted">
          Passwords are set in the Supabase dashboard. There is no self-service reset —
          ask for a new one to be issued.
        </p>
      </div>
    </main>
  );
}
