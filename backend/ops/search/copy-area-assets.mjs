import { cp, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Keep the deployable dist/ tree self-contained, including photo license credits.
const source=fileURLToPath(new URL('../../assets/search/areas/',import.meta.url));
const destination=fileURLToPath(new URL('../../dist/assets/search/areas/',import.meta.url));
await mkdir(destination,{recursive:true});
await cp(source,destination,{recursive:true});
console.log(`Copied ${(await readdir(source)).length} search area assets into dist/assets/search/areas`);
