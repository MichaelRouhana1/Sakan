import type { CreditBundleType } from "@/types/credits";

export type BundleDisplay = {
  type: Exclude<CreditBundleType, "custom">;
  title: string;
  description: string;
  amountUsd: number;
  postCredits: number;
  boostCredits: number;
};

export const CREDIT_BUNDLES: BundleDisplay[] = [
  {
    type: "starter",
    title: "$10 Starter",
    description: "1 post credit — 30 days live",
    amountUsd: 10,
    postCredits: 1,
    boostCredits: 0,
  },
  {
    type: "bundle_5",
    title: "$15 for 5 Credits",
    description: "5 post credits",
    amountUsd: 15,
    postCredits: 5,
    boostCredits: 0,
  },
  {
    type: "boost_pack",
    title: "Boost Pack",
    description: "3 boost credits — 7 days pin each",
    amountUsd: 10,
    postCredits: 0,
    boostCredits: 3,
  },
];
