import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { loadEnv, type Env } from "../config/env.js";

export type EmailDeliveryMode = "resend" | "smtp" | "outbox";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = {
  deliveryMode: EmailDeliveryMode;
  /** Present only for outbox — relative path hint, never includes code. */
  outboxHint?: string;
};

/**
 * Sends transactional email.
 * Never log message bodies (may contain verification codes).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const env = loadEnv();
  const from = env.EMAIL_FROM ?? defaultFrom(env);
  const transport = resolveTransport(env);

  if (transport === "resend") {
    const messageId = await sendViaResend({
      apiKey: env.RESEND_API_KEY!,
      from,
      ...input,
    });
    console.info(`[mailer] Sent via Resend to ${input.to} id=${messageId}`);
    return { deliveryMode: "resend" };
  }

  if (transport === "smtp") {
    await sendViaSmtp(env, { from, ...input });
    console.info(`[mailer] Sent via SMTP to ${input.to}`);
    return { deliveryMode: "smtp" };
  }

  const outboxHint = await writeOutboxEmail({ from, ...input });
  console.info(
    `[mailer] No live email API configured — wrote outbox for ${input.to} (${outboxHint})`,
  );
  return { deliveryMode: "outbox", outboxHint };
}

export function getEmailDeliveryMode(env: Env = loadEnv()): EmailDeliveryMode {
  return resolveTransport(env);
}

function defaultFrom(env: Env): string {
  if (env.SMTP_USER) return `Skoun <${env.SMTP_USER}>`;
  return "Skoun <onboarding@resend.dev>";
}

function resolveTransport(env: Env): EmailDeliveryMode {
  if (env.EMAIL_TRANSPORT === "resend") {
    if (!env.RESEND_API_KEY) {
      throw new Error("EMAIL_TRANSPORT=resend requires RESEND_API_KEY");
    }
    return "resend";
  }
  if (env.EMAIL_TRANSPORT === "smtp") {
    assertSmtpConfig(env);
    return "smtp";
  }
  if (env.EMAIL_TRANSPORT === "outbox") {
    return "outbox";
  }

  // auto
  if (env.RESEND_API_KEY) return "resend";
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return "smtp";
  if (env.NODE_ENV === "production") {
    throw new Error(
      "No email transport configured. Set RESEND_API_KEY or SMTP_* credentials.",
    );
  }
  return "outbox";
}

function assertSmtpConfig(env: Env): void {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error(
      "EMAIL_TRANSPORT=smtp requires SMTP_HOST, SMTP_USER, and SMTP_PASS",
    );
  }
}

async function sendViaResend(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<string> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!res.ok) {
    const detail = body.message ? `: ${body.message}` : "";
    throw new Error(`Resend rejected the request (${res.status})${detail}`);
  }

  return body.id ?? "unknown";
}

async function sendViaSmtp(
  env: Env,
  input: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  },
): Promise<void> {
  assertSmtpConfig(env);
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
    },
  });

  await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

async function writeOutboxEmail(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<string> {
  const dir = path.join(process.cwd(), ".email-outbox");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${stamp}-${safeFilePart(input.to)}.txt`;
  const file = path.join(dir, fileName);
  const body = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "",
    input.text,
  ].join("\n");
  await writeFile(file, body, "utf8");
  return path.join(".email-outbox", fileName);
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 64);
}
