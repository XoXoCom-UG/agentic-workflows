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

// A For-my-team booking asks for 2-20 places; larger groups are sent to the contact
// page by the form. Mirrors the course_waitlist_booking_shape CHECK in
// execution/add_course_waitlist_table.py, which enforces the same range in Postgres.
const MIN_TEAM_PLACES = 2;
const MAX_TEAM_PLACES = 20;

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
 * Course booking request → leads.course_waitlist (named for the waiting list it started
 * as). Vocabulary — Booking, Place, For myself, For my team — is defined in CONTEXT.md.
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

  // Anything but an explicit "team" is a For-myself booking: one place, no company.
  // Those fields are cleared rather than ignored so a repeat booking that switches from
  // team to myself does not leave the old company and place count behind.
  const bookingType = formFields.booking_type === "team" ? "team" : "self";
  let company: string | null = null;
  let lastName: string | null = null;
  let places = 1;
  if (bookingType === "team") {
    company = str(formFields.company, MAX_NAME);
    if (!company) {
      return NextResponse.json({ ok: false, error: "invalid_company" }, { status: 422 });
    }
    lastName = str(formFields.last_name, MAX_NAME);
    const n = Number(formFields.places);
    if (!Number.isInteger(n) || n < MIN_TEAM_PLACES || n > MAX_TEAM_PLACES) {
      return NextResponse.json({ ok: false, error: "invalid_places" }, { status: 422 });
    }
    places = n;
  }

  const supabase = getSupabase();
  const table = () => supabase.schema("leads").from("course_waitlist");

  // One booking per person per course: a repeat booking REPLACES the earlier one (the
  // visitor changing 5 places to 8 resubmits rather than writing to us). Looked up first
  // only so the operator email can say "updated"; the upsert below is what guarantees a
  // single row, even if two submissions race past this check.
  const { data: existing, error: lookupError } = await table()
    .select("id")
    .eq("course_slug", courseSlug)
    .eq("email", email)
    .maybeSingle();
  if (lookupError) {
    console.error("course booking lookup failed", lookupError);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
  const isUpdate = existing !== null;

  const row = {
    course_slug: courseSlug,
    email,
    first_name: firstName,
    last_name: lastName,
    company,
    booking_type: bookingType,
    places,
    note,
    lang,
    site_slug: process.env.SITE_SLUG ?? null,
    user_agent: req.headers.get("user-agent"),
    ip: clientIp(req),
    // created_at is deliberately absent: on a replace it keeps the first booking's date.
    ...(isUpdate && { updated_at: new Date().toISOString() }),
  };

  // Upsert on (course_slug, email) — the unique index created by
  // execution/add_course_waitlist_table.py. On conflict every column in `row` is
  // overwritten, which is exactly the "newest booking wins" rule.
  const { error: dbError } = await table()
    .upsert(row, { onConflict: "course_slug,email" })
    .select();
  if (dbError) {
    console.error("course booking upsert failed", dbError);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  // Running total of places booked for this course, for the operator email only —
  // XoXoCom decides internally when there are enough to set a start date, and visitors
  // never see this number. A failed count must not fail a booking that is already saved.
  let totalPlaces: number | null = null;
  const { data: placeRows, error: countError } = await table()
    .select("places")
    .eq("course_slug", courseSlug);
  if (countError) {
    console.error("course places total failed (non-blocking)", countError);
  } else {
    totalPlaces = (placeRows ?? []).reduce((sum, r) => sum + (r.places ?? 0), 0);
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
      lastName,
      company,
      bookingType,
      places,
      isUpdate,
      totalPlaces,
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
