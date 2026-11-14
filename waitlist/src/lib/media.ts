import { existsSync, readdirSync } from "fs";
import path from "path";

/** Check if a file exists under /public (server-only). */
export function publicFileExists(publicPath: string): boolean {
  const relative = publicPath.replace(/^\//, "");
  const full = path.join(process.cwd(), "public", relative);
  return existsSync(full);
}

export function listScreenshotPlaceholders(
  dir: "/screenshots/students" | "/screenshots/landlords",
): string[] {
  const folder = path.join(process.cwd(), "public", dir.replace(/^\//, ""));
  if (!existsSync(folder)) return [];

  const files = readdirSync(folder)
    .filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f))
    .sort();

  return files.map((f) => `${dir}/${f}`);
}
