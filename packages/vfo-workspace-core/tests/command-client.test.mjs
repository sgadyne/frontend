
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile(new URL('../src/command-client.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {CommandApi,filterUniverse,historicalLabel,dateAdd}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const fact=(state)=>({state,reason:'explicit_test_fixture'});
const asset=(i,state='observed')=>({asset_id:'EQUITY:T'+String(i).padStart(4,'0'),ticker:'T'+String(i).padStart(4,'0'),source:'ivol',input_timezone:'America/New_York',groups:[],accepted_output:fact(state),input:fact('unknown')});
const coverage={items:[{asset:'T0001',state:'recorded',recorded_requests:2,sources:[]},{asset:'T0002',state:'not_tested',recorded_requests:0,sources:[]}],index:{data_complete:true}};
const args={q:'',live:'',history:'',source:'',sort:'ticker'};
test('full configured universe pages all 1,997 records without a UI cap',async()=>{
 const rows=Array.from({length:1997},(_,i)=>asset(i));
 const offsets=[],client=new CommandApi(async()=>{throw Error('unexpected command')},async f=>{
  offsets.push(f.offset);return {items:rows.slice(f.offset,f.offset+f.limit),configured_total:1997,total:1997,config_revision:'fixed',next_offset:f.offset+f.limit<1997?f.offset+f.limit:null};
 });
 const result=await client.fullUniverse(new AbortController().signal);
 assert.equal(result.items.length,1997);
 assert.equal(result.items.at(-1).ticker,'T1996');
 assert.deepEqual(offsets,[0,256,512,768,1024,1280,1536,1792]);
});
test('larger future universe remains fully visible',async()=>{
 const rows=Array.from({length:3217},(_,i)=>asset(i));
 const client=new CommandApi(async()=>{},async f=>({items:rows.slice(f.offset,f.offset+256),configured_total:3217,total:3217,config_revision:'fixed',next_offset:f.offset+256<3217?f.offset+256:null}));
 assert.equal((await client.fullUniverse(new AbortController().signal)).items.length,3217);
});
test('configuration changes while paging cannot become one mixed universe',async()=>{
 const client=new CommandApi(async()=>{},async f=>({items:[asset(f.offset)],configured_total:2,total:2,config_revision:f.offset?'changed':'initial',next_offset:f.offset?null:1}));
 await assert.rejects(client.fullUniverse(new AbortController().signal),/configuration changed/);
});
test('duplicate identities and missing final page are rejected',async()=>{
 const duplicate=new CommandApi(async()=>{},async f=>({items:[asset(1)],configured_total:2,total:2,config_revision:'fixed',next_offset:f.offset?null:1}));
 await assert.rejects(duplicate.fullUniverse(new AbortController().signal),/duplicate asset/);
 const incomplete=new CommandApi(async()=>{},async()=>({items:[asset(1)],configured_total:2,total:2,config_revision:'fixed',next_offset:null}));
 await assert.rejects(incomplete.fullUniverse(new AbortController().signal),/incomplete/);
});
test('live and historical filters sort the full universe, preserving unknown registration',()=>{
 const rows=[asset(3,'no_data'),asset(2,'observed'),asset(1,'stale')];
 assert.equal(historicalLabel(rows[0],coverage),'unregistered');
 assert.equal(historicalLabel(rows[0],null),'unknown');
 assert.deepEqual(filterUniverse(rows,coverage,{...args,history:'recorded'}).map(a=>a.ticker),['T0001']);
 assert.deepEqual(filterUniverse(rows,coverage,{...args,history:'not_tested'}).map(a=>a.ticker),['T0002']);
 assert.deepEqual(filterUniverse(rows,coverage,{...args,live:'no_data'}).map(a=>a.ticker),['T0003']);
 assert.deepEqual(filterUniverse(rows,coverage,{...args,sort:'live'}).map(a=>a.ticker),['T0001','T0003','T0002']);
 assert.equal(filterUniverse(rows,coverage,{...args,q:'equity:t0002'}).length,1);
});
test('native historical selection and idempotency remain request scoped',async()=>{
 const calls=[];
 const client=new CommandApi(async(path,signal,body,key)=>{calls.push({path,body,key});return {}},async()=>{});
 const signal=new AbortController().signal,intent={group:'pilot_three',group_revision:'frozen',source:'ivol',start_date:'2026-04-02',end_date:'2026-04-03'};
 await client.validate(intent,'same-intent',signal);await client.submit(intent,'same-intent',signal);
 await client.day('a'.repeat(64),'2026-04-02','IWM',signal,2,256);
 assert.equal(calls[0].key,calls[1].key);assert.deepEqual(calls[0].body,calls[1].body);
 assert.match(calls[2].path,/native_expiry_index=2/);assert.match(calls[2].path,/native_cursor=256/);
});
test('half-open business-date arithmetic does not use workstation DST',()=>{
 assert.equal(dateAdd('2026-03-08',1),'2026-03-09');
 assert.equal(dateAdd('2026-11-01',1),'2026-11-02');
 assert.equal(dateAdd('2026-12-31',1),'2027-01-01');
});
