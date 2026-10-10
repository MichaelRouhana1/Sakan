import { Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { isInLebanon } from '@/lib/locationWkt';

type Props = {
  lat: string;
  lng: string;
  label?: string;
  onChange: (next: { lat: string; lng: string }) => void;
};

/** Keep browser-only Mapbox out of Hermes; native uses the existing native map. */
export function CampusPinPicker({ lat, lng, label, onChange }: Props) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const valid = lat.trim() !== '' && lng.trim() !== '' && Number.isFinite(latitude) && Number.isFinite(longitude) && isInLebanon({ lat: latitude, lng: longitude });
  const center = valid ? { latitude, longitude } : { latitude: 33.897, longitude: 35.482 };
  const choose = (coordinate: { latitude: number; longitude: number }) => {
    if (isInLebanon({ lat: coordinate.latitude, lng: coordinate.longitude })) {
      onChange({ lat: coordinate.latitude.toFixed(6), lng: coordinate.longitude.toFixed(6) });
    }
  };
  return <View style={{ gap: 8 }}>
    <Text>{label || 'Campus map pin'} · Tap or drag the pin in Lebanon.</Text>
    <MapView style={{ height: 240, borderRadius: 12 }} initialRegion={{ ...center, latitudeDelta: 0.025, longitudeDelta: 0.025 }} onPress={event => choose(event.nativeEvent.coordinate)}>
      <Marker coordinate={center} draggable onDragEnd={event => choose(event.nativeEvent.coordinate)} />
    </MapView>
  </View>;
}
