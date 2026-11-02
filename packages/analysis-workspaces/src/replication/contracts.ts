import type {JsonValue} from '@sampo/contracts';
import {object, type Metric, type Series, type Table} from '../contracts.ts';
import {reportRegistry, type ReportDefinition} from './reports.ts';

export interface ReportSelection {snapshotId: string; start: string; end: string; filters: Record<string, string[]>; compareSnapshotId: string}
export interface ReportSnapshot {id: string; date: string; label: string; views: string[]}
export interface ReportCatalogue {schemaVersion: 1; reports: {id: string; snapshots: ReportSnapshot[]; reason?: string; viewFilters?: Record<string, string[]>}[]}
export interface FilterDefinition {key: string; label: string; options: {id: string; label: string}[]; multiple?: boolean}
export interface BarChart {id: string; kind: 'bar'; title: string; unit: string; points: {id: string; label: string; value: number | null; filters?: Record<string, string[]>}[]}
export interface Heatmap {id: string; kind: 'heatmap'; title: string; unit: string; x: string[]; y: string[]; xLabels?: Record<string,string>; yLabels?: Record<string,string>; cells: {x: string; y: string; value: number | null}[]}
export interface Curve {id: string; kind: 'curve'; title: string; unit: string; points: {label: string; value: number | null}[]}
export interface Timeline {id: string; kind: 'timeline'; title: string; series: Series[]; bars?: boolean}
export type Chart = Timeline | BarChart | Heatmap | Curve;
export interface ReportResult {
  schemaVersion: 1; reportId: string; snapshotId: string; viewId: string; asOf: string; basis: string;
  metrics: Metric[]; charts: Chart[]; tables: Table[]; filters: FilterDefinition[]; warnings: string[];
  historicalRange?: {start: string; end: string};
}
export interface SavedView {id: string; name: string; reportId: string; viewId: string; selection: ReportSelection}
export interface WorkspaceState {reportId: string; viewId: string; selections: Record<string, ReportSelection>; savedViews: SavedView[]; pinned: string[]; columns: Record<string, string[]>; chartGroups: Record<string, string>}
const text = (x: unknown): x is string => typeof x === 'string';
const finite = (x: unknown) => x === null || typeof x === 'number' && Number.isFinite(x);
const list = (x: unknown): x is string[] => Array.isArray(x) && x.every(text) && new Set(x).size === x.length;
const date = (x: unknown): x is string => text(x) && (x === '' || /^\d{4}-\d{2}-\d{2}$/.test(x));
export function parseSelection(x: unknown): ReportSelection | null {
  if (!object(x) || !text(x.snapshotId) || !date(x.start) || !date(x.end) || !text(x.compareSnapshotId) || !object(x.filters)
      || !Object.entries(x.filters).every(([key, values]) => /^[\w-]+$/.test(key) && list(values)) || x.start && x.end && x.start > x.end) return null;
  return {snapshotId: x.snapshotId, start: x.start, end: x.end, compareSnapshotId: x.compareSnapshotId, filters: Object.fromEntries(Object.entries(x.filters).map(([k, v]) => [k, [...v as string[]]]))};
}
export const emptySelection = (snapshotId = ''): ReportSelection => ({snapshotId, start: '', end: '', compareSnapshotId: '', filters: {}});
export function parseCatalogue(x: unknown, definitions:readonly ReportDefinition[]): ReportCatalogue {
  const reportById=reportRegistry(definitions);
  if (!object(x) || x.schemaVersion !== 1 || !Array.isArray(x.reports) || !x.reports.every(r => object(r) && text(r.id) && reportById.has(r.id) && Array.isArray(r.snapshots)
      && r.snapshots.every(s => object(s) && text(s.id) && date(s.date) && s.date !== '' && text(s.label) && list(s.views) && s.views.every(v => reportById.get(r.id as string)!.views.some(view => view.id === v))))
      || new Set(x.reports.map(r => (r as {id: string}).id)).size !== x.reports.length) throw new Error('Invalid Replication report catalogue.');
  for (const r of x.reports as ReportCatalogue['reports']) if (new Set(r.snapshots.map(s => s.id)).size !== r.snapshots.length) throw new Error('Duplicate report snapshots.');
  for (const r of x.reports as ReportCatalogue['reports']) if (r.viewFilters !== undefined && (!object(r.viewFilters) || !Object.entries(r.viewFilters).every(([key, values]) => reportById.get(r.id)!.views.some(view => view.id === key) && list(values)))) throw new Error('Invalid report view filters.');
  return x as unknown as ReportCatalogue;
}
export function parseResult(x: unknown, expected: {reportId: string; viewId: string; snapshotId: string}): ReportResult {
  if (!object(x) || x.schemaVersion !== 1 || x.reportId !== expected.reportId || x.viewId !== expected.viewId || x.snapshotId !== expected.snapshotId
    || !date(x.asOf) || x.asOf === '' || !text(x.basis) || !Array.isArray(x.metrics) || !x.metrics.every(m => object(m) && text(m.id) && text(m.label) && text(m.unit) && finite(m.value))
    || !Array.isArray(x.tables) || !x.tables.every(t => object(t) && text(t.id) && text(t.title) && Array.isArray(t.columns) && t.columns.every(c => object(c) && text(c.key) && text(c.label)) && new Set(t.columns.map(c => (c as {key: string}).key)).size === t.columns.length && Array.isArray(t.rows) && t.rows.every(object))
    || !Array.isArray(x.charts) || !x.charts.every(chart) || !Array.isArray(x.filters) || !x.filters.every(f => object(f) && text(f.key) && text(f.label) && Array.isArray(f.options) && f.options.every(o => object(o) && text(o.id) && text(o.label)))
    || !Array.isArray(x.warnings) || !x.warnings.every(text)) throw new Error('The report did not return the selected snapshot and view.');
  return x as unknown as ReportResult;
}
function chart(x: unknown): boolean {
  if (!object(x) || !text(x.id) || !text(x.title)) return false;
  if (x.kind === 'timeline') return Array.isArray(x.series) && x.series.every(s => object(s) && text(s.id) && text(s.label) && text(s.unit) && Array.isArray(s.points) && s.points.every(p => object(p) && text(p.date) && finite(p.value)));
  if (!text(x.unit)) return false;
  if (x.kind === 'bar') return Array.isArray(x.points) && x.points.every(p => object(p) && text(p.id) && text(p.label) && finite(p.value) && (p.filters === undefined || object(p.filters) && Object.values(p.filters).every(list)));
  if (x.kind === 'curve') return Array.isArray(x.points) && x.points.every(p => object(p) && text(p.label) && finite(p.value));
  if (x.kind === 'heatmap') return list(x.x) && list(x.y) && Array.isArray(x.cells) && x.cells.every(c => object(c) && (x.x as string[]).includes(c.x as string) && (x.y as string[]).includes(c.y as string) && finite(c.value)) && new Set(x.cells.map(c => JSON.stringify([(c as {x: string}).x, (c as {y: string}).y]))).size === x.cells.length;
  return false;
}
export function restoreState(value: unknown, definitions:readonly ReportDefinition[]): WorkspaceState {
  const reportById=reportRegistry(definitions);
  const base: WorkspaceState = {reportId: definitions[0].id, viewId: definitions[0].views[0].id, selections: {}, savedViews: [], pinned: [], columns: {}, chartGroups: {}};
  if (!object(value)) return base;
  if (text(value.reportId) && reportById.has(value.reportId)) {base.reportId = value.reportId; base.viewId = reportById.get(value.reportId)!.views.some(v => v.id === value.viewId) ? value.viewId as string : reportById.get(value.reportId)!.views[0].id;}
  if (object(value.selections)) for (const [key, raw] of Object.entries(value.selections)) {const parsed = parseSelection(raw); if (reportById.has(key) && parsed) base.selections[key] = parsed;}
  if (Array.isArray(value.savedViews)) base.savedViews = value.savedViews.flatMap(v => object(v) && text(v.id) && text(v.name) && v.name.trim() && reportById.has(v.reportId as string) && reportById.get(v.reportId as string)!.views.some(view => view.id === v.viewId) && parseSelection(v.selection) ? [{id: v.id, name: v.name, reportId: v.reportId as string, viewId: v.viewId as string, selection: parseSelection(v.selection)!}] : []);
  if (list(value.pinned)) base.pinned = value.pinned.filter(id => reportById.has(id));
  if (object(value.columns)) for (const [id, columns] of Object.entries(value.columns)) if (list(columns)) base.columns[id] = columns;
  if (object(value.chartGroups)) base.chartGroups = Object.fromEntries(Object.entries(value.chartGroups).filter(([, group]) => text(group))) as Record<string, string>;
  return base;
}
export const jsonState = (state: WorkspaceState) => state as unknown as JsonValue;
