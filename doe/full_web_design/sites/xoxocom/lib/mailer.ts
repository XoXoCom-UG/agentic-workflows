import nodemailer, { Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransporter(): Transporter {
  if (cached) return cached;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  }
  cached = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return cached;
}

export type ContactArgs = {
  fromEmail: string;
  operatorEmail: string;
  companyName: string;
  gmailUser: string;
  fields: Record<string, string>;
};

const LABELS: Record<string, string> = {
  first_name: "Vorname",
  last_name: "Nachname",
  company: "Firma",
  message: "Nachricht",
};

/** Operator notification + visitor acknowledgment for a Kontakt submission (German). */
export async function sendContactEmails(args: ContactArgs): Promise<void> {
  const transporter = getTransporter();
  const firstName = args.fields.first_name?.trim();
  const greeting = firstName ? `Hallo ${firstName},` : "Hallo,";

  // The visitor's message is the core content — it goes straight to the contact mailbox.
  const message = (args.fields.message ?? "").trim();
  // Lead details below the message (everything except the message itself).
  const detailRows = Object.entries(args.fields)
    .filter(([k, v]) => k !== "message" && v && v.trim())
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top;">${escapeHtml(LABELS[k] ?? k)}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`
    )
    .join("");

  // 1. Forward the message to the contact mailbox (replyTo = visitor, so a reply
  //    goes straight back to them).
  await transporter.sendMail({
    from: `"${args.companyName} Website" <${args.gmailUser}>`,
    to: args.operatorEmail,
    replyTo: args.fromEmail,
    subject: `Neue Kontaktanfrage — ${args.companyName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
        <p style="font-size:16px;margin:0 0 14px;">Neue Kontaktanfrage über die Website von ${escapeHtml(args.companyName)}.</p>
        <p style="font-size:13px;color:#555;margin:0 0 6px;">Nachricht:</p>
        <blockquote style="margin:0 0 22px;padding:14px 16px;border-left:3px solid #fb6b4c;background:#f7f7f7;border-radius:6px;font-size:15px;white-space:pre-wrap;">${message ? escapeHtml(message) : "(keine Nachricht hinterlassen)"}</blockquote>
        <table style="font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;color:#555;">E-Mail</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(args.fromEmail)}">${escapeHtml(args.fromEmail)}</a></td></tr>
          ${detailRows}
        </table>
      </div>`.trim(),
  });

  // 2. Acknowledgment to the visitor.
  await transporter.sendMail({
    from: `"${args.companyName}" <${args.gmailUser}>`,
    to: args.fromEmail,
    subject: `Danke für deine Nachricht an ${args.companyName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
        <p style="font-size:16px;margin:0 0 16px;">${greeting}</p>
        <p style="font-size:16px;margin:0 0 24px;">
          vielen Dank für deine Nachricht an <strong>${escapeHtml(args.companyName)}</strong>. Wir haben sie erhalten und melden uns innerhalb eines Werktags bei dir.
        </p>
        <p style="font-size:14px;color:#555;margin:0;">— Dein Team von ${escapeHtml(args.companyName)}</p>
      </div>`.trim(),
  });
}

export type WaitlistArgs = {
  fromEmail: string;
  operatorEmail: string;
  companyName: string;
  gmailUser: string;
  courseSlug: string;
  /** Site language at signup time — decides which language the acknowledgment is in. */
  lang: "de" | "en";
  firstName: string | null;
  lastName: string | null;
  /** The booker's employer (For-my-team only) — not `companyName`, which is XoXoCom's own. */
  company: string | null;
  bookingType: "self" | "team";
  places: number;
  /** True when this booking replaced an earlier one by the same email for the same course. */
  isUpdate: boolean;
  /** Places booked for this course across all bookings — operator email only; null if the count failed. */
  totalPlaces: number | null;
  note: string | null;
};

/**
 * Operator notification + acknowledgment for a course booking request.
 *
 * Unlike sendContactEmails (German-only, matching the Kontakt page's German form), the
 * acknowledgment here follows the language the visitor had the site in: the waitlist
 * is a promise to email them later, and the first email they get should not arrive in a
 * language they didn't choose. The operator notification stays German.
 */
export async function sendWaitlistEmails(args: WaitlistArgs): Promise<void> {
  const transporter = getTransporter();
  const name = args.firstName?.trim();

  // 1. Operator notification — reply-to the signup, so answering a question is one click.
  await transporter.sendMail({
    from: `"${args.companyName} Website" <${args.gmailUser}>`,
    to: args.operatorEmail,
    replyTo: args.fromEmail,
    subject: `${args.isUpdate ? "Aktualisierte" : "Neue"} Kurs-Buchungsanfrage — ${args.courseSlug}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
        <p style="font-size:16px;margin:0 0 14px;">${
          args.isUpdate
            ? "Aktualisierte Buchungsanfrage für einen Kurs — sie ersetzt die frühere Anfrage dieser E-Mail-Adresse."
            : "Neue Buchungsanfrage für einen Kurs."
        }</p>
        <table style="font-size:14px;border-collapse:collapse;margin:0 0 20px;">
          <tr><td style="padding:4px 12px 4px 0;color:#555;">Kurs</td><td style="padding:4px 0;">${escapeHtml(args.courseSlug)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555;">E-Mail</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(args.fromEmail)}">${escapeHtml(args.fromEmail)}</a></td></tr>
          ${name ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Vorname</td><td style="padding:4px 0;">${escapeHtml(name)}</td></tr>` : ""}
          ${args.lastName ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Nachname</td><td style="padding:4px 0;">${escapeHtml(args.lastName)}</td></tr>` : ""}
          <tr><td style="padding:4px 12px 4px 0;color:#555;">Buchungsart</td><td style="padding:4px 0;">${args.bookingType === "team" ? "Für mein Unternehmen" : "Privat"}</td></tr>
          ${args.company ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Unternehmen</td><td style="padding:4px 0;">${escapeHtml(args.company)}</td></tr>` : ""}
          <tr><td style="padding:4px 12px 4px 0;color:#555;">Plätze</td><td style="padding:4px 0;">${args.places}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555;">Sprache</td><td style="padding:4px 0;">${args.lang}</td></tr>
        </table>
        ${
          args.totalPlaces !== null
            ? `<p style="font-size:15px;margin:0 0 20px;"><strong>Bisher gebuchte Plätze für diesen Kurs: ${args.totalPlaces}</strong></p>`
            : ""
        }
        ${
          args.note
            ? `<p style="font-size:13px;color:#555;margin:0 0 6px;">Was sie bauen wollen:</p>
        <blockquote style="margin:0;padding:14px 16px;border-left:3px solid #fb6b4c;background:#f7f7f7;border-radius:6px;font-size:15px;white-space:pre-wrap;">${escapeHtml(args.note)}</blockquote>`
            : ""
        }
      </div>`.trim(),
  });

  // 2. Acknowledgment to the person who signed up, in their language.
  const de = args.lang === "de";
  const team = args.bookingType === "team";
  const greeting = name ? (de ? `Hallo ${name},` : `Hi ${name},`) : de ? "Hallo," : "Hi,";
  await transporter.sendMail({
    from: `"${args.companyName}" <${args.gmailUser}>`,
    to: args.fromEmail,
    subject: de
      ? `Deine Buchungsanfrage — ${args.companyName}`
      : `Your booking request — ${args.companyName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
        <p style="font-size:16px;margin:0 0 16px;">${escapeHtml(greeting)}</p>
        <p style="font-size:16px;margin:0 0 24px;">${
          de
            ? team
              ? `danke für deine Buchungsanfrage über ${args.places} Plätze für ${escapeHtml(args.company ?? "")}. Wir melden uns in Kürze per E-Mail, um deine Buchung und den Starttermin des Kurses zu bestätigen.`
              : `danke für deine Buchungsanfrage. Wir melden uns in Kürze per E-Mail, um deine Buchung und den Starttermin des Kurses zu bestätigen.`
            : team
              ? `thanks for your booking request for ${args.places} places for ${escapeHtml(args.company ?? "")}. We'll email you shortly to confirm your booking and the course start date.`
              : `thanks for your booking request. We'll email you shortly to confirm your booking and the course start date.`
        }</p>
        <p style="font-size:14px;color:#555;margin:0;">— ${de ? "Dein Team von" : "The team at"} ${escapeHtml(args.companyName)}</p>
      </div>`.trim(),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
