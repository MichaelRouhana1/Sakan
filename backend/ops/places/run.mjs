import 'dotenv/config';
import postgres from 'postgres';
import { preflight,applyFoundation } from './foundation.mjs';
const client=postgres(process.env.DATABASE_URL,{max:1,connect_timeout:5,onnotice:()=>{}});
try {
 if(process.argv.includes('--apply')) console.log(JSON.stringify(await applyFoundation(client),null,2));
 const report=await preflight(client);
 console.log(JSON.stringify(report,null,2));
 if(report.blockers.length)process.exitCode=1;
} catch(error){console.error(error.message);process.exitCode=1;}
finally{await client.end();}

