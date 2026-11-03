import {createHash} from 'node:crypto';
import {copyFile,readFile,readdir,writeFile} from 'node:fs/promises';
import {join,relative,sep,resolve} from 'node:path';
import {SDK_VERSION,REACT_VERSION,validateLinkedDescriptor} from '@sampo/contracts';
import {createAppDescriptor} from './linked-descriptors.mjs';
const name=process.argv[2];const names={risk:'risk-lens',vfo:'vfo',cluster:'cluster',replication:'replication'};if(!names[name])throw Error('Select risk, vfo, cluster or replication');const root='dist-'+name,cohort='0.2.0-alpha.20261102.5';
if(SDK_VERSION!==cohort)throw Error('Install the exact linked SDK cohort '+cohort);
await readFile(join(root,'entry.mjs')); await Promise.all(['LICENSE','NOTICE'].map(name=>copyFile(name,join(root,name))));
const contributions=JSON.parse(await readFile('contributions.json','utf8')).filter(c=>c.id==='example.'+names[name]+'.main');
const linked=createAppDescriptor(name);await writeFile(join(root,'linked.json'),JSON.stringify(linked,null,2)+'\n');
validateLinkedDescriptor(linked,{publisher:'sampo.synthetic',contributions});
// Keep the supplied metadata/artwork rights notice with the packaged catalogue.
if(name==='vfo')await copyFile('../../assets/market-universe/README.md',join(root,'MARKET-UNIVERSE-NOTICE.md'));
const closure=JSON.parse(await readFile('../../.review/app-closures/'+name+'.json','utf8'));
const packages=[...new Set(closure.modules.flatMap(id=>{const m=id.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)/);return m?[m[1]]:[]}))];
const notices=[];
for(const dependency of packages){
 const directory=resolve('../../node_modules',dependency);
 const candidates=await readdir(directory);
 for(const file of candidates.filter(n=>/^(?:licen[cs]e|copying|notice)(?:\.[a-z]+)?$/i.test(n))){
  try{notices.push('===== '+dependency+' / '+file+' =====\n'+await readFile(join(directory,file),'utf8'));}catch(error){if(error.code!=='EISDIR')throw error;}
 }
}
await writeFile(join(root,'THIRD-PARTY-NOTICES.txt'),(notices.length?notices.join('\n\n'):'No third-party implementation packages are bundled in this app. React and the Sampo SDK are provided by the host. See MARKET-UNIVERSE-NOTICE.md where supplied for metadata and artwork provenance.')+'\n');
async function collect(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())files.push(...await collect(p));else if(e.isFile()&&e.name!=='manifest.json')files.push(p);else if(!e.isFile())throw Error('Only regular build assets are allowed');}return files;}
const assets=await Promise.all((await collect(root)).sort().map(async file=>{const bytes=await readFile(file);return {path:relative(root,file).split(sep).join('/'),size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}));
const manifest={schemaVersion:3,id:linked.applicationId,version:'1.2.0',publisher:'sampo.synthetic',license:'UNLICENSED',runtime:{kind:'trusted-react-esm',abi:1,sdk:cohort,react:REACT_VERSION,peers:{react:REACT_VERSION,'react-dom':REACT_VERSION,'@sampo/contracts':cohort,'@sampo/sdk-react':cohort}},entry:'entry.mjs',styles:assets.filter(a=>a.path.endsWith('.css')).map(a=>a.path),assets,contributions,capabilities:[],linked:'linked.json'};
await writeFile(join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
