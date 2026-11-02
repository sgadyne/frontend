import {useEffect, useId, useMemo, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';
import {formatNumericValue} from '../../ui/format';
import {seriesColorForId} from '../../ui/tokens/series';
import type {ContributionChartProps, ContributionDatum, ContributionMeasure} from './contracts';
import {adjacentContributionChartIndex, contributionChartGroupKey, normalizeContributionWheelDelta, resolveContributionChartGroup} from './navigation';
import './ContributionChart.css';

type MeasureKind = 'current' | 'movement';
const finite = (value: number | null | undefined): value is number => value != null && Number.isFinite(value);
function segmentColor(segment: {id: string; color?: string}): string {
  return 'color' in segment && segment.color ? segment.color : seriesColorForId(segment.id);
}

function defaultFormat(value: number | null): string {
  return formatNumericValue(value).text;
}

function formatMeasure(measure: ContributionMeasure, unit: string, formatValue: NonNullable<ContributionChartProps['formatValue']>): string {
  return finite(measure.value) && measure.coverage !== 'unavailable' ? formatValue(measure.value, unit) : 'Unavailable';
}

function coverageText(measure: ContributionMeasure): string {
  if (measure.coverage === 'complete' && measure.missingCount === 0) return '';
  return `${measure.coverage} coverage (${Math.max(0, measure.totalCount - measure.missingCount)}/${measure.totalCount} known)`;
}

function measureFor(item: Pick<ContributionDatum, 'current' | 'movement'>, kind: MeasureKind): ContributionMeasure {
  return item[kind];
}

function formatTags(item: ContributionDatum, formatValue: NonNullable<ContributionChartProps['formatValue']>): string {
  if (!item.segments?.length) return 'no tag split supplied';
  return item.segments.map(segment => {
    const current = statusLabel(segment.current, formatValue, item.unit);
    const movement = statusLabel(segment.movement, formatValue, item.unit);
    return `${segment.label}: ${current} current / ${movement} movement`;
  }).join('; ');
}

function valueDomain(items: readonly ContributionDatum[], kind: MeasureKind): {min: number; max: number; ticks: number[]} {
  let low = 0, high = 0;
  for (const item of items) {
    const measure = measureFor(item, kind);
    if (finite(measure.value) && measure.coverage !== 'unavailable') {
      low = Math.min(low, measure.value); high = Math.max(high, measure.value);
    }
    let positive = 0, negative = 0;
    for (const segment of item.segments ?? []) {
      const part = measureFor(segment, kind);
      if (!finite(part.value) || part.coverage === 'unavailable') continue;
      if (part.value > 0) positive += part.value;
      if (part.value < 0) negative += part.value;
    }
    low = Math.min(low, negative); high = Math.max(high, positive);
  }
  if (low === 0 && high === 0) return {min:-1, max:1, ticks:[1,0,-1]};
  const rawStep = (high - low) / 3;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const ratio = rawStep / power;
  const niceFactor = ratio <= 1.5 ? 1 : ratio <= 3.5 ? 2 : ratio <= 7.5 ? 5 : 10;
  const step = niceFactor * power;
  const lowTick = Math.floor(low / step) * step;
  const highTick = Math.ceil(high / step) * step;
  const min = low < 0 ? lowTick - step * 0.15 : 0;
  const max = high > 0 ? highTick + step * 0.15 : 0;
  return {min, max, ticks:[...new Set([highTick, 0, lowTick])]};
}

function formatAxis(value: number): string {
  if (value !== 0 && Math.abs(value) < 0.001) return value.toExponential(1).replace('e+', 'e');
  return new Intl.NumberFormat('en-US', {maximumSignificantDigits:3, notation:Math.abs(value) >= 10_000 ? 'compact' : 'standard'}).format(value);
}

function statusLabel(measure: ContributionMeasure, formatValue: NonNullable<ContributionChartProps['formatValue']>, unit: string) {
  const coverage = coverageText(measure);
  return `${formatMeasure(measure, unit, formatValue)}${coverage ? `, ${coverage}` : ''}`;
}

function MeasureReadout({measure, unit, formatValue}: {
  measure: ContributionMeasure; unit: string; formatValue: NonNullable<ContributionChartProps['formatValue']>;
}) {
  const coverage = coverageText(measure);
  return <>{formatMeasure(measure, unit, formatValue)}{coverage &&
    <span className="contribution-chart-coverage-warning">, {coverage}</span>}</>;
}

function childCanScrollVertically(target: Element, root: HTMLElement, deltaY: number): boolean {
  let node: HTMLElement | null = target instanceof HTMLElement ? target : target.parentElement;
  while (node && node !== root) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      if (deltaY < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1) return true;
    }
    node = node.parentElement;
  }
  return false;
}

const WHEEL_THRESHOLD_PX = 60;
const WHEEL_GESTURE_GAP_MS = 500;

interface PlotProps {
  items: readonly ContributionDatum[];
  kind: MeasureKind;
  unit: string;
  plotWidth: number;
  formatValue: NonNullable<ContributionChartProps['formatValue']>;
  selectedId?: string | null;
  onSelect?: (item: ContributionDatum) => void;
  onPointerEnter: (item: ContributionDatum) => void;
  onPointerLeave: (item: ContributionDatum) => void;
  onFocus: (item: ContributionDatum) => void;
  onBlur: (item: ContributionDatum) => void;
}

function Plot({items, kind, unit, plotWidth, formatValue, selectedId, onSelect, onPointerEnter, onPointerLeave, onFocus, onBlur}: PlotProps) {
  const width = Math.max(316, plotWidth, items.length * 62 + 62);
  const height = kind === 'current' ? 134 : 158;
  const margin = {left: 43, right: 10, top: 9, bottom: kind === 'current' ? 12 : 43};
  const top = margin.top, bottom = height - margin.bottom;
  const {min, max, ticks} = valueDomain(items, kind);
  const y = (value: number) => bottom - ((value - min) / (max - min)) * (bottom - top);
  const step = (width - margin.left - margin.right) / Math.max(1, items.length);
  const band = Math.min(38, step * 0.62);
  const label = kind === 'current' ? 'Current' : 'Movement';

  const onKeyDown = (event: KeyboardEvent<SVGRectElement>, index: number, item: ContributionDatum) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); onSelect?.(item); return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const hits = event.currentTarget.ownerSVGElement?.querySelectorAll<SVGRectElement>('.contribution-chart-hit');
      hits?.[Math.max(0, Math.min(hits.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))].focus();
    }
  };

  return <section className={`contribution-chart-plot contribution-chart-plot--${kind}`} aria-label={`${label} plot, ${unit}`}>
    <header className="contribution-chart-plot__heading"><h4>{label}</h4><span>{unit}</span></header>
    <svg className="contribution-chart-plot__svg" role="group" aria-label={`${label} signed vertical bar chart in ${unit}`}
      viewBox={`0 0 ${width} ${height}`} style={{width: `${width}px`}}>
      <line className="contribution-chart-axis" x1={margin.left} x2={margin.left} y1={top} y2={bottom}/>
      {ticks.map((tick, index) => <g key={`${tick}-${index}`}>
        <line className={tick === 0 ? 'contribution-chart-zero' : 'contribution-chart-grid'} x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)}/>
        <text className="contribution-chart-tick" x={margin.left - 5} y={y(tick) + 3} textAnchor="end">{formatAxis(tick)}</text>
      </g>)}
      {items.map((item, index) => {
        const center = margin.left + step * (index + 0.5);
        const parts = (item.segments ?? []).filter(segment => {
          const measure = measureFor(segment, kind);
          return finite(measure.value) && measure.coverage !== 'unavailable' && measure.value !== 0;
        });
        let positive = 0, negative = 0;
        const segments = parts.map(segment => {
          const part = measureFor(segment, kind);
          const start = part.value! >= 0 ? positive : negative;
          const end = start + part.value!;
          if (part.value! >= 0) positive = end; else negative = end;
          return {segment, measure: part, start, end};
        });
        const aggregate = measureFor(item, kind);
        const statusMark = aggregate.coverage === 'complete' ? null : aggregate.coverage === 'partial' ? 'P' : '?';
        const currentLabel = statusLabel(item.current, formatValue, unit);
        const movementLabel = statusLabel(item.movement, formatValue, unit);
        const ariaLabel = `${kind === 'current' ? 'Current' : 'Movement'} plot for ${item.label}, ${item.category}; ${label} ${statusLabel(aggregate, formatValue, unit)} ${unit}; Current ${currentLabel}; Movement ${movementLabel}; tags ${formatTags(item, formatValue)}.`;
        return <g key={item.id}>
          {selectedId === item.id && <rect className="contribution-chart-guide is-selected" x={center - step * 0.47} y={top} width={step * 0.94} height={bottom - top} rx="4"/>}
          {segments.map(({segment, measure, start, end}) => {
            const y1 = y(Math.max(start, end)), y2 = y(Math.min(start, end));
            return <rect key={segment.id} className={`contribution-chart-segment${measure.coverage === 'partial' ? ' is-partial' : ''}`}
              x={center - band / 2} y={y1} width={band} height={Math.max(1, y2 - y1)} rx="1"
              fill={segmentColor(segment)} stroke={measure.coverage === 'partial' ? '#26373d' : 'none'} strokeDasharray={measure.coverage === 'partial' ? '2 2' : undefined}
              aria-hidden="true"><title>{`${segment.label}: ${statusLabel(measure, formatValue, unit)}`}</title></rect>;
          })}
          {finite(aggregate.value) && aggregate.coverage !== 'unavailable' && <circle className={`contribution-chart-net${aggregate.coverage === 'partial' ? ' is-partial' : ''}`}
            cx={center} cy={y(aggregate.value)} r="3.3" fill={aggregate.coverage === 'complete' ? 'var(--risk-ink,#192a32)' : 'var(--risk-surface,#fff)'}
            stroke="var(--risk-ink,#192a32)" strokeWidth="1.5" aria-hidden="true"><title>{`${label} net ${statusLabel(aggregate, formatValue, unit)}`}</title></circle>}
          {statusMark && <text className="contribution-chart-coverage-mark" x={center} y={top + 8} textAnchor="middle" aria-hidden="true">{statusMark}</text>}
          {kind === 'movement' && <text className="contribution-chart-category" x={center} y={height - 15} textAnchor="end"
            transform={`rotate(-28 ${center} ${height - 15})`} aria-hidden="true">{item.label.length > 10 ? `${item.label.slice(0, 9)}…` : item.label}</text>}
          <rect className="contribution-chart-hit" data-index={index} data-item-id={item.id}
            x={center - step * 0.46} y={top} width={step * 0.92} height={bottom - top} rx="4"
            fill="transparent" role="button" tabIndex={0} aria-pressed={selectedId === item.id} aria-label={ariaLabel}
            onClick={() => onSelect?.(item)} onKeyDown={event => onKeyDown(event, index, item)}
            onPointerEnter={() => onPointerEnter(item)} onPointerLeave={() => onPointerLeave(item)}
            onFocus={() => onFocus(item)} onBlur={() => onBlur(item)} />
        </g>;
      })}
    </svg>
  </section>;
}

function Detail({item, formatValue}: {item: ContributionDatum; formatValue: NonNullable<ContributionChartProps['formatValue']>}) {
  return <aside className="contribution-chart-detail" aria-label={`Preview details for ${item.label}`}>
    <div className="contribution-chart-detail__head"><strong>{item.label}</strong><span>{item.category} · {item.unit}</span></div>
    <div className="contribution-chart-detail__values">
      <span>Current <b><MeasureReadout measure={item.current} unit={item.unit} formatValue={formatValue}/></b></span>
      <span>Movement <b><MeasureReadout measure={item.movement} unit={item.unit} formatValue={formatValue}/></b></span>
    </div>
    {item.segments?.length ? <ul className="contribution-chart-detail__tags">{item.segments.map(segment => <li key={segment.id}>
      <span className="contribution-chart-detail__tag"><i style={{background: segmentColor(segment)}} aria-hidden="true"/>{segment.label}</span>
      <b><MeasureReadout measure={segment.current} unit={item.unit} formatValue={formatValue}/></b>
      <b><MeasureReadout measure={segment.movement} unit={item.unit} formatValue={formatValue}/></b>
    </li>)}</ul> : <p className="contribution-chart-detail__note">Tag split not supplied for this group.</p>}
  </aside>;
}

export default function ContributionChart({items, selectedId, onPreview, onSelect, formatValue = defaultFormat,
  maxPerGroup = 8, emptyMessage = 'No exposures match the current selection.'}: ContributionChartProps) {
  const uid = useId();
  const groups = useMemo(() => {
    const map = new Map<string, {category: string; unit: string; rows: ContributionDatum[]}>();
    for (const item of items) {
      const key = contributionChartGroupKey(item.category, item.unit);
      const group = map.get(key) ?? {category: item.category, unit: item.unit, rows: []};
      group.rows.push(item); map.set(key, group);
    }
    return [...map.entries()].map(([key, group]) => ({key, ...group}))
      .sort((a, b) => a.category.localeCompare(b.category) || a.unit.localeCompare(b.unit));
  }, [items]);
  const groupRefs = useMemo(() => groups.map(group => ({
    key:group.key, category:group.category, unit:group.unit, itemIds:group.rows.map(item => item.id),
  })), [groups]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [plotWidths, setPlotWidths] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerInsideRef = useRef(false);
  const lastResolvedGroupRef = useRef<string | null>(null);
  const wheelGateRef = useRef({direction:0, accumulated:0, lockUntil:0, lastAt:0});
  const activeId = hoverId ?? focusId;
  const effectiveGroupKey = resolveContributionChartGroup(groupRefs, activeGroupKey, selectedId);
  const activeGroup = groups.find(group => group.key === effectiveGroupKey) ?? null;
  const activeItem = items.find(item => item.id === activeId) ?? null;

  const clearPreview = () => {
    setHoverId(null); setFocusId(null); onPreview?.(null);
  };
  const navigateToGroup = (key: string) => {
    if (key === effectiveGroupKey) return;
    setActiveGroupKey(key);
    lastResolvedGroupRef.current = key;
    clearPreview();
  };

  useEffect(() => {
    if (!effectiveGroupKey) return;
    if (activeGroupKey !== effectiveGroupKey) setActiveGroupKey(effectiveGroupKey);
    const previous = lastResolvedGroupRef.current;
    if (previous && previous !== effectiveGroupKey) clearPreview();
    lastResolvedGroupRef.current = effectiveGroupKey;
  }, [effectiveGroupKey, activeGroupKey]);

  useEffect(() => {
    const container = containerRef.current;
    const element = container?.querySelector<HTMLElement>('.contribution-chart-card__scroll');
    if (!element || !activeGroup) return;
    const key = activeGroup.key;
    const update = () => setPlotWidths(current => {
      const width = element.clientWidth;
      return current[key] === width ? current : {...current, [key]:width};
    });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeGroup?.key]);

  const setHover = (item: ContributionDatum | null) => {
    setHoverId(item?.id ?? null);
    onPreview?.(item ?? (focusId ? items.find(candidate => candidate.id === focusId) ?? null : null));
  };
  const setFocus = (item: ContributionDatum | null) => {
    setFocusId(item?.id ?? null);
    onPreview?.(hoverId ? items.find(candidate => candidate.id === hoverId) ?? null : item);
  };

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !effectiveGroupKey || groupRefs.length < 2) return;
    const onWheel = (event: WheelEvent) => {
      if (!pointerInsideRef.current || event.ctrlKey || event.shiftKey || event.deltaX !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('button, select, input, textarea, option, summary, details, a, [contenteditable="true"], [role="button"]:not(.contribution-chart-hit), .contribution-chart-detail')) return;

      const deltaY = normalizeContributionWheelDelta(event.deltaY, event.deltaMode, root.clientHeight);
      if (!deltaY || childCanScrollVertically(target, root, deltaY)) return;
      const direction: -1 | 1 = deltaY > 0 ? 1 : -1;
      const activeIndex = groupRefs.findIndex(group => group.key === effectiveGroupKey);
      const nextIndex = adjacentContributionChartIndex(activeIndex, direction, groupRefs.length);
      if (nextIndex == null) {
        wheelGateRef.current = {direction, accumulated:0, lockUntil:0, lastAt:performance.now()};
        return;
      }

      const now = performance.now();
      const gate = wheelGateRef.current;
      if (now < gate.lockUntil && direction === gate.direction) {
        gate.lockUntil = now + WHEEL_GESTURE_GAP_MS;
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (now < gate.lockUntil && direction !== gate.direction && Math.abs(deltaY) < WHEEL_THRESHOLD_PX) return;
      if (now - gate.lastAt > WHEEL_GESTURE_GAP_MS || direction !== gate.direction) gate.accumulated = 0;
      gate.direction = direction;
      gate.accumulated += deltaY;
      gate.lastAt = now;
      if (Math.abs(gate.accumulated) < WHEEL_THRESHOLD_PX) return;

      gate.accumulated = 0;
      gate.lockUntil = now + WHEEL_GESTURE_GAP_MS;
      navigateToGroup(groupRefs[nextIndex].key);
      if (event.cancelable) event.preventDefault();
    };
    root.addEventListener('wheel', onWheel, {passive:false});
    return () => root.removeEventListener('wheel', onWheel);
  }, [effectiveGroupKey, groupRefs]);

  if (!activeGroup) return <div className="contribution-chart-empty" role="status">{emptyMessage}</div>;
  const group = activeGroup;
  const isExpanded = expanded.has(group.key);
  const duplicateCategory = new Set(groups.filter(group => groups.some(other => other.category === group.category && other.unit !== group.unit))
    .map(group => group.category));
  const visible = group.rows.slice(0, isExpanded ? group.rows.length : maxPerGroup);
  const partialCount = group.rows.filter(item => item.current.coverage === 'partial' || item.movement.coverage === 'partial').length;
  const unavailableCount = group.rows.filter(item => item.current.coverage === 'unavailable' || item.movement.coverage === 'unavailable').length;
  const allSegments = [...new Map(group.rows.flatMap(item => item.segments ?? []).map(segment => [segment.id, segment])).values()];
  const groupsWithoutTags = group.rows.filter(item => !item.segments?.length).length;
  const coverageMessages = [partialCount ? `${partialCount} partial` : '', unavailableCount ? `${unavailableCount} unavailable` : ''].filter(Boolean);
  const headingId = `${uid}-${encodeURIComponent(group.key)}`;
  return <div ref={containerRef} className="contribution-chart" aria-label="Exposure contribution charts"
    onPointerEnter={() => {pointerInsideRef.current = true;}} onPointerLeave={() => {pointerInsideRef.current = false;}}>
    <div className="contribution-chart-controls">
      <div className="contribution-chart-asset-control">
        <label className="contribution-chart-asset-label" htmlFor={`${uid}-asset`}>Chart asset class</label>
        <select id={`${uid}-asset`} aria-controls={headingId} className="contribution-chart-asset-select" value={group.key}
          onChange={event => navigateToGroup(event.currentTarget.value)}>
          {groups.map(group => <option key={group.key} value={group.key}>
            {group.category}{duplicateCategory.has(group.category) ? ` — ${group.unit}` : ''}
          </option>)}
        </select>
      </div>
      {groups.length > 1 && <span className="contribution-chart-wheel-hint">Scroll to change asset class</span>}
    </div>
    <section key={group.key} className="contribution-chart-card" aria-labelledby={headingId}>
      <header className="contribution-chart-card__heading">
        <div><p>Asset class</p><h3 id={headingId}>{group.category}</h3></div>
        <div className="contribution-chart-card__meta"><span>{group.unit}</span><span>{group.rows.length} {group.rows.length === 1 ? 'exposure' : 'exposures'}</span></div>
      </header>
      <div data-group-key={group.key} className="contribution-chart-card__scroll" role="region" tabIndex={0} aria-label={`${group.category} aligned current and movement plots`}>
        <Plot items={visible} kind="current" unit={group.unit} plotWidth={plotWidths[group.key] ?? 0} formatValue={formatValue}
          selectedId={selectedId} onSelect={onSelect} onPointerEnter={item => setHover(item)} onPointerLeave={() => setHover(null)}
          onFocus={item => setFocus(item)} onBlur={() => setFocus(null)} />
        <Plot items={visible} kind="movement" unit={group.unit} plotWidth={plotWidths[group.key] ?? 0} formatValue={formatValue}
          selectedId={selectedId} onSelect={onSelect} onPointerEnter={item => setHover(item)} onPointerLeave={() => setHover(null)}
          onFocus={item => setFocus(item)} onBlur={() => setFocus(null)} />
      </div>
      {plotWidths[group.key] > 0 && Math.max(316, visible.length * 62 + 62) > plotWidths[group.key] &&
        <p className="contribution-chart-scroll-hint">Scroll horizontally to see more exposures.</p>}
      {(coverageMessages.length > 0 || group.rows.length > maxPerGroup) && <div className="contribution-chart-card__footer">
        {coverageMessages.length > 0 && <span className="contribution-chart-coverage-warning">{coverageMessages.join(' · ')}</span>}
        {group.rows.length > visible.length && <button type="button" className="contribution-chart-more" onClick={() => setExpanded(previous => new Set(previous).add(group.key))}>
          Show {group.rows.length - visible.length} more
        </button>}
        {isExpanded && group.rows.length > maxPerGroup && <button type="button" className="contribution-chart-more" onClick={() => setExpanded(previous => {
          const next = new Set(previous); next.delete(group.key); return next;
        })}>Show fewer</button>}
      </div>}
      {activeItem && group.rows.some(item => item.id === activeItem.id) && <Detail item={activeItem} formatValue={formatValue}/>}
      {allSegments.length > 0 && <div className="contribution-chart-legend" aria-label="Tag segment legend">
        {allSegments.map(segment => <span key={segment.id}><i style={{background: segmentColor(segment)}} aria-hidden="true"/>{segment.label}</span>)}
        {groupsWithoutTags > 0 && <small>{groupsWithoutTags} {groupsWithoutTags === 1 ? 'group has' : 'groups have'} no supplied tag split</small>}
      </div>}
      {!allSegments.length && <p className="contribution-chart-no-tags">Tag split unavailable from supplied data.</p>}
    </section>
  </div>;
}
