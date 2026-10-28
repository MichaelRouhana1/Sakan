/** Profile web CSS. Injected from ProfileWeb in SPA mode (`web.output: "single"`
 *  skips `app/+html.tsx`) and still inlined there for static export.
 *  RN Web strips `className` on View — target `nativeID` ids instead. */
export const PROFILE_CSS = `
#studently-profile {
  font-family: 'DM Sans', system-ui, sans-serif;
  color: #121826;
  -webkit-font-smoothing: antialiased;
}
#studently-profile [role="button"],
#studently-profile [role="link"] { cursor: pointer; }
#studently-profile [role="button"]:focus-visible,
#studently-profile [role="link"]:focus-visible {
  outline: 2px solid #2F6FED;
  outline-offset: 3px;
}

@keyframes sk-profile-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
#studently-profile > * {
  animation: sk-profile-in 460ms ease-out both;
}
#studently-profile > *:nth-child(1) { animation-delay: 0ms; }
#studently-profile > *:nth-child(2) { animation-delay: 40ms; }
#studently-profile > *:nth-child(3) { animation-delay: 90ms; }
#studently-profile > *:nth-child(4) { animation-delay: 140ms; }
#studently-profile > *:nth-child(5) { animation-delay: 190ms; }
#studently-profile > *:nth-child(6) { animation-delay: 230ms; }

#studently-profile-mosaic {
  display: flex;
  align-items: center;
  height: 128px;
}
#studently-profile-mosaic > * {
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
#studently-profile-mosaic > *:first-child { margin-left: 0; z-index: 3; }
#studently-profile-mosaic > *:nth-child(2) { z-index: 2; }
#studently-profile-mosaic > *:nth-child(3) { z-index: 1; }
#studently-profile-shortlist:hover #studently-profile-mosaic > *:nth-child(1) { transform: translateY(-4px); }
#studently-profile-shortlist:hover #studently-profile-mosaic > *:nth-child(2) { transform: translateY(-2px); }
#studently-profile-shortlist:hover #studently-profile-mosaic > *:nth-child(3) { transform: translateY(-1px); }

#studently-profile-dialog {
  max-height: min(72vh, 640px);
  overflow: auto;
  scrollbar-width: thin;
}

@media (max-width: 520px) {
  #studently-profile-mosaic { height: 96px; }
  #studently-profile-mosaic > * {
    width: 88px;
    height: 72px;
    margin-left: -20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #studently-profile > * { animation: none !important; }
  #studently-profile-mosaic > * { transition: none !important; }
  #studently-profile-shortlist:hover #studently-profile-mosaic > * { transform: none !important; }
}
`;
