import {riskLensPresentation} from './presentation';
import type {ExposureRow} from '../../domain/types';

export type LensMode = 'positions' | 'trades' | 'overlap';
export type LensMetric = 'delta' | 'risk';
export interface LensFilters {query?: string; assetClass?: string; books?: readonly string[]; tags?: readonly string[];}
export interface ExposureGroup {
  id: string; label: string; assetClass: string; unit: string;
  rows: ExposureRow[]; riskIds: string[]; value: number | null; change: number | null;
  gross: number | null; missingValues: number; missingChanges: number;
}
export const finite = (value: number | null | undefined): value is number => value != null && Number.isFinite(value);
export function completeSum(values: readonly (number | null | undefined)[]): number | null {
  return values.length && values.every(finite) ? (values as number[]).reduce((a, b) => a + b, 0) : null;
}
export function normalizedUnderlying(row: ExposureRow): string {
  const name = row.underlying;
  return row.asset_class === 'FX' && /^[A-Z]{6}$/.test(name)
    ? (riskLensPresentation.currencyAliases[name.slice(0, 3)] ?? name.slice(0, 3)) + (riskLensPresentation.currencyAliases[name.slice(3)] ?? name.slice(3)) : name;
}
function japanBank(row: ExposureRow): boolean {
  if (row.asset_class !== 'Equity') return false;
  const name = row.underlying.trim().toUpperCase().replace(/\s+INDEX$/, '');
  return new RegExp(riskLensPresentation.equityGroup.pattern).test(name) || (riskLensPresentation.equityGroup.tickers.includes(name.split(/\s+/)[0]) && new RegExp(riskLensPresentation.equityGroup.listedPattern).test(name));
}
export function displayAsset(row: ExposureRow): string {
  if (row.asset_class === 'Credit') return `${row.credit_segment ?? 'DM'} Credit`;
  return row.asset_class.replace('IR Peripheral Spread', 'Euro periphery').replace('IR Inflation', 'Inflation').replace('IR Swap Spread', 'Swap Spread') || 'Unclassified';
}
export function groupIdentity(row: ExposureRow, overlap = false): {id: string; label: string} {
  const label = overlap && japanBank(row) ? riskLensPresentation.equityGroup.label : normalizedUnderlying(row);
  // Preserve native/non-dollar factor identities. Only the legacy documented
  // economic groups combine converted dollar roots, PCA factors and credit names.
  const id = overlap && japanBank(row) || row.eligible || row.asset_class.startsWith('IR ') || row.asset_class === 'Credit'
    ? JSON.stringify([displayAsset(row), label]) : row.exposure_id;
  return {id, label};
}
export function metricValue(row: ExposureRow, metric: LensMetric): number | null {
  return metric === 'risk' || !row.eligible ? row.signed_risk_end_m : row.end_m;
}
export function metricChange(row: ExposureRow, metric: LensMetric): number | null {
  return metric === 'risk' || !row.eligible ? row.risk_equivalent_change_m ?? null : row.change_m;
}
export function selectRows(rows: readonly ExposureRow[], filters: LensFilters = {}): ExposureRow[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? '';
  return rows.filter(row => (!filters.assetClass || filters.assetClass === 'all' || row.asset_class === filters.assetClass)
    && (!filters.books?.length || filters.books.includes(row.pod))
    && (!filters.tags?.length || filters.tags.includes(row.tag))
    && (!query || [row.underlying, normalizedUnderlying(row), row.pod, row.tag, row.asset_class, row.currency, row.context, row.exposure_id]
      .some(value => value?.toLocaleLowerCase().includes(query))));
}
export function buildExposureGroups(rows: readonly ExposureRow[], metric: LensMetric, overlap = false): ExposureGroup[] {
  const grouped = new Map<string, ExposureGroup>();
  for (const row of rows) {
    const identity = groupIdentity(row, overlap);
    const group = grouped.get(identity.id) ?? {...identity, assetClass: displayAsset(row), unit: metric === 'risk' || !row.eligible ? '$M / day' : '$M delta', rows: [], riskIds: [], value: null, change: null, gross: null, missingValues: 0, missingChanges: 0};
    group.rows.push(row); grouped.set(identity.id, group);
  }
  return [...grouped.values()].map(group => {
    const values = group.rows.map(row => metricValue(row, metric)), changes = group.rows.map(row => metricChange(row, metric));
    return {...group, riskIds: [...new Set(group.rows.map(row => row.exposure_id))], value: completeSum(values), change: completeSum(changes),
      gross: completeSum(values.map(value => finite(value) ? Math.abs(value) : null)),
      missingValues: values.filter(value => !finite(value)).length, missingChanges: changes.filter(value => !finite(value)).length};
  }).sort((a, b) => Math.abs(b.value ?? 0) - Math.abs(a.value ?? 0) || a.label.localeCompare(b.label));
}
export function selectOverlapRows(allRows: readonly ExposureRow[], peers: readonly ExposureRow[], cutoff = .2): {rows: ExposureRow[]; qualifyingGroups: number; excludedUnpriced: number;} {
  const referenceGroups = new Map<string, ExposureRow[]>();
  for (const row of allRows.filter(row => row.pod === riskLensPresentation.referenceBook)) {
    const key = groupIdentity(row, true).id; referenceGroups.set(key, [...(referenceGroups.get(key) ?? []), row]);
  }
  const peerKeys = new Set(peers.filter(row => row.pod !== riskLensPresentation.referenceBook && ((finite(row.vol_end_m) && row.vol_end_m > 0) || (finite(row.end_m) && row.end_m !== 0) || (finite(row.signed_risk_end_m) && row.signed_risk_end_m !== 0)))
    .map(row => groupIdentity(row, true).id));
  const keys = new Set<string>(); let excludedUnpriced = 0;
  for (const [key, group] of referenceGroups) {
    const gross = completeSum(group.map(row => row.vol_end_m));
    if (gross == null) { excludedUnpriced++; continue; }
    if (gross > cutoff && peerKeys.has(key)) keys.add(key);
  }
  return {rows: peers.filter(row => row.pod !== riskLensPresentation.referenceBook && keys.has(groupIdentity(row, true).id)), qualifyingGroups: keys.size, excludedUnpriced};
}

export function portfolioStats(rows: readonly ExposureRow[]) {
  const eligible = rows.filter(row => row.eligible);
  return {netExposure: completeSum(eligible.map(row => row.end_m)), exposureChange: completeSum(eligible.map(row => row.change_m)),
    netDailyRisk: completeSum(rows.map(row => row.signed_risk_end_m)), grossDailyRisk: completeSum(rows.map(row => row.vol_end_m)),
    pricedRows: rows.filter(row => finite(row.signed_risk_end_m)).length, totalRows: rows.length};
}

export const presentationTagColor = (tag:string):string|undefined => riskLensPresentation.tagColors[tag];
