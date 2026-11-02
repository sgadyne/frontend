import {useEffect,useState} from 'react';
import type {VfoSession} from '../session';
import type {HistoryItem} from '../model';
import {short} from '../model';
export function RequestList({session,refresh}:{session:VfoSession;refresh:number}){
 const [items,setItems]=useState<HistoryItem[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[cursor,setCursor]=useState(''),[next,setNext]=useState<string|null>(null),[tick,setTick]=useState(0),[opened,setOpened]=useState<string|null>(null);
 useEffect(()=>{const c=new AbortController();setBusy(true);setError('');let timer:ReturnType<typeof setTimeout>|undefined;
  session.commands.requests(c.signal,cursor).then(page=>{if(c.signal.aborted)return;setItems(page.items);setNext(page.next_cursor);if(page.items.some(x=>!['completed','completed-with-gaps','failed','cancelled'].includes(x.progress.state)))timer=setTimeout(()=>setTick(n=>n+1),15000);}).catch(e=>{if(!c.signal.aborted)setError(e.message)}).finally(()=>{if(!c.signal.aborted)setBusy(false)});return()=>{c.abort();clearTimeout(timer)};
 },[session,refresh,cursor,tick]);
 return <details className="ops-requests" open><summary>Requests & progress {busy?'· refreshing':''}</summary>{error?<p className="ops-error">{error}</p>:<div className="ops-request-table"><table><thead><tr><th>Request</th><th>Source</th><th>Window</th><th>Lifecycle</th></tr></thead><tbody>{items.map(row=><tr key={row.request_id}><td><code title={row.request_id}>{short(row.request_id)}</code><details onToggle={e=>{if(e.currentTarget.open)setOpened(row.request_id)}}><summary>Inspect ticker progress</summary>{opened===row.request_id&&<RequestProgress session={session} requestId={row.request_id}/>}</details></td><td>{row.declaration.source}</td><td>{row.declaration.start_date} → {row.declaration.end_date}</td><td><span className="ops-tag">{row.progress.state}</span></td></tr>)}{!items.length&&!busy&&<tr><td colSpan={4}>No recorded requests.</td></tr>}</tbody></table></div>}<footer><button disabled={!cursor} onClick={()=>setCursor('')}>First page</button><button disabled={!next} onClick={()=>setCursor(next??'')}>More requests</button></footer></details>;
}


function RequestProgress({session,requestId}:{session:VfoSession;requestId:string}){
 const [page,setPage]=useState<import('../command-client').AssetProgress|null>(null),[error,setError]=useState(''),[offset,setOffset]=useState(0);
 useEffect(()=>{const c=new AbortController();setPage(null);setError('');session.commands.progress(requestId,c.signal,offset).then(v=>{if(!c.signal.aborted)setPage(v)}).catch(e=>{if(!c.signal.aborted)setError(e.message)});return()=>c.abort();},[session,requestId,offset]);
 return <div className="ops-request-progress">{error?<p role="alert">{error}</p>:!page?<p>Loading frozen ticker progress…</p>:<><table><thead><tr><th>Ticker</th><th>State</th><th>Product counts</th></tr></thead><tbody>{page.items.map(row=><tr key={row.asset}><td>{row.asset}</td><td>{row.progress.state}</td><td>{Object.entries(row.progress.counts).map(([key,value])=>key+': '+value).join(' · ')}</td></tr>)}</tbody></table><div><button disabled={!offset} onClick={()=>setOffset(0)}>First tickers</button><button disabled={page.next_offset===null} onClick={()=>setOffset(page.next_offset??0)}>More tickers</button></div></>}</div>;
}
