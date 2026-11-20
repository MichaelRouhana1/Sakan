import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createApp} from '../dist/app.js';
const source=new URL('../assets/search/areas/',import.meta.url);
const bundled=new URL('../dist/assets/search/areas/',import.meta.url);
const hash=data=>createHash('sha256').update(data).digest('hex');

test('backend build packages and serves all curated search photos and credits',async()=>{
 const files=(await readdir(source)).sort();assert.equal(files.filter(f=>f.endsWith('.jpg')).length,10);
 assert.deepEqual((await readdir(bundled)).sort(),files);
 for(const file of files)assert.equal(hash(await readFile(new URL(file,bundled))),hash(await readFile(new URL(file,source))),file);
 const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
 try{
  for(const file of files.filter(f=>f.endsWith('.jpg')||f==='credits.json'||f==='credits.html')){
   const response=await fetch('http://127.0.0.1:'+server.address().port+'/assets/search/areas/'+file);
   assert.equal(response.status,200,file);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await readFile(new URL(file,bundled))),file);
  }
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
