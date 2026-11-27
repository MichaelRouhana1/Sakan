// Native adaptation of React Bits' Pulse Heart. See FavoriteButton.LICENSE.md.
import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,Pressable,StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import Svg, {Path} from 'react-native-svg';
import {studentlyShadow} from '@/lib/studentlyShadow';
import {useReducedMotion} from '@/lib/useReducedMotion';
import {favoriteColor,favoriteIdleColor,favoritePulse,type FavoriteButtonProps} from './FavoriteButton.types';

const HEART = 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z';

export function FavoriteButton({saved,onPress,disabled=false,accessibilityLabel,iconSize=20,idleColor=favoriteIdleColor,variant='default',style}:FavoriteButtonProps) {
  const reduced=useReducedMotion();
  const [shown,setShown]=useState(saved);
  const previous=useRef(saved);
  const generation=useRef(0);
  const scale=useRef(new Animated.Value(1)).current;
  const surface=useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    const changed=previous.current!==saved;previous.current=saved;
    const token=++generation.current;
    scale.stopAnimation();surface.stopAnimation();scale.setValue(1);surface.setValue(1);
    if(!changed||reduced){setShown(saved);return;}
    const inward=favoritePulse.duration*favoritePulse.swapAt;
    Animated.parallel([
      Animated.timing(scale,{toValue:favoritePulse.dotSize,duration:inward,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
      Animated.timing(surface,{toValue:1-favoritePulse.beat,duration:inward,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
    ]).start(({finished})=>{
      if(!finished||token!==generation.current)return;
      setShown(saved);
      Animated.parallel([
        Animated.timing(scale,{toValue:1,duration:favoritePulse.duration-inward,easing:Easing.out(Easing.back(favoritePulse.overshoot)),useNativeDriver:true}),
        Animated.timing(surface,{toValue:1,duration:favoritePulse.duration-inward,easing:Easing.out(Easing.back(favoritePulse.overshoot)),useNativeDriver:true}),
      ]).start();
    });
    return()=>{++generation.current;scale.stopAnimation();surface.stopAnimation();};
  },[saved,reduced,scale,surface]);

  const isOverlay = variant === 'overlay';

  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??(saved?'Remove from saved':'Save listing')}
    accessibilityState={{selected:saved,disabled}} aria-pressed={saved} disabled={disabled} hitSlop={8}
    onPressIn={event=>event.stopPropagation()} onPress={event=>{event.stopPropagation();if(!disabled)onPress();}}
    style={[styles.frame,isOverlay&&styles.overlayFrame,style,disabled&&styles.disabled]}>
    <Animated.View pointerEvents="none" style={[isOverlay&&styles.overlayShadow,{transform:[{scale:surface}]}]}>
      <Animated.View style={{transform:[{scale}]}}>
        {isOverlay ? (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
            <Path
              d={HEART}
              fill={shown ? favoriteColor : 'rgba(0,0,0,0.22)'}
              stroke={shown ? favoriteColor : '#FFFFFF'}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <Ionicons name={shown?'heart':'heart-outline'} size={iconSize} color={shown?favoriteColor:idleColor}/>
        )}
      </Animated.View>
    </Animated.View>
  </Pressable>;
}

const styles=StyleSheet.create({
  frame:{width:40,height:40,borderRadius:20,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},
  overlayFrame:{backgroundColor:'transparent'},
  overlayShadow:{...studentlyShadow({color:'#000000',y:1,blur:3,opacity:0.45,elevation:2})},
  disabled:{opacity:.55},
});
