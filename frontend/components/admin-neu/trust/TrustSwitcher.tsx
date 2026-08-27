import { Link, usePathname, useLocalSearchParams, type Href } from "expo-router";
import { H } from "../h";
import { TRUST_TABS, parseTrustTab, type TrustTab } from "./types";

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

export function TrustSwitcher() {
  const pathname = usePathname();
  const params = useLocalSearchParams<{
    tab?: string | string[];
    id?: string | string[];
    alert?: string | string[];
  }>();
  const selected = firstParam(params.id)
    ? "kyc"
    : firstParam(params.alert)
      ? "alerts"
      : parseTrustTab(firstParam(params.tab));

  return (
    <H
      className="neu-scroll inline-flex w-auto max-w-full self-start gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
      role="tablist"
      aria-label="Trust view"
    >
      {TRUST_TABS.map((tab) => {
        const active = selected === tab.id && pathname === "/admin/trust";
        const href =
          tab.id === "kyc" ? "/admin/trust" : `/admin/trust?tab=${tab.id}`;
        return (
          <Link
            key={tab.id}
            href={href as Href}
            role="tab"
            aria-selected={active}
            className={[
              "flex shrink-0 cursor-pointer items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press sm:px-4",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
              active
                ? "bg-clay-100 text-clay-900 shadow-press"
                : "bg-transparent text-clay-700",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </H>
  );
}

export function useTrustTab(): TrustTab {
  const params = useLocalSearchParams<{
    tab?: string | string[];
    id?: string | string[];
    alert?: string | string[];
  }>();
  if (firstParam(params.id)) return "kyc";
  if (firstParam(params.alert)) return "alerts";
  return parseTrustTab(firstParam(params.tab));
}
