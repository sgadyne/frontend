// Synthetic host adapters exercise the actual packed SDK; real permissions are covered by the browser harness.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLinkedNavigation,createLinkedSessionPool,createLinkedQueryPool,planLinkedDraftPlacement,applyLinkedDraftPlacement} from '@sampo/runtime';
import {createAppDescriptor} from './linked-descriptors.mjs';
import {restoreVfoState} from './portable-state.ts';
const context={accountId:'synthetic-user',realmId:'synthetic-realm',workspaceId:'synthetic-workspace',accessContext:'synthetic-access',generation:1,isolation:'trusted-private'};
const release='sha256:'+'a'.repeat(64),missing='sha256:'+'b'.repeat(64);
const descriptor=createAppDescriptor('vfo'),entry={publisherId:descriptor.publisherId,applicationId:descriptor.applicationId,entryId:'vfo'};
const address={kind:'app-route',entry,routeId:'vfo.instrument',selection:{instrumentId:'catalogue.A',view:'history'},version:{kind:'exact',release,contributionId:'example.vfo.main'}};
const destination={status:'resolved',exactAddress:address,entry:{entry,title:'VFO',release,description:'Synthetic navigation fixture'},route:descriptor.routes.find(r=>r.id===address.routeId),context,capabilities:{open:true,peek:true,addToDraft:true}};
const overview=descriptor.references[0].target;
const riskEntry={entry:overview.entry,title:'Risk Lens',release,description:'Synthetic overview fixture'};
const resolve=async requested=>requested.kind==='published-entry'?{status:'entry',entry:riskEntry,capabilities:{open:false,peek:false,addToDraft:false}}:requested.version.release===release?destination:{status:'unavailable'};

test('declared VFO -> related overview -> Back preserves exact route, bounded portable state, scroll and focus',async()=>{
 let mounts=0;const nav=createLinkedNavigation({resolve,isCurrent:()=>true,mount:async()=>({resource:{id:++mounts},dispose(){}})});
 await nav.open(address);const state=restoreVfoState({},address.selection,new Set(['catalogue.A']));
 const saved={portableState:{id:destination.route.portableState.id,version:2,value:state},scrollTop:420,focusLabel:'Search market catalogue'};
 nav.saveHistoryState(saved);await nav.open(overview);assert.equal(mounts,1,'metadata exploration imports no application');
 await nav.back();assert.deepEqual(nav.getSnapshot().main.resolution.exactAddress,address);assert.deepEqual(nav.getSnapshot().history[0].state,saved);
 assert.equal(mounts,1,'retained mount survives round trip');
 const serialized=nav.serializeHistory();await nav.dispose();
 const restored=createLinkedNavigation({resolve,isCurrent:()=>true,mount:async(_r,opts)=>({resource:opts.historyState,dispose(){}})});
 await restored.restoreHistory(serialized);assert.deepEqual(restored.getSnapshot().main.resource,saved);await restored.dispose();
});

test('Peek is temporary, shares exact session/query lifetime, and cannot execute draft placement',async()=>{
 let sessionDisposals=0,queryDisposals=0;
 const sessions=createLinkedSessionPool(()=>({dispose(){sessionDisposals++;}}));
 const queries=createLinkedQueryPool(()=>({dispose(){queryDisposals++;}}));
 const sessionIdentity={context,applicationId:entry.applicationId,release,sessionIdentity:JSON.stringify(address.selection)};
 const queryIdentity={context,schema:{id:'synthetic.catalogue',version:1},selection:address.selection,bindingId:'synthetic.fixture',bindingRevision:'fixture-v1'};
 const nav=createLinkedNavigation({resolve,isCurrent:()=>true,mount:async()=>{
  const session=sessions.acquire(sessionIdentity),query=queries.acquire(queryIdentity);
  return {resource:{session:session.session,query:query.query},dispose(){session.release();query.release();}};
 }});
 await nav.open(address);const main=nav.getSnapshot().main.resource;
 await nav.open(address,{presentation:'peek'});assert.equal(nav.getSnapshot().history.length,1);
 assert.equal(nav.getSnapshot().peek.resource.session,main.session);assert.equal(nav.getSnapshot().peek.resource.query,main.query);
 nav.closePeek();assert.equal(sessionDisposals,0);assert.equal(queryDisposals,0);assert.equal(nav.getSnapshot().main.resource,main);
 await nav.dispose();await sessions.dispose();await queries.dispose();assert.equal(sessionDisposals,1);assert.equal(queryDisposals,1);
});

test('unavailable exact release remains unavailable; access retirement suppresses a late mount',async()=>{
 let created=0,disposed=0,finish;
 const nav=createLinkedNavigation({resolve,isCurrent:()=>true,mount:async()=>{created++;await new Promise(r=>finish=r);return {resource:'protected',dispose(){disposed++;}};}});
 assert.deepEqual(await nav.open({...address,version:{...address.version,release:missing}}),{status:'unavailable'});assert.equal(created,0);
 const pending=nav.open(address);await new Promise(r=>setImmediate(r));nav.retire();finish();assert.deepEqual(await pending,{status:'unavailable'});
 assert.equal(nav.getSnapshot().main,null);assert.equal(nav.getSnapshot().history.length,0);assert.equal(disposed,1);await nav.dispose();
});

test('Add plan validates v2 state and exact address, affects only a personal draft, and rejects incompatible state',()=>{
 const state=restoreVfoState({},address.selection,new Set(['catalogue.A']));
 // The authoring app never calls this: it is the existing host draft transaction used by Add.
 const plan=planLinkedDraftPlacement(destination,state,3);
 assert.equal(plan.portableState.version,2);assert.deepEqual(plan.address,address);
 assert.throws(()=>planLinkedDraftPlacement(destination,{...state,execution:'submit'},3));
 const draft={id:context.workspaceId,revision:3,widgets:[],sessions:[]};
 const identities={widgetId:'synthetic-widget',contribution:{id:address.version.contributionId}};
 const added=applyLinkedDraftPlacement(draft,plan,destination,identities);assert.equal(draft.widgets.length,0);assert.equal(added.widgets.length,1);assert.deepEqual(added.widgets[0].config,address.selection);assert.deepEqual(added.widgets[0].viewState,state);assert.equal(added.revision,3);
 assert.throws(()=>applyLinkedDraftPlacement(draft,plan,{...destination,context:{...context,generation:2}},identities));
});
