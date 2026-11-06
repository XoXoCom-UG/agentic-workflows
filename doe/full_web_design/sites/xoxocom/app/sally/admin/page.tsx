import type { Metadata } from "next";
import { isSallyAdmin } from "@/lib/sally-admin";
import { COPY } from "@/lib/copy";
import { signIn, signOut } from "./actions";
import SallyStudio from "@/components/sally/admin/SallyStudio";
import BrandMark from "@/components/BrandMark";

// Internal tool: never indexed, always rendered per request (it depends on the cookie).
export const metadata: Metadata = {
  title: "Sally Studio — XoXoCom",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "Wrong password.",
  limit: "Too many attempts. Wait a few minutes and try again.",
};

/**
 * Sally Studio: password gate + LinkedIn post generator. Admin copy is English-only,
 * like the blog admin — it is an internal tool for the team.
 */
export default async function SallyAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await isSallyAdmin())) {
    const { error } = await searchParams;
    return (
      <main className="px-6 py-24 md:py-32">
        <form action={signIn} className="mx-auto max-w-sm rounded-[var(--radius-card)] border border-border bg-surface p-8 shadow-2xl shadow-black/40">
          <BrandMark className="h-9 w-auto text-accent" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-fg">Sally Studio</h1>
          <p className="mt-1 text-sm text-muted">Team access — generate and review LinkedIn posts with Sally.</p>
          <label htmlFor="password" className="mt-6 block text-xs font-semibold uppercase tracking-wider text-muted">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="mt-2 w-full rounded-[var(--radius-card)] border border-border bg-bg px-4 py-2.5 text-sm text-fg focus:border-accent/70 focus:outline-none"
          />
          {error && ERRORS[error] && <p role="alert" className="mt-3 text-sm text-accent">{ERRORS[error]}</p>}
          <button type="submit" className="mt-5 w-full rounded-[var(--radius-card)] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90">
            Enter admin
          </button>
        </form>
      </main>
    );
  }

  // Topic ideas for the generator: Sally's own news posts (German tree is the source).
  const ideas = COPY.de.sally.posts.map((p) => ({ title: p.title, body: p.body }));

  return (
    <SallyStudio
      ideas={ideas}
      hasApiKey={!!process.env.ANTHROPIC_API_KEY}
      signOutButton={
        <form action={signOut}>
          <button type="submit" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-fg">
            Sign out
          </button>
        </form>
      }
    />
  );
}
