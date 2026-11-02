export type SelectionCoverage = 'complete' | 'partial' | 'unavailable';

/** Preformatted display value from the application adapter; the widget never derives it. */
export interface SelectionMetric {
  label: string;
  value: string | null;
  unit: string;
  coverage: SelectionCoverage;
  /** Optional app-computed known-count detail, shown only for incomplete coverage. */
  coverageLabel?: string;
}

/** Stable, app-ranked item shown in the rotating selection card. */
export interface SelectionItem {
  id: string;
  title: string;
  eyebrow?: string;
  context?: string;
  metrics: readonly SelectionMetric[];
}

export interface SelectionCarouselProps {
  items: readonly SelectionItem[];
  selectedId?: string | null;
  /** Compact inline card for a tight focus strip; the app still controls item order and content. */
  density?: 'default' | 'compact';
  eyebrow?: string;
  heading?: string;
  emptyMessage?: string;
  onPreview?: (item: SelectionItem | null) => void;
  onSelect?: (item: SelectionItem) => void;
}
