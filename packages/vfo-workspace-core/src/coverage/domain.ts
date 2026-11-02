import type {Asset} from '../model';
import type {CoverageUniverse,Timeline,Generation,CoverageDay,CommandApi} from '../command-client';
import {dateAdd} from '../command-client';
import {fullTimeline,sourceHistories,type DateAttempt} from '../history';

export type SnapshotChoice={assetId:string;request:string;date:string;source:string;nonce:number};
export type BackfillSeed={source:string;start:string;end:string;members:string[]};
export type Classification={country?:string;exchange?:string;currency?:string;sector?:string;industry?:string;instrument_type?:string;lifecycle?:string;source:string;observedAt:string};
export type Classifications=Record<string,Classification>;
export type Quality={state:'good'|'warning'|'bad'|'unknown';label:string;reason?:string;revision?:string};
export const sourceLabel=(source:string)=>source==='spiderrock_s3'?'SpiderRock S3':source.toUpperCase();
export const labels:Record<string,string>={verified:'Saved artifact verified',computed:'Computed / awaiting delivery',missing:'Recorded session gap',non_session:'Non-session',pending:'Requested / pending',failed:'Computation failed',quality_held:'Quality held',cancelled:'Cancelled',unknown:'No recorded observation'};
export function approvedAsset(asset:Asset,coverage:CoverageUniverse|null){return coverage?.items.find(x=>x.asset===asset.asset_id||x.asset===asset.ticker)?.asset??null;}
export function quality(day?:CoverageDay):Quality{
 const q=day?.quality;
 if(q&&['good','warning','bad'].includes(q.state)&&q.assessment_revision)return {...q,label:q.label||q.state};
 return {state:'unknown',label:day?.session===false?'Non-session':'Quality unassessed'};
}
export function cellEvidence(attempt:DateAttempt|undefined,lens:'coverage'|'quality'){
 if(lens==='quality'){const q=quality(attempt?.day);return {tone:'quality-'+q.state,label:q.label,detail:q.reason??'No recorded financial quality assessment'};}
 const state=attempt?.day.state??'unknown';return {tone:'cov-'+state,label:labels[state]??state,detail:attempt?.day.error_code??''};
}
export function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export async function readWindow(client:CommandApi,asset:string,start:string,end:string,signal:AbortSignal):Promise<Timeline>{
 if(!validDate(start)||!validDate(end)||end<=start)throw Error('Choose a valid date range; end is excluded.');
 let merged:Timeline|null=null;const generations=new Map<string,Generation>();
 for(let cursor=start;cursor<end;){signal.throwIfAborted();const stop=[dateAdd(cursor,366),end].sort()[0];const page=await fullTimeline(client,asset,cursor,stop,signal);
  if(merged&&merged.asset!==page.asset)throw Error('Coverage asset changed during scan');
  for(const row of page.generations){const prior=generations.get(row.request_id);generations.set(row.request_id,prior?{...row,days:[...prior.days,...row.days]}:row);}
  merged=merged?{...page,data_complete:merged.data_complete&&page.data_complete}:page;cursor=stop;
 }
 return {...merged!,start_date:start,end_date:end,generations:[...generations.values()],next_cursor:null};
}
export type PlanRange={members:string[];start:string;end:string;source?:string};
export function planRanges(members:string[],source:string,start:string,end:string,mode:'full'|'gaps'|'quality',timelines:Record<string,Timeline>):PlanRange[]{
 if(!validDate(start)||!validDate(end)||end<=start)throw Error('Invalid backfill window');
 const unique=[...new Set(members)].sort();if(!unique.length)return [];
 if(mode==='full')return [{members:unique,start,end}];
 const ranges:PlanRange[]=[];
 for(const asset of unique){const timeline=timelines[asset];if(!timeline||!timeline.data_complete||!timeline.index.data_complete)throw Error('Complete coverage is required before selecting gaps or assessed failures.');
  const history=sourceHistories(timeline).find(h=>h.source===source);let active:PlanRange|null=null;
  for(const cell of history?.dates??[]){const day=cell.selected?.day;const include=day?.session===true&&(mode==='gaps'?day.state==='missing':quality(day).state==='bad');
   if(include){if(active&&active.end===cell.date)active.end=dateAdd(cell.date,1);else{active={members:[asset],start:cell.date,end:dateAdd(cell.date,1)};ranges.push(active);}}else active=null;
  }
 }
 const merged=new Map<string,PlanRange>();for(const range of ranges){const key=range.start+'|'+range.end,prior=merged.get(key);if(prior)prior.members.push(...range.members);else merged.set(key,range);}
 return [...merged.values()].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
}
