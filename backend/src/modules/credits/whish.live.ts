import { AppError } from "../../lib/errors.js";
import type {
  WhishCreateCheckoutInput,
  WhishGateway,
  WhishPaymentStatus,
} from "./whish.types.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const SANDBOX_BASE = "https://lb.sandbox.whish.money/itel-service/api";
const PRODUCTION_BASE = "https://whish.money/itel-service/api";

type LiveConfig = {
  channel: string;
  secret: string;
  websiteUrl: string;
  baseUrl: string;
};

type WhishEnvelope<T> = {
  status?: boolean;
  code?: string;
  dialog?: { title?: string; message?: string } | null;
  data?: T;
};

function defaultBaseUrl(): string {
  return process.env.NODE_ENV === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

function parseCollectStatus(raw: unknown): WhishPaymentStatus["collectStatus"] {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value === "success" || value === "failed" || value === "pending") {
    return value;
  }
  return "pending";
}

export class LiveWhishGateway implements WhishGateway {
  constructor(private readonly config: LiveConfig) {}

  async createCheckout(input: WhishCreateCheckoutInput) {
    const amount = input.amountUsdCents / 100;
    const body = {
      amount,
      currency: "USD",
      invoice: input.invoice,
      externalId: input.externalId,
      successCallbackUrl: input.successCallbackUrl,
      failureCallbackUrl: input.failureCallbackUrl,
      successRedirectUrl: input.successRedirectUrl,
      failureRedirectUrl: input.failureRedirectUrl,
    };
    const response = await this.request<
      WhishEnvelope<{ collectUrl?: string; whishUrl?: string }>
    >("/payment/whish", "POST", body);

    if (!response.status) {
      throw new AppError(
        502,
        response.dialog?.message ?? "Whish rejected the checkout request",
        response.code ?? "WHISH_CREATE_FAILED",
      );
    }

    const collectUrl = response.data?.collectUrl || response.data?.whishUrl;
    if (!collectUrl) {
      throw new AppError(
        502,
        "Whish did not return a checkout URL",
        "WHISH_NO_COLLECT_URL",
      );
    }
    return { collectUrl };
  }

  async getPaymentStatus(
    currency: string,
    externalId: number,
  ): Promise<WhishPaymentStatus> {
    const response = await this.request<
      WhishEnvelope<{
        collectStatus?: string;
        amount?: number;
        currency?: string;
        transactionId?: string;
      }>
    >("/payment/collect/status", "POST", { currency, externalId });

    if (!response.status || !response.data) {
      throw new AppError(
        502,
        response.dialog?.message ?? "Whish status lookup failed",
        response.code ?? "WHISH_STATUS_FAILED",
      );
    }

    return {
      collectStatus: parseCollectStatus(response.data.collectStatus),
      amount: response.data.amount,
      currency: response.data.currency ?? currency,
      transactionId: response.data.transactionId ?? null,
    };
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          channel: this.config.channel,
          secret: this.config.secret,
          websiteurl: this.config.websiteUrl,
        },
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new AppError(
          502,
          `Whish API returned HTTP ${response.status}`,
          "WHISH_BAD_RESPONSE",
        );
      }
      const data = (await response.json()) as T & {
        dialog?: { message?: string } | null;
        code?: string;
      };
      if (!response.ok) {
        throw new AppError(
          502,
          data.dialog?.message ?? `Whish API returned HTTP ${response.status}`,
          data.code ?? "WHISH_HTTP_ERROR",
        );
      }
      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new AppError(
        502,
        aborted ? "Whish API timed out" : "Could not reach Whish API",
        aborted ? "WHISH_TIMEOUT" : "WHISH_NETWORK",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createLiveWhishGateway(config: {
  channel: string;
  secret: string;
  websiteUrl: string;
  baseUrl?: string;
}): LiveWhishGateway {
  return new LiveWhishGateway({
    ...config,
    baseUrl: (config.baseUrl ?? defaultBaseUrl()).replace(/\/$/, ""),
  });
}
