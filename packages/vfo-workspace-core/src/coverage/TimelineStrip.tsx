import type {SourceHistory,DateAttempt} from '../history';
import {dateAdd} from '../command-client';
import {cellEvidence,sourceLabel} from './domain';
import {HistoryCalendar} from './HistoryCalendar';
export function TimelineStrip({history,lens='coverage',selected,onSelect}:{history:SourceHistory;lens?:'coverage'|'quality';selected?:{request:string;date:string}|null;onSelect:(attempt:DateAttempt)=>void}){
 const chosen=history.dates.find(cell=>selected?.date===cell.date&&cell.attempts.some(a=>a.generation.request_id===selected.request));
 const days=history.dates.map(cell=>{const evidence=cellEvidence(cell.selected,lens);return {date:cell.date,tone:evidence.tone,label:evidence.label,detail:evidence.detail,disabled:!cell.selected}});
 return <div className="ops-source-strip"><div className="ops-source-caption"><b>{sourceLabel(history.source)}</b><span>{history.dates.filter(c=>c.selected&&['computed','verified'].includes(c.selected.day.state)).length} saved dates</span></div>
  <HistoryCalendar label={sourceLabel(history.source)} days={days} start={history.dates[0]?.date??''} end={history.dates.length?dateAdd(history.dates.at(-1)!.date,1):''} selectedDate={chosen?.date} onSelect={date=>{const cell=history.dates.find(c=>c.date===date);if(cell?.selected)onSelect(cell.selected)}}/>
 </div>;
}
export function CoverageLegend({lens}:{lens:'coverage'|'quality'}){return <div className="ops-legend">{(lens==='quality'?[['quality-good','Native fit accepted'],['quality-warning','Fallback / warning'],['quality-bad','Assessed failure'],['quality-unknown','Unassessed']]:[['cov-verified','Artifact verified'],['cov-computed','Computed'],['cov-missing','Recorded gap'],['cov-failed','Compute failed'],['cov-pending','Pending'],['cov-unknown','Unknown'],['cov-non_session','Non-session']]).map(([tone,label])=><span key={tone}><i className={'ops-'+tone}/>{label}</span>)}</div>;}
