export function seedTarget(raw=process.env,{reset=false}={}){
 if(raw.NODE_ENV==='production' || ['production','prod'].includes(raw.DEPLOYMENT_ENV))throw new Error('Housing seed/reset refuses production');
 const environment=raw.DEPLOYMENT_ENV;
 if(!['local','staging'].includes(environment))throw new Error('Set DEPLOYMENT_ENV explicitly to local or staging');
 const connection=reset?raw.DEV_DATABASE_URL:raw.DATABASE_URL;
 if(!connection)throw new Error(reset?'DEV_DATABASE_URL is required; DATABASE_URL is never a reset target':'DATABASE_URL is required');
 const url=new URL(connection);const name=decodeURIComponent(url.pathname.slice(1));
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 const test=/^skoun_places_test_[a-f0-9]{32}$/.test(name);
 if(!['postgres','template0','template1'].includes(name) &&
    ((environment==='local' && local && (name==='skoun_dev'||test)) ||
     (!reset && environment==='staging' && name==='skoun_staging' && raw.HOUSING_SEED_ALLOWED_HOST===url.hostname)))
  return {url,name,environment};
 throw new Error('Protected or unapproved database target; use loopback skoun_dev or an explicitly allowlisted skoun_staging host');
}
export async function assertSeedMarker(tx,target){
 const [exists]=await tx`select to_regclass('skoun_ops.environment_guard')::text name`;
 if(!exists.name)throw new Error('Missing independently provisioned nonproduction database marker');
 const [marker]=await tx`select environment,database_name from skoun_ops.environment_guard where singleton=true`;
 if(marker?.environment!==target.environment || marker?.database_name!==target.name)
  throw new Error('Database environment marker does not match the seed target');
 const [actual]=await tx`select current_database() name`;
 if(actual.name!==target.name)throw new Error('Connected database does not match target');
}

