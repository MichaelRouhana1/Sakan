import { releasePhoto } from "./photoCropIO";
const uploading = new Set<string>();
const removed = new Set<string>();
export function beginPhotoUpload(uri: string) {
  uploading.add(uri);
}
export function endPhotoUpload(uri: string, succeeded: boolean) {
  uploading.delete(uri);
  if (succeeded || removed.has(uri))
    releasePhoto({ uri, name: "crop", owned: true });
  removed.delete(uri);
}
export function removePhotoUri(uri: string) {
  if (uploading.has(uri)) removed.add(uri);
  else releasePhoto({ uri, name: "crop", owned: true });
}
