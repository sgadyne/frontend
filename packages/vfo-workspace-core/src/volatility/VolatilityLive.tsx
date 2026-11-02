import React,{useState,useEffect} from 'react';
import type {Surface,CutSelection} from '../model';
import type {VfoSession} from '../session';
import {useNativeInputs} from '../vola-inputs';
import {VolatilityTearsheet} from './VolatilityTearsheet';
export function VolatilityLive({session,state}:{session:VfoSession;state:ReturnType<VfoSession['getSnapshot']>}){
 const [query,setQuery]=useState<{strike:number|null;term:boolean;cut:CutSelection}>({strike:null,term:false,cut:{kind:'KF',value:1}});
 const [native,setNative]=useState<Surface|null>(null);
 useEffect(()=>{setNative(old=>old?.asset_id===state.surface?.asset_id&&old?.revision===state.surface?.revision?old:null);const c=new AbortController(),base=state.surface;if(!base)return()=>c.abort();const p=session.getProvider();
  const timer=setTimeout(()=>{if(base&&p?.evaluatedSurface)void p.evaluatedSurface(base.asset_id,base.source,base.revision,c.signal,query.cut).then(value=>{if(!c.signal.aborted&&value.asset_id===base.asset_id&&value.revision===base.revision&&value.native_asof_ns===base.native_asof_ns){if(value.evaluation.state==='sampled')setNative(value)}}).catch(()=>{});},120);
  return()=>{clearTimeout(timer);c.abort()};
 },[state.surface?.asset_id,state.surface?.revision,state.deployment,query.cut.kind,query.cut.value]);
 const bands=useNativeInputs(session,state.surface,state.expiryIndex,undefined,query.term?query.cut:undefined);
 if(state.errors.surface)return <p role="alert" className="vol-lab-notice">{state.errors.surface}</p>;
 if(!state.surface)return <div className="vol-lab-unavailable"><h3>{state.loading.surface?'Loading pinned native surface…':'Select a market to begin'}</h3><p>The preview uses the same saved objects as VFO Operations.</p></div>;
 return <VolatilityTearsheet surface={native??state.surface} inputs={bands.data} loadingInputs={bands.loading} expiryIndex={state.expiryIndex??0} onExpiry={i=>session.setExpiry(i)} onStrike={()=>{}} onCut={(cut,term)=>setQuery(old=>old.cut.kind===cut.kind&&old.cut.value===cut.value&&old.term===term?old:{strike:null,cut,term})}/>;
}
