import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const issues=[];let sourceFiles=0;
const company=/alpha(?:dyne|netcapital)|\bxmv\b|\bsgeller\b/i;
const internal=/C:[\\/]Users[\\/]|(?:source[\\/]local-infra)|(?:adyne\.com)|(?:from|import)\s+(?:alphaquant|pyvolar|risktech|mdng_client|sqlalchemy|vfo_platform)\b|from ['"]ag-grid-enterprise['"]/i;
const sourceExtensions=/\.(tsx?|mjs|json|css|md|html)$/;
async function scan(directory){
 for(const row of await readdir(directory,{withFileTypes:true})){
  if(['node_modules','dist','.git','__pycache__'].includes(row.name))continue;
  const file=path.join(directory,row.name),relative=path.relative(root,file).split(path.sep).join('/');
  if(row.isSymbolicLink()){issues.push(relative+': source symlink');continue;}
  if(row.isDirectory()){await scan(file);continue;}
  if(!sourceExtensions.test(row.name))continue;
  sourceFiles++;const text=await readFile(file,'utf8');
  if(company.test(text)||internal.test(text))issues.push(relative+': private name/source reference');
  const fixture=/\/tests\/|\/[^/]*demo\/|synthetic|fixture/.test(relative);
  if(!fixture&&/\.(tsx?|mjs)$/.test(row.name)&&/https?:\/\/[a-z0-9][a-z0-9.-]+/i.test(text))issues.push(relative+': concrete network endpoint in component source');
 }
}
for(const dir of ['apps','packages','assets'])await scan(path.join(root,dir));
for(const name of ['README.md','AGENTS.md']){
 const text=await readFile(path.join(root,name),'utf8');if(company.test(text)||internal.test(text))issues.push(name+': private repository reference');
}
if(issues.length)throw Error('Public boundary violations:\n'+issues.join('\n'));
console.log(JSON.stringify({sourceFiles,privateReferences:0,concreteComponentEndpoints:0}));
