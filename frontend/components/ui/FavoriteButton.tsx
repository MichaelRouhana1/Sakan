// Native adaptation of React Bits' Pulse Heart. See FavoriteButton.LICENSE.md.
import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,Pressable,StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useReducedMotion} from '@/lib/useReducedMotion';
import {favoriteColor,favoriteIdleColor,favoritePulse,type FavoriteButtonProps} from './FavoriteButton.types';

export function FavoriteButton({saved,onPress,disabled=false,accessibilityLabel,iconSize=20,style}:FavoriteButtonProps) {
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

  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??(saved?'Remove from saved':'Save listing')}
    accessibilityState={{selected:saved,disabled}} aria-pressed={saved} disabled={disabled} hitSlop={8}
    onPressIn={event=>event.stopPropagation()} onPress={event=>{event.stopPropagation();if(!disabled)onPress();}}
    style={[styles.frame,style,disabled&&styles.disabled]}>
    <Animated.View pointerEvents="none" style={{transform:[{scale:surface}]}}>
      <Animated.View style={{transform:[{scale}]}}><Ionicons name={shown?'heart':'heart-outline'} size={iconSize} color={shown?favoriteColor:favoriteIdleColor}/></Animated.View>
    </Animated.View>
  </Pressable>;
}

const styles=StyleSheet.create({frame:{width:40,height:40,borderRadius:20,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},disabled:{opacity:.55}});
