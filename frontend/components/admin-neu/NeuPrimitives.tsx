import type { ReactNode } from "react";
import { H } from "./h";

type ButtonTone = "plain" | "moss" | "ember" | "ochre";

const TONE: Record<ButtonTone, string> = {
  plain:
    "text-clay-900 hover:text-clay-900 focus-visible:outline-moss",
  moss: "text-moss hover:text-moss focus-visible:outline-moss",
  ember: "text-ember hover:text-ember focus-visible:outline-ember",
  ochre: "text-ochre hover:text-ochre focus-visible:outline-ochre",
};

type NeuButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  inset?: boolean;
  type?: "button" | "submit";
  className?: string;
  ariaLabel?: string;
};

export function NeuButton({
  children,
  onClick,
  disabled,
  tone = "plain",
  inset = false,
  type = "button",
  className = "",
  ariaLabel,
}: NeuButtonProps) {
  return (
    <H
      as="button"
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-neu-md px-3.5 py-2 text-sm font-medium transition-shadow duration-press",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "active:shadow-press disabled:cursor-not-allowed disabled:opacity-40",
        inset ? "bg-clay-100 shadow-neu-in-sm" : "bg-clay-100 shadow-neu-sm",
        TONE[tone],
        className,
      ].join(" ")}
    >
      {children}
    </H>
  );
}

export function NeuIconButton({
  children,
  onClick,
  disabled,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <H
      as="button"
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-clay-100 text-clay-900 shadow-neu-sm",
        "transition-shadow duration-press active:shadow-press",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      ].join(" ")}
    >
      {children}
    </H>
  );
}

export function NeuSurface({
  children,
  inset = false,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  inset?: boolean;
  className?: string;
  as?: "div" | "section" | "aside";
}) {
  return (
    <H
      as={as}
      className={[
        "rounded-neu bg-clay-100",
        inset ? "shadow-neu-in" : "shadow-neu",
        className,
      ].join(" ")}
    >
      {children}
    </H>
  );
}
