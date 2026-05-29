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

export type ThankYouArgs = {
  to: string;
  recipientFirstName?: string;
  companyName: string;
  leadMagnetTitle: string;
  driveLink: string;
  gmailUser: string;
};

export async function sendThankYouEmail(args: ThankYouArgs): Promise<void> {
  const transporter = getTransporter();
  const greeting = args.recipientFirstName ? `Hi ${args.recipientFirstName},` : "Hi,";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
      <p style="font-size: 16px; margin: 0 0 16px;">${greeting}</p>
      <p style="font-size: 16px; margin: 0 0 24px;">
        Thanks for grabbing <strong>${escapeHtml(args.leadMagnetTitle)}</strong>. The PM and PO one-pagers are inside the folder below.
      </p>
      <p style="margin: 0 0 32px;">
        <a href="${args.driveLink}"
           style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Open in Google Drive
        </a>
      </p>
      <p style="font-size: 14px; color: #555; margin: 0;">
        If the button doesn't work, paste this URL into your browser:<br>
        <span style="word-break: break-all;">${args.driveLink}</span>
      </p>
      <p style="font-size: 14px; color: #555; margin: 24px 0 0;">${escapeHtml(args.companyName)}</p>
    </div>
  `.trim();

  await transporter.sendMail({
    from: `"${args.companyName}" <${args.gmailUser}>`,
    to: args.to,
    subject: `Your download: ${args.leadMagnetTitle}`,
    html,
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
