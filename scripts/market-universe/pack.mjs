import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const root = new URL('../../assets/market-universe/',import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name,root),'utf8'));
const catalog=await read('catalog.json'), report=await read('coverage-report.json');
const columns=['assetId','ticker','name','region','mic','currency','instrumentType','listingCountry','isin','listingAsOf','metadataSourceId','localSymbol','logoFile','sector','industry','asof','source','exchange','aliases','listingId','alternateNames','englishName','metadataSource','metadataRetrievedAt'];
const shared=new Set(['region','mic','currency','instrumentType','listingCountry','listingAsOf','metadataSourceId']);
const dictionaries=Object.fromEntries([...shared].map(k=>[k,[]])),indexes=Object.fromEntries([...shared].map(k=>[k,new Map()]));
const rows=catalog.assets.map(a=>{
 const row=columns.map(k=>{
  let value=a[k]??null;
  if(k==='source'&&value===a.metadataSourceId)value=null;
  if(k==='listingId'&&value===a.assetId)value=null;
  if(k==='exchange'&&value===a.mic)value=null;
  if(k==='localSymbol'&&value===a.ticker)value=null;
  if(value!==null&&shared.has(k)){
   let index=indexes[k].get(value);if(index===undefined){index=dictionaries[k].length;dictionaries[k].push(value);indexes[k].set(value,index);}return index;
  }
  return value;
 });
 while(row.at(-1)===null)row.pop();return row;
});
const packed={schemaVersion:1,revision:catalog.revision,generatedAt:report.generatedAt,columns,dictionaries,sources:Object.fromEntries(report.sources.filter(s=>s.retrievedAt).map(s=>[s.id,{retrievedAt:s.retrievedAt,...(s.asof?{asof:s.asof}:{})}])),rows};
const output=JSON.stringify(packed)+'\n';await writeFile(new URL('catalog.compact.json',root),output);
const groupData=await readFile(new URL('groups.json',root));
const sizes={records:rows.length,groupsBytes:groupData.length,groupsGzipBytes:gzipSync(groupData).length,canonicalBytes:(await readFile(new URL('catalog.json',root))).length,compactBytes:Buffer.byteLength(output),compactGzipBytes:gzipSync(output).length};
await writeFile(new URL('payload-report.json',root),JSON.stringify(sizes,null,2)+'\n');console.log(sizes);
