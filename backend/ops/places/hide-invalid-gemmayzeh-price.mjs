// Reviewed manual-input error, not seed-owned inventory. Never guess a conversion.
import 'dotenv/config';
import postgres from 'postgres';
const target=new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || target.pathname!=='/studently_dev'
 || process.env.NODE_ENV==='production' || ['prod','production'].includes(process.env.DEPLOYMENT_ENV)) {
 throw new Error('This repair only accepts loopback studently_dev outside production');
}
const id='e1c573e4-e6dc-4170-8683-4ff2241d3799';
const client=postgres(target.toString(),{max:1,connect_timeout:5,onnotice:()=>{}});
try {
 const result=await client.begin(async sql=>{
  const [before]=await sql`SELECT id,place_id,monthly_rent_usd,security_deposit_usd,hidden FROM listings WHERE id=${id}::uuid FOR UPDATE`;
  if (!before || before.place_id!=='e41571ca-b6ad-4d6b-874c-0112f60081ba'
   || before.monthly_rent_usd!==234432 || before.security_deposit_usd!==234432) throw new Error('Reviewed record changed; refusing repair');
  if (!process.argv.includes('--apply')) return {apply:false,before};
  const [after]=await sql`UPDATE listings SET hidden=true,updated_at=CASE WHEN hidden THEN updated_at ELSE now() END
   WHERE id=${id}::uuid RETURNING id,place_id,monthly_rent_usd,security_deposit_usd,hidden`;
  if (!after.hidden || after.monthly_rent_usd!==before.monthly_rent_usd || after.security_deposit_usd!==before.security_deposit_usd) throw new Error('Repair verification failed');
  return {apply:true,before,after};
 });
 console.log(JSON.stringify(result,null,2));
} finally {await client.end();}
