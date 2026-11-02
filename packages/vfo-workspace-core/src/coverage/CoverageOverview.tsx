import type {Asset} from '../model';
import type {CoverageUniverse} from '../command-client';
import type {AssetDirectoryEntry} from '../market/contracts';
import {approvedAsset} from './domain';
export function CoverageOverview({universe,coverage,directory,region,onRegion}:{universe:Asset[];coverage:CoverageUniverse|null;directory:AssetDirectoryEntry[];region:string;onRegion:(value:string)=>void}){
 const entries=new Map(directory.map(a=>[a.assetId,a]));
 return <section className="coverage-overview"><header><div><small>COVERAGE COMMAND</small><h2>Discover, investigate, repair</h2><p>Group your universe, inspect source/date evidence and freeze reviewed repair requests.</p></div><button onClick={()=>onRegion('')}>All regions</button></header><div className="coverage-group-cards">{[...new Set(directory.map(a=>a.region).filter((v):v is string=>Boolean(v)))].sort().map(name=>{const assets=universe.filter(a=>entries.get(a.asset_id)?.region===name),registered=assets.filter(a=>approvedAsset(a,coverage)),recorded=registered.filter(a=>coverage?.items.find(x=>x.asset===approvedAsset(a,coverage))?.recorded_requests);return <button key={name} aria-pressed={region===name} onClick={()=>onRegion(region===name?'':name)}><b>{name}</b><strong>{assets.length.toLocaleString()}</strong><span>{registered.length} mapped · {recorded.length} with recorded history</span><small>Registration is not a coverage percentage</small></button>})}</div></section>;
}
