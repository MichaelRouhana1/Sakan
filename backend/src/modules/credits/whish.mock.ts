import { NotFoundError } from "../../lib/errors.js";
import type {
  WhishCreateCheckoutInput,
  WhishMockGateway,
  WhishMockOutcome,
  WhishPaymentStatus,
} from "./whish.types.js";

type MockPayment = {
  collectStatus: WhishPaymentStatus["collectStatus"];
  amount: number;
  currency: string;
  referenceId: string;
  transactionId: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMockCheckoutPage(input: {
  referenceId: string;
  amountLabel: string;
  completePath: string;
  returnTo?: string;
}): string {
  const referenceId = escapeHtml(input.referenceId);
  const amountLabel = escapeHtml(input.amountLabel);
  const completePath = escapeHtml(input.completePath);
  const returnTo = input.returnTo ? escapeHtml(input.returnTo) : null;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Skoun mock checkout</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: "Segoe UI", system-ui, sans-serif;
        background: #f4f7fb;
        color: #121826;
      }
      main {
        width: min(420px, calc(100% - 32px));
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 10px 30px rgb(18 24 38 / 6%);
      }
      h1 { font-size: 22px; margin: 0 0 8px; }
      p { margin: 0 0 12px; color: #5b6472; line-height: 1.45; }
      .ref { font-family: ui-monospace, monospace; font-size: 13px; }
      form { margin-top: 20px; }
      button {
        width: 100%;
        border: 0;
        border-radius: 10px;
        padding: 12px 14px;
        font-weight: 600;
        cursor: pointer;
        background: #2f6fed;
        color: #fff;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Mock Whish checkout</h1>
      <p>Local development only. This page stands in for Whish Pay until merchant credentials are set.</p>
      <p><strong>${amountLabel}</strong></p>
      <p class="ref">Reference ${referenceId}</p>
      <form method="post" action="${completePath}">
        <input type="hidden" name="referenceId" value="${referenceId}" />
        <input type="hidden" name="outcome" value="success" />
        ${returnTo ? `<input type="hidden" name="returnTo" value="${returnTo}" />` : ""}
        <button type="submit">Pay</button>
      </form>
    </main>
  </body>
</html>`;
}

export class MockWhishGateway implements WhishMockGateway {
  readonly isMock = true as const;
  private readonly payments = new Map<number, MockPayment>();

  constructor(private readonly publicApiBase: string) {}

  async createCheckout(input: WhishCreateCheckoutInput) {
    this.payments.set(input.externalId, {
      collectStatus: "pending",
      amount: input.amountUsdCents / 100,
      currency: "USD",
      referenceId: input.referenceId,
      transactionId: null,
    });
    const collectUrl = new URL("/api/credits/whish/mock/checkout", this.publicApiBase);
    collectUrl.searchParams.set("referenceId", input.referenceId);
    const returnTo = new URL(input.successRedirectUrl).searchParams.get("returnTo");
    if (returnTo) collectUrl.searchParams.set("returnTo", returnTo);
    return { collectUrl: collectUrl.toString() };
  }

  async getPaymentStatus(
    _currency: string,
    externalId: number,
  ): Promise<WhishPaymentStatus> {
    const row = this.payments.get(externalId);
    if (!row) {
      throw new NotFoundError("Mock Whish payment not found");
    }
    return {
      collectStatus: row.collectStatus,
      amount: row.amount,
      currency: row.currency,
      transactionId: row.transactionId,
    };
  }

  complete(externalId: number, outcome: WhishMockOutcome) {
    const row = this.payments.get(externalId);
    if (!row) {
      throw new NotFoundError("Mock Whish payment not found");
    }
    row.collectStatus = outcome;
    row.transactionId = `mock_${externalId}`;
  }
}
