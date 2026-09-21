import { Expo } from "expo-server-sdk";
import { loadEnv } from "../../config/env.js";
import {
  expiryNotificationsRepository,
  type ExpiryCandidate,
  type NotificationKind,
} from "./expiry-notifications.repository.js";

type DeliveryStats = { sent: number; skipped: number; failed: number };

function cleanEmails(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char] ?? char;
  });
}

function hostName(candidate: ExpiryCandidate) {
  return (
    [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") ||
    candidate.contactName ||
    "Host"
  );
}

function candidateWhatsapp(candidate: ExpiryCandidate): string | null {
  if (candidate.whatsappNumber) return candidate.whatsappNumber;
  if (Array.isArray(candidate.contactNumbers)) {
    const match = candidate.contactNumbers.find(
      (number): number is { e164: string; whatsapp: boolean } =>
        Boolean(
          number &&
            typeof number === "object" &&
            "whatsapp" in number &&
            number.whatsapp === true &&
            "e164" in number &&
            typeof number.e164 === "string",
        ),
    );
    if (match) return match.e164;
  }
  return candidate.contactPhone;
}

function hostCopy(kind: Exclude<NotificationKind, "admin_escalation">) {
  if (kind === "pre_expiry") {
    return {
      subject: "Your listing expires soon",
      title: "Your listing expires soon. Still available?",
      body: "Review it now so renters see accurate information.",
    };
  }
  return {
    subject: "Was your listing rented?",
    title: "Was it rented?",
    body: "Tell us what happened or renew your listing.",
  };
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}) {
  const env = loadEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return { skipped: true as const, reason: "Resend is not configured" };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(payload.message || `Resend returned HTTP ${response.status}`);
  }
  return { skipped: false as const, id: payload.id ?? null };
}

export class ExpiryNotificationsService {
  private expo = new Expo({ accessToken: loadEnv().EXPO_ACCESS_TOKEN });

  private retryAt(attempts: number) {
    const minutes = Math.min(60, 2 ** Math.max(0, attempts) * 5);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  async sendHost(
    candidate: ExpiryCandidate,
    kind: "pre_expiry" | "expiry_prompt",
  ): Promise<DeliveryStats> {
    const stats: DeliveryStats = { sent: 0, skipped: 0, failed: 0 };
    const copy = hostCopy(kind);
    const route = `/hosting/listing/${candidate.listingId}/outcome`;

    if (candidate.expiryPushEnabled) {
      const tokens = await expiryNotificationsRepository.activePushTokens(
        candidate.posterId,
      );
      for (const { token } of tokens) {
        const delivery = await expiryNotificationsRepository.claimDelivery({
          listingId: candidate.listingId,
          cycleExpiresAt: candidate.cycleExpiresAt,
          kind,
          channel: "push",
          recipientKey: token,
          now: new Date(),
        });
        if (!delivery) continue;
        if (!Expo.isExpoPushToken(token)) {
          await expiryNotificationsRepository.finishDelivery(delivery.id, {
            status: "skipped",
            error: "Invalid Expo push token",
          });
          await expiryNotificationsRepository.deactivatePushToken(token);
          stats.skipped += 1;
          continue;
        }
        try {
          const [ticket] = await this.expo.sendPushNotificationsAsync([
            {
              to: token,
              sound: "default",
              title: copy.title,
              body: copy.body,
              channelId: "listing-expiry",
              data: { path: route, listingId: candidate.listingId },
            },
          ]);
          if (!ticket || ticket.status === "error") {
            const error = ticket?.message ?? "Expo did not return a push ticket";
            const terminal = ticket?.details?.error === "DeviceNotRegistered";
            await expiryNotificationsRepository.finishDelivery(delivery.id, {
              status: terminal ? "skipped" : "failed",
              error,
              retryAt: terminal ? null : this.retryAt(delivery.attempts),
            });
            if (terminal) {
              await expiryNotificationsRepository.deactivatePushToken(token);
              stats.skipped += 1;
            } else stats.failed += 1;
          } else {
            await expiryNotificationsRepository.finishDelivery(delivery.id, {
              status: "sent",
              providerMessageId: ticket.id,
            });
            stats.sent += 1;
          }
        } catch (error) {
          await expiryNotificationsRepository.finishDelivery(delivery.id, {
            status: "failed",
            error: error instanceof Error ? error.message : "Push send failed",
            retryAt: this.retryAt(delivery.attempts),
          });
          stats.failed += 1;
        }
      }
    }

    if (candidate.expiryEmailEnabled && candidate.userEmail) {
      const email = candidate.userEmail.trim().toLowerCase();
      const delivery = await expiryNotificationsRepository.claimDelivery({
        listingId: candidate.listingId,
        cycleExpiresAt: candidate.cycleExpiresAt,
        kind,
        channel: "email",
        recipientKey: email,
        now: new Date(),
      });
      if (delivery) {
        try {
          const base = loadEnv().FRONTEND_PUBLIC_URL ?? "http://localhost:8081";
          const url = new URL(route, base).toString();
          const result = await sendResendEmail({
            to: email,
            subject: copy.subject,
            idempotencyKey: `listing-${candidate.listingId}-${candidate.cycleExpiresAt.toISOString()}-${kind}`,
            html: `<p>Hi ${escapeHtml(hostName(candidate))},</p><p>${escapeHtml(copy.body)}</p><p><strong>${escapeHtml(candidate.title)}</strong> · ${escapeHtml(candidate.area)}</p><p><a href="${escapeHtml(url)}">Review listing status</a></p>`,
          });
          await expiryNotificationsRepository.finishDelivery(delivery.id, {
            status: result.skipped ? "skipped" : "sent",
            providerMessageId: result.skipped ? null : result.id,
            error: result.skipped ? result.reason : null,
          });
          if (result.skipped) stats.skipped += 1;
          else stats.sent += 1;
        } catch (error) {
          await expiryNotificationsRepository.finishDelivery(delivery.id, {
            status: "failed",
            error: error instanceof Error ? error.message : "Email send failed",
            retryAt: this.retryAt(delivery.attempts),
          });
          stats.failed += 1;
        }
      }
    }
    return stats;
  }

  async escalate(candidate: ExpiryCandidate): Promise<DeliveryStats> {
    const stats: DeliveryStats = { sent: 0, skipped: 0, failed: 0 };
    const inbox = await expiryNotificationsRepository.claimDelivery({
      listingId: candidate.listingId,
      cycleExpiresAt: candidate.cycleExpiresAt,
      kind: "admin_escalation",
      channel: "admin_inbox",
      recipientKey: "ops",
      now: new Date(),
    });
    if (inbox) {
      await expiryNotificationsRepository.finishDelivery(inbox.id, {
        status: "sent",
      });
      stats.sent += 1;
    }

    const env = loadEnv();
    const route = `/admin/expired?id=${encodeURIComponent(candidate.listingId)}`;
    const adminUrl = new URL(
      route,
      env.FRONTEND_PUBLIC_URL ?? "http://localhost:8081",
    ).toString();
    const phone = candidateWhatsapp(candidate) ?? "Not stored";
    const state = candidate.triggerEvent === "improve_intent"
      ? "Improve intent; renewal not completed"
      : candidate.triggerEvent === "renew_intent"
        ? "Still available; renewal not completed"
        : "No host outcome";
    for (const email of cleanEmails(env.ADMIN_NOTIFICATION_EMAILS)) {
      const delivery = await expiryNotificationsRepository.claimDelivery({
        listingId: candidate.listingId,
        cycleExpiresAt: candidate.cycleExpiresAt,
        kind: "admin_escalation",
        channel: "email",
        recipientKey: `admin:${email}`,
        now: new Date(),
      });
      if (!delivery) continue;
      try {
        const result = await sendResendEmail({
          to: email,
          subject: `Expiry follow-up: ${candidate.title}`,
          idempotencyKey: `admin-expiry-${candidate.listingId}-${candidate.cycleExpiresAt.toISOString()}-${email}`,
          html: `<p>A listing needs manual expiry follow-up.</p><ul><li>ID: ${escapeHtml(candidate.listingId)}</li><li>Listing: ${escapeHtml(candidate.title)}</li><li>Host: ${escapeHtml(hostName(candidate))}</li><li>WhatsApp/contact: ${escapeHtml(phone)}</li><li>State: ${escapeHtml(state)}</li></ul><p><a href="${escapeHtml(adminUrl)}">Open the admin follow-up</a></p>`,
        });
        await expiryNotificationsRepository.finishDelivery(delivery.id, {
          status: result.skipped ? "skipped" : "sent",
          providerMessageId: result.skipped ? null : result.id,
          error: result.skipped ? result.reason : null,
        });
        if (result.skipped) stats.skipped += 1;
        else stats.sent += 1;
      } catch (error) {
        await expiryNotificationsRepository.finishDelivery(delivery.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Admin email failed",
          retryAt: this.retryAt(delivery.attempts),
        });
        stats.failed += 1;
      }
    }
    return stats;
  }

  async checkPushReceipts() {
    const pending = await expiryNotificationsRepository.uncheckedPushReceipts();
    const ids = pending
      .map((item) => item.receiptId)
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return { checked: 0, failed: 0 };
    const receipts = await this.expo.getPushNotificationReceiptsAsync(ids);
    let failed = 0;
    for (const item of pending) {
      if (!item.receiptId) continue;
      const receipt = receipts[item.receiptId];
      if (!receipt) continue;
      if (receipt.status === "error") {
        failed += 1;
        await expiryNotificationsRepository.markReceipt(
          item.id,
          receipt.message,
        );
        if (receipt.details?.error === "DeviceNotRegistered") {
          await expiryNotificationsRepository.deactivatePushToken(item.token);
        }
      } else {
        await expiryNotificationsRepository.markReceipt(item.id);
      }
    }
    return { checked: pending.length, failed };
  }
}

export const expiryNotificationsService = new ExpiryNotificationsService();
