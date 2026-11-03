import {useEffect,useMemo,useState} from 'react';
import type {SourceHistory,DateAttempt} from '../history';
import {cellEvidence,sourceLabel} from './domain';

const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
type Props={histories:SourceHistory[];lens:'coverage'|'quality';selected:{request:string;date:string}|null;onSelect:(attempt:DateAttempt)=>void;busy?:boolean};

/** Navigation only: all colors and selectable records come from retained evidence. */
export function HistoryCalendar({histories,lens,selected,onSelect,busy=false}:Props){
 const [source,setSource]=useState('');
 const [month,setMonth]=useState('');
 const selectedHistory=histories.find(h=>h.dates.some(d=>d.date===selected?.date&&d.attempts.some(a=>a.generation.request_id===selected.request)));
 const history=histories.find(h=>h.source===source)??selectedHistory??histories[0];
 const availableMonths=useMemo(()=>[...new Set(history?.dates.map(d=>d.date.slice(0,7))??[])].sort(),[history]);
 const years=[...new Set(availableMonths.map(m=>m.slice(0,4)))];
 const visibleMonth=availableMonths.includes(month)?month:
  selected?.date&&availableMonths.includes(selected.date.slice(0,7))?selected.date.slice(0,7):availableMonths.at(-1)??'';
 useEffect(()=>{
  if(selectedHistory&&selected){setSource(selectedHistory.source);setMonth(selected.date.slice(0,7));}
 },[selected?.request,selected?.date]);
 const cells=history?.dates.filter(d=>d.date.startsWith(visibleMonth))??[];
 const byDate=new Map(cells.map(d=>[d.date,d]));
 const year=visibleMonth.slice(0,4);
 const offset=visibleMonth?(new Date(visibleMonth+'-01T12:00:00Z').getUTCDay()+6)%7:0;
 const days=visibleMonth?new Date(Date.UTC(Number(year),Number(visibleMonth.slice(5)),0)).getUTCDate():0;
 const monthIndex=availableMonths.indexOf(visibleMonth);
 function attemptFor(cell:SourceHistory['dates'][number]){
  return cell.attempts.find(a=>cell.date===selected?.date&&a.generation.request_id===selected.request)??cell.selected;
 }
 const selectedCell=history?.dates.find(d=>d.date===selected?.date&&d.attempts.some(a=>a.generation.request_id===selected.request));
 const evidence=selectedCell?cellEvidence(attemptFor(selectedCell),lens):null;
 if(!history||!visibleMonth)return null;
 return <div className="ops-history-calendar" aria-label="Saved date browser" aria-busy={busy}>
  <div className="ops-calendar-controls">
   <label>Source<select aria-label="Historical source" value={history.source} onChange={e=>setSource(e.target.value)} disabled={busy}>
    {histories.map(h=><option key={h.source} value={h.source}>{sourceLabel(h.source)}</option>)}
   </select></label>
   <label>Year<select aria-label="Historical year" value={year} disabled={busy} onChange={e=>{
    const sameMonth=e.target.value+visibleMonth.slice(4);
    setMonth(availableMonths.includes(sameMonth)?sameMonth:availableMonths.find(m=>m.startsWith(e.target.value))!);
   }}>{years.map(y=><option key={y}>{y}</option>)}</select></label>
   <div className="ops-calendar-paging">
    <button aria-label="Previous historical month" disabled={busy||monthIndex<=0} onClick={()=>setMonth(availableMonths[monthIndex-1])}>‹</button>
    <button aria-label="Next historical month" disabled={busy||monthIndex>=availableMonths.length-1} onClick={()=>setMonth(availableMonths[monthIndex+1])}>›</button>
   </div>
  </div>
  <div className="ops-calendar-months" role="group" aria-label="Historical month">
   {months.map((label,i)=>{
    const key=year+'-'+String(i+1).padStart(2,'0');
    const monthCells=history.dates.filter(d=>d.date.startsWith(key));
    const tones=new Map<string,number>();
    for(const cell of monthCells){const tone=cellEvidence(attemptFor(cell),lens).tone;tones.set(tone,(tones.get(tone)??0)+1);}
    return <button key={key} aria-label={label+' '+year} aria-pressed={visibleMonth===key} disabled={busy||!monthCells.length} onClick={()=>setMonth(key)}>
     <span>{label}</span><span className="ops-month-evidence" aria-hidden="true">{[...tones].map(([tone,count])=><i key={tone} className={'ops-'+tone} style={{flex:count}}/>)}</span>
    </button>;
   })}
  </div>
  <div className="ops-calendar-heading"><strong>{new Date(visibleMonth+'-01T12:00:00Z').toLocaleDateString('en',{month:'long',year:'numeric',timeZone:'UTC'})}</strong><span>{cells.filter(d=>d.selected&&['verified','computed'].includes(d.selected.day.state)).length} saved dates</span></div>
  <div className="ops-calendar-week" aria-hidden="true">{weekdays.map(day=><span key={day}>{day}</span>)}</div>
  <div className="ops-calendar-days" role="group" aria-label="Historical day">
   {Array.from({length:offset},(_,i)=><span key={'blank-'+i} aria-hidden="true"/>)}
   {Array.from({length:days},(_,i)=>{
    const date=visibleMonth+'-'+String(i+1).padStart(2,'0');
    const cell=byDate.get(date),attempt=cell?attemptFor(cell):undefined,e=cellEvidence(attempt,lens);
    const chosen=Boolean(cell&&selected?.date===date&&cell.attempts.some(a=>a.generation.request_id===selected.request));
    const label=cell?e.label:'Outside loaded range';
    return <button key={date} className={'ops-calendar-day'+(chosen?' is-selected':'')} disabled={busy||!attempt} aria-pressed={chosen}
     aria-label={sourceLabel(history.source)+' '+date+' · '+label} title={[date,label,e.detail,cell?cell.attempts.length+' saved attempts':''].filter(Boolean).join(' · ')}
     onClick={()=>attempt&&onSelect(attempt)}>
     <span>{i+1}</span><i aria-hidden="true" className={'ops-day-evidence ops-'+e.tone}/>
    </button>;
   })}
  </div>
  <div className="ops-calendar-selection" role="status">
   {selectedCell&&evidence?<><i aria-hidden="true" className={'ops-'+evidence.tone}/><span>Selected</span><strong>{selectedCell.date}</strong><span>{evidence.label}</span></>:<span>Select a recorded day to inspect its saved attempt.</span>}
  </div>
  <p className="ops-calendar-note">Showing the loaded date range. Grey means {lens==='quality'?'unassessed quality':'no recorded observation'}; month bars show the mix of daily evidence.</p>
 </div>;
}
