import React from 'react';
import {ClusterWorkspace} from '../../packages/analysis-workspaces/src/cluster/ClusterWorkspace';
import {services,getCounters} from './cluster-fixture';
import {PreviewBoundary} from './services';
import '../../packages/analysis-workspaces/src/style.css';
export default function ClusterDemo(){return <PreviewBoundary services={services} counters={getCounters}><ClusterWorkspace instanceId="cluster-demo" config={{bindingId:'fixture.cluster',applicationId:'example.analysis',jobBindingId:'cluster-analysis',resultBindingId:'cluster-result'}}/></PreviewBoundary>}
