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

export type ConfirmationArgs = {
  to: string;
  recipientFirstName?: string;
  companyName: string;
  gmailUser: string;
};

/**
 * MAtfIT is a fake-door / early-access campaign — there is no download to
 * deliver. This email simply confirms the prospect is on the early-access list.
 */
export async function sendConfirmationEmail(args: ConfirmationArgs): Promise<void> {
  const transporter = getTransporter();
  const greeting = args.recipientFirstName
    ? `Hallo ${escapeHtml(args.recipientFirstName)},`
    : "Hallo,";
  const company = escapeHtml(args.companyName || "MAtfIT");
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
      <p style="font-size: 16px; margin: 0 0 16px;">${greeting}</p>
      <p style="font-size: 16px; margin: 0 0 16px;">
        danke für dein Interesse an <strong>MAtfIT</strong> — deinem
        KI-Strategie-Consultant für die Business-Transformation.
      </p>
      <p style="font-size: 16px; margin: 0 0 24px;">
        Du stehst jetzt auf der <strong>Early-Access-Liste</strong>. Wir melden
        uns bei dir, sobald MAtfIT startet — du gehörst zu den Ersten, die dabei
        sind.
      </p>
      <p style="font-size: 14px; color: #555; margin: 0;">
        Bis dahin: Wenn du Fragen oder Wünsche an MAtfIT hast, antworte einfach
        auf diese E-Mail.
      </p>
      <p style="font-size: 14px; color: #555; margin: 24px 0 0;">— Das Team von ${company}</p>
    </div>
  `.trim();

  await transporter.sendMail({
    from: `"${args.companyName || "MAtfIT"}" <${args.gmailUser}>`,
    to: args.to,
    subject: "Danke für dein Interesse an MAtfIT — du bist auf der Liste",
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
