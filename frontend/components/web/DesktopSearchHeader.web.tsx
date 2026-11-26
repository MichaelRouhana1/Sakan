import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useIsFocused } from 'expo-router/react-navigation';
import { useDesktopDesign } from '@/components/ui/DesktopDesign';
import { DesktopScaleToggle } from '@/components/ui/DesktopScaleToggle';
import { DESKTOP_SEARCH_MOTION as M, DESKTOP_SEARCH_HEADER as H } from '@/constants/desktopSearchMotion';

const CSS = `
.sdh{height:calc(${H.height}px * var(--ds));min-height:calc(${H.height}px * var(--ds));flex-shrink:0;position:sticky;top:0;z-index:200;overflow:visible}
.sdh[data-home=true]{position:fixed;top:0;left:0;right:0;visibility:hidden;opacity:0;transform:${M.headerHiddenTransform};pointer-events:none;transition:transform ${M.headerSlideMs}ms ${M.ease},opacity ${M.headerFadeMs}ms ${M.fadeEase},visibility 0s ${M.headerSlideMs}ms}
.sdh[data-home=true][data-visible=true]{visibility:visible;opacity:1;transform:${M.headerVisibleTransform};pointer-events:auto;transition:transform ${M.headerSlideMs}ms ${M.ease},opacity ${M.headerFadeMs}ms ${M.fadeEase},visibility 0s}
.sdh::before{content:"";position:absolute;top:100%;left:0;right:0;height:calc(100vh - ${H.height}px * var(--ds));background:rgba(17,25,40,.18);z-index:-1;opacity:0;pointer-events:none;transition:opacity ${M.scrimMs}ms ${M.fadeEase}}.sdh:has([data-open=true]){z-index:10000001}.sdh:has([data-open=true])::before{opacity:1}
.sdh-scale{position:fixed;left:calc(16px * var(--ds));bottom:calc(16px * var(--ds));z-index:300;background:#fff;border:1px solid #e5e7eb;border-radius:999px;box-shadow:0 3px 16px #11192818;font-family:'DMSans_400Regular','DM Sans',sans-serif}
.sdh-scale [role=button]{min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center}
@media(prefers-reduced-motion:reduce){.sdh,.sdh::before{transition:none!important}}
`;
export function DesktopSearchHeader({children,home=false,visible=true}:{children:ReactNode;home?:boolean;visible?:boolean}) {
 const {scale}=useDesktopDesign();const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(ref.current)ref.current.inert=!visible;},[visible]);
 return <><style>{CSS}</style><div ref={ref} className="sdh" role="banner" data-desktop-header data-home={home} data-visible={visible} aria-hidden={!visible||undefined} inert={!visible||undefined} style={{'--ds':scale} as CSSProperties}>{children}</div></>;
}
export function FloatingDesktopScaleControl(){
 const {scale,isDesktop}=useDesktopDesign();
 const isFocused=useIsFocused();
 if(!__DEV__||!isDesktop||!isFocused||typeof document==='undefined')return null;
 return createPortal(<div className="sdh-scale" data-testid="desktop-scale-toggle" style={{'--ds':scale} as CSSProperties}><DesktopScaleToggle/></div>,document.body);
}
