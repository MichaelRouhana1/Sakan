import { createElement } from "react";

export function ThinkingLabel() {
  return createElement(
    "span",
    {
      className: "skoun-thinking",
      "data-text": "Thinking...",
      role: "status",
    },
    "Thinking...",
  );
}
