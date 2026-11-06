"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SALLY_ADMIN_COOKIE, checkPassword, newSessionToken, rateLimit } from "@/lib/sally-admin";

export async function signIn(formData: FormData) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  // 10 attempts per 15 minutes per IP (per instance — see lib/sally-admin.ts).
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000)) redirect("/sally/admin?error=limit");

  const pw = formData.get("password");
  if (typeof pw !== "string" || !checkPassword(pw)) redirect("/sally/admin?error=invalid");

  const { value, maxAge } = newSessionToken();
  (await cookies()).set(SALLY_ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  redirect("/sally/admin");
}

export async function signOut() {
  (await cookies()).delete(SALLY_ADMIN_COOKIE);
  redirect("/sally/admin");
}
