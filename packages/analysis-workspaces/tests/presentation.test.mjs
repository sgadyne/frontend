import {test} from 'node:test';
import assert from 'node:assert/strict';
import {historyGroups, lineSegments, tableCsv, tableRows, views} from '../src/presentation.ts';

const table = {id: 'risk', title: 'Risk', columns: [{key: 'name', label: 'Book'}, {key: 'value', label: 'PnL'}],
  rows: [{name: 'B', value: 12}, {name: 'A', value: null}, {name: 'C', value: -3}, {name: 'D', value: 0}]};

test('table sorting is numeric, keeps nulls last in both directions and never mutates the source', () => {
  const original = structuredClone(table);
  assert.deepEqual(tableRows(table, '', {key: 'value', descending: false}).map(r => r.value), [-3, 0, 12, null]);
  assert.deepEqual(tableRows(table, '', {key: 'value', descending: true}).map(r => r.value), [12, 0, -3, null]);
  assert.deepEqual(table, original);
});

test('search covers declared columns only and preserves zero and lossless scalars', () => {
  const exact = {$sampo: 'int64', value: '9007199254740993'};
  const source = {...table, rows: [{name: 'Exact', value: exact, private: 'not-searchable'}, {name: 'Zero', value: 0}]};
  assert.deepEqual(tableRows(source, '9007199254740993', null)[0].value, exact);
  assert.equal(tableRows(source, 'zero', null)[0].value, 0);
  assert.equal(tableRows(source, 'not-searchable', null).length, 0);
});

test('CSV retains exact transported integers and quotes strings and formulas safely', () => {
  const result = tableCsv({...table, rows: [{name: '=HYPERLINK("bad")', value: {$sampo: 'decimal', value: '12345678901234567890.000001'}}, {name: 'zero', value: 0}, {name: 'missing', value: null}]});
  assert.ok(result.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(result.includes('"12345678901234567890.000001"'));
  assert.ok(result.includes('"zero","0"'));
  assert.ok(result.includes('"missing",""'));
});

test('charts never connect across a missing observation', () => {
  const result = lineSegments([{date: '1', value: 2}, {date: '2', value: null}, {date: '3', value: -1}, {date: '4', value: 0}], Number, x => x * 2);
  assert.deepEqual(result, [{path: 'M1 4', start: 1, end: 1}, {path: 'M3 -2 L4 0', start: 3, end: 4}]);
  assert.deepEqual(lineSegments([{date: '1', value: null}], Number, Number), []);
});

test('performance groups preserve all published series without recomputing values', () => {
  const series = ['daily', 'cumulative', 'baseline', 'parent', 'drawdown', 'rolling-rms', 'node:book', 'extra'].map(id => ({id, label: id, unit: 'USD', points: [{date: '2026-10-30', value: 0}]}));
  const groups = historyGroups(series);
  assert.deepEqual(groups.main.map(s => s.id), ['cumulative', 'baseline', 'parent']);
  assert.equal(Object.values(groups).flat().length, series.length);
  assert.equal(groups.main[0], series[1]);
  assert.equal(new Set(views.map(v => v.id)).size, views.length);
});
