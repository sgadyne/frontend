import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import type {JsonValue} from './model';
import type {VfoSession} from './session';
import type {Asset,Page} from './model';
import {expiryLabel} from './model';
import {liveState,coverageFor,type BackfillCatalogue,type CoverageUniverse,type DynamicGroup} from './command-client';
import {CsvImport} from './coverage/CsvImport';
import {CoverageHub} from './coverage/CoverageHub';
import {BackfillPlanner} from './coverage/BackfillPlanner';
import {RequestList} from './coverage/RequestList';
import {TickerTearsheet} from './ticker/TickerTearsheet';
import {approvedAsset,type BackfillSeed,type Classifications,type SnapshotChoice} from './coverage/domain';

import './operations.css';
import {MarketHome,useWorkspaceSite,useMarketFrame} from './market/MarketHome';
import {CoverageOverview} from './coverage/CoverageOverview';
import {emptyFilters,filterMarketAssets,type UniverseFilters} from './market/filters';
import {UniverseFilterBar} from './market/UniverseFilterBar';
type Props={explorerPreview?:boolean;session:VfoSession;state:ReturnType<VfoSession['getSnapshot']>;renderLive:()=>ReactNode;renderInspector:()=>ReactNode;renderCustom:()=>ReactNode;uiState?:JsonValue;onUiState?:(value:JsonValue)=>void};
export function CommandNode({session,state,renderLive,renderInspector,renderCustom,uiState,onUiState}:Props){
 const saved=(uiState&&typeof uiState==='object'&&!Array.isArray(uiState)?uiState:{}) as Record<string,JsonValue>;
 const [mode,setMode]=useState<'market'|'coverage'>(saved.mode==='coverage'?'coverage':'market'),[universe,setUniverse]=useState<Asset[]>([]),[page,setPage]=useState<Page|null>(null),[coverage,setCoverage]=useState<CoverageUniverse|null>(null),[catalogue,setCatalogue]=useState<BackfillCatalogue|null>(null),[loading,setLoading]=useState(false),[errors,setErrors]=useState<Record<string,string>>({}),[refresh,setRefresh]=useState(0);
 const context=state.scope+'|'+state.deployment;
 const initialFilters=saved.filterContext===context&&saved.filters&&typeof saved.filters==='object'&&!Array.isArray(saved.filters)?{...emptyFilters,...saved.filters} as UniverseFilters:emptyFilters;
 const [filters,setFilters]=useState<UniverseFilters>(initialFilters),[checked,setChecked]=useState<string[]>([]),[metadata,setMetadata]=useState<Classifications>(saved.filterContext===context?(saved.classifications??{}) as unknown as Classifications:{}),[importing,setImporting]=useState(false),[docked,setDocked]=useState(false),[choice,setChoice]=useState<SnapshotChoice|null>(null),[planning,setPlanning]=useState(false),[seed,setSeed]=useState<BackfillSeed|null>(null);
 const setField=<K extends keyof UniverseFilters>(key:K,value:UniverseFilters[K])=>setFilters(old=>({...old,[key]:value}));
 const setRegion=(value:string)=>setField('region',value);
 const toggleGroup=(id:string)=>setFilters(old=>({...old,groups:old.groups.includes(id)?old.groups.filter(x=>x!==id):[...old.groups,id]}));
 const [basket,setBasket]=useState<BackfillSeed[]>([]),[basketPlan,setBasketPlan]=useState(false);
 const [start,setStart]=useState(''),[end,setEnd]=useState(''),[source,setSource]=useState('ivol');
 const {site,error:siteError}=useWorkspaceSite(session,state.deployment,state.scope);
 const market=useMarketFrame(session,mode==='market'?universe:[],site.refreshSeconds??30);
 const directory=useMemo(()=>new Map(site.assets.map(a=>[a.assetId,a])),[site.assets]);
 const profile=state.profiles.find(p=>p.id===state.deployment);
 const persisted=useRef(''),previousContext=useRef(''),skipPersist=useRef(false),initialSaved=useRef(saved);
 useEffect(()=>{if(!state.scope||!state.deployment||previousContext.current===context)return;const first=!previousContext.current,prior=initialSaved.current;previousContext.current=context;skipPersist.current=true;setFilters(first&&prior.filterContext===context&&prior.filters&&typeof prior.filters==='object'&&!Array.isArray(prior.filters)?{...emptyFilters,...prior.filters} as UniverseFilters:emptyFilters);setMetadata(first&&prior.filterContext===context?(prior.classifications??{}) as unknown as Classifications:{});setUniverse([]);setCoverage(null);setCatalogue(null);setChecked([]);setChoice(null);setPlanning(false);setBasket([]);setBasketPlan(false);},[context,state.scope,state.deployment]);
 useEffect(()=>{if(skipPersist.current){skipPersist.current=false;return;}if(!state.scope||!state.deployment||previousContext.current!==context)return;const value=JSON.stringify({mode,classifications:metadata,filters,filterContext:context});if(value!==persisted.current){persisted.current=value;onUiState?.(JSON.parse(value));}},[mode,metadata,filters,context,onUiState]);
 useEffect(()=>{if(!state.scope||!profile?.available)return;const c=new AbortController();setLoading(true);setErrors({});
  const tasks=[session.commands.fullUniverse(c.signal).then(v=>{if(!c.signal.aborted){setUniverse(v.items);setPage(v.page)}}).catch(e=>{if(!c.signal.aborted)setErrors(s=>({...s,universe:e.message}))}),session.commands.universe(c.signal).then(v=>{if(!c.signal.aborted)setCoverage(v)}).catch(e=>{if(!c.signal.aborted)setErrors(s=>({...s,coverage:e.message}))}),session.commands.catalogue(c.signal).then(v=>{if(!c.signal.aborted)setCatalogue(v)}).catch(e=>{if(!c.signal.aborted)setErrors(s=>({...s,catalogue:e.message}))})];void Promise.allSettled(tasks).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort();
 },[session,state.scope,state.deployment,profile?.available,refresh]);
 useEffect(()=>{if(start||!coverage)return;const ends=coverage.items.flatMap(a=>a.sources.map(s=>s.request.end_date)).sort(),stop=ends.at(-1)??new Date().toISOString().slice(0,10),d=new Date(stop+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-365);setStart(d.toISOString().slice(0,10));setEnd(stop);},[coverage,start]);
 function refreshAll(){setRefresh(n=>n+1);}
 const marketGroups=site.marketGroups?.groups??[];
 const filtered=useMemo(()=>filterMarketAssets(universe,directory,metadata,marketGroups,filters),[universe,directory,metadata,marketGroups,filters]);
 const hidden=checked.filter(id=>!filtered.some(a=>a.asset_id===id));
 function reviewBasket(){if(!basket.length)return;setChecked([...new Set(basket.flatMap(x=>x.members))]);setStart(basket.map(x=>x.start).sort()[0]);setEnd(basket.map(x=>x.end).sort().at(-1)!);setSource(basket[0].source);setBasketPlan(true);setPlanning(true);setMode('coverage');session.select(null);}
 function toggle(id:string){setChecked(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);}
 function inspect(v:SnapshotChoice){setChoice(v);session.select(v.assetId);}
 function prepare(value?:BackfillSeed){setBasketPlan(false);if(value){setSeed(value);setChecked(value.members);setStart(value.start);setEnd(value.end);setSource(value.source);}setMode('coverage');setPlanning(true);session.select(null);}
 const states=[...new Set(universe.map(liveState))].sort();
 const groupIdentity={catalogueRevision:site.marketGroups?.revision??'',groups:marketGroups.filter(g=>filters.groups.includes(g.id)).map(g=>({id:g.id,revision:g.revision}))};
 return <main className={'vfo-command-node ops-workspace view-'+mode+(state.asset?' has-ticker':'')+(docked?' ticker-docked':'')} data-testid="vfo-command-center"><header className="ops-topbar"><div className="ops-brand"><span>{site.presentation.eyebrow}</span><h1>{site.presentation.title}</h1></div><nav className="ops-root-nav" aria-label="Workspace views"><button aria-current={mode==='market'?'page':undefined} onClick={()=>setMode('market')}>Market universe</button><button aria-current={mode==='coverage'?'page':undefined} onClick={()=>setMode('coverage')}>Coverage & backfills</button></nav><label>Data environment<select aria-label="VFO data environment" value={state.deployment} onChange={e=>{setStart('');setEnd('');session.setDeployment(e.target.value)}}>{state.profiles.map(p=><option key={p.id} value={p.id}>{p.label}{p.available?'':' · unavailable'}</option>)}</select></label><button onClick={refreshAll} disabled={loading}>Refresh observations</button></header>
 {!state.scope?<div className="ops-empty"><h2>Select an execution environment</h2><p>Select Personal or your team in Sampo’s Execution environment selector.</p></div>:!profile?.available?<div className="ops-empty"><h2>{profile?.label??state.deployment} unavailable</h2><p>{profile?.reason}</p></div>:<div className="ops-stage"><div className="ops-root-scroll"><section className="ops-summary"><div><strong>{page?.configured_total??'—'}</strong><span>Configured tickers</span></div><div><strong>{universe.filter(a=>liveState(a)==='observed').length}</strong><span>Observed cached surfaces</span></div><div><strong>{universe.filter(a=>liveState(a)==='stale').length}</strong><span>Stale observations</span></div><div><strong>{coverage?.items.filter(a=>a.recorded_requests>0).length??'—'}</strong><span>Tickers with recorded history</span></div><button onClick={()=>setImporting(true)}>Import CSV ↗</button></section>
 {Object.entries(errors).map(([key,value])=><p role="alert" className="ops-error" key={key}>{key}: {value}</p>)}{loading&&<p role="status" className="ops-hint">Loading the configured universe and registered history…</p>}
 <UniverseFilterBar filters={filters} onChange={setFilters} groups={marketGroups} universe={universe} directory={site.assets} metadata={metadata} states={states}/>
 <div className="ops-selection-bar"><span>{filtered.length} matching · {checked.length} selected{hidden.length?' · '+hidden.length+' hidden by filters':''}</span><button onClick={()=>setChecked([...new Set([...checked,...filtered.map(a=>a.asset_id)])])}>Select matching</button><button disabled={!checked.length} onClick={()=>setChecked([])}>Clear selection</button>{checked.length>0&&<button className="ops-primary" onClick={()=>prepare()}>Prepare backfill</button>}</div>
 {hidden.length>0&&<details className="ops-members"><summary>{hidden.length} selected assets hidden by filters · review or remove</summary>{hidden.map(id=><span key={id}>{id} <button aria-label={'Remove '+id+' from selection'} onClick={()=>setChecked(old=>old.filter(x=>x!==id))}>×</button></span>)}<button onClick={()=>setChecked(old=>old.filter(id=>!hidden.includes(id)))}>Remove hidden selections</button></details>}
 {importing&&<CsvImport universe={universe} catalogue={catalogue} coverage={coverage} onClose={()=>setImporting(false)} onApply={(ids,values)=>{setChecked(ids);setMetadata(s=>({...s,...values}));setImporting(false)}}/>}
 {basket.length>0&&<section className="coverage-repair-basket"><div><b>Repair basket · {basket.length} windows</b><span>{[...new Set(basket.flatMap(x=>x.members))].length} tickers · source and dates stay explicit</span></div><button onClick={reviewBasket}>Review repair plan</button><button onClick={()=>setBasket([])}>Clear basket</button></section>}
 {planning&&<BackfillPlanner key={state.scope+state.deployment+JSON.stringify(seed)} session={session} universe={universe} coverage={coverage} catalogue={catalogue} selected={checked} start={start} end={end} source={source} onClose={()=>setPlanning(false)} onAccepted={refreshAll} onGroups={()=>{}} groupIdentity={groupIdentity} preselected={basketPlan?basket:undefined}/>}
 {mode==='coverage'?<><CoverageOverview universe={universe} coverage={coverage} directory={site.assets} region={filters.region} onRegion={setRegion}/><CoverageHub session={session} universe={filtered} coverage={coverage} start={start} end={end} onRange={(a,b)=>{setStart(a);setEnd(b)}} checked={checked} onChecked={setChecked} onInspect={inspect} refresh={refresh} onPrepare={()=>prepare()} onRepair={(run,assetId)=>{const value={source:run.source,start:run.start,end:run.end,members:[assetId]};setBasket(old=>old.some(x=>JSON.stringify(x)===JSON.stringify(value))?old:[...old,value]);}}/><RequestList session={session} refresh={refresh}/></>:<MarketHome universe={universe} filtered={filtered} site={site} frame={market.frame} loaded={market.loaded} busy={market.busy} error={market.error||siteError} onSelect={id=>{setChoice({assetId:id,request:'',date:'',source:'live',nonce:Date.now()});session.select(id)}} checked={checked} onChecked={setChecked} onRegion={setRegion} onGroup={toggleGroup} selectedGroups={filters.groups}/>}

 </div>{state.asset&&<TickerTearsheet key={state.scope+state.deployment+state.asset} session={session} state={state} coverage={coverage} choice={choice} onBackfill={prepare} renderLive={renderLive} renderInspector={renderInspector} renderCustom={renderCustom} docked={docked} onDock={()=>setDocked(d=>!d)}/>}</div>}
 </main>;
}
