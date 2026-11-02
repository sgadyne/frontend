export type ContributionCoverage = 'complete' | 'partial' | 'unavailable';

/** A caller-computed value and its coverage; the renderer does not aggregate it. */
export interface ContributionMeasure {
  value: number | null;
  coverage: ContributionCoverage;
  missingCount: number;
  totalCount: number;
}

/** One real, caller-supplied tag slice of a contribution. */
export interface ContributionSegment {
  id: string;
  label: string;
  /** Optional shared palette color; omitted values use a stable ID hash. */
  color?: string;
  current: ContributionMeasure;
  movement: ContributionMeasure;
}

/** A stable entity to plot. Current/movement and tag segments are independent measures. */
export interface ContributionDatum {
  id: string;
  label: string;
  category: string;
  unit: string;
  current: ContributionMeasure;
  movement: ContributionMeasure;
  segments?: readonly ContributionSegment[];
}

export interface ContributionChartProps {
  items: readonly ContributionDatum[];
  selectedId?: string | null;
  onPreview?: (item: ContributionDatum | null) => void;
  onSelect?: (item: ContributionDatum) => void;
  formatValue?: (value: number | null, unit: string) => string;
  maxPerGroup?: number;
  emptyMessage?: string;
}
