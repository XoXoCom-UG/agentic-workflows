import nodemailer, { Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransporter(): Transporter {
  if (cached) return cached;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  }
  cached = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cached;
}

export type ContactArgs = {
  /** the visitor's email (sender) */
  fromEmail: string;
  /** the operator inbox that should receive the notification */
  operatorEmail: string;
  companyName: string;
  gmailUser: string;
  /** all submitted fields except email, e.g. { first_name, company, message } */
  fields: Record<string, string>;
};

/**
 * Sends two emails for a contact submission:
 *  1. a notification to the operator inbox with the full message, and
 *  2. an acknowledgment to the visitor.
 * Both are best-effort; the caller treats failures as non-blocking.
 */
export async function sendContactEmails(args: ContactArgs): Promise<void> {
  const transporter = getTransporter();
  const firstName = args.fields.first_name?.trim();
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  const rows = Object.entries(args.fields)
    .filter(([, v]) => v && v.trim())
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top;">${escapeHtml(
          k
        )}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`
    )
    .join("");

  // 1. Operator notification.
  await transporter.sendMail({
    from: `"${args.companyName} website" <${args.gmailUser}>`,
    to: args.operatorEmail,
    replyTo: args.fromEmail,
    subject: `New contact message — ${args.companyName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
        <p style="font-size:16px;margin:0 0 16px;">New message from the ${escapeHtml(
          args.companyName
        )} contact form.</p>
        <table style="font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;color:#555;">email</td><td style="padding:4px 0;">${escapeHtml(
            args.fromEmail
          )}</td></tr>
          ${rows}
        </table>
      </div>
    `.trim(),
  });

  // 2. Visitor acknowledgment.
  await transporter.sendMail({
    from: `"${args.companyName}" <${args.gmailUser}>`,
    to: args.fromEmail,
    subject: `Thanks for reaching out to ${args.companyName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
        <p style="font-size:16px;margin:0 0 16px;">${greeting}</p>
        <p style="font-size:16px;margin:0 0 24px;">
          Thanks for contacting <strong>${escapeHtml(
            args.companyName
          )}</strong>. We've received your message and will get back to you within one business day.
        </p>
        <p style="font-size:14px;color:#555;margin:0;">— ${escapeHtml(
          args.companyName
        )}</p>
      </div>
    `.trim(),
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
