import {useEffect,useState} from 'react';
import type {Asset,ObservationCoverage,SourceObservation,Surface,CutSelection} from '../model';
import type {VfoSession} from '../session';
import {dateAdd} from '../command-client';
import {expiryLabel,num} from '../model';
import {VolatilityTearsheet} from '../volatility/VolatilityTearsheet';

export function ObservationCoverageHome({assets,onInspect}:{assets:Asset[];onInspect:(asset:string)=>void}){
 return <section className="ops-native-details" aria-label="Stored source coverage">
  <h2>Historical observations</h2><p className="ops-hint">Select a ticker to query its stored dates and snapshots. Coverage is read on demand; missing dates are not labelled as failed jobs.</p>
  <div className="vfo-scroll-table"><table><thead><tr><th>Ticker</th><th>Asset class</th><th>Latest stored live observation</th><th/></tr></thead>
   <tbody>{assets.map(asset=><tr key={asset.asset_id}><td>{asset.ticker}</td><td>{asset.asset_id.split(':')[0]}</td><td>{expiryLabel(asset.accepted_output.asof)}</td><td><button onClick={()=>onInspect(asset.asset_id)}>Inspect history</button></td></tr>)}</tbody></table></div>
 </section>;
}

export function ObservationHistory({session,asset}:{session:VfoSession;asset:string}){
 const provider=session.getProvider(),today=new Date().toISOString().slice(0,10);
 const [start,setStart]=useState(dateAdd(today,-365)),[end,setEnd]=useState(dateAdd(today,1));
 const [coverage,setCoverage]=useState<ObservationCoverage|null>(null),[coverageError,setCoverageError]=useState(''),[coverageBusy,setCoverageBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const [selection,setSelection]=useState<{source:string;date:string}|null>(null),[items,setItems]=useState<SourceObservation[]>([]),[selected,setSelected]=useState<SourceObservation|null>(null);
 const [surface,setSurface]=useState<Surface|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[expiry,setExpiry]=useState(0),[cut,setCut]=useState<CutSelection>({kind:'KF',value:1});
 useEffect(()=>{
  const controller=new AbortController();setCoverage(null);setCoverageError('');setSelection(null);setItems([]);setSelected(null);setSurface(null);setBusy(false);
  if(!provider.observationCoverage||end<=start)return()=>controller.abort();
  setCoverageBusy(true);
  provider.observationCoverage(asset,start,end,controller.signal).then(value=>{if(!controller.signal.aborted)setCoverage(value)}).catch(e=>{if(!controller.signal.aborted)setCoverageError(e.message)}).finally(()=>{if(!controller.signal.aborted)setCoverageBusy(false)});
  return()=>controller.abort();
 },[session,asset,start,end,refresh]);
 useEffect(()=>{
  const controller=new AbortController();setItems([]);setSelected(null);setSurface(null);setError('');
  if(!selection||!provider.observations)return()=>controller.abort();
  setBusy(true);
  provider.observations(asset,selection.source,selection.date,controller.signal).then(value=>{if(!controller.signal.aborted){setItems(value);setSelected(value.at(-1)??null);if(!value.length)setError('No stored observations returned for this date.')}}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setBusy(false)});
  return()=>controller.abort();
 },[session,asset,selection?.source,selection?.date]);
 useEffect(()=>{
  const controller=new AbortController();setError('');
  if(!selected||!selection||!provider.observationSurface)return()=>controller.abort();
  setBusy(true);
  provider.observationSurface(asset,selected.source,selection.date,selected.timestamp,controller.signal,cut).then(value=>{if(!controller.signal.aborted){if(value.revision!==selected.revision)throw Error('Stored surface identity changed');setSurface(value);setExpiry(old=>value.expiries.some(e=>e.listed_index===old)?old:value.evaluation.rows[0]?.listed_index??0)}}).catch(e=>{if(!controller.signal.aborted){setSurface(null);setError(e.message)}}).finally(()=>{if(!controller.signal.aborted)setBusy(false)});
  return()=>controller.abort();
 },[session,asset,selected?.timestamp,selected?.revision,cut.kind,cut.value]);
 function select(source:string,date:string){setSurface(null);setSelection({source,date});}
 return <section aria-label="Historical source observations">
  <div className="ops-history-range"><label>Start<input aria-label="Source history start" type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>End · excluded<input aria-label="Source history end" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><button disabled={coverageBusy} onClick={()=>setRefresh(x=>x+1)}>Refresh coverage</button></div>
  <p className="ops-hint">Dates and timestamps below come from stored source observations. Blue marks a stored observation, not a quality verdict. Stored fit quality is shown as supplied. The initial one-year window can be extended using Start and End.</p>
  {coverageBusy&&<p role="status">Reading historical coverage…</p>}{coverageError&&<p role="alert" className="ops-error">{coverageError}</p>}
  {coverage?.sources.map(source=><div className="ops-source-strip" key={source.source}><div className="ops-source-caption"><b>{source.label}</b><span>{source.days.length} observed dates · {source.days.reduce((sum,day)=>sum+day.snapshots,0)} snapshots</span></div><div className="ops-date-cells" role="group" aria-label={source.label+' observed dates'}>
   {source.days.map(day=><button key={day.date} className={'ops-cell ops-cov-observed'+(selection?.source===source.source&&selection.date===day.date?' is-selected':'')} aria-label={source.label+' '+day.date} title={day.date+' · '+day.snapshots+' snapshots · stored quality '+num(day.last_fit_quality,5)} onClick={()=>select(source.source,day.date)}/>)}
  </div><div className="ops-date-labels"><span>{source.days[0]?.date??'No observations in this window'}</span><span>{source.days.at(-1)?.date}</span></div></div>)}
  {items.length>0&&<label>Stored snapshot<select aria-label="Stored source snapshot" value={selected?.timestamp??''} onChange={e=>{setSurface(null);setSelected(items.find(row=>row.timestamp===e.target.value)??null)}}>{items.map(row=><option key={row.timestamp} value={row.timestamp}>{expiryLabel(row.timestamp)} · {row.expiry_count} expiries · quality {num(row.fit_quality,5)}</option>)}</select></label>}
  {busy&&<p role="status">Loading selected stored model…</p>}{error&&<p role="alert" className="ops-error">{error}</p>}
  {surface&&<><p className="ops-hint">{surface.ticker} · {selection?.source} · {expiryLabel(surface.source_asof)} · read only</p><VolatilityTearsheet surface={surface} inputs={null} expiryIndex={expiry} onExpiry={setExpiry} onStrike={()=>{}} onCut={value=>setCut(old=>old.kind===value.kind&&old.value===value.value?old:value)} history/></>}
  {!selection&&!busy&&<p className="ops-hint">Select an observed date to inspect all stored snapshots for that source.</p>}
 </section>;
}
