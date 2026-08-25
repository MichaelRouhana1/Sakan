import { createElement, type ElementType, type ReactNode } from "react";

type HProps = {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
};

/** Web DOM node for admin Tailwind classes. Used only from `.web.tsx` trees. */
export function H({ as = "div", children, ...props }: HProps) {
  return createElement(as, props, children);
}
