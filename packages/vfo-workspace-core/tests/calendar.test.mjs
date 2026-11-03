import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/coverage/calendar.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {calendarMonths,calendarDates}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('multi-year coverage has one summary per month, including empty months',()=>{
 const months=calendarMonths([{date:'2024-05-01',tone:'cov-observed',label:'Stored',snapshots:2}],'2023-01-01','2026-01-01');
 assert.equal(months.length,36);assert.equal(months.find(m=>m.key==='2024-05').recorded,1);assert.equal(months[0].recorded,0);
 assert.equal(months.at(-1).key,'2025-12');
});
test('any assessed failure dominates a healthy month and unknown is not healthy',()=>{
 const day=(date,tone)=>({date,tone,label:tone});
 let month=calendarMonths([day('2024-05-01','quality-good'),day('2024-05-31','quality-bad')],'2024-05-01','2024-06-01')[0];
 assert.equal(month.tone,'quality-bad');
 month=calendarMonths([day('2024-05-01','quality-good'),day('2024-05-02','quality-unknown')],'2024-05-01','2024-06-01')[0];
 assert.equal(month.tone,'quality-unknown');
 assert.equal(calendarMonths([day('2024-05-01','cov-observed')],'2024-05-01','2024-06-01')[0].tone,'cov-observed');
});
test('expanded calendars respect leap days and exclusive partial ranges',()=>{
 assert.equal(calendarDates('2024-02','2024-01-01','2025-01-01').length,29);
 assert.equal(calendarDates('2025-02','2025-01-01','2026-01-01').length,28);
 assert.deepEqual(calendarDates('2024-02','2024-02-28','2024-03-01'),['2024-02-28','2024-02-29']);
 assert.deepEqual(calendarDates('2024-02','2024-02-01','2024-02-02'),['2024-02-01']);
});

test('invalid and final supported year boundaries cannot leave an unbounded month loop',()=>{
 assert.deepEqual(calendarMonths([],'2024-01-01','invalid'),[]);
 assert.equal(calendarMonths([],'9999-01-01','9999-12-31').length,12);
});
