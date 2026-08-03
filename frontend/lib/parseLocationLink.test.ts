/**
 * Smoke checks for location link parsing.
 * Run: npx tsx lib/parseLocationLink.test.ts
 */
import {
  extractUrlFromPaste,
  parseCoordsFromLocationUrl,
  parseCoordsFromMapsHtml,
} from "./parseLocationLink.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function nearly(a: number, b: number, eps = 1e-5) {
  return Math.abs(a - b) < eps;
}

// WhatsApp-style blob
{
  const u = extractUrlFromPaste(
    "Shared location\nhttps://maps.app.goo.gl/abc123?foo=1",
  );
  assert(u === "https://maps.app.goo.gl/abc123?foo=1", "extract short");
}

{
  const u = extractUrlFromPaste("geo:33.8938,35.5018");
  assert(u === "geo:33.8938,35.5018", "extract geo");
}

{
  const c = parseCoordsFromLocationUrl(
    "https://www.google.com/maps/place/Hamra/@33.8969,35.4822,17z",
  );
  assert(c && nearly(c.lat, 33.8969) && nearly(c.lng, 35.4822), "@lat,lng");
}

{
  const c = parseCoordsFromLocationUrl(
    "https://maps.google.com/?q=33.8938,35.5018",
  );
  assert(c && nearly(c.lat, 33.8938) && nearly(c.lng, 35.5018), "q=");
}

{
  const c = parseCoordsFromLocationUrl(
    "https://www.google.com/maps?ll=33.89,35.50&z=14",
  );
  assert(c && nearly(c.lat, 33.89) && nearly(c.lng, 35.5), "ll=");
}

{
  const c = parseCoordsFromLocationUrl(
    "https://www.google.com/maps/dir//33.893791,35.501776/@33.89,35.50,14z",
  );
  assert(c && nearly(c.lat, 33.893791) && nearly(c.lng, 35.501776), "dir path");
}

{
  const c = parseCoordsFromLocationUrl(
    "https://maps.apple.com/?ll=33.8938,35.5018&q=Place",
  );
  assert(c && nearly(c.lat, 33.8938) && nearly(c.lng, 35.5018), "apple ll");
}

{
  const c = parseCoordsFromLocationUrl("geo:33.8938,35.5018");
  assert(c && nearly(c.lat, 33.8938) && nearly(c.lng, 35.5018), "geo");
}

{
  const c = parseCoordsFromLocationUrl(
    "https://www.google.com/maps/place/data=!3d33.9!4d35.5",
  );
  assert(c && nearly(c.lat, 33.9) && nearly(c.lng, 35.5), "!3d!4d");
}

{
  const html =
    'content="https://maps.google.com/maps/api/staticmap?center=33.87635095%2C35.57535025&amp;zoom=13" ' +
    "other %212d35.57535025000001%213d33.876350949999996 tail";
  const c = parseCoordsFromMapsHtml(html);
  assert(
    c && nearly(c.lat, 33.87635095) && nearly(c.lng, 35.57535025),
    "html center=",
  );
}

{
  const c = parseCoordsFromLocationUrl("https://example.com/no-coords");
  assert(c === null, "no coords");
}

console.log("parseLocationLink.test: ok");
