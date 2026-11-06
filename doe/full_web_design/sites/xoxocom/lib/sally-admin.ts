import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Access control for Sally Studio (/sally/admin), the internal LinkedIn-post generator.
 *
 * Deliberately separate from the blog admin (/admin, Supabase accounts): the studio is
 * a shared team tool behind ONE password, and it must keep working on a deploy that has
 * no Supabase at all. What it protects is the Anthropic API budget — the generate route
 * re-checks the session itself, so this cookie is the only way to spend money.
 *
 * The session is a signed expiry timestamp ("<exp>.<hmac>") in an httpOnly cookie, so
 * nothing is stored server-side and the password never sits in the browser.
 *
 * ⚠ Set SALLY_ADMIN_PASSWORD (and SALLY_ADMIN_SECRET) in the Vercel env. The fallback
 * password below exists so the studio works before that is done; anyone who can read
 * this repository can read it too.
 */

export const SALLY_ADMIN_COOKIE = "sally-admin";
const SESSION_HOURS = 12;
const FALLBACK_PASSWORD = "xoxocomtest1234";

function password(): string {
  return process.env.SALLY_ADMIN_PASSWORD || FALLBACK_PASSWORD;
}

// Changing the password also invalidates every existing session, because the secret
// falls back to being derived from it.
function secret(): string {
  return process.env.SALLY_ADMIN_SECRET || `sally-studio:${password()}`;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, password());
}

export function newSessionToken(): { value: string; maxAge: number } {
  const maxAge = SESSION_HOURS * 3600;
  const exp = String(Date.now() + maxAge * 1000);
  return { value: `${exp}.${sign(exp)}`, maxAge };
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !safeEqual(mac, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export async function isSallyAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(SALLY_ADMIN_COOKIE)?.value);
}

/**
 * Best-effort, per-instance rate limiter (a Map in module scope). On Vercel each
 * serverless instance has its own copy, so this slows brute force and runaway clicking
 * down rather than enforcing a hard global cap — the hard cap is the spend limit on the
 * Anthropic workspace.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}
