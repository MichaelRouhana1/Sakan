// Compare diagnostics against the checked-in frontend with identical dependencies
// and generated Expo types. Line shifts are ignored; diagnostic multiplicity is not.
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const repo=path.resolve(root,'..');
const ref=process.argv[2]??'HEAD';
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:20*1024*1024});
const tracked=new Set(git('ls-tree','-r','--name-only',ref,'--','frontend').trim().split('\n'));
const changed=git('diff','--name-only',ref,'--','frontend').trim().split('\n').filter(f=>/\.(ts|tsx)$/.test(f));
const before=new Map(changed.filter(f=>tracked.has(f)).map(f=>[path.normalize(path.join(repo,f)),git('show',`${ref}:${f}`)]));
const configPath=path.join(root,'tsconfig.json');
const config=ts.readConfigFile(configPath,ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
function diagnostics(baseline){
 const host=ts.createCompilerHost(parsed.options);const read=host.readFile.bind(host);
 if(baseline)host.readFile=f=>before.get(path.normalize(f))??read(f);
 const roots=parsed.fileNames.filter(f=>{
  const relative=path.relative(repo,f).replaceAll('\\','/');
  return !baseline||tracked.has(relative)||relative.startsWith('frontend/.expo/')||relative==='frontend/expo-env.d.ts';
 });
 const program=ts.createProgram(roots,{...parsed.options,noEmit:true},host);
 return ts.getPreEmitDiagnostics(program).map(d=>`${d.file?path.relative(root,d.file.fileName).replaceAll('\\','/'):'config'} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`).sort();
}
const baseline=diagnostics(true),current=diagnostics(false);
const remaining=[...baseline];const added=[];
for(const message of current){const i=remaining.indexOf(message);if(i<0)added.push(message);else remaining.splice(i,1);}
const result={ref,baseline:baseline.length,current:current.length,added,removed:remaining};
await mkdir(path.join(root,'.expo'),{recursive:true});await writeFile(path.join(root,'.expo','slice2-typecheck.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));if(added.length)process.exitCode=1;
