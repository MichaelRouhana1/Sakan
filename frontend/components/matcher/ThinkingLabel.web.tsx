import { createElement } from "react";

export function ThinkingLabel() {
  return createElement(
    "span",
    {
      className: "studently-thinking",
      "data-text": "Thinking...",
      role: "status",
    },
    "Thinking...",
  );
}
