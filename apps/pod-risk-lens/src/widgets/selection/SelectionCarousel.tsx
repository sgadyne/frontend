import {useEffect, useId, useMemo, useRef, useState} from 'react';
import type {SelectionCarouselProps, SelectionItem, SelectionMetric} from './contracts';
import './SelectionCarousel.css';

function itemLabel(item: SelectionItem): string {
  const metrics = item.metrics.map(metric =>
    `${metric.label}: ${metric.value ?? 'Unavailable'} ${metric.unit}, ${metric.coverage} coverage${metric.coverage !== 'complete' && metric.coverageLabel ? `, ${metric.coverageLabel}` : ''}`,
  ).join('; ');
  return [
    `Inspect ${item.title}`,
    item.eyebrow,
    item.context,
    metrics,
  ].filter(Boolean).join('; ');
}

function optionLabels(items: readonly SelectionItem[]): string[] {
  const labels = items.map(item => [item.eyebrow, item.title].filter(Boolean).join(' · '));
  const totals = new Map<string, number>();
  for (const label of labels) totals.set(label, (totals.get(label) ?? 0) + 1);
  const counts = new Map<string, number>();
  return labels.map((label, index) => {
    const item = items[index];
    const disambiguated = (totals.get(label) ?? 0) > 1 && item.context ? `${label} — ${item.context}` : label;
    const count = counts.get(disambiguated) ?? 0;
    counts.set(disambiguated, count + 1);
    return count ? `${disambiguated} (${count + 1})` : disambiguated;
  });
}

function MetricTile({metric}: {metric: SelectionMetric}) {
  const incomplete = metric.coverage !== 'complete';
  const missing = metric.value == null;
  return <span className={`selection-carousel__metric${incomplete ? ' is-incomplete' : ''}`}>
    <span className="selection-carousel__metric-label">{metric.label}</span>
    <span className="selection-carousel__metric-value">
      <strong>{missing ? '—' : metric.value}</strong>
      {metric.unit && <span>{metric.unit}</span>}
    </span>
    {incomplete && <span className="selection-carousel__coverage">{metric.coverage === 'partial' ? 'Partial' : 'Unavailable'}{metric.coverageLabel ? ` · ${metric.coverageLabel}` : ''}</span>}
  </span>;
}

export default function SelectionCarousel({items, selectedId, density = 'default', eyebrow = 'Highlights', heading = 'Largest exposures',
  emptyMessage = 'No ranked exposures are available.', onPreview, onSelect}: SelectionCarouselProps) {
  const uid = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastPreviewRef = useRef<SelectionItem | null | undefined>(undefined);
  const activeItem = items.find(item => item.id === activeId)
    ?? items.find(item => item.id === selectedId)
    ?? items[0]
    ?? null;
  const activeIndex = activeItem ? items.findIndex(item => item.id === activeItem.id) : -1;
  const labels = useMemo(() => optionLabels(items), [items]);

  useEffect(() => {
    if (activeItem && activeItem.id !== activeId) setActiveId(activeItem.id);
  }, [activeItem?.id, activeId]);

  useEffect(() => {
    if (lastPreviewRef.current === activeItem) return;
    lastPreviewRef.current = activeItem;
    onPreview?.(activeItem);
  }, [activeItem, onPreview]);

  const navigate = (index: number) => {
    const next = items[index];
    if (next) setActiveId(next.id);
  };
  const compact = density === 'compact';
  const displayedMetrics = compact ? activeItem?.metrics.slice(0, 2) ?? [] : activeItem?.metrics ?? [];
  return <section className={`selection-carousel${compact ? ' selection-carousel--compact' : ''}`} aria-labelledby={`${uid}-heading`}>
    <header className="selection-carousel__header">
      <div className="selection-carousel__heading-copy">
        <p>{eyebrow}</p>
        <h2 id={`${uid}-heading`}>{heading}</h2>
      </div>
      {activeItem && items.length > 1 && <div className="selection-carousel__controls">
        <label className="selection-carousel__choose-label" htmlFor={`${uid}-choose`}>Choose exposure</label>
        <select id={`${uid}-choose`} className="selection-carousel__choose" value={activeItem.id}
          onChange={event => {
            const next = items.findIndex(item => item.id === event.currentTarget.value);
            if (next >= 0) navigate(next);
          }}>
          {items.map((item, index) => <option key={item.id} value={item.id}>{labels[index]}</option>)}
        </select>
        <div className="selection-carousel__steps" aria-label="Choose previous or next leader">
          <button type="button" aria-label="Previous leader" disabled={activeIndex <= 0} onClick={() => navigate(activeIndex - 1)}>
            <span aria-hidden="true">‹</span>
          </button>
          <span className="selection-carousel__position" aria-live="polite">{String(activeIndex + 1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</span>
          <button type="button" aria-label="Next leader" disabled={activeIndex < 0 || activeIndex >= items.length - 1} onClick={() => navigate(activeIndex + 1)}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>}
    </header>

    {!activeItem ? <div className="selection-carousel__empty" role="status">{emptyMessage}</div> : <button
      type="button"
      className={`selection-carousel__card${selectedId === activeItem.id ? ' is-selected' : ''}`}
      aria-label={itemLabel(activeItem)}
      aria-pressed={selectedId === activeItem.id}
      onClick={() => onSelect?.(activeItem)}
    >
      <span className="selection-carousel__card-top">
        <span className="selection-carousel__identity">
          {activeItem.eyebrow && <span className="selection-carousel__eyebrow">{activeItem.eyebrow}</span>}
          <strong className="selection-carousel__title">{activeItem.title}</strong>
          {activeItem.context && <span className="selection-carousel__context">{activeItem.context}</span>}
        </span>
        <span className={`selection-carousel__state${selectedId === activeItem.id ? ' is-selected' : ''}`}>
          {selectedId === activeItem.id ? 'Selected' : 'Preview'}
        </span>
      </span>
      {displayedMetrics.length ? <span className={`selection-carousel__metrics${displayedMetrics.length === 1 ? ' is-single' : ''}`}>
        {displayedMetrics.map((metric, index) => <MetricTile key={`${metric.label}-${metric.unit}-${index}`} metric={metric} />)}
      </span> : <span className="selection-carousel__no-metrics">No prepared metrics for this item.</span>}
      {!compact && <span className="selection-carousel__card-footer"><span>Open details</span><span aria-hidden="true">↗</span></span>}
    </button>}
  </section>;
}
