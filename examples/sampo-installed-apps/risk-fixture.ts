// @ts-nocheck
import type {RiskLensDataProvider} from '../../packages/risk-lens-data/contracts';
// Explicitly synthetic browser data. No network or live-source fallback.
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


export const riskProvider:RiskLensDataProvider={
 async loadContext(){return {fixture:true,namespace:{scope:'synthetic',environment:'browser-demo'},horizons:['1D','1W','1M','3M','YTD','CUSTOM'],ranges:['1M','3M','1Y','ALL'],snapshot:{state:'ready',data:{available:true,meta:{base_date:BASE_DATE,end_date:END_DATE}},fixture:true},capabilities:['positions','trades','history','comparison']}},
 async loadComparison(horizon='1D',endpoint='Live',end,start){return envelope(comparisonData({endpoint,horizon,end,start}),'partial','Synthetic fixture: one unavailable risk input.')},
 async loadTrades(){const data=comparisonData({endpoint:'EOD',horizon:'TRADES',end:END_DATE});data.rows=positions.filter(row=>row.pod!=='REFERENCE');return envelope(data,'partial','Synthetic trades')},
 async loadHistory(stamp,riskIds,range='1M'){return envelope({records:positions.filter(row=>riskIds.includes(row.exposure_id)).map(row=>[BASE_DATE,row.pod,row.exposure_id,row.change_m,row.signed_risk_end_m,row.vol_end_m,null]),start:BASE_DATE,end:END_DATE,state:'partial',coverage:{[range]:{complete:false,pricing_complete:false}}},'partial','Synthetic history')}
};
