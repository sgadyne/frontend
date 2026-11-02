import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalogue, parseConfig, parseProjection, parseSelection, selectSnapshot} from '../src/contracts.ts';

const catalogue = {schemaVersion: 1, title: 'Synthetic unit fixture', portfolios: [{id: 'p', label: 'Portfolio'}],
  snapshots: [{id: 's', portfolioId: 'p', date: '2026-10-30', label: 'Snapshot'}],
  hierarchies: [{id: 'book', label: 'Book'}], factors: [], capabilities: {whatIfPreview: true}};
test('snapshot selection uses explicit native units and clears previous portfolio weights', () => {
  const selected = selectSnapshot(parseCatalogue(catalogue), 's');
  assert.equal(selected.normalization, 'native');
  assert.deepEqual(selected.multipliers, []);
  assert.equal(parseSelection(selected)?.snapshotId, 's');
});
test('duplicate identities, foreign portfolios and nonfinite multipliers are refused', () => {
  assert.throws(() => parseCatalogue({...catalogue, portfolios: [...catalogue.portfolios, ...catalogue.portfolios]}));
  assert.throws(() => parseCatalogue({...catalogue, snapshots: [{...catalogue.snapshots[0], portfolioId: 'other'}]}));
  assert.equal(parseSelection({...selectSnapshot(catalogue, 's'), multipliers: [{nodeId: 'n', value: Infinity}]}), null);
});
test('null and zero remain distinct in validated projections', () => {
  const base = {schemaVersion: 1, title: 'Fixture', asOf: '2026-10-30', pnlKind: 'backtested', nodes: [],
    metrics: [{id: 'pnl', label: 'PnL', value: 0, unit: 'USD'}], series: [], tables: [], warnings: []};
  assert.equal(parseProjection(base).metrics[0].value, 0);
  assert.equal(parseProjection({...base, metrics: [{...base.metrics[0], value: null}]}).metrics[0].value, null);
  assert.throws(() => parseProjection({...base, metrics: [{...base.metrics[0], value: NaN}]}));
});
test('configuration chooses a logical binding, not an endpoint or module', () => {
  assert.equal(parseConfig({bindingId: 'fixture.read'}).bindingId, 'fixture.read');
  assert.throws(() => parseConfig({bindingId: 'https://example.invalid'}));
  assert.throws(() => parseConfig({bindingId: 'fixture.read', workflow: {id: 'run', revision: 'latest', parameters: {}}}));
});
