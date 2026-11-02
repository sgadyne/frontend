import type {WidgetProps} from '@sampo/sdk-react';
import {ClusterWorkspace} from '../../packages/analysis-workspaces/src/cluster/ClusterWorkspace';
import {services} from './cluster-data';
import {Frame,FixtureData,Unavailable,useFixtureContext} from './fixture-frame';
import {portableClusterView,restoreClusterView} from './portable-state';
export function Cluster(props:WidgetProps){
  const context=useFixtureContext();let view:string;try{view=restoreClusterView(props.viewState,props.config);}catch{return <Frame><Unavailable/></Frame>;}
  const scopeKey=JSON.stringify(['fixture.cluster',context.scope]);
  return <Frame><FixtureData services={services}><ClusterWorkspace key={context.key} {...props}
    config={{bindingId:'fixture.cluster',applicationId:'example.analysis',jobBindingId:'cluster-analysis',resultBindingId:'cluster-result'}}
    viewState={{scopeKey,view,saved:[]}} onViewStateChange={value=>props.onViewStateChange?.(portableClusterView(value))}/></FixtureData></Frame>;
}
export {Cluster as ClusterApp};
