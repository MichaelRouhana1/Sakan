import 'dotenv/config';
import postgres from 'postgres';
import { seedHousing } from './seed-housing.mjs';
import { seedTarget } from './seed-guard.mjs';
let client;
try {
 const target=seedTarget();
 client=postgres(target.url.toString(),{max:1,onnotice:()=>{}});
 console.log(JSON.stringify(await seedHousing(client),null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(client)await client.end();}

