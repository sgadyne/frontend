import React,{useState,useEffect,useSyncExternalStore} from 'react';
import {VolatilityWorkspace,VfoSession} from '../../packages/vfo-workspace-core/src/index';
import {VolatilityLive} from '../../packages/vfo-workspace-core/src/volatility/VolatilityLive';
import {fixtures} from '../workspace-demo/fixture';
let providerCalls=0;Object.defineProperty(window,'vfoDemoCalls',{get:()=>providerCalls});
export default function VfoDemo(){
 const [{session,controller}]=useState(()=>{const controller=new AbortController();const source=fixtures();const provider={...source,forEnvironment:(id:string)=>{const target=source.forEnvironment(id);return new Proxy(target,{get(object,key){const value=Reflect.get(object,key);return typeof value==='function'?(...args:unknown[])=>{providerCalls++;return value.apply(object,args)}:value}})}};const session=new VfoSession({signal:controller.signal},{deployment:'demo'},provider);session.bindScope('personal:demo','demo:1');return {session,controller}});
 useEffect(()=>()=>{controller.abort();session.dispose()},[session,controller]);
 const state=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
 return <div className="demo-vfo"><VolatilityWorkspace session={session} state={state} renderLive={()=><VolatilityLive session={session} state={state}/>} renderInspector={()=><pre>{JSON.stringify({source:'synthetic fixture',parameters:state.surface?.expiries.map(x=>({expiry:x.expiry,params:x.params}))},null,2)}</pre>} renderCustom={()=><p>Synthetic preview: no native what-if or publication service is connected.</p>}/></div>;
}
