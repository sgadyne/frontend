import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateLinkedDescriptor,validatePortableSelection,encodeLinkedAddress,decodeLinkedAddress,appRouteAddress} from '@sampo/contracts';
import {createAppDescriptor} from './linked-descriptors.mjs';
import {restoreVfoState,portableVfoState,restoreRiskState,portableRiskState,restoreClusterView,portableClusterView,restoreReplicationState,portableReplicationState} from './portable-state.ts';
const ids=new Set(['catalogue.A','catalogue.B']);
const definitions=[{id:'report',views:[{id:'overview'},{id:'detail'}]}];

test('each independent descriptor validates, VFO routes share one app and entry; Cluster is linkless',async()=>{
 const contributions=JSON.parse(await readFile(new URL('./contributions.json',import.meta.url),'utf8'));
 for(const name of ['risk','vfo','cluster','replication']){
  const descriptor=createAppDescriptor(name);
  validateLinkedDescriptor(descriptor,{publisher:'sampo.synthetic',contributions:contributions.filter(c=>c.applicationId===descriptor.applicationId)});
  assert.equal(descriptor.entries.length,1);
  assert.ok(descriptor.routes.every(r=>r.contributionId===descriptor.applicationId+'.main'));
  for(const route of descriptor.routes)validatePortableSelection({},route.portableState.schema);
 }
 assert.deepEqual(createAppDescriptor('cluster').references,[]);
 assert.equal(createAppDescriptor('vfo').routes.length,5);
 assert.equal(createAppDescriptor('vfo').routes[0].portableState.version,2);
 for(const view of ['universe','live','history']){
  const route=createAppDescriptor('vfo').routes.find(r=>r.id==='vfo.'+view);
  validatePortableSelection({view},route.selectionSchema);
  assert.throws(()=>validatePortableSelection({},route.selectionSchema));
  assert.throws(()=>validatePortableSelection({view:'unsupported'},route.selectionSchema));
 }
 assert.deepEqual(JSON.parse(await readFile(new URL('./linked.json',import.meta.url),'utf8')),createAppDescriptor('vfo'));
});

test('legacy empty and v1 VFO state restore without jobs or data; canonical selection stays exact',()=>{
 const empty=restoreVfoState({}, {},ids);assert.equal(empty.view,'universe');assert.deepEqual(empty.selected,[]);
 const restored=restoreVfoState({version:1,view:'history',watchlist:['catalogue.A','removed'],selected:['catalogue.B']},{instrumentId:'catalogue.A'},ids);
 assert.equal(restored.view,'history');assert.deepEqual(restored.watchlist,['catalogue.A']);assert.equal(restored.focused,'catalogue.A');
 validatePortableSelection(portableVfoState(restored),createAppDescriptor('vfo').routes[0].portableState.schema);
 assert.throws(()=>restoreVfoState({}, {instrumentId:'AAPL'},ids),/unavailable/);
 assert.throws(()=>restoreVfoState({}, {instrumentId:''},ids),/unavailable/);
 assert.equal(restoreVfoState({version:1,focused:''},{instrumentId:'catalogue.A'},ids).focused,'','an explicitly closed inspector stays closed');
 const d=createAppDescriptor('vfo'),route=d.routes.find(r=>r.id==='vfo.instrument');
 const address=appRouteAddress({publisherId:d.publisherId,applicationId:d.applicationId,entryId:'vfo'},route.id,{view:'live',instrumentId:'catalogue.A'},{kind:'exact',release:'sha256:'+'a'.repeat(64),contributionId:route.contributionId});
 assert.deepEqual(decodeLinkedAddress(encodeLinkedAddress(address,route)),address);
 assert.throws(()=>validatePortableSelection({},route.selectionSchema));
});

test('closed bounded state rejects unknown versions, intent, credentials, malformed arrays and oversized values',()=>{
 for(const value of [{version:99},{credentials:'secret'},{execution:'submit'},{watchlist:['catalogue.A',7]},{selected:Array(101).fill('catalogue.A')},{filters:{query:'x'.repeat(161)}},{page:Infinity},{data:{rows:[]}}])assert.throws(()=>restoreVfoState(value,{},ids));
 for(const name of ['risk','cluster','replication'])assert.throws(()=>validatePortableSelection({bindingId:'private'},createAppDescriptor(name).routes[0].portableState.schema));
 assert.throws(()=>restoreRiskState({}, {instrumentId:'catalogue.A'}));
});

test('Risk portable state preserves all/none scope semantics and selected view without observations',()=>{
 const state={mode:'positions',metric:'risk',query:'demo',selectedKey:null,inspectorOpen:false,scopeByMode:{positions:{mode:'positions',presetId:null,books:null,tags:[],excludedTags:['excluded']}}};
 const portable=portableRiskState(state),restored=restoreRiskState(portable,{});
 assert.equal(restored.metric,'risk');assert.equal(restored.scopeByMode.positions.books,null);assert.deepEqual(restored.scopeByMode.positions.tags,[]);
 assert.equal(Object.hasOwn(portable,'comparison'),false);assert.equal(restoreRiskState({}, {mode:'trades'}).mode,'trades');
});

test('Cluster carries a bounded display view, and never calculation/job proposals',()=>{
 assert.equal(restoreClusterView({}, {view:'risk'}),'risk');
 assert.deepEqual(portableClusterView({view:'pca',spec:{execute:true},result:{rows:[]}}),{version:1,view:'pca'});
 assert.throws(()=>restoreClusterView({view:'pca',spec:{}},{}));
});

test('Replication preserves recognized report/view, filters and snapshot, rejecting unknown destinations',()=>{
 const selection={snapshotId:'retained-1',start:'2026-10-01',end:'2026-10-30',compareSnapshotId:'',filters:{book:['rates']}};
 const raw={state:{reportId:'report',viewId:'detail',selections:{report:selection},pinned:['report'],savedViews:[],columns:{table:['book']},chartGroups:{'report:detail':'USD'}}};
 const portable=portableReplicationState(raw),state=restoreReplicationState(portable,{},definitions);
 assert.equal(state.reportId,'report');assert.equal(state.viewId,'detail');
 assert.equal(state.selections.report.snapshotId,'retained-1');assert.deepEqual(state.selections.report.filters,{book:['rates']});
 assert.deepEqual(state.columns,{table:['book']});
 assert.throws(()=>restoreReplicationState({}, {reportId:'not-authorized'},definitions),/unavailable/);
 assert.throws(()=>restoreReplicationState({}, {reportId:'report',viewId:'nonexistent'},definitions),/unavailable/);
});
