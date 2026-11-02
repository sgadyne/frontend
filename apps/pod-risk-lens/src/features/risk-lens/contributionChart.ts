import type {ContributionDatum, ContributionMeasure} from '../../widgets/contributions/contracts';
import type {ExposureRow} from '../../domain/types';
import {completeSum, finite, metricChange, metricValue, presentationTagColor} from './model';
import type {ExposureGroup, LensMetric} from './model';



function measure(values: readonly (number | null | undefined)[]): ContributionMeasure {
  const totalCount = values.length;
  const knownCount = values.filter(finite).length;
  const missingCount = totalCount - knownCount;
  const total = completeSum(values);
  const coverage = totalCount === 0 || knownCount === 0 || (missingCount === 0 && !finite(total))
    ? 'unavailable'
    : missingCount > 0
      ? 'partial'
      : 'complete';

  return {
    value: coverage === 'complete' && finite(total) ? total : null,
    coverage,
    missingCount,
    totalCount,
  };
}

function groupMeasure(group: ExposureGroup, missingCount: number, value: number | null): ContributionMeasure {
  const totalCount = group.rows.length;
  const coverage = totalCount === 0 || missingCount === totalCount || (missingCount === 0 && !finite(value))
    ? 'unavailable'
    : missingCount > 0
      ? 'partial'
      : 'complete';
  return {
    value: coverage === 'complete' && finite(value) ? value : null,
    coverage,
    missingCount,
    totalCount,
  };
}

function tagSegments(group: ExposureGroup, metric: LensMetric) {
  const rowsByTag = new Map<string, ExposureRow[]>();
  for (const row of group.rows) rowsByTag.set(row.tag, [...(rowsByTag.get(row.tag) ?? []), row]);

  return [...rowsByTag.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tag, rows]) => ({
      id: `risk-lens:tag:${encodeURIComponent(tag)}`,
      label: tag || 'Unspecified tag',
      ...(presentationTagColor(tag) ? {color: presentationTagColor(tag)} : {}),
      current: measure(rows.map(row => metricValue(row, metric))),
      movement: measure(rows.map(row => metricChange(row, metric))),
    }));
}

/** Adapt already-grouped Risk Lens exposures into signed chart data.
 *
 * Totals use the model's complete group sums. Tag measures are computed from
 * their actual source rows; a partially priced tag reports coverage and a null
 * bar value instead of presenting its known subtotal as a complete segment.
 */
export function toContributionData(groups: readonly ExposureGroup[], metric: LensMetric): ContributionDatum[] {
  return groups.map(group => ({
      id: group.id,
      label: group.label,
      category: group.assetClass,
      unit: group.unit,
      current: groupMeasure(group, group.missingValues, group.value),
      movement: groupMeasure(group, group.missingChanges, group.change),
      segments: tagSegments(group, metric),
    }));
}
