import type {WidgetProps} from '@sampo/sdk-react';
import {ClusterWorkspace} from '../../packages/analysis-workspaces/src/cluster/ClusterWorkspace';
import {services} from './cluster-data';
import {Frame,FixtureData,Unavailable,useFixtureContext,usePortableWriter} from './fixture-frame';
import {portableClusterView,restoreClusterView} from './portable-state';
export function Cluster(props:WidgetProps){
  const context=useFixtureContext(),[write,problem]=usePortableWriter(portableClusterView,props.onViewStateChange);
  const scopeKey=JSON.stringify(['fixture.cluster',context.scope]);
  let view:string;try{view=restoreClusterView(props.viewState,props.config,scopeKey);}catch{return <Frame><Unavailable/></Frame>;}
  return <Frame>{problem?<p role="status">{problem}</p>:null}<FixtureData services={services}><ClusterWorkspace key={context.key} {...props}
    config={{bindingId:'fixture.cluster',applicationId:'example.analysis',jobBindingId:'cluster-analysis',resultBindingId:'cluster-result'}}
    viewState={{scopeKey,view,saved:[]}} onViewStateChange={write}/></FixtureData></Frame>;
}
export {Cluster as ClusterApp};
