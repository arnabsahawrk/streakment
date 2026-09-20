/** Brevo transactional email. Chosen over Resend because it sends from a
 *  validated sender address without requiring a verified domain, and the
 *  free tier (300/day) never expires. */
const ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME ?? "Streakment",
        },
        to: [{ email: opts.to, name: opts.toName || opts.to }],
        subject: opts.subject,
        htmlContent: opts.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#14110E;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#1C1815;border:1px solid #2E2620;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 4px;color:#FF6B35;font-size:12px;font-weight:700;letter-spacing:2px">STREAKMENT</p>
<h1 style="margin:0 0 16px;color:#F2ECE3;font-size:20px">${title}</h1>
${bodyHtml}
<p style="margin:28px 0 0;color:#A79C8C;font-size:12px;border-top:1px solid #2E2620;padding-top:16px">
Keep the streakment alive. · <a href="https://streakment.vercel.app" style="color:#FF6B35;text-decoration:none">Open Streakment</a>
</p>
</td></tr></table></td></tr></table></body></html>`;
}
