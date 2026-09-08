/** Profile web CSS. Injected from ProfileWeb in SPA mode (`web.output: "single"`
 *  skips `app/+html.tsx`) and still inlined there for static export.
 *  RN Web strips `className` on View — target `nativeID` ids instead. */
export const PROFILE_CSS = `
#skoun-profile {
  font-family: 'DM Sans', system-ui, sans-serif;
  color: #121826;
  -webkit-font-smoothing: antialiased;
}
#skoun-profile [role="button"],
#skoun-profile [role="link"] { cursor: pointer; }
#skoun-profile [role="button"]:focus-visible,
#skoun-profile [role="link"]:focus-visible {
  outline: 2px solid #2F6FED;
  outline-offset: 3px;
}

@keyframes sk-profile-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
#skoun-profile > * {
  animation: sk-profile-in 460ms ease-out both;
}
#skoun-profile > *:nth-child(1) { animation-delay: 0ms; }
#skoun-profile > *:nth-child(2) { animation-delay: 40ms; }
#skoun-profile > *:nth-child(3) { animation-delay: 90ms; }
#skoun-profile > *:nth-child(4) { animation-delay: 140ms; }
#skoun-profile > *:nth-child(5) { animation-delay: 190ms; }
#skoun-profile > *:nth-child(6) { animation-delay: 230ms; }

#skoun-profile-mosaic {
  display: flex;
  align-items: center;
  height: 128px;
}
#skoun-profile-mosaic > * {
  position: relative;
  width: 152px;
  height: 112px;
  margin-left: -36px;
  border-radius: 10px;
  overflow: hidden;
  background: #E8EEF6;
  border: 2px solid #FFFFFF;
  box-shadow: 0 10px 24px rgba(18, 24, 38, 0.12);
  transition: transform 200ms ease;
}
#skoun-profile-mosaic > *:first-child { margin-left: 0; z-index: 3; }
#skoun-profile-mosaic > *:nth-child(2) { z-index: 2; }
#skoun-profile-mosaic > *:nth-child(3) { z-index: 1; }
#skoun-profile-shortlist:hover #skoun-profile-mosaic > *:nth-child(1) { transform: translateY(-4px); }
#skoun-profile-shortlist:hover #skoun-profile-mosaic > *:nth-child(2) { transform: translateY(-2px); }
#skoun-profile-shortlist:hover #skoun-profile-mosaic > *:nth-child(3) { transform: translateY(-1px); }

#skoun-profile-dialog {
  max-height: min(72vh, 640px);
  overflow: auto;
  scrollbar-width: thin;
}

@media (max-width: 520px) {
  #skoun-profile-mosaic { height: 96px; }
  #skoun-profile-mosaic > * {
    width: 88px;
    height: 72px;
    margin-left: -20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #skoun-profile > * { animation: none !important; }
  #skoun-profile-mosaic > * { transition: none !important; }
  #skoun-profile-shortlist:hover #skoun-profile-mosaic > * { transform: none !important; }
}
`;
