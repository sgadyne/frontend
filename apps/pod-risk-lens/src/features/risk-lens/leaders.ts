import type {ExposureRow} from '../../domain/types';
import type {SelectionItem, SelectionMetric} from '../../widgets/selection';
import {completeSum, finite, metricChange, metricValue, type ExposureGroup, type LensMetric, type LensMode} from './model';

export interface ExposureMeasure {
  value: number | null;
  unit: string;
  coverage: 'complete' | 'partial' | 'unavailable';
  missingCount: number;
  totalCount: number;
}

export interface ExposureHistoryPair {riskId: string; book: string;}

export interface ExposureContributor {
  id: string;
  pod: string;
  tag: string;
  rows: ExposureRow[];
  current: ExposureMeasure;
  start: ExposureMeasure;
  change: ExposureMeasure;
  signedRiskStart: ExposureMeasure;
  signedRiskCurrent: ExposureMeasure;
  signedRiskChange: ExposureMeasure;
}

export interface ExposureLeader {
  id: string;
  label: string;
  assetClass: string;
  unit: string;
  mode: LensMode;
  metric: LensMetric;
  rows: ExposureRow[];
  riskIds: string[];
  historyPairs: ExposureHistoryPair[];
  scopedBooks: string[];
  current: ExposureMeasure;
  start: ExposureMeasure;
  change: ExposureMeasure;
  signedRiskStart: ExposureMeasure;
  signedRiskCurrent: ExposureMeasure;
  signedRiskChange: ExposureMeasure;
  contributors: ExposureContributor[];
  provenance: {
    sources: string[];
    contexts: string[];
    factorDates: string[];
    factorSources: string[];
    factorFallbacks: string[];
  };
  hasDeltaHistory: boolean;
}

function measure(values: readonly (number | null | undefined)[], unit: string): ExposureMeasure {
  const known = values.filter(finite);
  const missingCount = values.length - known.length;
  if (known.length === 0) return {value: null, unit, coverage: 'unavailable', missingCount, totalCount: values.length};
  if (missingCount === 0) return {value: completeSum(values), unit, coverage: 'complete', missingCount: 0, totalCount: values.length};
  // Incomplete book/tag values stay unavailable; counts explain the gap without
  // turning the available subset into an apparent net exposure.
  return {value: null, unit, coverage: 'partial', missingCount, totalCount: values.length};
}

function startValue(row: ExposureRow, metric: LensMetric) {
  return metric === 'risk' || !row.eligible ? row.signed_risk_start_m : row.start_m;
}

function unique(values: readonly (string | null | undefined)[]) {
  return [...new Set(values.map(value => value?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

function optionalFactorValue(row: ExposureRow, field: 'factor_source' | 'factor_fallback') {
  const published = row as ExposureRow & Record<string, unknown>;
  const value = published[field];
  return typeof value === 'string' ? value : null;
}

function contributorIdentity(groupId: string, pod: string, tag: string) {
  return `risk-lens:contributor:${JSON.stringify([groupId, pod, tag])}`;
}

export function buildExposureLeaders(groups: readonly ExposureGroup[], metric: LensMetric, mode: LensMode): ExposureLeader[] {
  return groups.map(group => {
    const unit = group.unit;
    const groupedContributors = new Map<string, ExposureRow[]>();
    for (const row of group.rows) {
      const key = JSON.stringify([row.pod, row.tag || 'Other']);
      groupedContributors.set(key, [...(groupedContributors.get(key) ?? []), row]);
    }
    const contributors = [...groupedContributors.entries()].map(([key, rows]) => {
      const [pod, tag] = JSON.parse(key) as [string, string];
      return {
        id: contributorIdentity(group.id, pod, tag), pod, tag, rows,
        current: measure(rows.map(row => metricValue(row, metric)), unit),
        start: measure(rows.map(row => startValue(row, metric)), unit),
        change: measure(rows.map(row => metricChange(row, metric)), unit),
        signedRiskStart: measure(rows.map(row => row.signed_risk_start_m), '$M / day'),
        signedRiskCurrent: measure(rows.map(row => row.signed_risk_end_m), '$M / day'),
        signedRiskChange: measure(rows.map(row => row.risk_equivalent_change_m), '$M / day'),
      };
    }).sort((a, b) => {
      const av = a.change.value == null ? Number.NEGATIVE_INFINITY : Math.abs(a.change.value);
      const bv = b.change.value == null ? Number.NEGATIVE_INFINITY : Math.abs(b.change.value);
      return bv - av || a.pod.localeCompare(b.pod) || a.tag.localeCompare(b.tag);
    });
    const historyPairs = [...new Map(group.rows.map(row => [JSON.stringify([row.exposure_id, row.pod]), {riskId: row.exposure_id, book: row.pod}])).values()]
      .sort((a, b) => a.book.localeCompare(b.book) || a.riskId.localeCompare(b.riskId));
    const provenanceRows = group.rows;
    return {
      id: group.id,
      label: group.label,
      assetClass: group.assetClass,
      unit,
      mode,
      metric,
      rows: group.rows,
      riskIds: [...new Set(group.rows.map(row => row.exposure_id))],
      historyPairs,
      scopedBooks: unique(group.rows.map(row => row.pod)),
      current: measure(group.rows.map(row => metricValue(row, metric)), unit),
      start: measure(group.rows.map(row => startValue(row, metric)), unit),
      change: measure(group.rows.map(row => metricChange(row, metric)), unit),
      signedRiskStart: measure(group.rows.map(row => row.signed_risk_start_m), '$M / day'),
      signedRiskCurrent: measure(group.rows.map(row => row.signed_risk_end_m), '$M / day'),
      signedRiskChange: measure(group.rows.map(row => row.risk_equivalent_change_m), '$M / day'),
      contributors,
      provenance: {
        sources: unique(provenanceRows.map(row => row.source)),
        contexts: unique(provenanceRows.map(row => row.context)),
        factorDates: unique(provenanceRows.map(row => row.factor_date)),
        factorSources: unique(provenanceRows.map(row => optionalFactorValue(row, 'factor_source'))),
        factorFallbacks: unique(provenanceRows.map(row => optionalFactorValue(row, 'factor_fallback'))),
      },
      hasDeltaHistory: group.rows.length > 0 && group.rows.every(row => row.eligible),
    };
  });
}

function displayMeasureValue(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  const formatted = value === 0 || Object.is(value, -0) ? '0'
    : new Intl.NumberFormat('en-US', {maximumSignificantDigits: 7, signDisplay: 'exceptZero'}).format(value);
  return formatted;
}

function selectionMetric(label: string, value: ExposureMeasure): SelectionMetric {
  return {
    label,
    value: displayMeasureValue(value.value),
    unit: value.unit,
    coverage: value.coverage,
    coverageLabel: value.coverage === 'complete' ? undefined : `${value.totalCount - value.missingCount}/${value.totalCount} known`,
  };
}

export function toSelectionItems(leaders: readonly ExposureLeader[]): SelectionItem[] {
  return [...leaders].sort((a, b) => {
    const rank = (value: ExposureMeasure) => value.coverage === 'complete' ? 0 : value.coverage === 'partial' ? 1 : 2;
    const coverageOrder = rank(a.signedRiskCurrent) - rank(b.signedRiskCurrent);
    if (coverageOrder !== 0) return coverageOrder;
    if (a.signedRiskCurrent.coverage !== 'complete') return a.label.localeCompare(b.label);
    return Math.abs(b.signedRiskCurrent.value!) - Math.abs(a.signedRiskCurrent.value!) || a.label.localeCompare(b.label);
  }).map(leader => ({
    id: leader.id,
    title: leader.label,
    eyebrow: `${leader.assetClass} · ${leader.metric === 'risk' ? 'Daily risk' : 'Delta'}`,
    context: `${leader.scopedBooks.length} books in current scope`,
    metrics: [
      selectionMetric('Signed daily risk', leader.signedRiskCurrent),
      selectionMetric('Period movement', leader.change),
    ],
  }));
}
