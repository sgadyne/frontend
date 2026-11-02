import {Vfo} from './VfoMarket';
import React,{useMemo} from 'react';
import {useHost,PlatformProvider,type WidgetProps} from '@sampo/sdk-react';
import {SampoAppearanceProvider} from '../../packages/presentation/src';
import {RiskLens} from '../../apps/pod-risk-lens/src';
import {riskProvider} from './risk-fixture';
import {ClusterWorkspace} from '../../packages/analysis-workspaces/src/cluster/ClusterWorkspace';
import {ReplicationWorkspace} from '../../packages/analysis-workspaces/src/replication/ReplicationWorkspace';
import {reports} from '../../packages/analysis-workspaces/tests/fixtures/reports';
import {services as clusterData} from './cluster-data';
import {services as reportData} from './replication-data';



import '../../packages/analysis-workspaces/src/style.css';
import './style.css';

function Frame({children,notice='Synthetic demonstration · no live sources or backend jobs'}:{children:React.ReactNode;notice?:string}){return <SampoAppearanceProvider><div className="sampo-analysis-fixture"><div className="analysis-fixture-notice">{notice}</div>{children}</div></SampoAppearanceProvider>}
export function Risk(props:WidgetProps){const host=useHost();return <Frame><RiskLens provider={riskProvider} portalContainer={host.getPortalContainer?.()}/></Frame>}
function FixtureData({services,children}:{services:typeof clusterData;children:React.ReactNode}){const host=useHost();const dataHost=useMemo(()=>({...host,data:services.data,jobs:services.jobs}),[host,services]);return <PlatformProvider services={dataHost}>{children}</PlatformProvider>}
export function Cluster(props:WidgetProps){return <Frame><FixtureData services={clusterData}><ClusterWorkspace {...props} config={{bindingId:'fixture.cluster',applicationId:'example.analysis',jobBindingId:'cluster-analysis',resultBindingId:'cluster-result'}}/></FixtureData></Frame>}
export function Replication(props:WidgetProps){return <Frame><FixtureData services={reportData}><ReplicationWorkspace {...props} reports={reports} config={{bindingId:'fixture.read'}}/></FixtureData></Frame>}
export {Vfo} from './VfoMarket';
// These demos keep mutable view state in their widgets; no shared application session or backend is required.
const applications=Object.fromEntries(['example.risk-lens','example.vfo','example.cluster','example.replication'].map(id=>[id,{createSession:(_services:unknown,initial:unknown)=>({serialize:()=>initial??{},dispose(){}})}]));
export default {runtimeAbi:1,applications,widgets:{Risk:{id:'example.risk-lens.main',Component:Risk},Vfo:{id:'example.vfo.main',Component:Vfo},Cluster:{id:'example.cluster.main',Component:Cluster},Replication:{id:'example.replication.main',Component:Replication}}};
