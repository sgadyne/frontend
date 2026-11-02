const base = '/risk-lens-demo/v1';

async function getJson(path) {
  const response = await fetch(`${base}${path}`, {credentials: 'same-origin'});
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error(`Synthetic demo provider returned non-JSON (${response.status}).`);
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? `Synthetic demo request failed (${response.status}).`);
  return payload;
}

export const syntheticRiskLensProvider = {
  loadContext: () => getJson('/context'),
  loadComparison: (horizon = '1D', endpoint = 'Live', end, start) => {
    const query = new URLSearchParams({horizon, endpoint, ...(end ? {end} : {}), ...(start ? {start} : {})});
    return getJson(`/comparison?${query}`);
  },
  loadTrades: () => getJson('/trades'),
  loadHistory: async (stamp, riskIds, range = '1M') => {
    const response = await fetch(`${base}/history`, {
      method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({stamp, risk_ids: riskIds, range}),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message ?? `Synthetic history request failed (${response.status}).`);
    return payload;
  },
};
