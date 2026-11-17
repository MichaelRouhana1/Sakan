// Animation adapted from React Bits' Pulse Heart (David Haz).
// https://reactbits.dev/micro/pulse-heart — see FavoriteButton.LICENSE.md.
import {useLayoutEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {useReducedMotion} from '@/lib/useReducedMotion';
import {favoriteColor, favoriteIdleColor, favoritePulse, type FavoriteButtonProps} from './FavoriteButton.types';
import './FavoriteButton.css';

const HEART = 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z';

export function FavoriteButton({saved,onPress,disabled=false,accessibilityLabel,iconSize=20,style}:FavoriteButtonProps) {
  const reduced=useReducedMotion();
  const previous=useRef(saved);
  const surface=useRef<HTMLSpanElement>(null);
  const outline=useRef<HTMLSpanElement>(null);
  const filled=useRef<HTMLSpanElement>(null);
  const button=useRef<HTMLButtonElement>(null);
  const animations=useRef<Animation[]>([]);

  useLayoutEffect(()=>{
    const changed=previous.current!==saved;
    previous.current=saved;
    const target=surface.current;
    const layers=[outline.current,filled.current];
    if(!target||!layers[0]||!layers[1])return;

    // Read the in-flight appearance before cancelling so another tap never
    // snaps the heart back to full size or flashes the wrong saved state.
    const interrupted=animations.current.length>0;
    const fromTransform=interrupted?getComputedStyle(target).transform:'scale(1)';
    const fromOpacity=layers.map((layer,index)=>interrupted
      ?getComputedStyle(layer!).opacity
      :Number(index===0?saved:!saved));
    animations.current.forEach(animation=>animation.cancel());
    animations.current=[];
    button.current?.removeAttribute('data-running');
    if(!changed||reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;

    button.current?.setAttribute('data-running','');
    // Animate one HTML transform instead of redrawing an SVG transform on
    // every JS frame. Both heart layers stay mounted through the color swap.
    const pulse=target.animate([
      {transform:fromTransform,easing:'cubic-bezier(0.33, 1, 0.68, 1)'},
      {transform:`scale(${favoritePulse.dotSize*(1-favoritePulse.beat)})`,offset:favoritePulse.swapAt,easing:'cubic-bezier(0.34, 1.56, 0.64, 1)'},
      {transform:'scale(1)'},
    ],{duration:favoritePulse.duration});
    const fades=layers.map((layer,index)=>{
      const opacity=Number(index===0?!saved:saved);
      return layer!.animate([
        {opacity:fromOpacity[index]},
        {opacity:fromOpacity[index],offset:favoritePulse.swapAt-.06},
        {opacity,offset:favoritePulse.swapAt+.06},
        {opacity},
      ],{duration:favoritePulse.duration});
    });
    animations.current=[pulse,...fades];
    pulse.onfinish=()=>{
      if(animations.current[0]!==pulse)return;
      animations.current.forEach(animation=>animation.cancel());
      animations.current=[];
      button.current?.removeAttribute('data-running');
    };
  },[saved,reduced]);

  useLayoutEffect(()=>()=>{
    animations.current.forEach(animation=>animation.cancel());
    animations.current=[];
  },[]);

  return <View style={[styles.frame,style]}>
    <button ref={button} type="button" className="studently-favorite-pulse" aria-label={accessibilityLabel??(saved?'Remove from saved':'Save listing')}
      aria-pressed={saved} disabled={disabled} data-liked={saved?'true':'false'}
      onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.preventDefault();event.stopPropagation();if(!disabled)onPress();}}>
      <span ref={surface} className="studently-favorite-pulse__surface" aria-hidden="true">
        <span ref={outline} className="studently-favorite-pulse__glyph" style={{opacity:saved?0:1}}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" focusable="false" style={{color:favoriteIdleColor}}>
            <path d={HEART} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
          </svg>
        </span>
        <span ref={filled} className="studently-favorite-pulse__glyph" style={{opacity:saved?1:0}}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" focusable="false" style={{color:favoriteColor}}>
            <path d={HEART} fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
          </svg>
        </span>
      </span>
    </button>
  </View>;
}

const styles=StyleSheet.create({frame:{width:40,height:40,borderRadius:20,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'}});
