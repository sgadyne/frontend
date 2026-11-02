export type ResultState = 'ready' | 'partial' | 'missing' | 'error';
export interface Envelope<T> {
  state: ResultState; data: T | null; fixture: boolean; publication?: string | null;
  message?: string; error?: string; coverage?: {complete: boolean; pricing_complete?: boolean} | null;
  freshness?: {state: 'fresh' | 'stale' | 'unknown'; publication_age_seconds?: number; source_as_of?: string | null};
}
export interface ExposureRow {
  exposure_id: string; underlying: string; asset_class: string; pod: string; tag: string;
  currency: string; context?: string; eligible: boolean; unit?: string; source?: string;
  credit_segment?: string | null;
  start_m: number | null; end_m: number | null; change_m: number | null;
  signed_risk_start_m: number | null; signed_risk_end_m: number | null;
  vol_start_m: number | null; vol_end_m: number | null; vol_change_m: number | null;
  risk_equivalent_change_m?: number | null; factor_date?: string;
}
export interface ComparisonData {
  rows: ExposureRow[]; stamp: string; tags?: string[]; excluded_tags?: string[];
  meta: {date?: string; base_date: string; end_date: string; horizon: string; endpoint: string;
    fixture?: boolean; source?: string; position_count?: number; priced?: number; requested?: number; risk_gross_coverage?: number;
    live_source_as_of?: string; exact?: boolean; sigma_basis?: string; market_errors?: string[]; excluded_books?: string[]};
  history?: {coverage?: Record<string, {complete: boolean; pricing_complete?: boolean}>; start?: string; end?: string};
}
export type HistoryRecord = [date: string, book: string, riskId: string, deltaM: number | null,
  signedRiskM: number | null, grossRiskM: number | null, unitNotional: number | null];
export interface HistoryData {
  records: HistoryRecord[]; start?: string; end?: string; state?: string;
  coverage?: Record<string, {complete: boolean; pricing_complete?: boolean}>;
}
export interface ContextResponse {
  fixture: boolean; namespace: {scope: string; environment: string}; horizons: string[]; ranges: string[];
  snapshot: Envelope<{available: boolean; meta: {end_date?: string; base_date?: string}}>;
  capabilities: string[];
}
export const rowKey = (row: ExposureRow) => `${row.exposure_id}::${row.pod}::${row.tag}`;
