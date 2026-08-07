import type { ReactNode } from "react";

const BG = "#EEF1F6";

/** Homepage motion + tokens — kept in +html so Expo Router does not treat it as a route module. */
const SKOUN_HOME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

:root {
  --sk-primary: #2F6FED;
  --sk-primary-deep: #121826;
  --sk-primary-soft: #A8C4F0;
  --sk-primary-mist: #E8EEF6;
  --sk-bg: #EEF1F6;
  --sk-bg-wash: #E2E8F0;
  --sk-surface: #FFFFFF;
  --sk-ink: #121826;
  --sk-muted: #5B6570;
  --sk-faint: #8B95A1;
  --sk-border: #C5CDD8;
  --sk-danger: #B42318;
  --sk-radius: 8px;
  --sk-radius-pill: 999px;
  --sk-pad-x: clamp(16px, 5vw, 80px);
  --sk-section-y: clamp(32px, 5vw, 48px);
  --sk-font: 'DM Sans', system-ui, sans-serif;
  --shine-degree: -120deg;
  --shine-color: rgba(255,255,255,.45);
}

.skoun-home {
  font-family: var(--sk-font);
  color: var(--sk-ink);
  background: var(--sk-bg);
  min-height: 100%;
  -webkit-font-smoothing: antialiased;
}

.skoun-home * { box-sizing: border-box; }

.skoun-home a { color: inherit; text-decoration: none; cursor: pointer; }
.skoun-home button { font-family: inherit; cursor: pointer; }

@keyframes sk-search-move {
  0% { opacity: 0; transform: translateY(100%); }
  33.33% { opacity: 1; transform: translateY(0); }
  66.67% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-100%); }
}

@keyframes sk-chip-shine {
  0% { left: -100%; }
  30%, 100% { left: 100%; }
}

@keyframes sk-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes sk-img-in {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes sk-ripple {
  to { opacity: 0; transform: scale(2.2); }
}

.sk-reveal { animation: sk-fade-up 0.55s ease both; }
.sk-img-anim { animation: sk-img-in 0.35s ease both; }
.sk-search-cycle { animation: sk-search-move 2.8s ease-in-out infinite; }

.sk-chip-shine::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 55%;
  height: 100%;
  background: linear-gradient(var(--shine-degree), transparent, var(--shine-color), transparent);
  animation: sk-chip-shine 4.2s ease-in-out infinite;
  pointer-events: none;
}

     .sk-rail {
       display: flex;
       gap: 12px;
       overflow-x: auto;
       scrollbar-width: none;
       -webkit-overflow-scrolling: touch;
       scroll-snap-type: x proximity;
       padding-bottom: 4px;
     }
     .sk-rail::-webkit-scrollbar { display: none; }

     .sk-cities-grid {
       overflow: hidden !important;
       overflow-x: hidden !important;
       scrollbar-width: none !important;
       -ms-overflow-style: none !important;
     }
     .sk-cities-grid::-webkit-scrollbar {
       display: none !important;
       width: 0 !important;
       height: 0 !important;
     }

     /* Amber popular-cities card (DevTools parity) */
     .sk-city-card {
       display: flex;
       position: relative;
       width: 100%;
       min-width: 0;
       border-radius: 8px;
       overflow: hidden;
       transition: opacity 0.2s ease-in-out;
     }
     .sk-city-card:hover { opacity: 0.92; }
     .sk-city-card__overlay {
       position: absolute;
       inset: 0;
       z-index: 1;
       pointer-events: none;
       background-image: linear-gradient(
         transparent 36.6%,
         rgba(0, 0, 0, 0.6) 100%
       );
     }
     .sk-city-card__text {
       position: absolute;
       bottom: 0;
       left: 0;
       width: 100%;
       z-index: 2;
       color: #fff !important;
       font-size: 16px !important;
       font-weight: 600 !important;
       text-align: center;
       padding: 8px 8px 10px;
       font-family: var(--sk-font);
     }

.sk-card:hover .sk-card-img { transform: scale(1.03); }

.sk-nav-solid {
  background: rgba(255,255,255,0.92) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--sk-border) !important;
  color: var(--sk-ink) !important;
}
.sk-nav-solid .sk-nav-link { color: var(--sk-muted) !important; }
.sk-nav-solid .sk-nav-brand { color: var(--sk-primary-deep) !important; }
.sk-nav-solid .sk-nav-cta {
  background: var(--sk-primary) !important;
  color: #fff !important;
}

@media (prefers-reduced-motion: reduce) {
  .sk-reveal, .sk-img-anim, .sk-search-cycle, .sk-chip-shine::after {
    animation: none !important;
  }
  .sk-card:hover .sk-card-img,
  .sk-tile:hover img {
    transform: none !important;
  }
}
`;

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#121826" />
        <meta
          name="description"
          content="Skoun — Lebanon rental classifieds. Find rooms and apartments by area or university, then connect on WhatsApp."
        />
        <title>Skoun — Housing in Lebanon</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
html, body, #root { height: 100%; min-height: 100%; }
#root, #root > div { min-height: 100%; display: flex; flex-direction: column; }
body {
  margin: 0;
  background-color: ${BG};
  overflow-y: auto;
  -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
a { text-decoration: none; color: inherit; }
button, [role="button"], [role="link"] { cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
${SKOUN_HOME_CSS}
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
