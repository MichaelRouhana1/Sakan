// Runtime assets are derived from the committed logo kit; no runtime old-logo copies.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const frontend = path.resolve(__dirname, '..');
const kit = path.resolve(frontend, '../brand/logo-system');
async function main() {
  const images = path.join(frontend, 'assets/images');
  const brand = path.join(images, 'brand');
  const pub = path.join(frontend, 'public');
  await fs.mkdir(brand, {recursive:true});
  const copy = (from,to) => fs.copyFile(path.join(kit,from),to);
  await copy('png/studently-app-icon-red-1024.png',path.join(images,'icon.png'));
  await copy('png/studently-android-foreground-white-1024.png',path.join(images,'android-icon-foreground.png'));
  await copy('png/studently-android-background-red-1024.png',path.join(images,'android-icon-background.png'));
  await copy('png/studently-full-color-512.png',path.join(images,'splash-icon.png'));
  // The same full-color pixels serve splash and large in-app branding.
  await copy('png/studently-knockout-white-512.png',path.join(brand,'knockout-white.png'));
  for(const tone of ['color','knockout-white'])for(const size of [16,64])
    await copy(`png/studently-small-${tone}-${size}.png`,path.join(brand,`small-${tone}-${size}.png`));
  await copy('png/studently-small-knockout-red-16.png',path.join(pub,'favicon-16.png'));
  await copy('png/studently-knockout-red-32.png',path.join(pub,'favicon-32.png'));
  for(const [file,size] of [['apple-touch-icon.png',180],['pwa-icon-192.png',192],['pwa-icon-512.png',512]])
    await sharp(path.join(images,'icon.png')).resize(size,size).png().toFile(path.join(pub,file));
  // Explicitly named obsolete runtime assets only; design archives remain untouched.
  for(const file of ['assets/images/logo.png','assets/images/favicon.png','assets/images/android-icon-monochrome.png','public/logo.png','public/logo.svg'])
    await fs.rm(path.join(frontend,file),{force:true});
}
main().catch(e=>{console.error(e);process.exitCode=1;});
