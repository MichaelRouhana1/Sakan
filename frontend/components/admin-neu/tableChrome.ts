/**
 * Shared neumorphic chrome for admin list/table rows.
 * Keep these literal class strings in source so `npm run admin:css` emits them.
 */

/** Outer well holding head + stacked rows. */
export const ADMIN_TABLE_WELL =
  "min-w-0 overflow-hidden rounded-neu bg-clay-100 p-3 shadow-neu-in";

/** Column header strip (no hairline border). */
export const ADMIN_TABLE_HEAD =
  "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-clay-700";

/** Vertical stack of extruded rows. */
export const ADMIN_TABLE_STACK = "flex flex-col gap-2.5";

/** Space under a column header before the stack. */
export const ADMIN_TABLE_STACK_AFTER_HEAD = "mt-2 flex flex-col gap-2.5";

/** Single data row — extruded neu so rows separate from each other. */
export const ADMIN_TABLE_ROW =
  "rounded-neu-md bg-clay-100 px-4 py-3.5 shadow-neu-sm transition-shadow duration-press sm:px-5";

/** Interactive row affordances. */
export const ADMIN_TABLE_ROW_INTERACTIVE =
  "cursor-pointer hover:shadow-neu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

/** Selected / active row. */
export const ADMIN_TABLE_ROW_SELECTED = "shadow-glow-moss";
