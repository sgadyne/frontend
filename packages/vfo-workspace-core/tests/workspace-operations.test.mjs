import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=async name=>ts.transpileModule(await readFile(new URL('../src/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const commands=uri(await compile('command-client.ts')),history=uri(await compile('history.ts'));
const domain=await import(uri((await compile('coverage/domain.ts')).replace("'../command-client'",JSON.stringify(commands)).replace("'../history'",JSON.stringify(history))));
const csv=await import(uri(await compile('coverage/csv.ts')));
test('CSV preserves quoted commas, multiline text, escaped quotes and BOM',()=>{
 assert.deepEqual(csv.parseCsv('\uFEFFticker,industry\r\nSPY,"Equity, broad"\r\nQQQ,"line 1\nline ""2"""'),[['ticker','industry'],['SPY','Equity, broad'],['QQQ','line 1\nline "2"']]);
 assert.throws(()=>csv.parseCsv('ticker,ticker\nSPY,SPY'),/unique/);
 assert.throws(()=>csv.parseCsv('ticker,name\nSPY,"bad'),/Unclosed/);
 assert.throws(()=>csv.parseCsv('ticker,name\nSPY,"bad"oops'),/Unexpected/);
});
test('ticker resolution never silently chooses an ambiguous alias',()=>{
 const index=csv.aliasIndex([{asset_id:'EQUITY:ABC',ticker:'ABC'},{asset_id:'FUTURES:ABC',ticker:'ABC'}],null);
 assert.equal(csv.resolveSymbol('ABC',index).assetId,null);
 assert.equal(csv.resolveSymbol('equity:abc',index).assetId,'EQUITY:ABC');
 assert.equal(csv.resolveSymbol('missing',index).assetId,null);
});
test('artifact verification is not a fit-quality assessment',()=>{
 assert.equal(domain.quality({state:'verified'}).state,'unknown');
 assert.equal(domain.quality({quality:{state:'good',label:'pass'}}).state,'unknown');
 assert.equal(domain.quality({quality:{state:'warning',label:'Fallback fit',assessment_revision:'abc'}}).state,'warning');
 assert.equal(domain.cellEvidence(undefined,'coverage').label,'No recorded observation');
});
const timeline=days=>({start_date:'2026-05-01',end_date:'2026-05-06',data_complete:true,index:{data_complete:true},generations:[{source:'ivol',request_id:'a',accepted_at_ms:1,days:days.map(([date,state,session=true])=>({date,state,session}))}]});
test('gap planning merges adjacent eligible days and excludes unknown or non-session dates',()=>{
 const timelines={SPY:timeline([['2026-05-01','missing'],['2026-05-02','missing'],['2026-05-03','missing',false],['2026-05-05','verified']]),QQQ:timeline([['2026-05-01','missing'],['2026-05-02','missing']])};
 assert.deepEqual(domain.planRanges(['SPY','QQQ'],'ivol','2026-05-01','2026-05-06','gaps',timelines),[{members:['QQQ','SPY'],start:'2026-05-01',end:'2026-05-03'}]);
 assert.deepEqual(domain.planRanges(['SPY'],'ivol','2026-05-01','2026-05-06','quality',timelines),[]);
 assert.throws(()=>domain.planRanges(['SPY'],'ivol','2026-05-01','2026-05-06','gaps',{SPY:{...timelines.SPY,data_complete:false}}),/Complete coverage/);
});
test('date and multi-year coverage handling does not silently clip requests to a year',async()=>{
 assert.equal(domain.validDate('2026-02-31'),false);
 const calls=[];const client={timeline:async(asset,start,end)=>{calls.push([start,end]);return {asset,start_date:start,end_date:end,data_complete:true,index:{data_complete:true},generations:[],next_cursor:null}}};
 const result=await domain.readWindow(client,'SPY','2024-01-01','2026-05-01',new AbortController().signal);
 assert.equal(result.start_date,'2024-01-01');assert.equal(result.end_date,'2026-05-01');assert.equal(calls.length,3);
});

test('full-history browsing retains incomplete evidence from earlier windows',async()=>{
 const calls=[];const client={timeline:async(asset,start,end)=>{
  calls.push([start,end]);return {asset,start_date:start,end_date:end,data_complete:true,index:{data_complete:calls.length!==1},generations:[],next_cursor:null};
 }};
 const result=await domain.readWindow(client,'SYNTHETIC','2024-01-01','2026-05-01',new AbortController().signal);
 assert.equal(calls.length,3);assert.equal(result.data_complete,false);
});
