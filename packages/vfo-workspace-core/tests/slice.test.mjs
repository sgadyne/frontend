import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/slice.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {nearestStrike}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('nearest returned strike keeps valid zero and skips missing or non-finite values',()=>{
 const points=[{ns:0,strike:0,iv:0},{ns:1,strike:90,iv:null},{ns:2,strike:100,iv:.2},{ns:3,strike:110,iv:.3},{ns:4,strike:NaN,iv:.4}];
 assert.equal(nearestStrike(points,0),points[0]);assert.equal(nearestStrike(points,106),points[3]);assert.equal(nearestStrike(points,99),points[2]);assert.equal(nearestStrike(points,NaN),undefined);assert.equal(nearestStrike([],100),undefined);
});
test('native expiry labels keep time and timezone and preserve unknown formats',async()=>{
 const modelSource=await readFile(new URL('../src/model.ts',import.meta.url),'utf8');
 const modelCode=ts.transpileModule(modelSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const {expiryLabel}=await import('data:text/javascript;base64,'+Buffer.from(modelCode).toString('base64'));
 assert.equal(expiryLabel('20261120-093000.000-EST'),'20 Nov 2026 · 09:30 EST');assert.equal(expiryLabel('unknown'),'unknown');
});
