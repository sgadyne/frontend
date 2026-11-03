import type {Asset} from '../model';
import type {CoverageUniverse,Timeline} from '../command-client';
import type {WorkspaceSite} from './contracts';
import type {Instrument,CoverageSnapshot,CoverageStatus,CoverageInterval} from './universe-model';
import {dateAdd} from '../command-client';
import {sourceHistories} from '../history';

const status=(value?:string):CoverageStatus=>value==='observed'?'ready':value==='stale'?'stale':value==='failed'?'failed':value==='no_data'?'missing':'unknown';
export function observedInstruments(site:WorkspaceSite,universe:Asset[]):Instrument[]{
 const configured=new Map(universe.map(a=>[a.asset_id,a]));
 const result=site.assets.map(a=>({...a,ticker:configured.get(a.assetId)?.ticker??a.assetId.slice(a.assetId.indexOf(':')+1)}));
 const known=new Set(result.map(a=>a.assetId));
 for(const a of universe)if(!known.has(a.asset_id))result.push({assetId:a.asset_id,ticker:a.ticker,name:a.ticker,source:'configured-universe'});
 return result;
}
/** Registered requests are discovery evidence, never proof of a complete date range. */
export function observedCoverage(universe:Asset[],coverage:CoverageUniverse|null,timelines:Record<string,Timeline>):CoverageSnapshot{
 const rows=universe.map(asset=>{
  const registered=coverage?.items.find(a=>a.asset===asset.asset_id||a.asset===asset.ticker);
  const timeline=timelines[asset.asset_id];const intervals:CoverageInterval[]=[];
  if(timeline)for(const history of sourceHistories(timeline))for(const entry of history.dates){
   const day=entry.selected?.day;if(!day||!day.session)continue;
   const fit=day.products.fit;
   const state:CoverageInterval['status']=(fit==='verified'&&day.has_commit)?'available':day.state==='missing'&&timeline.data_complete&&timeline.index.data_complete?'gap':day.state==='failed'?'failed':day.has_commit||day.state==='computed'?'partial':'unknown';
   const previous=intervals.at(-1);
   if(previous&&previous.end===day.date&&previous.source===history.source&&previous.status===state)previous.end=dateAdd(day.date,1);
   else intervals.push({start:day.date,end:dateAdd(day.date,1),status:state,source:history.source,dataset:'volatility-surfaces',detail:day.error_code??day.reason});
  }
  else for(const source of registered?.sources??[])intervals.push({start:source.request.start_date,end:source.request.end_date,status:'unknown',source:source.source,dataset:'volatility-surfaces',detail:'Registered request; open historical coverage for verified per-session evidence.'});
  return {assetId:asset.asset_id,quotes:status(asset.input.state),surfaces:status(asset.accepted_output.state),source:asset.source,asOf:asset.accepted_output.asof??asset.accepted_output.observed_at??'',intervals};
 });
 // Historical-only catalogue entries retain real evidence even outside the active build scope.
 for(const registered of coverage?.items??[]){
  const assetId=registered.asset.includes(':')?registered.asset:'EQUITY:'+registered.asset;
  if(rows.some(row=>row.assetId===assetId))continue;
  const temporary:Asset={asset_id:assetId,ticker:registered.asset,source:registered.sources[0]?.source??'',input_timezone:'',groups:[],session:{state:'unknown',reason:''},input:{state:'unknown',reason:''},latest_attempt:{state:'unknown',reason:''},accepted_output:{state:'unknown',reason:''},publication:{state:'unknown',reason:''}};
  rows.push(...observedCoverage([temporary],{...coverage!,items:[registered]},timelines).rows);
 }
 return {kind:'observed',label:'Observed local build and retained backfill evidence',asOf:coverage?.observed_at??'',rows};
}
