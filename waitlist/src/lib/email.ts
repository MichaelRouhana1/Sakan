import { Resend } from "resend";
import type { WaitlistRole } from "./constants";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendConfirmationEmail(input: {
  to: string;
  fullName: string;
  role: WaitlistRole;
  referralUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM;

  if (!resend || !from) {
    return { sent: false, error: "Resend is not configured" };
  }

  const firstName = input.fullName.split(" ")[0] || input.fullName;
  const isStudent = input.role === "student";

  const subject = isStudent
    ? "You're on the Studently waitlist"
    : "You're on the Studently landlord waitlist";

  const bodyHtml = isStudent
    ? `
      <p>Hey ${escapeHtml(firstName)},</p>
      <p>Thanks for joining Studently — we're building the easiest way for Lebanese students to find dorms and campus perks.</p>
      <p>We'll email you when early access opens.</p>
      <p>Want to move up the list? Share your personal link:<br/>
      <a href="${escapeHtml(input.referralUrl)}">${escapeHtml(input.referralUrl)}</a></p>
      <p>— Michael & the Studently team</p>
    `
    : `
      <p>Hey ${escapeHtml(firstName)},</p>
      <p>Thanks for joining the Studently landlord waitlist — we're helping hosts fill units with students without the WhatsApp chaos.</p>
      <p>We'll reach out when early listing access opens (free during beta).</p>
      <p>Know other landlords? Share your link:<br/>
      <a href="${escapeHtml(input.referralUrl)}">${escapeHtml(input.referralUrl)}</a></p>
      <p>— Michael & the Studently team</p>
    `;

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject,
      html: bodyHtml,
    });

    if (error) {
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Email failed",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
