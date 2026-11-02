import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRiskLensDemoRequest} from './synthetic-api.mjs';

function request(method, url, value = undefined) {
  const bytes = value === undefined ? null : Buffer.from(JSON.stringify(value));
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() { if (bytes) yield bytes; },
  };
}

function response() {
  return {
    headers: {},
    writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
    end(value) { this.body = value?.toString() ?? ''; },
    json() { return JSON.parse(this.body); },
  };
}

test('synthetic context declares fixture provenance and supported browser views', async () => {
  const result = response();
  assert.equal(await handleRiskLensDemoRequest(request('GET', '/risk-lens-demo/v1/context'), result), true);
  assert.equal(result.statusCode, 200);
  const body = result.json();
  assert.equal(body.fixture, true);
  assert.deepEqual(body.namespace, {scope: 'synthetic', environment: 'browser-demo'});
  assert.ok(body.capabilities.includes('history'));
});

test('comparison payload preserves partial coverage and null risk values across endpoints', async () => {
  const result = response();
  assert.equal(await handleRiskLensDemoRequest(request('GET', '/risk-lens-demo/v1/comparison?horizon=1W&endpoint=EOD'), result), true);
  const body = result.json();
  assert.equal(body.fixture, true);
  assert.equal(body.state, 'partial');
  assert.equal(body.data.meta.endpoint, 'EOD');
  assert.equal(body.data.meta.horizon, '1W');
  assert.equal(body.data.meta.source, 'Synthetic browser demo');
  assert.ok(body.data.rows.some(row => row.signed_risk_end_m === null));
  assert.equal(body.coverage.complete, false);
  assert.match(body.message, /Synthetic demo fixture/);
});

test('history uses caller stamp, selected risk ids and partial source labels', async () => {
  const result = response();
  assert.equal(await handleRiskLensDemoRequest(request('POST', '/risk-lens-demo/v1/history', {
    stamp: 'synthetic-risk-lens-live-1d-2026-10-23', risk_ids: ['DEMO-PEER-SPX'], range: '3M',
  }), result), true);
  const body = result.json();
  assert.equal(body.fixture, true);
  assert.equal(body.state, 'partial');
  assert.equal(body.data.coverage['3M'].complete, false);
  assert.deepEqual(body.data.records.map(record => record[2]), ['DEMO-PEER-SPX']);
  assert.match(body.message, /Synthetic history fixture/);
});

test('private handler declines routes it does not own', async () => {
  const result = response();
  assert.equal(await handleRiskLensDemoRequest(request('GET', '/api/catalog'), result), false);
  assert.equal(result.body, undefined);
});
