import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { LText } from '@/components/lister/Typography';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { Listing } from '@/types/listing';

export function SharedPhotoGallery({listing}:{listing:Listing}){
 const photos=listing.sharedPhotos??[];
 if(!photos.length)return null;
 return <View style={{paddingVertical:24,gap:12}}>
  <LText variant="subtitle">{listing.placeKind==='building'?'Building':'Shared apartment'} photos</LText>
  <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{gap:12}}>
   {photos.map(photo=><View key={photo.id} style={{width:260,gap:6}}>
    <Image accessibilityLabel={photo.caption||'Shared space'} source={{uri:resolveMediaUrl(photo.url)??photo.url}} style={{width:260,height:170,borderRadius:12}} contentFit="cover"/>
    {photo.caption?<LText variant="caption">{photo.caption}</LText>:null}
   </View>)}
  </ScrollView>
 </View>;
}
