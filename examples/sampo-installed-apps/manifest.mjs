import {createHash} from 'node:crypto';
import {copyFile,readFile,readdir,writeFile,cp,rm} from 'node:fs/promises';
import {join,relative,sep} from 'node:path';
import {SDK_VERSION,REACT_VERSION,validateLinkedDescriptor} from '@sampo/contracts';
const name=process.argv[2];const names={risk:'risk-lens',vfo:'vfo',cluster:'cluster',replication:'replication'};if(!names[name])throw Error('Select risk, vfo, cluster or replication');const root='dist-'+name,cohort='0.2.0-alpha.20261102.1';
if(SDK_VERSION!==cohort)throw Error('Install the exact linked SDK cohort '+cohort);
await rm(root,{recursive:true,force:true});await cp('dist',root,{recursive:true});await Promise.all(['LICENSE','NOTICE'].map(name=>copyFile(name,join(root,name))));
const contributions=JSON.parse(await readFile('contributions.json','utf8')).filter(c=>c.id==='example.'+names[name]+'.main');
const linked=JSON.parse(await readFile('linked.json','utf8'));
linked.applicationId='example.'+names[name];linked.entries=linked.entries.filter(e=>e.id===name);linked.routes=linked.routes.filter(r=>r.id===name);await writeFile(join(root,'linked.json'),JSON.stringify(linked,null,2)+'\n');
validateLinkedDescriptor(linked,{publisher:'sampo.synthetic',contributions});
async function collect(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())files.push(...await collect(p));else if(e.isFile()&&e.name!=='manifest.json')files.push(p);else if(!e.isFile())throw Error('Only regular build assets are allowed');}return files;}
const assets=await Promise.all((await collect(root)).sort().map(async file=>{const bytes=await readFile(file);return {path:relative(root,file).split(sep).join('/'),size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}));
const manifest={schemaVersion:3,id:linked.applicationId,version:name==='vfo'?'1.1.2':'1.0.2',publisher:'sampo.synthetic',license:'UNLICENSED',runtime:{kind:'trusted-react-esm',abi:1,sdk:cohort,react:REACT_VERSION,peers:{react:REACT_VERSION,'react-dom':REACT_VERSION,'@sampo/contracts':cohort,'@sampo/sdk-react':cohort}},entry:'entry.mjs',styles:assets.filter(a=>a.path.endsWith('.css')).map(a=>a.path),assets,contributions,capabilities:[],linked:'linked.json'};
await writeFile(join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
