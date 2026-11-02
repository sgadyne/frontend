import type {WidgetProps} from '@sampo/sdk-react';
import {MarketUniverseWorkbench} from '../../packages/vfo-workspace-core/src/market/UniverseWorkbench';
import {marketAssets,marketGroups,navigation,catalogueRevision,catalogueAsOf,demoCoverage,historyWindow} from './market-universe-data';
import {Frame,RelatedOverview,Unavailable,useFixtureContext} from './fixture-frame';
import {portableVfoState,restoreVfoState} from './portable-state';
const instrumentIds=new Set(marketAssets.map(a=>a.assetId));
export function Vfo(props:WidgetProps){
  const context=useFixtureContext();let state;
  try{state=restoreVfoState(props.viewState,props.config,instrumentIds);}catch{return <Frame><Unavailable/></Frame>;}
  return <Frame notice="Static market catalogue · synthetic coverage demo · no live sources or submitted jobs">
    <MarketUniverseWorkbench key={context.key} assets={marketAssets} groups={marketGroups} navigation={navigation}
      catalogueRevision={catalogueRevision} catalogueAsOf={catalogueAsOf} coverage={demoCoverage} historyWindow={historyWindow}
      initialState={state} onStateChange={value=>props.onViewStateChange?.(portableVfoState(value))}/>
    <div aria-label="Related destinations"><RelatedOverview target="risk"/> <RelatedOverview target="replication"/>
      <p>Related entries open their overview. No portfolio or report mapping is configured for this catalogue selection.</p></div>
  </Frame>;
}
export {Vfo as VfoApp};
