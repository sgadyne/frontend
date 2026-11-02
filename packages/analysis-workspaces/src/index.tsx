import {ClusterWorkspace} from './cluster/ClusterWorkspace.tsx';
import {ReplicationWorkspace} from './replication/ReplicationWorkspace.tsx';
import './style.css';

export {ClusterWorkspace};
export {ReplicationWorkspace};
export {DataTable, HistoryChart, MetricStrip} from './visuals.tsx';
export {readPrepared} from './prepared.ts';
export type {Catalogue, Projection, Selection, WorkspaceConfig} from './contracts.ts';
export {ChartWidget, HierarchyPicker, ResultGrid} from './replication/widgets.tsx';
export type {ReportCatalogue, ReportResult, ReportSelection, SavedView} from './replication/contracts.ts';

// Factories, application IDs and manifests belong to the consuming deployment.
export type {ReportDefinition, ReportView} from './replication/reports.ts';
