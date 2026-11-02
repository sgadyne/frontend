import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reports, reportById, sections} from './fixtures/reports.ts';
import {emptySelection, parseCatalogue as parseConfiguredCatalogue, parseResult, parseSelection, restoreState as restoreConfiguredState} from '../src/replication/contracts.ts';

test('the full Replication collection has report-specific views and no Cluster page', () => {
  assert.equal(reports.length, 22);
  assert.equal(new Set(reports.map(r => r.id)).size, reports.length);
  for (const report of reports) {
    assert.ok(sections.includes(report.section));
    assert.ok(report.views.length);
    assert.equal(new Set(report.views.map(v => v.id)).size, report.views.length);
    assert.ok(report.related.every(id => reportById.has(id)));
    assert.ok(!report.id.includes('cluster'));
  }
  assert.deepEqual(reportById.get('demo-report-16').views.map(v => v.id), ['gamma', 'theta', 'vega', 'detail']);
  assert.deepEqual(reportById.get('demo-report-13').views.map(v => v.id), ['gamma', 'delta', 'delta-change', 'pca', 'pca-change']);
});

test('saved state restores intent only and discards the old single-portfolio format', () => {
  assert.equal(restoreState({selection: {snapshotId: 'old'}}).reportId, 'demo-report-1');
  const state = restoreState({reportId: 'demo-report-16', viewId: 'vega', selections: {'demo-report-16': emptySelection('s')}, pinned: ['demo-report-16', 'missing'], savedViews: [{id: 'one', name: 'Morning', reportId: 'demo-report-16', viewId: 'vega', selection: emptySelection('s')}], results: {private: 'must not persist'}});
  assert.equal(state.viewId, 'vega');
  assert.deepEqual(state.pinned, ['demo-report-16']);
  assert.equal(state.savedViews.length, 1);
  assert.equal('results' in state, false);
});

test('a date range is separate from the portfolio snapshot and must be ordered', () => {
  const selection = {...emptySelection('snapshot-of-today'), start: '2023-01-01', end: '2026-10-30'};
  assert.deepEqual(parseSelection(selection), selection);
  assert.equal(parseSelection({...selection, start: '2027-01-01'}), null);
  assert.equal(parseSelection({...selection, filters: {book: ['duplicate', 'duplicate']}}), null);
});

test('catalogue accepts supported full-app views and rejects invented views or snapshots', () => {
  const catalogue = {schemaVersion: 1, reports: [{id: 'demo-report-1', snapshots: [{id: 's', label: 'Snapshot', date: '2026-10-30', views: ['overview']}]}]};
  assert.equal(parseCatalogue(catalogue).reports.length, 1);
  assert.throws(() => parseCatalogue({...catalogue, reports: [{...catalogue.reports[0], id: 'cluster'}]}));
  assert.throws(() => parseCatalogue({...catalogue, reports: [{...catalogue.reports[0], snapshots: [{...catalogue.reports[0].snapshots[0], views: ['fake']}]}]}));
});

test('a result must match the requested report, snapshot and view; zero is never missing', () => {
  const expected = {reportId: 'demo-report-16', snapshotId: 's', viewId: 'gamma'};
  const result = {schemaVersion: 1, ...expected, asOf: '2026-10-30', basis: 'Published risk', metrics: [], charts: [{id: 'g', kind: 'heatmap', title: 'Gamma', unit: 'USD', x: ['1Y'], y: ['1M', '3M'], cells: [{x: '1Y', y: '1M', value: 0}, {x: '1Y', y: '3M', value: null}]}], tables: [], filters: [], warnings: []};
  assert.equal(parseResult(result, expected).charts[0].cells[0].value, 0);
  assert.throws(() => parseResult({...result, snapshotId: 'wrong'}, expected));
  assert.throws(() => parseResult({...result, viewId: 'theta'}, expected));
  assert.throws(() => parseResult({...result, charts: [{...result.charts[0], cells: [...result.charts[0].cells, result.charts[0].cells[0]]}]}, expected));
});

const parseCatalogue=(value)=>parseConfiguredCatalogue(value,reports);
const restoreState=(value)=>restoreConfiguredState(value,reports);
