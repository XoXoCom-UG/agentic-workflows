import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendWaitlistEmails } from "@/lib/mailer";
import { COURSE_SLUGS } from "@/lib/courses";
import { COURSES_ENABLED } from "@/lib/features";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Free-text caps. The column is `text` (no length limit), so the bound has to be
// enforced here or a scripted POST could write megabytes per row.
const MAX_NOTE = 2000;
const MAX_NAME = 200;

/**
 * How long the response will wait on the notification emails before giving up on them.
 *
 * This is not belt-and-braces; it was measured. Gmail SMTP can take longer than a
 * browser is willing to wait (and on a network that blocks outbound SMTP it never
 * answers at all), and because the mail send is awaited, the visitor sits on a spinner
 * while a row that is ALREADY COMMITTED in Postgres goes unacknowledged — and then very
 * reasonably submits again. The signup is durable before this point, so a slow mailbox
 * must cost the operator a notification, never the visitor their confirmation.
 */
const EMAIL_TIMEOUT_MS = 8000;

type Body = {
  email?: unknown;
  course_slug?: unknown;
  lang?: unknown;
  fields?: unknown;
};

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Course waiting-list signup → leads.course_waitlist.
 *
 * Separate from /api/submit because it answers a different question (who wants THIS
 * course) and writes a different table. Deliberate differences from the contact route:
 *
 *   • `course_slug` is validated against COURSE_SLUGS, the catalog in lib/copy.ts.
 *     Without that check the endpoint is an open text-insert that anyone can use to
 *     invent courses in our own demand report.
 *   • No LEAD_COLUMNS allowlist. That env var describes leads.prospects; this table has
 *     a fixed, known shape, so the row is built explicitly instead.
 */
export async function POST(req: NextRequest) {
  // Parked: refuse signups for a section visitors cannot see (lib/features.ts).
  if (!COURSES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  const courseSlug = typeof body.course_slug === "string" ? body.course_slug.trim() : "";
  if (!COURSE_SLUGS.includes(courseSlug)) {
    return NextResponse.json({ ok: false, error: "unknown_course" }, { status: 422 });
  }

  const formFields =
    body.fields && typeof body.fields === "object" && !Array.isArray(body.fields)
      ? (body.fields as Record<string, unknown>)
      : {};

  const firstName = str(formFields.first_name, MAX_NAME);
  const note = str(formFields.note, MAX_NOTE);
  const lang = body.lang === "de" ? "de" : "en";

  const row = {
    course_slug: courseSlug,
    email,
    first_name: firstName,
    note,
    lang,
    site_slug: process.env.SITE_SLUG ?? null,
    user_agent: req.headers.get("user-agent"),
    ip: clientIp(req),
  };

  const supabase = getSupabase();
  // Upsert on (course_slug, email) — the unique index created by
  // execution/add_course_waitlist_table.py. Signing up twice for the same course is a
  // no-op at the row level, so the waitlist count stays an honest count of people.
  const { error: dbError } = await supabase
    .schema("leads")
    .from("course_waitlist")
    .upsert(row, { onConflict: "course_slug,email", ignoreDuplicates: true })
    .select();
  if (dbError) {
    console.error("course waitlist upsert failed", dbError);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  // Operator notification + signup acknowledgment. Best-effort and time-boxed: the row
  // is already safe in Postgres, so neither a mail outage nor a slow one may turn a
  // captured lead into an error the visitor sees and retries.
  const operatorEmail = process.env.CONTACT_EMAIL;
  const gmailUser = process.env.GMAIL_USER;
  if (operatorEmail && gmailUser) {
    const send = sendWaitlistEmails({
      fromEmail: email,
      operatorEmail,
      companyName: process.env.COMPANY_NAME ?? "",
      gmailUser,
      courseSlug,
      lang,
      firstName,
      note,
    }).catch((err) => {
      // Attached here, not only via the race below: if the send rejects AFTER the
      // timeout has already won, an unattached rejection would be an unhandled one.
      console.error("waitlist email failed (non-blocking)", err);
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      send,
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          console.error(`waitlist email still pending after ${EMAIL_TIMEOUT_MS}ms; responding anyway`);
          resolve();
        }, EMAIL_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timer);
  }

  return NextResponse.json({ ok: true });
}
