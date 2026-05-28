import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getAllowedColumns } from "@/lib/supabase";
import { sendThankYouEmail } from "@/lib/mailer";

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

  const allowed = new Set(getAllowedColumns());
  const candidate: Record<string, string | null> = {
    email,
    campaign_slug: process.env.CAMPAIGN_SLUG ?? null,
    user_agent: req.headers.get("user-agent"),
    ip: clientIp(req),
    created_at: new Date().toISOString(),
  };
  for (const [k, v] of Object.entries(formFields)) {
    if (typeof v === "string" && v.trim()) candidate[k] = v.trim();
  }
  const row: Record<string, string> = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (v != null && allowed.has(k)) row[k] = v;
  }

  const supabase = getSupabase();
  const { error: dbError } = await supabase
    .schema("leads")
    .from("prospects")
    .insert(row)
    .select();
  if (dbError) {
    console.error("supabase insert failed", dbError);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  const driveLink = process.env.DRIVE_LINK;
  const leadMagnetTitle = process.env.LEAD_MAGNET_TITLE ?? "your download";
  const companyName = process.env.COMPANY_NAME ?? "";
  const gmailUser = process.env.GMAIL_USER;

  if (driveLink && gmailUser) {
    try {
      const firstName = typeof formFields.first_name === "string" ? formFields.first_name.trim() : undefined;
      await sendThankYouEmail({
        to: email,
        recipientFirstName: firstName,
        companyName,
        leadMagnetTitle,
        driveLink,
        gmailUser,
      });
    } catch (err) {
      console.error("thank-you email failed (non-blocking)", err);
    }
  }

  const redirect_url = driveLink
    ? `/thank-you?to=${encodeURIComponent(driveLink)}`
    : `/thank-you`;
  return NextResponse.json({ ok: true, redirect_url });
}
