import type {Asset} from '../model';
import type {AssetDirectoryEntry,MarketGroup} from './contracts';
import {liveState} from '../command-client';
export type UniverseFilters={query:string;groups:string[];region:string;country:string;sector:string;industry:string;live:string};
export const emptyFilters:UniverseFilters={query:'',groups:[],region:'',country:'',sector:'',industry:'',live:''};
export function filterMarketAssets(assets:Asset[],directory:Map<string,AssetDirectoryEntry>,overrides:Record<string,{region?:string;country?:string;sector?:string;industry?:string}>,groups:MarketGroup[],filters:UniverseFilters){
 const members=new Set(groups.filter(g=>filters.groups.includes(g.id)).flatMap(g=>g.assetIds));
 const q=filters.query.trim().toLowerCase();
 return assets.filter(a=>{const d={...directory.get(a.asset_id),...overrides[a.asset_id]};return (!q||[a.ticker,a.asset_id,d.name??''].some(x=>x.toLowerCase().includes(q)))&&(!filters.groups.length||members.has(a.asset_id))&&(!filters.region||d.region===filters.region)&&(!filters.country||d.country===filters.country)&&(!filters.sector||d.sector===filters.sector)&&(!filters.industry||d.industry===filters.industry)&&(!filters.live||liveState(a)===filters.live);});
}
export function filterOptions(directory:AssetDirectoryEntry[],overrides:Record<string,{region?:string;country?:string;sector?:string;industry?:string}>,field:'region'|'country'|'sector'|'industry'){
 return [...new Set([...directory.map(d=>({...d,...overrides[d.assetId]})[field]),...Object.values(overrides).map(d=>d[field])].filter((x):x is string=>Boolean(x)))].sort();
}
