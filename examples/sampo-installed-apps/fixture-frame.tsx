import {useCallback,useMemo,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {PlatformProvider,useHost,DestinationLink,type HostServices} from '@sampo/sdk-react';
import {publishedEntryAddress,type HostEnvironmentSnapshot,type JsonValue} from '@sampo/contracts';
import {SampoAppearanceProvider} from '../../packages/presentation/src';
import './style.css';
const absent:HostEnvironmentSnapshot={scope:null,generation:0};
const subscribe=()=>()=>{},snapshot=()=>absent;
export function useFixtureContext(){
  const host=useHost(),environment=useSyncExternalStore(host.environment?.subscribe??subscribe,host.environment?.getSnapshot??snapshot,snapshot);
  return {host,scope:environment.scope,key:JSON.stringify([host.workspaceId,environment.generation,environment.scope])};
}
export function Frame({children,notice='Synthetic demonstration · no live sources or backend jobs'}:{children:ReactNode;notice?:string}){
  return <SampoAppearanceProvider><div className="sampo-analysis-fixture"><div className="analysis-fixture-notice">{notice}</div>{children}</div></SampoAppearanceProvider>;
}
// Fixtures implement the read/job methods exercised by these demos; they are not full SDK providers.
export function FixtureData({services,children}:{services:{data:unknown;jobs?:unknown};children:ReactNode}){
  const host=useHost(),dataHost=useMemo(()=>({...host,data:services.data as HostServices['data'],jobs:services.jobs as HostServices['jobs']}),[host,services]);
  return <PlatformProvider services={dataHost}>{children}</PlatformProvider>;
}
export function Unavailable(){return <p role="status">Destination unavailable</p>;}
export function usePortableWriter<T>(serialize:(value:T)=>JsonValue,onChange?: (value:JsonValue)=>void){
  const callback=useRef({serialize,onChange});callback.current={serialize,onChange};
  const [problem,setProblem]=useState('');
  const write=useCallback((value:T)=>{try{const state=callback.current.serialize(value);callback.current.onChange?.(state);setProblem('');}catch{setProblem('This view exceeds portable state limits. Reduce the selection or filter text to retain it.');}},[]);
  return [write,problem] as const;
}
export function RelatedOverview({target}:{target:'risk'|'vfo'|'replication'}){
  const applicationId=target==='risk'?'example.risk-lens':'example.'+target;
  return <DestinationLink address={publishedEntryAddress({publisherId:'sampo.synthetic',applicationId,entryId:target})}>Related {target==='risk'?'analysis':target==='vfo'?'market':'report'} overview</DestinationLink>;
}
export const demoApplication = {createSession:(_services:unknown,initial:unknown)=>({serialize:()=>initial??{},dispose(){}})};
