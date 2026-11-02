import type {CoverageDay, Generation, Timeline, CoverageAsset, CommandApi} from './command-client';
import type {HistoryDay} from './model';
import type {NativeInputs} from './vola-inputs';

export type HistoricalRecord = HistoryDay & {
  request_id:string; session:boolean; identity:Record<string,string>;
  surface:HistoryDay['surface'] & {surface_sha256?:string; native_asof?:string; native_asof_ns?:string;
    input_bands?:NativeInputs; expiries?:{expiry:string;expiry_ns:string;listed_index:number}[]};
};
export type DateAttempt = {generation:Generation; day:CoverageDay};
export type SourceHistory = {source:string; dates:{date:string; attempts:DateAttempt[]; selected?:DateAttempt}[]};
const addDay = (value:string, days:number) => {
  const d=new Date(value+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
};
export function defaultHistoryRange(asset:CoverageAsset) {
  const end=asset.calendar.end_date;
  return {start:[asset.calendar.start_date,addDay(end,-366)].sort().at(-1)!,end};
}
// Coverage is the union of dates across batches. Each selectable model still
// points to one exact immutable request; numerical artifacts are never spliced.
export function sourceHistories(timeline:Timeline):SourceHistory[] {
  const rank:Record<string,number>={verified:0,computed:1,quality_held:2,pending:3,failed:4,missing:5,cancelled:6,non_session:7};
  const sources=[...new Set(timeline.generations.map(g=>g.source))].sort();
  return sources.map(source=>{
    const byDate=new Map<string,DateAttempt[]>();
    for(const generation of timeline.generations.filter(g=>g.source===source)) for(const day of generation.days){
      if(day.date<timeline.start_date||day.date>=timeline.end_date)continue;
      const entries=byDate.get(day.date)??[];
      if(!entries.some(a=>a.generation.request_id===generation.request_id))entries.push({generation,day});
      byDate.set(day.date,entries);
    }
    const dates:SourceHistory['dates']=[];
    for(let date=timeline.start_date;date<timeline.end_date;date=addDay(date,1)){
      const attempts=byDate.get(date)??[];
      attempts.sort((a,b)=>(rank[a.day.state]??8)-(rank[b.day.state]??8)||b.generation.accepted_at_ms-a.generation.accepted_at_ms||a.generation.request_id.localeCompare(b.generation.request_id));
      dates.push({date,attempts,selected:attempts[0]});
    }
    return {source,dates};
  });
}
export async function fullTimeline(client:CommandApi, asset:string, start:string, end:string, signal:AbortSignal) {
  let first:Timeline|null=null, cursor=''; const generations:Generation[]=[],seen=new Set<string>();
  do {
    const page=await client.timeline(asset,start,end,signal,cursor);
    if(page.start_date!==start||page.end_date!==end||first&&page.asset!==first.asset)throw Error('Historical coverage identity changed');
    first??=page; generations.push(...page.generations);
    first={...first,data_complete:first.data_complete&&page.data_complete,index:page.index};
    if(!page.next_cursor)break;
    if(seen.has(page.next_cursor))throw Error('Historical coverage cursor repeated');
    seen.add(page.next_cursor); cursor=page.next_cursor;
  }while(!signal.aborted);
  signal.throwIfAborted();
  return {...first!,generations,next_cursor:null};
}
export async function historicalDay(client:CommandApi, request:string, date:string, asset:string, expiryIndex:number, signal:AbortSignal,cut?:import('./model').CutSelection,term=false) {
  const value=await client.day(request,date,asset,signal,expiryIndex,0,undefined,cut,term) as HistoricalRecord;
  if(value.request_id!==request||value.business_date!==date||value.asset!==asset)throw Error('Historical model identity mismatch');
  const bands=value.surface.input_bands;
  if(bands){
    const items=[...bands.items], seen=new Set<number>(); let cursor=bands.next_cursor;
    while(cursor!==null){
      if(seen.has(cursor))throw Error('Historical native input cursor repeated'); seen.add(cursor);
      const page=await client.day(request,date,asset,signal,expiryIndex,cursor,undefined,cut,term) as HistoricalRecord;
      const b=page.surface.input_bands;
      if(page.request_id!==request||page.business_date!==date||page.asset!==asset||page.surface.surface_sha256!==value.surface.surface_sha256||!b||b.results_revision!==bands.results_revision||b.surface_revision!==bands.surface_revision||b.total!==bands.total)throw Error('Historical native input generation mismatch');
      if(b.next_cursor!==null&&b.next_cursor<=cursor)throw Error('Historical native input cursor did not advance');
      items.push(...b.items);cursor=b.next_cursor;
    }
    if(bands.state==='available'&&items.length!==bands.total)throw Error('Historical native input pages incomplete');
    value.surface.input_bands={...bands,items,next_cursor:null};
  }
  return value;
}
export async function historicalQuotes(client:CommandApi, request:string,date:string,asset:string,expiry:string,surfaceRevision:string,signal:AbortSignal) {
  let first:HistoryDay['quotes']|null=null,cursor=0;const seen=new Set<number>();const items:HistoryDay['quotes']['items']=[];
  do {
    if(seen.has(cursor))throw Error('Historical quote cursor repeated');seen.add(cursor);
    const page=await client.day(request,date,asset,signal,0,0,{expiry,quoteCursor:cursor}) as HistoricalRecord;
    if(page.request_id!==request||page.business_date!==date||page.asset!==asset||page.surface.surface_sha256!==surfaceRevision||first&&page.quotes.frame_sha256!==first.frame_sha256)throw Error('Historical quote generation mismatch');
    first??=page.quotes;
    if(page.quotes.items.some(q=>q.expiry!==expiry))throw Error('Historical quote expiry mismatch');
    items.push(...page.quotes.items);
    const next=page.quotes.next_cursor;
    if(next==null){if(page.quotes.truncated)throw Error('Historical quote cursor missing');break;}
    if(next<=cursor)throw Error('Historical quote cursor did not advance');cursor=next;
  }while(!signal.aborted);
  signal.throwIfAborted();return {...first!,items,truncated:false,next_cursor:null};
}
