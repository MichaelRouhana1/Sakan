// Expo's route context can include the web search entry in native exports.
// Resolve its component to the existing native search, keeping Mapbox GL out of Hermes.
export { default as FindBrowse } from '@/app/(renter)/(tabs)/(explore)/search';
