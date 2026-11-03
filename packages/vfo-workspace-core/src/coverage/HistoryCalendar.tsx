import {useEffect,useId,useMemo,useState} from 'react';
import {calendarDates,calendarMonths,type CalendarDay} from './calendar';
const monthName=(key:string,format:'short'|'long')=>new Date(key+'-01T12:00:00Z').toLocaleDateString('en',{month:format,timeZone:'UTC'});
export function HistoryCalendar({label,days,start,end,selectedDate,onSelect}:{label:string;days:CalendarDay[];start:string;end:string;selectedDate?:string;onSelect:(date:string)=>void}){
 const months=useMemo(()=>calendarMonths(days,start,end),[days,start,end]);
 const [opened,setOpened]=useState<string|null>(selectedDate?.slice(0,7)??null),id=useId();
 useEffect(()=>{if(selectedDate)setOpened(selectedDate.slice(0,7))},[selectedDate]);
 useEffect(()=>{setOpened(key=>months.some(m=>m.key===key)?key:null)},[months]);
 const active=months.find(m=>m.key===opened),byDate=new Map(active?.days.map(d=>[d.date,d])??[]);
 const years=[...new Set(months.map(m=>m.year))];
 const dates=active?calendarDates(active.key,start,end):[];
 const calendar=active&&<section id={id} className="ops-history-open-month" aria-label={label+' '+active.key+' days'}>
   <div className="ops-source-caption"><b>{monthName(active.key,'long')} {active.year}</b><span>{active.recorded} recorded dates / {active.label}</span><button type="button" aria-label={'Collapse '+label+' month'} onClick={()=>setOpened(null)}>Close</button></div>
   <div className="ops-history-days" role="group" aria-label={label+' observed dates'}>
    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><small key={day} aria-hidden="true">{day}</small>)}
    {dates.map((date,index)=>{const cell=byDate.get(date),disabled=!cell||cell.disabled,chosen=selectedDate===date;
     return <button type="button" key={date} data-history-day={date} className={'ops-history-day ops-'+(cell?.tone??'cov-unknown')+(chosen?' is-selected':'')} aria-label={label+' '+date} aria-pressed={chosen} disabled={disabled} style={index===0?{gridColumnStart:(new Date(date+'T12:00:00Z').getUTCDay()+6)%7+1}:undefined} title={[date,cell?.label??'No stored observation',cell?.detail].filter(Boolean).join(' / ')} onClick={()=>onSelect(date)}>{Number(date.slice(-2))}</button>;
    })}
   </div>
  </section>;
 return <div className="ops-history-calendar">
  <p className="ops-hint">Choose a month, then a day. Month colours summarise reported statuses; any assessed failure or warning takes priority.</p>
  <div className="ops-history-years" aria-label={label+' months'}>
   {years.map(year=><div className="ops-history-year" key={year}><strong>{year}</strong><div className="ops-history-months">
    {months.filter(m=>m.year===year).map(month=><button type="button" key={month.key} className={'ops-history-month ops-'+month.tone} aria-label={label+' '+monthName(month.key,'long')+' '+year} aria-expanded={opened===month.key} aria-controls={id} disabled={!month.days.length} title={month.key+' / '+month.recorded+' recorded dates / '+month.label} onClick={()=>setOpened(key=>key===month.key?null:month.key)}>
     <span>{monthName(month.key,'short')}</span><small>{month.recorded||'—'}{['quality-bad','cov-failed','quality-warning'].includes(month.tone)?' !':''}</small>
    </button>)}
   </div>{active?.year===year&&calendar}</div>)}
  </div>

 </div>;
}
