import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function load(name){const source=await readFile(new URL('../src/'+name,import.meta.url),'utf8');const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const {nativeDays,nativeSamples,nativeGrid,highlightedSamples,nearestInputPerExpiry,nearestStrikeIndex,priceIntervals}=await load('plot-data.ts'),{expiryLabel}=await load('model.ts');
const surface={native_asof_ns:'1793384862000000000',expiries:[{listed_index:0,expiry_ns:'1793471262000000000'},{listed_index:1,expiry_ns:'1793557662000000000'}]};
const evaluation={rows:[{listed_index:0,expiry:'exact-am',points:[{ns:0,strike:0,iv:0},{ns:1,strike:100,iv:.2},{ns:2,strike:120,iv:null}]},{listed_index:1,expiry:'exact-pm',points:[{ns:0,strike:90,iv:.3},{ns:2,strike:110,iv:.4}]}]};
test('3D uses exact ns differences and preserves finite zero values',()=>{assert.equal(nativeDays(surface.expiries[0].expiry_ns,surface.native_asof_ns),1);assert.equal(nativeDays('bad',surface.native_asof_ns),null);const pts=nativeSamples(surface,evaluation,'K');assert.equal(pts.length,4);assert.equal(pts[0].x,0);assert.equal(pts[0].z,0);assert.equal(pts[1].z,20);assert.equal(pts[2].y,2);});
test('surface aligns actual normal-strike nodes, retaining holes across unequal rows',()=>{const grid=nativeGrid(surface,evaluation,'K');assert.deepEqual(grid.x,[[0,100,null],[90,null,110]]);assert.deepEqual(grid.z,[[0,20,null],[30,null,40]]);assert.equal(grid.custom[1][2][3],1);assert.equal(grid.custom[1][2][4],1);});
test('yellow expiry and nearest-strike traces use returned samples without interpolation',()=>{const pts=nativeSamples(surface,evaluation,'K'),selected=highlightedSamples(pts,0,102);assert.equal(selected.tenor.length,2);assert.deepEqual(selected.term.map(p=>p.strike),[100,110]);assert(selected.term.every(p=>pts.includes(p)));});
test('captured price bars preserve zeros and reject crossed/missing quotes without mixing expiry or right',()=>{const q=(bid,ask,expiry='2026-11-01',right='C')=>({expiry,right,strike:100,timestamp:'2026-10-30T20:00:00Z',bid,ask});const kept=priceIntervals([q(0,0),q(1,2),q(2,1),q(null,2),q(1,2,'2026-12-01'),q(1,2,'2026-11-01','P')],'2026-11-01','C');assert.equal(kept.length,2);assert.deepEqual([kept[0].bid,kept[0].ask],[0,0]);});
test('expiry formatting preserves AM/PM and timezone, validates dates, and handles ISO/nanoseconds explicitly',()=>{assert.equal(expiryLabel('20261120-093000.000-EST'),'20 Nov 2026 · 09:30 EST');assert.equal(expiryLabel('20261120-160000.000-EST'),'20 Nov 2026 · 16:00 EST');assert.equal(expiryLabel('2026-11-20'),'20 Nov 2026');assert.equal(expiryLabel('2026-11-20T09:30:00-05:00'),'20 Nov 2026 · 14:30 UTC');assert.equal(expiryLabel('1795185000000000000'),'20 Nov 2026 · 14:30 UTC');assert.equal(expiryLabel('2026-02-30'),'Unknown expiry');assert.equal(expiryLabel('0'),'Unknown expiry');assert.equal(expiryLabel(undefined),'Unknown expiry');assert.equal(expiryLabel('unclassified'),'unclassified');});

test('strike term reduces expiry-selected multi-strike bands to nearest actual input once per exact expiry',()=>{const exp=[{listed_index:0,expiry:'same-am',expiry_ns:'2000000000'},{listed_index:1,expiry:'same-pm',expiry_ns:'3000000000'}],point=(i,k)=>({...exp[i],strike:k,iv:.2,error:.02,lower:.18,upper:.22});const expiryOnly=[point(0,90),point(0,100),point(0,110)];assert.deepEqual(nearestInputPerExpiry(expiryOnly,exp,104).map(p=>[p.listed_index,p.strike]),[[0,100]]);const all=[...expiryOnly,point(1,103),point(1,110),{...point(1,104),expiry:'wrong-generation-expiry'}];assert.deepEqual(nearestInputPerExpiry(all,exp,104).map(p=>[p.listed_index,p.strike]),[[0,100],[1,103]]);});
test('strike cut survives different sparse expiry grids and restores when available',()=>{
 const first=[{strike:80},{strike:90},{strike:100},{strike:110}],other=[{strike:84},{strike:94},{strike:106},{strike:116}],target=100;
 assert.equal(nearestStrikeIndex(first,target,2),2);
 assert.equal(nearestStrikeIndex(other,target,2),1);
 assert.equal(nearestStrikeIndex(first,target,1),2);
 assert.equal(nearestStrikeIndex(first,0,3),0);
 assert.equal(nearestStrikeIndex(first,null,3),3);
 assert.equal(nearestStrikeIndex([],target,3),0);
});

test('native density uses inverse-price units without IV percent scaling or renormalization',()=>{
 const e={rows:[{listed_index:0,expiry:'exact-am',points:[{ns:0,strike:100,iv:.2}],density_points:[{ns:-1,strike:95,pdf:0},{ns:0,strike:100,pdf:.03},{ns:1,strike:105,pdf:-.001}]}]};
 assert.deepEqual(nativeSamples(surface,e,'K','pdf').map(p=>p.z),[0,.03,-.001]);
 assert.deepEqual(nativeSamples(surface,e,'K').map(p=>p.z),[20]);
 assert.equal(nativeGrid(surface,e,'K','pdf').z[0][1],.03);
});
test('an absent native PDF does not fall back to IV or a guessed density',()=>{
 assert.deepEqual(nativeSamples(surface,evaluation,'K','pdf'),[]);
});

// A fixed percentage slider ignores how narrow a near-expiry sample can be.
test('moneyness slider uses the shared native grid instead of an arbitrary percentage',async()=>{
 const source=await readFile(new URL('../src/plot-data.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const {nativeCutDomain}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const rows=[{forward:100,points:[{strike:99.8,ns:-3},{strike:100.2,ns:3}]},{forward:110,points:[{strike:88,ns:-3},{strike:132,ns:3}]}];
 assert.deepEqual(nativeCutDomain(rows,'KF'),{min:.998,max:1.002});
 assert.deepEqual(nativeCutDomain(rows,'NS'),{min:-3,max:3});
 assert.equal(nativeCutDomain([{points:[{strike:90,ns:-3},{strike:100,ns:3}]},{points:[{strike:110,ns:-3},{strike:130,ns:3}]}],'K'),null); // physical K ranges do not overlap
});
