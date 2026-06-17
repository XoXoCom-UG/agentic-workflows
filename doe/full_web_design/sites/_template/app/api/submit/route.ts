import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getAllowedColumns } from "@/lib/supabase";
import { sendContactEmails } from "@/lib/mailer";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  email?: unknown;
  fields?: unknown;
};

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  const formFields =
    body.fields && typeof body.fields === "object" && !Array.isArray(body.fields)
      ? (body.fields as Record<string, unknown>)
      : {};

  // Build the DB row, filtered to the LEAD_COLUMNS allowlist (unknown columns are dropped).
  const allowed = new Set(getAllowedColumns());
  const candidate: Record<string, string | null> = {
    email,
    campaign_slug: process.env.SITE_SLUG ?? null,
    user_agent: req.headers.get("user-agent"),
    ip: clientIp(req),
    created_at: new Date().toISOString(),
  };
  const cleanFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(formFields)) {
    if (typeof v === "string" && v.trim()) {
      candidate[k] = v.trim();
      cleanFields[k] = v.trim();
    }
  }
  const row: Record<string, string> = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (v != null && allowed.has(k)) row[k] = v;
  }

  const supabase = getSupabase();
  // Upsert on (campaign_slug, email): a repeat submission from the same person on
  // this site is a no-op at the row level (DB unique index enforces it), so the
  // prospects table holds at most one row per visitor. The contact email below
  // still fires every time, so the operator never misses a returning visitor's message.
  const { error: dbError } = await supabase
    .schema("leads")
    .from("prospects")
    .upsert(row, { onConflict: "campaign_slug,email", ignoreDuplicates: true })
    .select();
  if (dbError) {
    console.error("supabase upsert failed", dbError);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  // Email notification + acknowledgment (best-effort, non-blocking).
  const operatorEmail = process.env.CONTACT_EMAIL;
  const companyName = process.env.COMPANY_NAME ?? "";
  const gmailUser = process.env.GMAIL_USER;
  if (operatorEmail && gmailUser) {
    try {
      await sendContactEmails({
        fromEmail: email,
        operatorEmail,
        companyName,
        gmailUser,
        fields: cleanFields,
      });
    } catch (err) {
      console.error("contact email failed (non-blocking)", err);
    }
  }

  return NextResponse.json({ ok: true });
}
