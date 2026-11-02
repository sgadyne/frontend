import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/session.ts',import.meta.url),'utf8');
let code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const commandSource=await readFile(new URL('../src/command-client.ts',import.meta.url),'utf8');
const commandCode=ts.transpileModule(commandSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const commandUrl='data:text/javascript;base64,'+Buffer.from(commandCode).toString('base64');
code=code.replace("'./command-client'",JSON.stringify(commandUrl));
const {VfoSession}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const root=provider=>({forEnvironment:()=>provider,profiles:async()=>({defaultEnvironment:'sandbox',profiles:[{id:'sandbox',label:'Sandbox',available:true,customWrites:true},{id:'staging',label:'Staging',available:false,customWrites:false}]})});
const next=()=>new Promise(resolve=>setImmediate(resolve));
test('scope/environment change discards late data and keeps safe view references',async()=>{
 const pending=[];
 const provider={
  list:()=>Promise.resolve({items:[],configured_total:1997,total:1997}),
  detail:()=>Promise.resolve({items:[]}),surface:(asset,source,revision,signal)=>new Promise(resolve=>pending.push({asset,revision,signal,resolve})),
  draft:()=>Promise.resolve({draft:null}),receipts:()=>Promise.resolve({items:[]})
 };
 const controller=new AbortController();const session=new VfoSession({signal:controller.signal},{deployment:'sandbox'},root(provider));await next();
 session.bindScope('personal:a','a:1');session.select('EQUITY:SPX');assert.equal(pending.length,1);
 session.setDeployment('staging');pending[0].resolve({expiries:[{listed_index:0}],evaluation:{rows:[{listed_index:0}]},revision:'a'.repeat(64),asset_id:'EQUITY:SPX'});await next();assert.equal(session.getSnapshot().surface,null);assert.equal(session.getSnapshot().page,null);
 session.setDeployment('sandbox');session.select('EQUITY:SPY');assert.equal(pending.length,2);session.bindScope('personal:b','b:2');pending[1].resolve({expiries:[{listed_index:0}],evaluation:{rows:[{listed_index:0}]},revision:'b'.repeat(64),asset_id:'EQUITY:SPY'});await next();assert.equal(session.getSnapshot().surface,null);assert.equal(session.getSnapshot().asset,null);
 session.select('EQUITY:SPX');pending[2].resolve({expiries:[{listed_index:0}],evaluation:{rows:[{listed_index:0}]},revision:'c'.repeat(64),asset_id:'EQUITY:SPX'});await next();assert.equal(session.getSnapshot().revision,'c'.repeat(64));const saved=session.serialize();assert.equal(saved.asset,'EQUITY:SPX');assert(!('surface'in saved));assert(!('draft'in saved));controller.abort();
});

test('ticker switch aborts prior surface and never displays a late response',async()=>{
 const pending=[];
 const provider={list:()=>Promise.resolve({items:[]}),detail:()=>Promise.resolve({items:[]}),surface:(asset,source,revision,signal)=>new Promise(resolve=>pending.push({asset,signal,resolve})),draft:()=>Promise.resolve({draft:null}),receipts:()=>Promise.resolve({items:[]})};
 const controller=new AbortController(),session=new VfoSession({signal:controller.signal},{deployment:'sandbox'},root(provider));await next();
 session.bindScope('personal:a','a:1');session.select('EQUITY:SPX');session.select('EQUITY:SPY');
 session.setExpiry(57);assert.equal(pending[0].signal.aborted,true);pending[1].resolve({expiries:[{listed_index:0}],evaluation:{rows:[{listed_index:0}]},asset_id:'EQUITY:SPY',revision:'b'.repeat(64)});await next();pending[0].resolve({expiries:[{listed_index:0}],evaluation:{rows:[{listed_index:0}]},asset_id:'EQUITY:SPX',revision:'a'.repeat(64)});await next();
 assert.equal(session.getSnapshot().expiryIndex,0);assert.equal(session.getSnapshot().surface.asset_id,'EQUITY:SPY');assert.equal(session.getSnapshot().revision,'b'.repeat(64));controller.abort();
});
