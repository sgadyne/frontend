import type {WidgetProps} from '@sampo/sdk-react';
import type {JsonValue} from '@sampo/contracts';
import {ReplicationWorkspace} from '../../packages/analysis-workspaces/src/replication/ReplicationWorkspace';
import {reports} from '../../packages/analysis-workspaces/tests/fixtures/reports';
import {services} from './replication-data';
import {Frame,FixtureData,RelatedOverview,Unavailable,useFixtureContext} from './fixture-frame';
import {portableReplicationState,restoreReplicationState} from './portable-state';
export function Replication(props:WidgetProps){
  const context=useFixtureContext();let state;try{state=restoreReplicationState(props.viewState,props.config,reports);}catch{return <Frame><Unavailable/></Frame>;}
  const scopeKey=JSON.stringify([context.host.workspaceId,'fixture.read',context.scope]);
  return <Frame><RelatedOverview target="vfo"/><FixtureData services={services}><ReplicationWorkspace key={context.key} {...props} reports={reports}
    config={{bindingId:'fixture.read'}} viewState={{scopeKey,state} as JsonValue}
    onViewStateChange={value=>props.onViewStateChange?.(portableReplicationState(value))}/></FixtureData></Frame>;
}
export {Replication as ReplicationApp};
