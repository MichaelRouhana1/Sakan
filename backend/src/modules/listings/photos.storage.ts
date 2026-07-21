import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { loadEnv } from "../../config/env.js";

const env = loadEnv();

export const UPLOADS_ROOT = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(process.cwd(), env.UPLOAD_DIR);

export const LISTING_PHOTOS_DIR = path.join(UPLOADS_ROOT, "listings");

fs.mkdirSync(LISTING_PHOTOS_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/heic" || mime === "image/heif") return ".heic";
  return ".jpg";
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, LISTING_PHOTOS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extForMime(file.mimetype)}`);
  },
});

export const listingPhotoUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 8,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WebP, or HEIC images are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Build a device-reachable absolute URL for a stored file. */
export function publicUrlForUpload(
  filename: string,
  reqHost?: string,
): string {
  const relative = `/uploads/listings/${filename}`;
  if (env.PUBLIC_BASE_URL) {
    return `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}${relative}`;
  }
  if (reqHost) {
    return `http://${reqHost}${relative}`;
  }
  return `http://localhost:${env.PORT}${relative}`;
}
