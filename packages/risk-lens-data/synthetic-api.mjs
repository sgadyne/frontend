const API_PREFIX = '/risk-lens-demo/v1';
const END_DATE = '2026-10-23';
const BASE_DATE = '2026-10-22';

const positions = [
  {
    exposure_id: 'DEMO-REFERENCE-SPX', underlying: 'SPX Index', asset_class: 'Equity', pod: 'REFERENCE', tag: 'REFERENCE',
    currency: 'USD', context: 'Synthetic reference book', eligible: true, unit: 'USD M', source: 'Synthetic demo',
    start_m: 16.2, end_m: 17.1, change_m: 0.9, signed_risk_start_m: 0.22, signed_risk_end_m: 0.25,
    vol_start_m: 0.14, vol_end_m: 0.16, vol_change_m: 0.02,
  },
  {
    exposure_id: 'DEMO-PEER-SPX', underlying: 'SPX Index', asset_class: 'Equity', pod: 'Macro Fund A', tag: 'Core',
    currency: 'USD', context: 'Synthetic peer book', eligible: true, unit: 'USD M', source: 'Synthetic demo',
    start_m: 5.1, end_m: 5.8, change_m: 0.7, signed_risk_start_m: 0.08, signed_risk_end_m: 0.1,
    vol_start_m: 0.04, vol_end_m: 0.05, vol_change_m: 0.01,
  },
  {
    exposure_id: 'DEMO-PEER-EUR', underlying: 'EURUSD', asset_class: 'FX', pod: 'Macro Fund B', tag: 'Core',
    currency: 'USD', context: 'Synthetic peer book', eligible: true, unit: 'USD M', source: 'Synthetic demo',
    start_m: -2.4, end_m: -2.1, change_m: 0.3, signed_risk_start_m: -0.05, signed_risk_end_m: -0.04,
    vol_start_m: 0.03, vol_end_m: 0.03, vol_change_m: 0,
  },
  {
    exposure_id: 'DEMO-PEER-CREDIT', underlying: 'CDX IG', asset_class: 'Credit', pod: 'Macro Fund A', tag: 'Core',
    currency: 'USD', context: 'Synthetic publication with missing risk input', eligible: true, unit: 'USD M', source: 'Synthetic demo',
    start_m: 3.7, end_m: 3.9, change_m: 0.2, signed_risk_start_m: null, signed_risk_end_m: null,
    vol_start_m: 0.02, vol_end_m: null, vol_change_m: null,
  },
  {
    exposure_id: 'DEMO-PEER-VOL', underlying: 'VIX Future', asset_class: 'Volatility', pod: 'Macro Fund B', tag: 'Vol',
    currency: 'USD', context: 'Excluded by the default Positions scope', eligible: true, unit: 'USD M', source: 'Synthetic demo',
    start_m: 1.2, end_m: 1.4, change_m: 0.2, signed_risk_start_m: 0.04, signed_risk_end_m: 0.05,
    vol_start_m: 0.08, vol_end_m: 0.09, vol_change_m: 0.01,
  },
];

function json(response, status, payload) {
  const bytes = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': bytes.byteLength,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(bytes);
}

function envelope(data, state = 'partial', message = undefined) {
  return {
    state,
    data,
    fixture: true,
    publication: 'synthetic-risk-lens-demo-v1',
    ...(message ? {message} : {}),
    coverage: {complete: state === 'ready', pricing_complete: state === 'ready'},
    freshness: {state: 'fresh', publication_age_seconds: 0, source_as_of: END_DATE},
  };
}

function comparisonData({endpoint, horizon, end, start}) {
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(end ?? '') ? end : END_DATE;
  const baseDate = /^\d{4}-\d{2}-\d{2}$/.test(start ?? '') ? start : BASE_DATE;
  const stamp = `synthetic-risk-lens-${endpoint.toLowerCase()}-${horizon.toLowerCase()}-${endDate}`;
  return {
    rows: positions,
    stamp,
    tags: ['Core', 'Vol', 'REFERENCE'],
    excluded_tags: ['Vol'],
    meta: {
      base_date: baseDate,
      end_date: endDate,
      horizon,
      endpoint,
      fixture: true,
      source: 'Synthetic browser demo',
      position_count: positions.length,
      priced: 3,
      requested: positions.length,
      risk_gross_coverage: 0.75,
      live_source_as_of: endDate,
      sigma_basis: 'Synthetic demonstration data; not a risk input',
    },
  };
}

async function requestJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > 16 * 1024) throw Object.assign(new Error('Demo history request is too large.'), {status: 413});
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Demo history request must contain JSON.'), {status: 400}); }
}

/** Synthetic-only routes for the standalone component demo. */
export async function handleRiskLensDemoRequest(request, response) {
  let url;
  try { url = new URL(request.url ?? '/', 'http://localhost'); }
  catch { return false; }
  if (!url.pathname.startsWith(`${API_PREFIX}/`)) return false;
  if (url.pathname === `${API_PREFIX}/context` && request.method === 'GET') {
    return json(response, 200, {
      fixture: true,
      namespace: {scope: 'synthetic', environment: 'browser-demo'},
      horizons: ['1D', '1W', '1M', '3M', 'YTD', 'CUSTOM'],
      ranges: ['1M', '3M', '1Y', 'ALL'],
      snapshot: {state: 'ready', data: {available: true, meta: {base_date: BASE_DATE, end_date: END_DATE}}, fixture: true},
      capabilities: ['positions', 'trades', 'history', 'comparison'],
    }), true;
  }
  if (url.pathname === `${API_PREFIX}/comparison` && request.method === 'GET') {
    const endpoint = url.searchParams.get('endpoint') === 'EOD' ? 'EOD' : 'Live';
    const horizon = /^[A-Z0-9]{1,8}$/.test(url.searchParams.get('horizon') ?? '') ? url.searchParams.get('horizon') : '1D';
    const data = comparisonData({endpoint, horizon, end: url.searchParams.get('end'), start: url.searchParams.get('start')});
    return json(response, 200, envelope(data, 'partial', 'Synthetic demo fixture: one publication row has an unavailable risk input.')), true;
  }
  if (url.pathname === `${API_PREFIX}/trades` && request.method === 'GET') {
    const data = comparisonData({endpoint: 'EOD', horizon: 'TRADES', end: END_DATE});
    data.rows = positions.filter(row => row.pod !== 'REFERENCE').map(row => ({...row, context: 'Synthetic prepared trade result'}));
    data.stamp = 'synthetic-risk-lens-trades-2026-10-23';
    data.meta.source = 'Synthetic browser demo trades';
    return json(response, 200, envelope(data, 'partial', 'Synthetic trade fixture; missing risk values remain null.')), true;
  }
  if (url.pathname === `${API_PREFIX}/history` && request.method === 'POST') {
    try {
      const body = await requestJson(request);
      const riskIds = Array.isArray(body.risk_ids) ? body.risk_ids.filter(value => typeof value === 'string').slice(0, 100) : [];
      const records = positions.filter(row => riskIds.includes(row.exposure_id)).map((row, index) => [
        BASE_DATE, row.pod, row.exposure_id, row.change_m, row.signed_risk_end_m, row.vol_end_m, null,
      ]);
      return json(response, 200, envelope({
        records,
        start: BASE_DATE,
        end: END_DATE,
        state: 'partial',
        coverage: {[String(body.range ?? '1M')]: {complete: false, pricing_complete: false}},
      }, 'partial', 'Synthetic history fixture; a missing value is preserved as unknown.')), true;
    } catch (error) {
      return json(response, error.status ?? 400, {error: {code: 'INVALID_DEMO_REQUEST', message: error.message}}), true;
    }
  }
  return json(response, 404, {error: {code: 'DEMO_ROUTE_NOT_FOUND', message: 'Synthetic Risk Lens demo route was not found.'}}), true;
}

export default handleRiskLensDemoRequest;
