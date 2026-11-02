import {useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent} from 'react';
import {formatNumericMeasure} from '../../ui/format';
import {seriesColorForId} from '../../ui/tokens/series';
import {formatAxisLabels} from './axisLabels';
import './TimeSeriesChart.css';

export interface TimeSeriesSeries {
  id: string;
  label: string;
  unit: string;
  color?: string;
}

export interface TimeSeriesPoint {
  date: string;
  values: Readonly<Record<string, number | null | undefined>>;
}

export interface TimeSeriesRange {
  start: string;
  end: string;
}

export interface TimeSeriesChartProps {
  series: readonly TimeSeriesSeries[];
  points: readonly TimeSeriesPoint[];
  ariaLabel: string;
  className?: string;
  emptyMessage?: string;
  height?: number;
  includeZero?: boolean;
  showLegend?: boolean;
  selectedSeriesIds?: readonly string[];
  onSelectedSeriesChange?: (seriesIds: string[]) => void;
  activeDate?: string | null;
  onActiveDateChange?: (date: string | null) => void;
  selectedRange?: TimeSeriesRange | null;
  onSelectedRangeChange?: (range: TimeSeriesRange | null) => void;
  formatDate?: (date: string) => string;
  formatValue?: (value: number, series: TimeSeriesSeries) => string;
}

const FALLBACK_WIDTH = 720;
const LEFT = 66;
const RIGHT_INSET = 22;
const TOP = 18;
const BOTTOM = 246;

type ValidPoint = {point: TimeSeriesPoint; index: number; values: Array<{series: TimeSeriesSeries; value: number}>};

function defaultDateLabel(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(parsed);
}

function defaultValueLabel(value: number, series: TimeSeriesSeries) {
  return formatNumericMeasure(value, series.unit).accessibleText;
}

function accessibleValueLabel(value: number, series: TimeSeriesSeries, formatter: (value: number, series: TimeSeriesSeries) => string) {
  const raw = `${value.toString()}${series.unit ? ` ${series.unit}` : ''}`;
  return `${formatter(value, series)}; raw value ${raw}`;
}

function isFiniteValue(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function pathFor(points: readonly TimeSeriesPoint[], seriesId: string, xAt: (index: number) => number, yAt: (value: number) => number) {
  const paths: string[] = [];
  let current = '';
  points.forEach((point, index) => {
    const value = point.values[seriesId];
    if (!isFiniteValue(value)) {
      if (current) paths.push(current);
      current = '';
      return;
    }
    current += `${current ? ' L' : 'M'} ${xAt(index).toFixed(2)} ${yAt(value).toFixed(2)}`;
  });
  if (current) paths.push(current);
  return paths;
}

function TimeSeriesChart({
  series,
  points,
  ariaLabel,
  className = '',
  emptyMessage = 'No series values are available for this range.',
  height = 300,
  includeZero = true,
  showLegend = true,
  selectedSeriesIds,
  onSelectedSeriesChange,
  activeDate,
  onActiveDateChange,
  selectedRange,
  onSelectedRangeChange,
  formatDate = defaultDateLabel,
  formatValue = defaultValueLabel,
}: TimeSeriesChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const plotWrapRef = useRef<HTMLDivElement>(null);
  const [observedWidth, setObservedWidth] = useState<number | null>(null);
  const [localSeriesIds, setLocalSeriesIds] = useState<string[] | null>(null);
  const [localActiveDate, setLocalActiveDate] = useState<string | null>(null);
  const [localSelectedRange, setLocalSelectedRange] = useState<TimeSeriesRange | null>(null);
  const [brushStartIndex, setBrushStartIndex] = useState<number | null>(null);
  const [brushEndIndex, setBrushEndIndex] = useState<number | null>(null);
  const keyboardRangeAnchor = useRef<string | null>(null);

  useEffect(() => {
    const element = plotWrapRef.current;
    if (!element) return;
    const initialWidth = element.getBoundingClientRect().width;
    if (initialWidth > 0) setObservedWidth(initialWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth && nextWidth > 0) setObservedWidth(current => current != null && Math.abs(current - nextWidth) < .5 ? current : nextWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const chosenIds = selectedSeriesIds ?? localSeriesIds ?? series.map(item => item.id);
  const chosenIdSet = new Set(chosenIds);
  const visibleSeries = series.filter(item => chosenIdSet.has(item.id));
  const visibleUnits = [...new Set(visibleSeries.map(item => item.unit))];
  const unitMismatch = visibleUnits.length > 1;
  const currentActiveDate = activeDate === undefined ? localActiveDate : activeDate;
  const currentRange = selectedRange === undefined ? localSelectedRange : selectedRange;
  const canBrush = selectedRange !== undefined || onSelectedRangeChange != null;
  const dateLabel = formatDate;
  const valueLabel = formatValue;

  const validPoints = useMemo<ValidPoint[]>(() => points.map((point, index) => ({
    point,
    index,
    values: visibleSeries.flatMap(item => {
      const value = point.values[item.id];
      return isFiniteValue(value) ? [{series: item, value}] : [];
    }),
  })).filter(item => item.values.length > 0), [points, visibleSeries]);

  const values = validPoints.flatMap(item => item.values.map(entry => entry.value));
  const dataLow = values.length ? values.reduce((current, value) => Math.min(current, value), Number.POSITIVE_INFINITY) : 0;
  const dataHigh = values.length ? values.reduce((current, value) => Math.max(current, value), Number.NEGATIVE_INFINITY) : 0;
  let low = includeZero ? Math.min(0, dataLow) : dataLow;
  let high = includeZero ? Math.max(0, dataHigh) : dataHigh;
  if (high === low) {
    const pad = high === 0 ? 0.5 : Math.max(Math.abs(high) * 0.12, Number.MIN_VALUE);
    low -= pad;
    high += pad;
  } else {
    const pad = (high - low) * 0.07;
    low -= pad;
    high += pad;
  }

  const plotWidth = observedWidth ?? FALLBACK_WIDTH;
  const right = Math.max(LEFT + 90, plotWidth - RIGHT_INSET);
  const xAt = (index: number) => points.length <= 1 ? (LEFT + right) / 2 : LEFT + index * (right - LEFT) / (points.length - 1);
  const tickValues = [high, (high + low) / 2, low];
  const tickLabels = formatAxisLabels(tickValues);
  const dateTicks = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])].filter(index => index >= 0);
  const zeroVisible = low <= 0 && high >= 0;
  const activeIndex = currentActiveDate == null ? -1 : points.findIndex(point => point.date === currentActiveDate);
  const brushStartDate = brushStartIndex == null ? undefined : points[Math.min(brushStartIndex, brushEndIndex ?? brushStartIndex)]?.date;
  const brushEndDate = brushEndIndex == null ? undefined : points[Math.max(brushStartIndex ?? brushEndIndex, brushEndIndex)]?.date;
  const brushRange: TimeSeriesRange | null = brushStartDate && brushEndDate ? {start: brushStartDate, end: brushEndDate} : null;
  const visibleRange = brushRange ?? currentRange;
  const rangeStartIndex = visibleRange ? points.findIndex(point => point.date === visibleRange.start) : -1;
  const rangeEndIndex = visibleRange ? points.findIndex(point => point.date === visibleRange.end) : -1;
  const rangeLeftIndex = rangeStartIndex < 0 || rangeEndIndex < 0 ? -1 : Math.min(rangeStartIndex, rangeEndIndex);
  const rangeRightIndex = rangeStartIndex < 0 || rangeEndIndex < 0 ? -1 : Math.max(rangeStartIndex, rangeEndIndex);
  const chartHeight = Math.max(height, 190);
  const scale = chartHeight / 300;
  const bottom = BOTTOM * scale;
  const top = TOP * scale;
  const yAtScaled = (value: number) => bottom - (value - low) * (bottom - top) / (high - low);
  const xForPointer = (event: PointerEvent<SVGRectElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || points.length === 0 || rect.width === 0) return -1;
    const chartX = ((event.clientX - rect.left) / rect.width) * plotWidth;
    const ratio = (chartX - LEFT) / (right - LEFT);
    return Math.max(0, Math.min(points.length - 1, Math.round(ratio * Math.max(0, points.length - 1))));
  };
  const setCurrentDate = (date: string | null) => {
    if (activeDate === undefined) setLocalActiveDate(date);
    onActiveDateChange?.(date);
  };
  const setCurrentRange = (range: TimeSeriesRange | null) => {
    if (selectedRange === undefined) setLocalSelectedRange(range);
    onSelectedRangeChange?.(range);
  };

  const handleVisibility = (id: string) => {
    const next = chosenIdSet.has(id) ? chosenIds.filter(item => item !== id) : [...chosenIds, id];
    if (selectedSeriesIds === undefined) setLocalSeriesIds(next);
    onSelectedSeriesChange?.(next);
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, fromIndex: number) => {
    if (event.key === 'Escape' && canBrush) {
      if (currentRange || brushStartIndex != null || keyboardRangeAnchor.current) {
        event.preventDefault();
        keyboardRangeAnchor.current = null;
        setBrushStartIndex(null);
        setBrushEndIndex(null);
        setCurrentRange(null);
      }
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = validPoints.findIndex(item => item.index === fromIndex);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? validPoints.length - 1
      : Math.max(0, Math.min(validPoints.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)));
    const currentPoint = validPoints[current]?.point;
    const nextPoint = validPoints[next]?.point;
    if (canBrush && event.shiftKey && currentPoint && nextPoint && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const anchor = keyboardRangeAnchor.current ?? currentPoint.date;
      keyboardRangeAnchor.current = anchor;
      const anchorIndex = points.findIndex(point => point.date === anchor);
      const nextIndex = validPoints[next]?.index ?? anchorIndex;
      const startIndex = Math.min(anchorIndex, nextIndex);
      const endIndex = Math.max(anchorIndex, nextIndex);
      setCurrentRange({start: points[startIndex].date, end: points[endIndex].date});
    } else {
      keyboardRangeAnchor.current = null;
    }
    const pointIndex = validPoints[next]?.index;
    if (pointIndex != null) svgRef.current?.parentElement?.querySelector<HTMLButtonElement>(`button[data-point-index="${pointIndex}"]`)?.focus();
  };

  const handlePointerDown = (event: PointerEvent<SVGRectElement>) => {
    if (!canBrush || points.length < 2) return;
    const index = xForPointer(event);
    if (index < 0) return;
    event.preventDefault();
    keyboardRangeAnchor.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    setBrushStartIndex(index);
    setBrushEndIndex(index);
    setCurrentDate(points[index]?.date ?? null);
  };

  const handlePointerMove = (event: PointerEvent<SVGRectElement>) => {
    const index = xForPointer(event);
    if (index < 0) return;
    setCurrentDate(points[index]?.date ?? null);
    if (brushStartIndex != null) setBrushEndIndex(index);
  };

  const handlePointerUp = (event: PointerEvent<SVGRectElement>) => {
    if (brushStartIndex == null) return;
    const endIndex = xForPointer(event);
    const startIndex = brushStartIndex;
    if (endIndex >= 0 && endIndex !== startIndex) {
      const firstIndex = Math.min(startIndex, endIndex);
      const lastIndex = Math.max(startIndex, endIndex);
      setCurrentRange({start: points[firstIndex].date, end: points[lastIndex].date});
    } else if (endIndex >= 0) {
      setCurrentDate(points[endIndex]?.date ?? null);
    }
    setBrushStartIndex(null);
    setBrushEndIndex(null);
  };

  if (points.length === 0 || series.length === 0) {
    return <div className={`time-series-chart ${className}`.trim()} aria-label={ariaLabel}>
      <div className="time-series-chart__empty" role="status">{emptyMessage}</div>
    </div>;
  }

  const yTicks = tickValues.map((value, index) => ({value, y: TOP + index * (BOTTOM - TOP) / 2}));
  const tooltipPoint = activeIndex >= 0 ? points[activeIndex] : null;
  const tooltipValues = tooltipPoint ? visibleSeries.flatMap(item => {
    const value = tooltipPoint.values[item.id];
    return isFiniteValue(value) ? [{series: item, value}] : [];
  }) : [];
  const tooltipHeight = 25 + tooltipValues.length * 17;
  const firstTooltipValue = tooltipValues[0]?.value;
  const tooltipValueY = firstTooltipValue == null ? (top + bottom) / 2 : yAtScaled(firstTooltipValue);
  const tooltipY = tooltipValueY < top + tooltipHeight + 8
    ? Math.min(bottom - tooltipHeight + 9, tooltipValueY + 12)
    : Math.max(top - 5, tooltipValueY - tooltipHeight - 9);
  const tooltipX = activeIndex < 0 ? LEFT : xAt(activeIndex) > plotWidth / 2
    ? Math.max(6, xAt(activeIndex) - 215)
    : Math.min(Math.max(6, plotWidth - 212), xAt(activeIndex) + 9);
  const instruction = canBrush
    ? 'Focus a date and use arrow keys to move. Hold Shift with an arrow key to select dates, or drag across the chart. Press Escape to clear the selection.'
    : 'Focus a date and use the arrow keys to move between observations.';

  return <section className={`time-series-chart ${className}`.trim()} aria-label={ariaLabel}>
    {showLegend && <div className="time-series-chart__legend" role="group" aria-label="Visible chart series">
      {series.map(item => <button key={item.id} type="button" aria-pressed={chosenIdSet.has(item.id)}
        onClick={() => handleVisibility(item.id)}>
        <span className="time-series-chart__swatch" style={{'--series-color': item.color ?? seriesColorForId(item.id)} as CSSProperties} aria-hidden="true" />
        {item.label}
      </button>)}
    </div>}

    {unitMismatch
      ? <div className="time-series-chart__empty" role="status">
        Visible series use different units, so they cannot share one Y axis.{showLegend ? ' Hide series until the visible units match.' : ''}
      </div>
      : visibleSeries.length === 0 || validPoints.length === 0
      ? <div className="time-series-chart__empty" role="status">{visibleSeries.length === 0 ? 'Select a series to display its observations.' : emptyMessage}</div>
      : <>
        <div ref={plotWrapRef} className="time-series-chart__plot-wrap">
          <svg ref={svgRef} className="time-series-chart__plot" style={{height: chartHeight}}
            viewBox={`0 0 ${plotWidth} ${chartHeight}`} role="img" aria-label={ariaLabel}>
            <title>{ariaLabel}</title>
            <desc>Time series observations. Missing values are displayed as gaps between line segments.</desc>
            {yTicks.map(({value, y}, index) => {
              const scaledY = y * scale;
              return <g key={`y-${index}`} className="time-series-chart__y-tick">
                <line x1={LEFT} x2={right} y1={scaledY} y2={scaledY} />
                <text x={LEFT - 10} y={scaledY + 4} textAnchor="end">{tickLabels[index]}</text>
              </g>;
            })}
            {visibleSeries[0]?.unit && <text className="time-series-chart__axis-unit" x="17" y={(top + bottom) / 2}
              textAnchor="middle" transform={`rotate(-90 17 ${(top + bottom) / 2})`}>{visibleSeries[0].unit}</text>}
            {zeroVisible && <line className="time-series-chart__zero" x1={LEFT} x2={right} y1={yAtScaled(0)} y2={yAtScaled(0)} />}
            {rangeLeftIndex >= 0 && rangeRightIndex >= 0 && <rect className="time-series-chart__selected-range"
              x={xAt(rangeLeftIndex)} y={top} width={Math.max(2, xAt(rangeRightIndex) - xAt(rangeLeftIndex))} height={bottom - top} />}
            {activeIndex >= 0 && <line className="time-series-chart__cursor" x1={xAt(activeIndex)} x2={xAt(activeIndex)} y1={top} y2={bottom} />}
            <rect className="time-series-chart__interaction-surface" data-testid="time-series-brush-surface"
              x={LEFT} y={top} width={right - LEFT} height={bottom - top} onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
              onPointerCancel={event => { if (brushStartIndex != null) { setBrushStartIndex(null); setBrushEndIndex(null); } }}
              onPointerLeave={() => { if (brushStartIndex == null) setCurrentDate(null); }} />
            {visibleSeries.map(item => pathFor(points, item.id, xAt, value => yAtScaled(value)).map((path, index) => <path key={`${item.id}-${index}`}
              className="time-series-chart__line" style={{'--series-color': item.color ?? seriesColorForId(item.id)} as CSSProperties} d={path} />))}
            {visibleSeries.map(item => points.map((point, index) => {
              const value = point.values[item.id];
              if (!isFiniteValue(value)) return null;
              const isActive = point.date === currentActiveDate;
              return <circle key={`${item.id}-${point.date}`} className={`time-series-chart__point${isActive ? ' is-active' : ''}`}
                style={{'--series-color': item.color ?? seriesColorForId(item.id)} as CSSProperties}
                cx={xAt(index)} cy={yAtScaled(value)} r={isActive ? 4.6 : 3.2} aria-hidden="true" />;
            }))}
            {dateTicks.map(index => <g key={`x-${index}`} className="time-series-chart__x-tick">
              <line x1={xAt(index)} x2={xAt(index)} y1={bottom} y2={bottom + 5} />
              <text x={xAt(index)} y={bottom + 21} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>
                {dateLabel(points[index].date)}
              </text>
            </g>)}
            {tooltipPoint && tooltipValues.length > 0 && <g className="time-series-chart__tooltip" role="tooltip" aria-live="polite"
              aria-label={`${dateLabel(tooltipPoint.date)}: ${tooltipValues.map(({series: item, value}) => accessibleValueLabel(value, item, valueLabel)).join('; ')}`}
              pointerEvents="none" transform={`translate(${tooltipX}, ${tooltipY})`}>
              <rect width="206" height={tooltipHeight} rx="6" />
              <text className="time-series-chart__tooltip-date" x="10" y="16">{dateLabel(tooltipPoint.date)}</text>
              {tooltipValues.map(({series: item, value}, index) => <text key={item.id} x="10" y={32 + index * 17}>
                <tspan className="time-series-chart__tooltip-series" fill={item.color ?? seriesColorForId(item.id)}>{item.label}</tspan>
                <tspan dx="5">{valueLabel(value, item)}</tspan>
              </text>)}
            </g>}
          </svg>
          <div className="time-series-chart__point-controls" role="group" aria-label="Chart observations">
            {validPoints.map(({point, index, values: pointValues}, focusIndex) => <button key={point.date} type="button"
              data-point-index={index} tabIndex={focusIndex === 0 ? 0 : -1}
              aria-keyshortcuts={canBrush ? 'ArrowLeft ArrowRight Home End Shift+ArrowLeft Shift+ArrowRight Escape' : 'ArrowLeft ArrowRight Home End'}
              aria-label={`${point.date}: ${pointValues.map(({series: item, value}) => `${item.label} ${accessibleValueLabel(value, item, valueLabel)}`).join('; ')}`}
              onFocus={() => setCurrentDate(point.date)} onBlur={() => { if (activeDate === undefined) setLocalActiveDate(null); onActiveDateChange?.(null); }}
              onKeyDown={event => moveFocus(event, index)}>
              {point.date}
            </button>)}
          </div>
        </div>
        <p className="time-series-chart__instruction">{instruction}</p>
        {currentRange && <button className="time-series-chart__clear-range" type="button" onClick={() => {
          keyboardRangeAnchor.current = null;
          setCurrentRange(null);
        }}>
          Clear selected dates
        </button>}
      </>}
  </section>;
}

export default TimeSeriesChart;
