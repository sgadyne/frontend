import type {WidgetProps} from '@sampo/sdk-react';
import {useLayoutEffect,useRef,useState} from 'react';
import type {MarketUniverseState} from '../../packages/vfo-workspace-core/src/market/UniverseWorkbench';
import {MarketUniverseWorkbench} from '../../packages/vfo-workspace-core/src/market/UniverseWorkbench';
import {marketAssets,marketGroups,navigation,catalogueRevision,catalogueAsOf,demoCoverage,historyWindow} from './market-universe-data';
import {Frame,RelatedOverview,Unavailable,useFixtureContext} from './fixture-frame';
import {portableVfoState,restoreVfoState} from './portable-state';
const instrumentIds=new Set(marketAssets.map(a=>a.assetId));
type RetainedState=MarketUniverseState&{scrollTop?:number;focusLabel?:string};
function VfoView({state,...props}:WidgetProps&{state:RetainedState}){
  const root=useRef<HTMLDivElement>(null),latest=useRef(state),[problem,setProblem]=useState('');
  const publish=(value:RetainedState)=>{latest.current=value;try{props.onViewStateChange?.(portableVfoState(value));setProblem('');}catch{setProblem('This view exceeds portable state limits. Reduce the selection or filter text to retain it.');}};
  useLayoutEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      const main=root.current?.querySelector<HTMLElement>('.mu-main');if(main&&state.scrollTop!==undefined)main.scrollTop=state.scrollTop;
      if(state.focusLabel)root.current?.querySelector<HTMLElement>('[aria-label="'+CSS.escape(state.focusLabel)+'"]')?.focus({preventScroll:true});
    });return()=>cancelAnimationFrame(frame);
  },[]);
  const routePresentation={state,renderRelated:()=> <div aria-label="Related destinations"><RelatedOverview target="risk"/> <RelatedOverview target="replication"/>
    <p>Related entries open their overview. No portfolio or report mapping is configured for this catalogue selection.</p></div>};
  return <div ref={root} style={{height:'100%'}} onScrollCapture={event=>{
    if(event.target instanceof HTMLElement&&event.target.classList.contains('mu-main'))publish({...latest.current,scrollTop:event.target.scrollTop});
  }} onFocusCapture={event=>{const label=event.target.getAttribute('aria-label');if(label&&label.length<=180)publish({...latest.current,focusLabel:label});}}>
    {problem?<p role="status">{problem}</p>:null}
    <MarketUniverseWorkbench {...routePresentation} assets={marketAssets} groups={marketGroups} navigation={navigation}
      catalogueRevision={catalogueRevision} catalogueAsOf={catalogueAsOf} coverage={demoCoverage} historyWindow={historyWindow}
      initialState={state} onStateChange={value=>publish({...value,scrollTop:latest.current.scrollTop??0,...(latest.current.focusLabel?{focusLabel:latest.current.focusLabel}:{})})}/>
  </div>;
}
export function Vfo(props:WidgetProps){
  const context=useFixtureContext();let state;
  try{state=restoreVfoState(props.viewState,props.config,instrumentIds);}catch{return <Frame><Unavailable/></Frame>;}
  return <Frame notice="Static market catalogue · synthetic coverage demo · no live sources or submitted jobs">
    <VfoView key={context.key} {...props} state={state}/>
  </Frame>;
}
export {Vfo as VfoApp};
