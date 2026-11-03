import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {AnimatePresence,MotionConfig,motion,useReducedMotion} from 'motion/react';
import type {SourceHistory,DateAttempt} from '../history';
import {cellEvidence,labels,sourceLabel,validDate} from './domain';
import {CoverageLegend} from './TimelineStrip';
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
type Props={histories:SourceHistory[];lens:'coverage'|'quality';selected:{request:string;date:string}|null;onSelect:(attempt:DateAttempt)=>void;busy?:boolean;range?:{start:string;end:string};sources?:string[];onLensChange?:(lens:'coverage'|'quality')=>void;onRefresh?:()=>void};
type Summary={counts:Map<string,number>;recorded:number;attempt?:DateAttempt};
const toneOrder=['quality-good','quality-warning','quality-bad','quality-unknown','cov-verified','cov-computed','cov-missing','cov-failed','cov-quality_held','cov-pending','cov-cancelled','cov-non_session','cov-unknown'];
const toneLabel=(tone:string)=>({'quality-good':'Accepted','quality-warning':'Fallback / warning','quality-bad':'Assessed failure','quality-unknown':'Unassessed'}[tone]??labels[tone.replace('cov-','')]??'Unknown');
const utc=(date:string)=>Date.parse(date+'T12:00:00Z');
function periodRange(id:string){
 const parts=id.split('-').map(Number),start=id.length===4?id+'-01-01':id.length===7?id+'-01':id;
 const end=new Date(Date.UTC(parts[0],parts.length===1?0:parts[1]-1,parts[2]??1,12));
 if(parts.length===1)end.setUTCFullYear(parts[0]+1);
 else if(parts.length===2)end.setUTCMonth(parts[1]);
 else end.setUTCDate(parts[2]+1);
 return {start:utc(start),end:end.getTime()};
}
export function HistoryCalendar(props:Props){return <MotionConfig reducedMotion="user"><HistoryStrip {...props}/></MotionConfig>;}
function HistoryStrip({histories,lens,selected,onSelect,busy=false,range,sources=[],onLensChange,onRefresh}:Props){
 const [path,setPath]=useState<string[]>([]),[direction,setDirection]=useState(1),[hint,setHint]=useState<string|null>(null);
 const reduced=useReducedMotion(),pane=useRef<HTMLDivElement>(null),pendingFocus=useRef<string|null>(null);
 const bounds=useMemo(()=>{
  if(range&&validDate(range.start)&&validDate(range.end)&&range.end>range.start)return range;
  const dates=histories.flatMap(h=>h.dates.map(d=>d.date)).sort();
  return dates.length?{start:dates[0],end:new Date(utc(dates.at(-1)!)+86400000).toISOString().slice(0,10)}:null;
 },[range?.start,range?.end,histories]);
 const rows=useMemo(()=>{
  const bySource=new Map(histories.map(h=>[h.source,h]));
  return [...new Set([...histories.map(h=>h.source),...sources])].map(source=>{
   const periods=new Map<string,Summary>();
   for(const cell of bySource.get(source)?.dates??[]){
    const attempt=cell.attempts.find(a=>selected?.date===cell.date&&a.generation.request_id===selected.request)??cell.selected;
    const tone=cellEvidence(attempt,lens).tone;
    for(const key of [cell.date.slice(0,4),cell.date.slice(0,7),cell.date]){
     const item:Summary=periods.get(key)??{counts:new Map(),recorded:0};
     item.counts.set(tone,(item.counts.get(tone)??0)+1);
     if(attempt)item.recorded++;
     if(key.length===10)item.attempt=attempt;
     periods.set(key,item);
    }
   }
   return {source,periods};
  });
 },[histories,sources.join('\0'),lens,selected?.date,selected?.request]);
 useEffect(()=>{if(selected&&validDate(selected.date))setPath(selected.date.slice(0,7).split('-'));},[selected?.date,selected?.request]);
 useEffect(()=>{setHint(null);},[lens]);
 useEffect(()=>{if(bounds&&path.length&&(path[0]<bounds.start.slice(0,4)||path[0]>bounds.end.slice(0,4)))setPath([]);},[bounds?.start,bounds?.end]);
 if(!bounds)return null;
 const lastDate=new Date(utc(bounds.end)-86400000).toISOString().slice(0,10);
 const kind=path.length===0?'year':path.length===1?'month':'day';
 const columns=path.length===0?Array.from({length:Number(lastDate.slice(0,4))-Number(bounds.start.slice(0,4))+1},(_,i)=>({id:String(Number(bounds.start.slice(0,4))+i),label:String(Number(bounds.start.slice(0,4))+i)})):path.length===1?months.map((label,i)=>({id:path[0]+'-'+String(i+1).padStart(2,'0'),label})):Array.from({length:new Date(Date.UTC(+path[0],+path[1],0)).getUTCDate()},(_,i)=>({id:path.join('-')+'-'+String(i+1).padStart(2,'0'),label:String(i+1)}));
 function navigate(next:string[]){if(next.join('-')===path.join('-'))return;setDirection(next.length>=path.length?1:-1);pendingFocus.current=next.length<path.length?path.slice(0,next.length+1).join('-'):'first';setHint(null);setPath(next);}
 const selectedRow=rows.find(r=>r.periods.get(selected?.date??'')?.attempt?.generation.request_id===selected?.request&&selected);
 const selectedAttempt=selectedRow?.periods.get(selected?.date??'')?.attempt;
 const detail=selected&&selectedRow&&selectedAttempt?sourceLabel(selectedRow.source)+' · '+selected.date+' · '+cellEvidence(selectedAttempt,lens).label:bounds.start+' – '+lastDate+' · Full registered history';
 return <section className="ops-history-strip" aria-label="Saved date browser" aria-busy={busy}>
  <header className="ops-strip-head"><strong>History</strong><nav aria-label="History breadcrumbs">
   <button disabled={busy} aria-current={!path.length?'page':undefined} onClick={()=>navigate([])}>All years</button>
   {path.length>0&&<><span aria-hidden="true">/</span><button disabled={busy} aria-current={path.length===1?'page':undefined} onClick={()=>navigate([path[0]])}>{path[0]}</button></>}
   {path.length>1&&<><span aria-hidden="true">/</span><button disabled={busy} aria-current="page" onClick={()=>navigate(path)}>{months[+path[1]-1]}</button></>}
  </nav>{onLensChange&&<div className="ops-strip-lenses" role="group" aria-label="Historical evidence view">{(['coverage','quality'] as const).map(value=><button key={value} aria-pressed={lens===value} onClick={()=>onLensChange(value)}>{value==='quality'?'Fit quality':'Coverage'}</button>)}</div>}
  {onRefresh&&<button className="ops-strip-refresh" disabled={busy} onClick={onRefresh} aria-label="Refresh historical records" title="Refresh historical records">↻</button>}</header>
  <div className="ops-strip-viewport"><AnimatePresence initial={false} mode="wait">
   <motion.div key={path.join('-')||'all'} ref={pane} data-history-level={kind} initial={{opacity:reduced?1:0,x:reduced?0:direction*10}} animate={{opacity:1,x:0}} exit={{opacity:reduced?1:0,x:reduced?0:-direction*10}} transition={{duration:reduced?0:.14,ease:'easeOut'}} onAnimationComplete={()=>{
    if(!pendingFocus.current)return;const target=pendingFocus.current;pendingFocus.current=null;
    (target==='first'?pane.current?.querySelector<HTMLButtonElement>('.ops-period-cell:not(:disabled)'):pane.current?.querySelector<HTMLButtonElement>('[data-period="'+target+'"]:not(:disabled)'))?.focus({preventScroll:true});
   }}>
    <div className="ops-strip-scroll" tabIndex={0} role="group" aria-label={'Historical '+kind+' rows'}>
     <div className={'ops-strip-grid level-'+kind} style={{'--periods':columns.length} as CSSProperties}>
      <span className="ops-strip-source-heading">Source</span>{columns.map(col=><span className="ops-period-label" key={col.id}>{col.label}</span>)}
      {rows.map(row=><div className="ops-strip-row" key={row.source}>
       <span className="ops-strip-source" title={sourceLabel(row.source)}>{sourceLabel(row.source)}</span>
       {columns.map(col=>{
        const item=row.periods.get(col.id),period=periodRange(col.id);
        const length=Math.max(0,(Math.min(utc(bounds.end),period.end)-Math.max(utc(bounds.start),period.start))/86400000);
        const counts=new Map(item?.counts??[]),accounted=[...counts.values()].reduce((a,b)=>a+b,0),unknown=lens==='quality'?'quality-unknown':'cov-unknown';
        if(length>accounted)counts.set(unknown,(counts.get(unknown)??0)+length-accounted);
        const segments=[...counts].sort((a,b)=>toneOrder.indexOf(a[0])-toneOrder.indexOf(b[0]));
        const chosen=selectedRow?.source===row.source&&Boolean(selected?.date.startsWith(col.id));
        const description=sourceLabel(row.source)+' · '+col.id+' · '+(!length?'Outside registered range':!item?.recorded?'No recorded observation':kind==='day'&&item.attempt?cellEvidence(item.attempt,lens).label:segments.map(([tone,n])=>toneLabel(tone)+': '+n).join(' · '));
        return <button key={col.id} data-period={col.id} className={'ops-period-cell'+(chosen?' is-selected':'')} disabled={busy||!length||(kind==='day'&&!item?.attempt)} aria-pressed={kind==='day'?chosen:undefined} aria-label={description} title={description} onMouseEnter={()=>setHint(description)} onMouseLeave={()=>setHint(null)} onFocus={()=>setHint(description)} onBlur={()=>setHint(null)} onClick={()=>kind==='day'?item?.attempt&&onSelect(item.attempt):navigate(col.id.split('-'))}>
         <span className="ops-period-fill" aria-hidden="true">{segments.map(([tone,n])=><i key={tone} className={'ops-'+tone} style={{flex:n}}/>)}</span>
        </button>;
       })}
      </div>)}
     </div>
    </div>
   </motion.div>
  </AnimatePresence></div>
  <footer className="ops-strip-foot"><CoverageLegend lens={lens}/><span>Choose a {kind}</span></footer>
  <div className="ops-strip-detail" role="status">{busy?'Reading recorded history…':hint??detail}</div>
 </section>;
}
