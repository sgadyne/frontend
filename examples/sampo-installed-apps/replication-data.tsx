import {reports} from '../../packages/analysis-workspaces/tests/fixtures/reports';
// @ts-nocheck — existing synthetic service envelopes, validated by the app contract readers.
// Synthetic SDK service fixture only. No real source, service or credentials.



const listeners = new Set<() => void>();
let environment = {scope: {profile: 'synthetic-fixture', environment: 'development'}, generation: 1};
let reads = 0;
const catalogue = {schemaVersion: 1, reports: reports.map(r => ({id: r.id, snapshots: ['2026-10-30', '2026-10-29'].map(date => ({id: r.id + ':' + date, date, label: date, views: r.views.map(v => v.id)}))}))};
const history = Array.from({length: 126}, (_, i) => ({date: new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10), value: Math.sin(i * .15) * 6000 + Math.cos(i * .06) * 3500}));
let cumulative = 0;
const curve = history.map(p => ({...p, value: cumulative += p.value}));
function projection(request) {
  const selection = JSON.parse(request.partition.selection), report = reports.find(r => r.id === request.partition.report)!, view = report.views.find(v => v.id === request.partition.view)!;
  const timeline = {id: 'performance', kind: 'timeline', title: view.layout === 'comparison' ? 'REP and source-book comparison' : 'Cumulative performance', series: [{id: 'rep', label: 'REP', unit: 'USD', points: curve}, {id: 'source', label: 'Source books', unit: 'USD', points: curve.map(p => ({...p, value: p.value * 1.08}))}]};
  const bar = {id: 'attribution', kind: 'bar', title: 'Attribution by strategy', unit: 'USD', points: [{id: 'rates', label: 'Rates', value: 82410, filters: {book: ['rates']}}, {id: 'fx', label: 'FX', value: -37200, filters: {book: ['fx']}}, {id: 'equity', label: 'Equity', value: 25940, filters: {book: ['equity']}}]};
  const grid = {id: 'rates', kind: 'heatmap', title: 'Rates ' + view.label.toLowerCase(), unit: view.label + ' · USD', x: ['1Y', '2Y', '5Y', '10Y', '30Y'], y: ['1M', '3M', '6M', '1Y', '2Y'], cells: ['1M', '3M', '6M', '1Y', '2Y'].flatMap((y, yi) => ['1Y', '2Y', '5Y', '10Y', '30Y'].map((x, xi) => ({x, y, value: (xi - yi) * 2380})))};
  const rowCount = view.layout === 'operations' ? 8 : 230;
  return {schemaVersion: 1, reportId: report.id, viewId: view.id, snapshotId: selection.snapshotId, asOf: selection.snapshotId.endsWith('29') ? '2026-10-29' : '2026-10-30', basis: 'Synthetic browser-test fixture',
    metrics: view.layout === 'detail' || view.layout === 'operations' ? [] : [{id: 'pnl', label: 'REP PnL', value: 71150.25, unit: 'USD'}, {id: 'source', label: 'Source-book PnL', value: 75140.15, unit: 'USD'}, {id: 'difference', label: 'Difference', value: -3989.9, unit: 'USD'}, {id: 'rows', label: 'Matched rows', value: rowCount, unit: 'count'}],
    charts: view.layout === 'matrix' ? [grid] : view.layout === 'detail' || view.layout === 'operations' ? [] : view.layout === 'performance' || view.layout === 'comparison' ? [timeline, bar, {...bar, id: 'residual', title: 'Residual exposure'}] : [bar, {...bar, id: 'residual', title: 'Exposure breakdown'}],
    tables: [{id: 'detail', title: view.layout === 'operations' ? 'Registered jobs' : 'Detailed results', columns: [{key: 'book', label: 'Book'}, {key: 'asset', label: 'Asset'}, {key: 'value', label: 'PnL', unit: 'USD'}, {key: 'reference', label: 'Reference'}], rows: Array.from({length: rowCount}, (_, i) => ({book: 'Strategy ' + i, asset: i % 2 ? 'FX' : 'Rates', value: (i - 60) * 25.4, reference: {$sampo: 'int64', value: '9007199254740993'}}))}],
    filters: [{key: 'book', label: 'Books / strategies', multiple: true, options: [{id: 'rates', label: 'Rates'}, {id: 'fx', label: 'FX'}, {id: 'equity', label: 'Equity'}]}],
    historicalRange: {start: '2023-01-01', end: '2026-10-30'}, warnings: []};
}
const data = {
  async resolve(request) {return {reference: {dataset: 'fixture.report', partition: request.partition, revision: 'fixture-v1'}};},
  async read(request) {reads++; return {reference: {dataset: 'fixture.report', partition: request.partition, revision: request.revision}, leaseId: 'fixture-hold', result: {status: 'ready', completeness: 'complete', provenance: {synthetic: false}, data: {encoding: 'sampo.lossless-json.v1', value: request.partition.operation === 'replication-catalogue' ? catalogue : projection(request)}}};},
  async release() {},
};
export const services = {workspaceId: 'fixture', data, environment: {subscribe: (listener) => {listeners.add(listener); return () => listeners.delete(listener);}, getSnapshot: () => environment}, brand: {}, registerCleanup: () => () => {}, getPortalContainer: () => document.body};

export const getCounters=()=>({reads});
