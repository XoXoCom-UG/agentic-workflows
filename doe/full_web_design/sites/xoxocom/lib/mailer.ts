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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
