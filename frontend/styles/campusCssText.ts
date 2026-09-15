import { TICKET_SHADOW } from "@/lib/ticketMask";

/** Campus web CSS. Injected from CampusShell in SPA mode (`web.output: "single"`
 *  skips `app/+html.tsx`) and still inlined there for static export. */
export const CAMPUS_CSS = `
.skoun-campus,
#skoun-campus {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: #F9FAFB;
  color: #121826;
  -webkit-font-smoothing: antialiased;
  -webkit-overflow-scrolling: touch;
}
.skoun-campus [role="button"],
.skoun-campus [role="link"],
#skoun-campus [role="button"],
#skoun-campus [role="link"] { cursor: pointer; }
@keyframes sk-campus-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.sk-campus-in { animation: sk-campus-in 240ms ease-out both; }
.sk-campus-bar {
  transform-origin: left center;
  transition: width 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.campus-ripple {
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
  -webkit-mask-image: radial-gradient(ellipse 92% 88% at 50% 18%, #000 16%, transparent 78%);
  mask-image: radial-gradient(ellipse 92% 88% at 50% 18%, #000 16%, transparent 78%);
}
.campus-ripple-grid {
  display: grid;
  margin-inline: auto;
}
.campus-ripple-cell {
  box-sizing: border-box;
  border: 0.5px solid #D5DCE7;
  background: rgba(47, 111, 237, 0.1);
  opacity: 0.4;
  cursor: pointer;
  will-change: opacity, background-color;
}
@media (hover: hover) and (pointer: fine) {
  .campus-ripple-cell:hover {
    opacity: 0.8;
    background: rgba(47, 111, 237, 0.18);
    transition: opacity 150ms ease, background-color 150ms ease;
  }
}
.campus-ripple-cell.is-rippling {
  animation-name: campus-cell-ripple;
  animation-duration: var(--duration, 200ms);
  animation-timing-function: ease-out;
  animation-delay: var(--delay, 0ms);
  animation-iteration-count: 1;
  animation-fill-mode: none;
}
@keyframes campus-cell-ripple {
  0% { opacity: 0.4; background: rgba(47, 111, 237, 0.1); }
  50% { opacity: 1; background: rgba(47, 111, 237, 0.28); }
  100% { opacity: 0.4; background: rgba(47, 111, 237, 0.1); }
}
.campus-cal-hero { animation: sk-campus-in 420ms ease-out both; }
.campus-cal-ticket { animation: sk-campus-in 480ms 70ms ease-out both; }
.campus-cal-board { animation: sk-campus-in 520ms 110ms ease-out both; }
@keyframes campus-cal-swap {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.campus-cal-month-swap { animation: campus-cal-swap 280ms ease-out both; }
.campus-cal-day,
.campus-cal-chip,
.campus-cal-month {
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}
.campus-cal-heat {
  transition: width 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.campus-cal-day:focus-visible,
.campus-cal-chip:focus-visible,
.campus-cal-month:focus-visible {
  outline: 2px solid #2F6FED;
  outline-offset: 2px;
  z-index: 2;
}
@media (max-width: 979px) {
  .campus-cal-hero { flex-direction: column !important; align-items: stretch !important; }
  .campus-cal-ticket { width: 100% !important; }
  .campus-cal-split { flex-direction: column !important; }
  .campus-cal-ledger { max-width: 100% !important; }
}
@media (max-width: 639px) {
  #skoun-campus, .skoun-campus { touch-action: manipulation; }
  .skoun-benefit-card-shadow {
    filter: ${TICKET_SHADOW};
    -webkit-filter: ${TICKET_SHADOW};
  }
}
@media (prefers-reduced-motion: reduce) {
  .skoun-campus *,
  #skoun-campus * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .sk-campus-in,
  .campus-cal-hero,
  .campus-cal-ticket,
  .campus-cal-board,
  .campus-cal-month-swap { animation: none !important; }
}
`;
