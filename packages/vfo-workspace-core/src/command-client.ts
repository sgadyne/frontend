
import type {Asset,Filters,Page,HistoryDay} from './model';
export type IndexState={discovery_complete:boolean;data_complete:boolean;reconciled_at:string|null;rebuild_in_progress:boolean;refresh_interval_seconds:number;unavailable_requests:{request_id:string;reason:string}[];epoch:number};
export type Provenance={classification:string;authority:string|null;registry_revision:string|null};
export type CoverageRequest={request_id:string;accepted_at_ms:number;accepted_sha256:string;group:string;group_revision:string;source:string;start_date:string;end_date:string;outputs:string[];capture:string;recipe:{name:string;revision:string;runtime_revision:string};destination:string};
export type Calendar={revision:string;exchange:string;timezone:string;provenance:string;start_date:string;end_date:string};
export type SourceSummary={source:string;recorded_requests:number;request:CoverageRequest;provenance:Provenance;state:string;expected_product_cells?:number;product_counts?:Record<string,number>;reason?:string};
export type CoverageAsset={asset:string;state:string;recorded_requests:number;sources:SourceSummary[];requests_truncated:boolean;calendar:Calendar};
export type CoverageUniverse={schema:string;catalogue_revision:string;registered_total:number;next_offset:number|null;items:CoverageAsset[];unregistered_state:string;index:IndexState;observed_at:string;limitations:string[]};
export type CoverageDay={date:string;session:boolean;reason:string;calendar_revision:string;observation:string;state:string;products:Record<string,string>;error_code?:string;has_commit:boolean;quality?:{state:'good'|'warning'|'bad'|'unknown';label:string;reason?:string;assessment_revision?:string;revision?:string}};
export type Generation=CoverageRequest&{provenance:Provenance;days:CoverageDay[];snapshot_revision:string};
export type Timeline={schema:string;asset:string;state?:string;reason?:string;start_date:string;end_date:string;calendar?:Calendar;generations:Generation[];next_cursor:string|null;data_complete:boolean;index:IndexState;observed_at:string};
export type Group={name:string;member_count:number;members:{asset:string;symbols:Record<string,string>}[];members_truncated:boolean;revision?:string};
export type DynamicGroup={name:string;revision:string;base_catalogue_revision:string;members:string[];bindings:Record<string,unknown>};
export type BackfillCatalogue={revision:string;groups:Group[];sources:string[];recipes:string[];destinations:{name:string;revision:string;eligibility_policy:string;allow_gaps:boolean}[];dynamic_groups:{available:boolean;scope?:string;reason?:string};next_offset:number|null};
export type BackfillIntent={group:string;group_revision:string;source:string;recipe:string;destination:string;start_date:string;end_date:string;outputs:('fit'|'metrics')[];origin_lineage:string};
export type Validation={valid:boolean;request_id:string;native_fit:string;group_revision:string;catalogue_revision:string;recipe:{name:string;revision:string;runtime_revision:string};source_profile:{source:string;capture:string;semantics:string};range:{start_date:string;end_date:string;semantics:string};destination:{destination:string;revision:string;allow_gaps:boolean};estimated_ticker_days:number;financial_revision:string|null};
export type RequestStatus={request_id:string;accepted_at_ms:number;declaration:BackfillIntent&{recipe:Validation['recipe'];publication:Validation['destination']};progress:{state:string;expected:number;counts:Record<string,number>;terminal_accounted:boolean;dependency_age_ms:number}};
export type AssetProgress={items:{asset:string;symbol:string;progress:RequestStatus['progress']}[];total:number;next_offset:number|null};
export type ArtifactEvidence={items:{asset:string;business_date:string;checkpoint_sha256:string;artifacts:{product:string;sha256:string;size_bytes:number}[];delivery:{state:string;receipt_sha256:string|null}|null}[];next_cursor:number|null};
type Transport=<T>(path:string,signal:AbortSignal,body?:unknown,key?:string)=>Promise<T>;
export class CommandApi {
 constructor(private transport:Transport,private live:(args:Filters,signal:AbortSignal)=>Promise<Page>){}
 async universe(signal:AbortSignal){
  let offset=0,first:CoverageUniverse|null=null;const items:CoverageAsset[]=[];const seen=new Set<string>();
  do{const page=await this.transport<CoverageUniverse>('/coverage/universe?'+new URLSearchParams({offset:String(offset),limit:'256'}),signal);
   if(first&&page.catalogue_revision!==first.catalogue_revision)throw Error('Historical catalogue changed during paging. Refresh required.');
   first??=page;
   for(const row of page.items){if(seen.has(row.asset))throw Error('Duplicate historical asset identity.');seen.add(row.asset);items.push(row)}
   first={...first,index:page.index,observed_at:page.observed_at};
   if(page.next_offset==null)break;if(page.next_offset<=offset)throw Error('Historical catalogue cursor did not advance.');offset=page.next_offset;
  }while(!signal.aborted);
  if(!first||items.length!==first.registered_total)throw Error('Historical catalogue paging incomplete.');
  return {...first,items,next_offset:null};
 }
 timeline(asset:string,start:string,end:string,signal:AbortSignal,cursor=''){return this.transport<Timeline>('/coverage/assets/'+encodeURIComponent(asset)+'?'+new URLSearchParams({start_date:start,end_date:end,...(cursor?{cursor}:{})}),signal)}
 catalogue(signal:AbortSignal){return this.transport<BackfillCatalogue>('/backfills/catalogue?limit=256',signal)}
 groups(signal:AbortSignal){return this.transport<{items:DynamicGroup[]}>('/backfills/groups',signal)}
 createGroup(body:{name:string;members:string[];base_catalogue_revision:string;expected_revision?:string},signal:AbortSignal){return this.transport<DynamicGroup>('/backfills/groups',signal,body)}
 validate(body:BackfillIntent,key:string,signal:AbortSignal){return this.transport<Validation>('/backfills/validate',signal,body,key)}
 submit(body:BackfillIntent,key:string,signal:AbortSignal){return this.transport<{request_id:string;status_url:string}>('/backfills/submit',signal,body,key)}
 requests(signal:AbortSignal,cursor=''){return this.transport<import('./model').HistoryPage>('/backfills/requests?'+new URLSearchParams({limit:'50',...(cursor?{cursor}:{})}),signal)}
 status(id:string,signal:AbortSignal){return this.transport<RequestStatus>('/backfills/requests/'+id,signal)}
 progress(id:string,signal:AbortSignal,offset=0){return this.transport<AssetProgress>('/backfills/requests/'+id+'/assets?'+new URLSearchParams({offset:String(offset),limit:'256'}),signal)}
 artifacts(id:string,signal:AbortSignal,cursor=0){return this.transport<ArtifactEvidence>('/backfills/requests/'+id+'/artifacts?'+new URLSearchParams({cursor:String(cursor),limit:'256'}),signal)}
 cancel(id:string,key:string,signal:AbortSignal){return this.transport<{request_id:string;cancelled:boolean}>('/backfills/requests/'+id+'/cancellation',signal,{},key)}
 day(id:string,day:string,asset:string,signal:AbortSignal,nativeExpiryIndex=0,nativeCursor=0,quotes?:{expiry:string;quoteCursor:number},cut?:import('./model').CutSelection,term=false){return this.transport<HistoryDay>('/backfills/requests/'+id+'/days/'+day+'?'+new URLSearchParams({asset,native_expiry_index:String(nativeExpiryIndex),native_cursor:String(nativeCursor),native_limit:'256',...(cut?{native_cut_kind:cut.kind,native_cut_value:String(cut.value),native_term:String(term)}:{}),...(quotes?{expiry:quotes.expiry,quote_cursor:String(quotes.quoteCursor)}:{})}),signal)}
 async fullUniverse(signal:AbortSignal,onProgress?:(loaded:number,total:number)=>void):Promise<{items:Asset[];page:Page}>{
  const items:Asset[]=[];let offset=0,base:Page|null=null;const seen=new Set<string>();
  do {const page=await this.live({q:'',source:'',group:'',sort:'ticker',direction:'asc',offset,limit:256},signal);
   if(base&&page.config_revision!==base.config_revision)throw Error('Universe configuration changed during paging. Refresh to load one revision.');
   if(base&&page.configured_total!==base.configured_total)throw Error('Universe changed during paging. Refresh required.');
   base??=page;
   for(const row of page.items){if(seen.has(row.asset_id))throw Error('Universe returned duplicate asset identity. Refresh required.');seen.add(row.asset_id);items.push(row)}
   onProgress?.(items.length,page.total);
   if(page.next_offset===null)break;
   if(page.next_offset<=offset)throw Error('Universe cursor did not advance.');
   offset=page.next_offset;
  }while(!signal.aborted);
  if(!base||items.length!==base.total)throw Error('Universe paging incomplete.');
  return {items,page:base};
 }
}
export const tickerOf=(asset:string)=>asset.includes(':')?asset.slice(asset.indexOf(':')+1):asset;
export const dateAdd=(value:string,days:number)=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
export const coverageFor=(asset:Asset,coverage:CoverageUniverse|null)=>coverage?.items.find(x=>x.asset===asset.asset_id||x.asset===asset.ticker);
export const liveState=(asset:Asset)=>asset.accepted_output.state;
export const historicalLabel=(asset:Asset,coverage:CoverageUniverse|null)=>!coverage?'unknown':coverageFor(asset,coverage)?.state??'unregistered';
export function filterUniverse(items:Asset[],coverage:CoverageUniverse|null,args:{q:string;live:string;history:string;source:string;sort:string}){
 const query=args.q.trim().toUpperCase();
 const rows=items.filter(a=>(!query||a.ticker.toUpperCase().includes(query)||a.asset_id.toUpperCase().includes(query))&&(!args.live||liveState(a)===args.live)&&(!args.history||historicalLabel(a,coverage)===args.history)&&(!args.source||a.source===args.source));
 const rank:Record<string,number>={failed:0,stale:1,no_data:2,unknown:3,observed:4};
 return [...rows].sort((a,b)=>{if(args.sort==='live')return (rank[liveState(a)]??9)-(rank[liveState(b)]??9)||a.ticker.localeCompare(b.ticker);
 if(args.sort==='history')return historicalLabel(a,coverage).localeCompare(historicalLabel(b,coverage))||a.ticker.localeCompare(b.ticker);
 if(args.sort==='ticker_desc')return b.ticker.localeCompare(a.ticker);
 return a.ticker.localeCompare(b.ticker)||a.asset_id.localeCompare(b.asset_id)});
}
