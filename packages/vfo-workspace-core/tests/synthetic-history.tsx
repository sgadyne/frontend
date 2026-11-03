import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TickerTearsheet} from '../src/ticker/TickerTearsheet';
import '../src/operations.css';
import type {VfoSession} from '../src/session';
import type {CoverageUniverse} from '../src/command-client';
const sources=['archive','feed','internal'];
const records=sources.map((source,s)=>{const days=[];for(let t=Date.UTC(2018,0,1);t<Date.UTC(2026,10,1);t+=86400000){
 const date=new Date(t).toISOString().slice(0,10),quality=['good','warning','bad','unknown'][(Math.floor(t/86400000)+s)%4];
 if(date<'2020-01-01'&&s===2)continue;
 days.push({date,state:'verified',session:true,quality:{state:quality,label:quality,assessment_revision:quality==='unknown'?undefined:'synthetic-assessment'}});
}return {request_id:'synthetic-'+source,source,accepted_at_ms:s,days,provenance:{classification:'synthetic'},recipe:{revision:'synthetic'}};});
const calls:{start:string;end:string}[]=[],dayCalls:{request:string;date:string}[]=[];
Object.assign(window,{historyFixture:{calls,dayCalls}});
const session={select:()=>{},commands:{
 async timeline(asset:string,start:string,end:string){calls.push({start,end});return {asset,start_date:start,end_date:end,generations:records.map(r=>({...r,days:r.days.filter(d=>d.date>=start&&d.date<end)})),next_cursor:null,data_complete:true,index:{data_complete:true}};},
 async day(request:string,date:string){dayCalls.push({request,date});throw Error('Synthetic fixture: no surface artifact attached.');}
}} as unknown as VfoSession;
const coverage={items:[{asset:'SYNTHETIC',calendar:{start_date:'2018-01-01',end_date:'2026-11-01',exchange:'Synthetic',timezone:'UTC'},sources:sources.map(source=>({source}))}]} as unknown as CoverageUniverse;
const state={asset:'SYNTHETIC',deployment:'demo',surface:null,loading:{surface:false}} as unknown as ReturnType<VfoSession['getSnapshot']>;
function Demo(){const [dark,setDark]=useState(false);return <div style={{height:'100vh',background:dark?'#15202a':'#eef2f4',padding:16}}><button onClick={()=>setDark(!dark)}>Toggle fixture theme</button><main className="ops-workspace" data-fixture-theme={dark?'dark':'light'} style={{position:'relative',height:'calc(100vh - 70px)',minHeight:0,...(dark?{'--sampo-panel':'#1e2832','--sampo-canvas':'#15202a','--sampo-ink':'#e4edf2','--sampo-muted':'#a9bdca','--sampo-line':'#3b4c59','--sampo-accent':'#95ced5','--sampo-accent-soft':'#29434a','--sampo-surface-sunken':'#18232d'}:{})} as React.CSSProperties}><TickerTearsheet session={session} state={state} coverage={coverage} choice={null} docked={false} onDock={()=>{}} onBackfill={()=>{}} renderLive={()=><p>Synthetic live view; no source connected.</p>} renderInspector={()=>null} renderCustom={()=>null}/></main></div>;}
createRoot(document.getElementById('root')!).render(<Demo/>);
