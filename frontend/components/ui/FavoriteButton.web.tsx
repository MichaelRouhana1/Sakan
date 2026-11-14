// Animation adapted from React Bits' Pulse Heart (David Haz).
// https://reactbits.dev/micro/pulse-heart — see FavoriteButton.LICENSE.md.
import {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useReducedMotion} from '@/lib/useReducedMotion';
import {favoriteColor, favoriteIdleColor, favoritePulse, type FavoriteButtonProps} from './FavoriteButton.types';
import './FavoriteButton.css';

const HEART = 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z';
const back = (t:number) => {const u=t-1;return 1+(favoritePulse.overshoot+1)*u**3+favoritePulse.overshoot*u**2;};

export function FavoriteButton({saved,onPress,disabled=false,accessibilityLabel,iconSize=20,style}:FavoriteButtonProps) {
  const reduced=useReducedMotion();
  const [shown,setShown]=useState(saved);
  const previous=useRef(saved);
  const glyph=useRef<SVGGElement>(null);
  const surface=useRef<HTMLSpanElement>(null);
  const button=useRef<HTMLButtonElement>(null);
  const frame=useRef(0);

  useEffect(()=>{
    const changed=previous.current!==saved;
    previous.current=saved;
    cancelAnimationFrame(frame.current);
    const reset=()=>{glyph.current?.removeAttribute('transform');if(surface.current)surface.current.style.transform='';button.current?.removeAttribute('data-running');};
    if(!changed||reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches){reset();setShown(saved);return;}
    reset();button.current?.setAttribute('data-running','');
    const started=performance.now();let swapped=false;
    const tick=(now:number)=>{
      const t=Math.min(1,(now-started)/favoritePulse.duration);
      const swell=t<favoritePulse.swapAt?1-(1-t/favoritePulse.swapAt)**3:1-back((t-favoritePulse.swapAt)/(1-favoritePulse.swapAt));
      const scale=1-(1-favoritePulse.dotSize)*swell;
      glyph.current?.setAttribute('transform',`translate(12 12) scale(${scale}) translate(-12 -12)`);
      if(surface.current)surface.current.style.transform=`scale(${1-favoritePulse.beat*swell})`;
      if(!swapped&&t>=favoritePulse.swapAt){swapped=true;setShown(saved);}
      if(t<1)frame.current=requestAnimationFrame(tick);
      else {frame.current=0;reset();}
    };
    frame.current=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame.current);reset();};
  },[saved,reduced]);

  return <View style={[styles.frame,style]}>
    <button ref={button} type="button" className="studently-favorite-pulse" aria-label={accessibilityLabel??(saved?'Remove from saved':'Save listing')}
      aria-pressed={saved} disabled={disabled} data-liked={shown?'true':'false'}
      onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.preventDefault();event.stopPropagation();if(!disabled)onPress();}}>
      <span ref={surface} className="studently-favorite-pulse__surface" aria-hidden="true">
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" focusable="false" style={{color:shown?favoriteColor:favoriteIdleColor}}>
          <g ref={glyph}><path d={HEART} fill={shown?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></g>
        </svg>
      </span>
    </button>
  </View>;
}

const styles=StyleSheet.create({frame:{width:40,height:40,borderRadius:20,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'}});
