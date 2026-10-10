import { releasePhoto } from "./photoCropIO";
const uploading = new Set<string>();
const removed = new Set<string>();
const held = new Set<string>();

export function beginPhotoUpload(uri: string) {
  uploading.add(uri);
}

/** Keep a blob alive while a deleted photo can still be undone. */
export function holdPhotoUri(uri: string) {
  held.add(uri);
}

export function releasePhotoHold(uri: string) {
  held.delete(uri);
}

export function endPhotoUpload(uri: string, succeeded: boolean) {
  uploading.delete(uri);
  if (!held.has(uri) && (succeeded || removed.has(uri)))
    releasePhoto({ uri, name: "crop", owned: true });
  removed.delete(uri);
}

export function removePhotoUri(uri: string) {
  held.delete(uri);
  if (uploading.has(uri)) removed.add(uri);
  else releasePhoto({ uri, name: "crop", owned: true });
}
