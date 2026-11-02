import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const text=await readFile(new URL('../src/history.ts',import.meta.url),'utf8');
const js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {sourceHistories,defaultHistoryRange,fullTimeline,historicalQuotes}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const gen=(id,start,states,accepted=1)=>({request_id:id,source:'ivol',accepted_at_ms:accepted,days:states.map(([date,state])=>({date,state})),start_date:start});
test('separate weekly batches form one continuous coverage row and retain exact artifact identities',()=>{
 const timeline={start_date:'2026-05-01',end_date:'2026-05-05',generations:[gen('one','2026-05-01',[['2026-05-01','verified']]),gen('two','2026-05-04',[['2026-05-04','verified']])]};
 const [row]=sourceHistories(timeline);assert.equal(row.dates.length,4);
 assert.equal(row.dates[0].selected.generation.request_id,'one');assert.equal(row.dates[3].selected.generation.request_id,'two');assert.equal(row.dates[1].selected,undefined);
});
test('a later failed repair does not hide an existing artifact; every attempt remains selectable',()=>{
 const t={start_date:'2026-05-01',end_date:'2026-05-02',generations:[gen('good','2026-05-01',[['2026-05-01','verified']],1),gen('failed','2026-05-01',[['2026-05-01','failed']],9)]};
 const [row]=sourceHistories(t);assert.equal(row.dates[0].selected.generation.request_id,'good');assert.equal(row.dates[0].attempts.length,2);
 t.generations.push(gen('newgood','2026-05-01',[['2026-05-01','verified']],10));assert.equal(sourceHistories(t)[0].dates[0].selected.generation.request_id,'newgood');
});
test('default range covers the registered archive rather than latest request summaries',()=>{
 assert.deepEqual(defaultHistoryRange({calendar:{start_date:'2025-10-30',end_date:'2026-10-30'},sources:[{request:{start_date:'2026-09-23',end_date:'2026-09-24'}}]}),{start:'2025-10-30',end:'2026-10-30'});
});
test('coverage paging follows empty filtered pages and loads all recorded requests',async()=>{
 const calls=[];const client={timeline:async(a,s,e,signal,cursor)=>{calls.push(cursor);return {asset:'IWM',start_date:s,end_date:e,generations:cursor?[gen('fit',s,[[s,'verified']])]:[],next_cursor:cursor?null:'next',data_complete:true,index:{data_complete:true}}}};
 const value=await fullTimeline(client,'IWM','2026-05-01','2026-05-02',new AbortController().signal);assert.equal(value.generations.length,1);assert.deepEqual(calls,['','next']);
});
test('quotes read every page for the exact expiry and saved surface',async()=>{
 const calls=[];const client={day:async(req,date,asset,signal,i,n,q)=>{calls.push(q);return {request_id:req,business_date:date,asset,surface:{surface_sha256:'exact'},quotes:{frame_sha256:'frame',items:[{expiry:q.expiry,strike:q.quoteCursor}],truncated:q.quoteCursor===0,next_cursor:q.quoteCursor===0?1000:null}}}};
 const q=await historicalQuotes(client,'request','2026-05-01','IWM','2026-05-15','exact',new AbortController().signal);assert.equal(q.items.length,2);assert.deepEqual(calls.map(x=>x.quoteCursor),[0,1000]);assert.equal(q.truncated,false);
});
test('quotes reject mismatched generations rather than mixing snapshots',async()=>{
 const client={day:async(req,date,asset)=>({request_id:req,business_date:date,asset,surface:{surface_sha256:'wrong'},quotes:{items:[]}})};
 await assert.rejects(historicalQuotes(client,'request','2026-05-01','IWM','2026-05-15','exact',new AbortController().signal),/generation mismatch/);
});
