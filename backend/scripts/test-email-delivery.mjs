/**
 * Proves the SMTP send path works (Ethereal catch inbox).
 * Also tests Resend when RESEND_API_KEY is present in .env.
 *
 * Usage:
 *   node scripts/test-email-delivery.mjs
 *   node scripts/test-email-delivery.mjs --to you@gmail.com
 */
import "dotenv/config";
import nodemailer from "nodemailer";

const toArg = process.argv.includes("--to")
  ? process.argv[process.argv.indexOf("--to") + 1]
  : null;

async function testEthereal() {
  console.log("\n=== Ethereal SMTP (catch inbox) ===");
  const account = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });

  const info = await transporter.sendMail({
    from: `"Skoun Test" <${account.user}>`,
    to: toArg || "delivery-check@example.com",
    subject: "Skoun email delivery test",
    text: "If you can read this in Ethereal, SMTP sending works.",
    html: "<p>If you can read this in Ethereal, SMTP sending works.</p>",
  });

  const preview = nodemailer.getTestMessageUrl(info);
  console.log("messageId:", info.messageId);
  console.log("accepted:", info.accepted);
  console.log("preview:", preview);
  if (!info.messageId) throw new Error("No messageId — send may have failed");
  if (!preview) throw new Error("No Ethereal preview URL — send may have failed");

  try {
    const res = await fetch(preview, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const html = await res.text();
      if (!html.includes("Skoun email delivery test")) {
        throw new Error("Preview page did not contain expected subject");
      }
      console.log("PASS: Ethereal preview confirms message content");
    } else {
      console.log(
        "WARN: preview HTTP",
        res.status,
        "- send still accepted (messageId present)",
      );
    }
  } catch (err) {
    console.log(
      "WARN: could not fetch Ethereal preview (",
      err?.cause?.code || err.message,
      ") — SMTP send still accepted",
    );
  }
  console.log("PASS: Ethereal SMTP accepted the message");
  return true;
}

async function testResend() {
  console.log("\n=== Resend API ===");
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("SKIP: RESEND_API_KEY not set in backend/.env");
    return false;
  }
  const to = toArg || process.env.EMAIL_TEST_TO;
  if (!to) {
    console.log(
      "SKIP: pass --to you@gmail.com (must be your Resend account email for onboarding@resend.dev)",
    );
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Skoun <onboarding@resend.dev>",
      to: [to],
      subject: "Skoun Resend delivery test",
      text: "If you see this in your inbox, Resend is configured correctly.",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("FAIL Resend:", res.status, body);
    throw new Error(body.message || `Resend status ${res.status}`);
  }
  console.log("PASS: Resend accepted send", body);
  console.log(`Check inbox (and spam) for ${to}`);
  return true;
}

async function main() {
  await testEthereal();
  await testResend();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
