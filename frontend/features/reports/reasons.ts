import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { ReportReason } from "./useReportListing";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type ReportReasonAccent = "danger" | "warning" | "primary";

export type ReportReasonOption = {
  value: ReportReason;
  label: string;
  hint: string;
  icon: IoniconName;
  accent: ReportReasonAccent;
};

export const REPORT_REASONS: ReportReasonOption[] = [
  {
    value: "fake",
    label: "Fake listing",
    hint: "Photos or details look fabricated or scammy",
    icon: "alert-circle-outline",
    accent: "danger",
  },
  {
    value: "inaccurate_utilities",
    label: "Utilities don’t match",
    hint: "Electricity, water, or Wi‑Fi isn’t as posted",
    icon: "flash-outline",
    accent: "warning",
  },
  {
    value: "already_rented",
    label: "Already rented",
    hint: "Taken, or no longer available to tour",
    icon: "home-outline",
    accent: "primary",
  },
];
