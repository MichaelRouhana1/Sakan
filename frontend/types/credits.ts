export type CreditTxStatus = "pending" | "approved" | "rejected" | "expired";

export type CreditBundleType = "starter" | "bundle_5" | "boost_pack" | "custom";

export type PaymentChannel = "whish" | "omt";

export type CreditTransaction = {
  id: string;
  userId: string;
  referenceId: string;
  status: CreditTxStatus;
  bundleType: CreditBundleType;
  postCreditsDelta: number;
  boostCreditsDelta: number;
  amountUsdCents: number;
  channel: PaymentChannel;
  providerExternalId?: string | null;
  providerTransactionId?: string | null;
  checkoutUrl?: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
