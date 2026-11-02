import type {JsonValue} from '@sampo/contracts';

export interface Option {id: string; label: string;}
export interface NodeOption extends Option {parentId?: string | null;}
export interface SnapshotOption extends Option {portfolioId: string; date: string;}
export interface Catalogue {
  schemaVersion: 1; title: string; portfolios: Option[]; snapshots: SnapshotOption[];
  hierarchies: Option[]; factors: Option[]; capabilities: {whatIfPreview: boolean};
}
export interface Selection {
  snapshotId: string; hierarchy: string; nodeIds: string[]; lookbackDays: number;
  normalization: string; factorIds: string[]; multipliers: {nodeId: string; value: number}[];
}
export interface Metric {id: string; label: string; value: number | null; unit: string;}
export interface Series {id: string; label: string; unit: string; points: {date: string; value: number | null}[];}
export interface Table {
  id: string; title: string; columns: {key: string; label: string; unit?: string}[];
  rows: Record<string, JsonValue>[];
}
export interface Projection {
  schemaVersion: 1; title: string; asOf: string; pnlKind: string; nodes: NodeOption[];
  metrics: Metric[]; series: Series[]; tables: Table[]; warnings: string[];
}
export interface JobsProjection {
  schemaVersion: 1;
  jobs: {id: string; label: string; enabled: boolean; state: string; lastRun?: string; message?: string}[];
}
export interface WorkspaceConfig {
  bindingId: string; title?: string; clusterWorkspaceId?: string; initialPortfolioId?: string;
  workflow?: {id: string; revision: `sha256:${string}`; parameters: Record<string, string>};
}

export const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const options = (v: unknown): v is Option[] => Array.isArray(v) && v.every(x => object(x) && string(x.id) && string(x.label)) && new Set(v.map(x => x.id)).size === v.length;
const number = (v: unknown) => v === null || typeof v === 'number' && Number.isFinite(v);

export function parseCatalogue(v: unknown): Catalogue {
  if (!object(v) || v.schemaVersion !== 1 || !string(v.title) || !options(v.portfolios)
    || !options(v.snapshots) || !v.snapshots.every(x => object(x) && string(x.portfolioId) && string(x.date))
    || !options(v.hierarchies) || !options(v.factors) || !object(v.capabilities)
    || typeof v.capabilities.whatIfPreview !== 'boolean') throw new Error('Invalid analysis catalogue.');
  const ids = new Set(v.portfolios.map(x => x.id));
  if (v.snapshots.some(x => !ids.has((x as unknown as SnapshotOption).portfolioId))) throw new Error('Snapshot portfolio is not in the authorized catalogue.');
  return v as unknown as Catalogue;
}

export function parseProjection(v: unknown): Projection {
  if (!object(v) || v.schemaVersion !== 1 || !string(v.title) || !string(v.asOf) || !string(v.pnlKind)
    || !options(v.nodes) || !Array.isArray(v.metrics) || !v.metrics.every(x => object(x) && string(x.id) && string(x.label) && string(x.unit) && number(x.value))
    || !Array.isArray(v.series) || !v.series.every(x => object(x) && string(x.id) && string(x.label) && string(x.unit)
      && Array.isArray(x.points) && x.points.every(p => object(p) && string(p.date) && number(p.value)))
    || !Array.isArray(v.tables) || !v.tables.every(x => object(x) && string(x.id) && string(x.title)
      && Array.isArray(x.columns) && x.columns.every(c => object(c) && string(c.key) && string(c.label))
      && new Set(x.columns.map(c => (c as {key: string}).key)).size === x.columns.length && Array.isArray(x.rows) && x.rows.every(object))
    || !Array.isArray(v.warnings) || !v.warnings.every(x => typeof x === 'string')) throw new Error('Invalid analysis projection.');
  return v as unknown as Projection;
}

export function parseJobs(v: unknown): JobsProjection {
  if (!object(v) || v.schemaVersion !== 1 || !Array.isArray(v.jobs) || !v.jobs.every(x => object(x)
    && string(x.id) && string(x.label) && typeof x.enabled === 'boolean' && string(x.state))) throw new Error('Invalid job catalogue.');
  return v as unknown as JobsProjection;
}

export function parseSelection(v: unknown): Selection | null {
  if (!object(v) || !string(v.snapshotId) || !string(v.hierarchy) || !string(v.normalization)
    || !Array.isArray(v.nodeIds) || !v.nodeIds.every(string) || new Set(v.nodeIds).size !== v.nodeIds.length
    || !Array.isArray(v.factorIds) || !v.factorIds.every(string) || new Set(v.factorIds).size !== v.factorIds.length
    || !Number.isSafeInteger(v.lookbackDays) || Number(v.lookbackDays) < 2
    || !Array.isArray(v.multipliers) || !v.multipliers.every(x => object(x) && string(x.nodeId) && typeof x.value === 'number' && Number.isFinite(x.value))
    || new Set(v.multipliers.map(x => (x as {nodeId: string}).nodeId)).size !== v.multipliers.length) return null;
  return {snapshotId: v.snapshotId, hierarchy: v.hierarchy, normalization: v.normalization,
    nodeIds: [...v.nodeIds], factorIds: [...v.factorIds], lookbackDays: Number(v.lookbackDays),
    multipliers: v.multipliers.map(x => ({nodeId: x.nodeId as string, value: x.value as number}))};
}

export function selectSnapshot(catalogue: Catalogue, id: string, previous?: Selection | null): Selection {
  if (!catalogue.snapshots.some(x => x.id === id)) throw new Error('Select an available snapshot.');
  const hierarchy = catalogue.hierarchies.some(x => x.id === previous?.hierarchy) ? previous!.hierarchy : catalogue.hierarchies[0]?.id;
  if (!hierarchy) throw new Error('No hierarchy is available for this binding.');
  return {snapshotId: id, hierarchy, nodeIds: [], lookbackDays: previous?.lookbackDays ?? 252,
    normalization: previous?.normalization ?? 'native', factorIds: [], multipliers: []};
}

export function parseConfig(v: JsonValue): WorkspaceConfig {
  if (!object(v) || !string(v.bindingId) || /[\s/\\]/.test(v.bindingId)) throw new Error('An installed logical read binding is required.');
  if (v.workflow !== undefined && (!object(v.workflow) || !string(v.workflow.id) || !string(v.workflow.revision)
    || !/^sha256:[a-f0-9]{64}$/.test(v.workflow.revision) || !object(v.workflow.parameters)
    || !Object.values(v.workflow.parameters).every(x => typeof x === 'string'))) throw new Error('Invalid installed workflow reference.');
  return v as unknown as WorkspaceConfig;
}
