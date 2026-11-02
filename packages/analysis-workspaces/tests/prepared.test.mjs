import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readPrepared} from '../src/prepared.ts';

const reference = {dataset: 'fixture.projection', partition: {operation: 'catalogue'}, revision: 'exact'};
const response = {reference, leaseId: 'fixture-hold', result: {status: 'ready', completeness: 'complete',
  data: {encoding: 'sampo.lossless-json.v1', value: {n: 0, absent: null}}, provenance: {synthetic: false}}};
function provider(overrides = {}) {
  const released = [];
  return {released, resolve: async () => ({reference}), read: async () => response,
    release: async request => released.push(request.leaseId), ...overrides};
}
test('reads an exact reference and releases its hold', async () => {
  const p = provider();
  const result = await readPrepared(p, 'fixture.read', reference.partition, new AbortController().signal);
  assert.deepEqual(result.value, {n: 0, absent: null});
  assert.deepEqual(p.released, ['fixture-hold']);
});
test('rejects changed revisions and releases the rejected read', async () => {
  const p = provider({read: async () => ({...response, reference: {...reference, revision: 'other'}})});
  await assert.rejects(readPrepared(p, 'fixture.read', reference.partition, new AbortController().signal), /exact/);
  assert.deepEqual(p.released, ['fixture-hold']);
});
test('does not acquire, manufacture data or accept a synthetic live fallback', async () => {
  const missing = provider({resolve: async () => ({reference: null}), read: async () => {throw Error('must not read');}});
  assert.equal(await readPrepared(missing, 'fixture.read', reference.partition, new AbortController().signal), null);
  const p = provider({read: async () => ({...response, result: {...response.result, provenance: {synthetic: true}}})});
  await assert.rejects(readPrepared(p, 'fixture.read', reference.partition, new AbortController().signal), /real cached/);
});
test('late responses after cancellation are discarded and their holds released', async () => {
  const controller = new AbortController();
  const p = provider({read: async () => {controller.abort(); return response;}});
  await assert.rejects(readPrepared(p, 'fixture.read', reference.partition, controller.signal), /superseded/);
  assert.deepEqual(p.released, ['fixture-hold']);
});
