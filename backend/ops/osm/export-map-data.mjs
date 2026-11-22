// Offline: seed + area polygons -> artifacts/osm-streets/maps/{streets,area-polygons}.geojson for the Leaflet spot-check page.
//   node export-map-data.mjs ; then serve artifacts/osm-streets/maps and open index.html?area=area:jounieh
import fs from 'node:fs';
import path from 'node:path';
import { outDir, seedDir, here } from './lib.mjs';

const maps = path.resolve(here, '../../../artifacts/osm-streets/maps');
fs.mkdirSync(maps, { recursive: true });
const seed = JSON.parse(fs.readFileSync(path.join(seedDir, 'streets.seed.json'), 'utf8'));
fs.copyFileSync(path.join(outDir, 'area-polygons.geojson'), path.join(maps, 'area-polygons.geojson'));
fs.writeFileSync(path.join(maps, 'streets.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  features: seed.streets.map(s => ({ type: 'Feature', properties: { id: s.id, name: s.nameEn, parent: s.parentAreaId }, geometry: s.geom })),
}));
console.log(`map data: ${seed.streets.length} streets`);
