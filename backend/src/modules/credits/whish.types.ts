export type WhishCollectStatus = "success" | "failed" | "pending";

export type WhishCreateCheckoutInput = {
  amountUsdCents: number;
  invoice: string;
  externalId: number;
  referenceId: string;
  successCallbackUrl: string;
  failureCallbackUrl: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
};

export type WhishCreateCheckoutResult = {
  collectUrl: string;
};

export type WhishPaymentStatus = {
  collectStatus: WhishCollectStatus;
  amount?: number;
  currency?: string;
  transactionId?: string | null;
};

export interface WhishGateway {
  createCheckout(
    input: WhishCreateCheckoutInput,
  ): Promise<WhishCreateCheckoutResult>;
  getPaymentStatus(
    currency: string,
    externalId: number,
  ): Promise<WhishPaymentStatus>;
}

export type WhishMockOutcome = "success" | "failed";

export interface WhishMockGateway extends WhishGateway {
  readonly isMock: true;
  complete(externalId: number, outcome: WhishMockOutcome): void;
}

export function isWhishMockGateway(
  gateway: WhishGateway,
): gateway is WhishMockGateway {
  return "isMock" in gateway && (gateway as WhishMockGateway).isMock === true;
}
