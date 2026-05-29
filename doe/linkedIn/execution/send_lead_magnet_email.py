import argparse
import json
import os
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv


def _build_html(first_name: str, drive_links: list[str]) -> str:
    buttons = ""
    for i, link in enumerate(drive_links):
        label = "Download your resource" if len(drive_links) == 1 else f"Download file {i + 1}"
        buttons += f"""
        <a href="{link}"
           style="display:inline-block;margin:8px 0;padding:14px 28px;
                  background:#c8a96e;color:#0a0a0a;font-family:Helvetica Neue,Arial,sans-serif;
                  font-size:14px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
                  text-decoration:none;border-radius:8px;">
          {label} →
        </a><br>"""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica Neue,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#080808;padding:32px 40px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#c8a96e;
                      letter-spacing:0.1em;text-transform:uppercase;">XoXoCom</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#080808;
                       line-height:1.2;">
              Your resource is ready, {first_name}.
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.7;">
              Thank you for signing up. Click the button below to access your free resource.
              If you have any questions, simply reply to this email.
            </p>

            {buttons}

            <p style="margin:32px 0 0;font-size:13px;color:#999;line-height:1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="color:#c8a96e;">{drive_links[0]}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
              © 2026 XoXoCom. You received this email because you signed up for a free resource.<br>
              To unsubscribe, reply with "unsubscribe" in the subject line.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_lead_magnet_email(first_name: str, last_name: str, email: str, drive_links: list[str]) -> dict:
    load_dotenv()

    gmail_user = os.environ.get("GMAIL_USER")
    gmail_pass = os.environ.get("GMAIL_APP_PASSWORD")
    if not gmail_user or not gmail_pass:
        raise EnvironmentError("GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env")

    html = _build_html(first_name, drive_links)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your free resource is here, {first_name} 🎁"
    msg["From"] = f"XoXoCom <{gmail_user}>"
    msg["To"] = email
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.ehlo()
        server.starttls()
        server.login(gmail_user, gmail_pass)
        server.sendmail(gmail_user, email, msg.as_string())

    return {"status": "sent"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send lead magnet email via Gmail SMTP")
    parser.add_argument("--first-name", required=True)
    parser.add_argument("--last-name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--drive-links", nargs="+", required=True,
                        help="One or more Google Drive download URLs")
    args = parser.parse_args()

    try:
        result = send_lead_magnet_email(
            args.first_name, args.last_name, args.email, args.drive_links
        )
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}), file=sys.stderr)
        sys.exit(1)
