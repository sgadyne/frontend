import React from 'react';
import {ReplicationWorkspace} from '../../packages/analysis-workspaces/src/replication/ReplicationWorkspace';
import {reports} from '../../packages/analysis-workspaces/tests/fixtures/reports';
import {services,getCounters} from './replication-fixture';
import {PreviewBoundary} from './services';
import '../../packages/analysis-workspaces/src/style.css';
export default function ReportsDemo(){return <PreviewBoundary services={services} counters={getCounters}><ReplicationWorkspace reports={reports} instanceId="reports-demo" config={{bindingId:'fixture.read'}}/></PreviewBoundary>}
