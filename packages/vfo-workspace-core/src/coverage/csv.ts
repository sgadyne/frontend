import type {Asset} from '../model';
import type {BackfillCatalogue} from '../command-client';
export function parseCsv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'&&!field&&!closed){quoted=true;continue;}
  if(c===','||c==='\n'||c==='\r'){row.push(field);field='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[];}continue;}
  if(closed){if(!/\s/.test(c))throw Error('Unexpected text after a quoted CSV field');}else field+=c;
 }
 if(quoted)throw Error('Unclosed quoted CSV field');if(field||row.length){row.push(field);if(row.some(x=>x.trim()))rows.push(row);}
 if(!rows.length)throw Error('CSV is empty');const headers=rows[0].map(x=>x.trim());if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error('CSV column names must be nonempty and unique');
 if(rows.slice(1).some(r=>r.length!==headers.length))throw Error('CSV rows must have the same number of columns as the header');return [headers,...rows.slice(1)];
}
export function aliasIndex(universe:Asset[],catalogue:BackfillCatalogue|null){
 const index=new Map<string,Set<string>>(),add=(key:string,id:string)=>{key=key.trim().toUpperCase();if(!key)return;const values=index.get(key)??new Set<string>();values.add(id);index.set(key,values);};
 for(const asset of universe){add(asset.asset_id,asset.asset_id);add(asset.ticker,asset.asset_id);}
 for(const group of catalogue?.groups??[])for(const member of group.members){const target=universe.find(a=>a.asset_id===member.asset||a.ticker===member.asset);if(target)for(const alias of Object.values(member.symbols))add(alias,target.asset_id);}
 return index;
}
export function resolveSymbol(value:string,index:Map<string,Set<string>>){const choices=[...(index.get(value.trim().toUpperCase())??[])];return {assetId:choices.length===1?choices[0]:null,choices};}
