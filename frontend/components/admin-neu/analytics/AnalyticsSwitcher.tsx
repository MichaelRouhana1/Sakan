import { Link, usePathname, type Href } from "expo-router";
import { H } from "../h";

const TABS = [
  { href: "/admin/analytics", label: "User Trends" },
  { href: "/admin/conversion", label: "Listing Conversion" },
] as const;

export function AnalyticsSwitcher() {
  const pathname = usePathname();

  return (
    <H
      className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
      role="tablist"
      aria-label="Analytics view"
    >
      {TABS.map((tab) => {
        const selected = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href as Href}
            role="tab"
            aria-selected={selected}
            className={[
              "flex shrink-0 cursor-pointer items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press sm:px-4",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
              selected
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
