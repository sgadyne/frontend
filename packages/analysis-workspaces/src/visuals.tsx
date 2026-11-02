import {useId, useMemo, useState} from 'react';
import {formatDataValue, type JsonValue} from '@sampo/contracts';
import type {Metric, Series, Table} from './contracts.ts';
import {lineSegments, tableCsv, tableRows, type TableSort} from './presentation.ts';
import {Icon} from './Icon.tsx';

const palette = ['var(--analysis-accent)', 'var(--analysis-secondary)', 'var(--analysis-tertiary)', '#c28035', '#b96d91'];
export function MetricStrip({items}: {items: Metric[]}) {
  return <div className="analysis-metrics">{items.map(item => <article key={item.id} data-metric={item.id}><span>{item.label}</span>
    <div><strong data-tone={item.id === 'pnl' && item.value !== null ? item.value < 0 ? 'negative' : item.value > 0 ? 'positive' : undefined : undefined}>{item.value === null ? '—' : item.value.toLocaleString(undefined, {maximumFractionDigits: 2})}</strong><small>{item.unit}</small></div></article>)}</div>;
}

export function HistoryChart({series, title, description, bars = false}: {series: Series[]; title: string; description?: string; bars?: boolean}) {
  const gradient = useId().replaceAll(':', '');
  const [hover, setHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [brush, setBrush] = useState(0);
  const source = useMemo(() => series.filter(s => !hidden.includes(s.id)).map(s => ({...s, points: brush ? s.points.slice(-brush) : s.points})), [series, hidden, brush]);
  const labels: Record<string, string> = {cumulative: 'Selected portfolio', baseline: 'Original baseline', parent: 'Full portfolio'};
  const values = source.flatMap(s => s.points.flatMap(p => p.value === null ? [] : [p.value]));
  const dates = [...new Set(source.flatMap(s => s.points.map(p => p.date)))].sort();
  const low = values.reduce((a, b) => Math.min(a, b), 0), high = values.reduce((a, b) => Math.max(a, b), 0);
  const span = high - low || Math.max(Math.abs(high), 1);
  const top = high + span * .07, bottom = low - span * .07;
  const x = (i: number) => 78 + i * 766 / Math.max(dates.length - 1, 1);
  const positions = new Map(dates.map((day, i) => [day, x(i)]));
  const y = (v: number) => 264 - (v - bottom) * 236 / (top - bottom);
  const compact = (v: number) => Intl.NumberFormat(undefined, {notation: 'compact', maximumFractionDigits: 1}).format(v);
  const focused = hover !== null ? dates[Math.min(hover, dates.length - 1)] : null;
  const paths = useMemo(() => source.map(s => lineSegments(s.points, date => positions.get(date)!, y)), [source, top, bottom]);
  return <section className="analysis-card analysis-chart"><div className="analysis-card-title"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>
    <div className="analysis-chart-tools"><small>{series[0]?.unit}</small><select aria-label={`${title} display range`} value={brush} onChange={e => {setBrush(Number(e.target.value)); setHover(null);}}><option value={0}>Full selection</option><option value={63}>Last 63 observations</option><option value={252}>Last 252 observations</option></select></div></div>
    {!values.length || !dates.length ? <div className="analysis-empty-chart">No observations to display{!source.length ? ' — select a series below.' : '.'}</div> : <div className="analysis-chart-plot">
      <svg className="analysis-history" viewBox="0 0 880 306" role="img" aria-label={title} tabIndex={0}
        onMouseMove={event => {const bounds = event.currentTarget.getBoundingClientRect(); const px = (event.clientX - bounds.left) / bounds.width * 880; setHover(Math.max(0, Math.min(dates.length - 1, Math.round((px - 78) / 766 * (dates.length - 1)))));}}
        onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)} onKeyDown={event => {if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {event.preventDefault(); setHover(n => Math.max(0, Math.min(dates.length - 1, (n ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))));}}}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette[0]} stopOpacity=".14" /><stop offset="100%" stopColor={palette[0]} stopOpacity=".01" /></linearGradient></defs>
        {Array.from({length: 5}, (_, i) => {const v = bottom + (top - bottom) * i / 4; return <g key={i}><line x1="78" x2="844" y1={y(v)} y2={y(v)} className="analysis-axis" /><text x="63" y={y(v) + 4} textAnchor="end">{compact(v)}</text></g>;})}
        <line x1="78" x2="844" y1={y(0)} y2={y(0)} className="analysis-zero" />
        {source.map(s => {const i = series.findIndex(item => item.id === s.id), color = palette[i % palette.length];
          return bars && source.length === 1 ? s.points.filter(p => p.value !== null).map(p => <rect key={p.date} x={positions.get(p.date)! - Math.max(.7, Math.min(8, 580 / dates.length)) / 2} y={Math.min(y(0), y(p.value!))} width={Math.max(.7, Math.min(8, 580 / dates.length))} height={Math.max(.7, Math.abs(y(p.value!) - y(0)))} fill={p.value! < 0 ? 'var(--analysis-negative)' : color} opacity=".8" />)
            : paths[source.indexOf(s)].map((segment, j) => <g key={`${s.id}-${j}`}>{source.length === 1 && <path d={`${segment.path} L${segment.end} ${y(0)} L${segment.start} ${y(0)} Z`} fill={`url(#${gradient})`} />}
              <path d={segment.path} stroke={color} fill="none" strokeWidth={i === 0 ? 2.4 : 1.7} strokeDasharray={s.id === 'baseline' ? '5 4' : undefined} opacity={s.id === 'parent' ? .7 : 1} vectorEffect="non-scaling-stroke" /></g>);
        })}
        {[0, Math.floor((dates.length - 1) / 2), dates.length - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => <text key={i} x={x(i)} y="292" textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'}>{dates[i]}</text>)}
        {focused && <line x1={x(Math.min(hover!, dates.length - 1))} x2={x(Math.min(hover!, dates.length - 1))} y1="28" y2="264" className="analysis-crosshair" />}
      </svg>
      {focused && <div className="analysis-chart-tooltip" role="status"><strong>{focused}</strong>{source.map(s => {const p = s.points.find(p => p.date === focused); return <span key={s.id}>{labels[s.id] ?? s.label}<b>{p?.value === null || p?.value === undefined ? '—' : p.value.toLocaleString(undefined, {maximumFractionDigits: 2})}</b></span>;})}</div>}
    </div>}
    <div className="analysis-legend">{series.map((s, i) => <button key={s.id} aria-pressed={!hidden.includes(s.id)} onClick={() => setHidden(h => h.includes(s.id) ? h.filter(id => id !== s.id) : [...h, s.id])}><i style={{background: palette[i % palette.length]}} />{labels[s.id] ?? s.label}</button>)}</div></section>;
}

export function DataTable({table}: {table: Table}) {
  const [requestedPage, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<TableSort>(null);
  const filtered = useMemo(() => tableRows(table, query, sort), [table, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / 100)), page = Math.min(requestedPage, pages - 1);
  const rows = filtered.slice(page * 100, (page + 1) * 100);
  const cell = (value: JsonValue | undefined) => value === undefined ? '—' : formatDataValue(value);
  function download() {const url = URL.createObjectURL(new Blob([tableCsv(table, filtered)], {type: 'text/csv;charset=utf-8'})); const link = document.createElement('a'); link.href = url; link.download = table.id.replace(/[^a-z\d_-]/gi, '-') + '.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);}
  return <section className="analysis-card analysis-data-table"><div className="analysis-card-title"><div><h2>{table.title}</h2><p>{filtered.length.toLocaleString()} of {table.rows.length.toLocaleString()} rows</p></div>
    <div className="analysis-table-tools"><label className="analysis-search"><Icon name="search" size={14} /><input aria-label={`Search ${table.title}`} type="search" placeholder="Search table…" value={query} onChange={e => {setQuery(e.target.value); setPage(0);}} /></label><button title="Download filtered rows" aria-label={`Download ${table.title} CSV`} onClick={download}><Icon name="download" size={16} /><span>CSV</span></button></div></div>
    <div className="analysis-table-scroll"><table><thead><tr>{table.columns.map(c => <th key={c.key} aria-sort={sort?.key === c.key ? sort.descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => {setSort({key: c.key, descending: sort?.key === c.key && !sort.descending}); setPage(0);}}>{c.label}{c.unit && <small> {c.unit}</small>}<span className="analysis-sort" aria-hidden="true">{sort?.key === c.key ? sort.descending ? '↓' : '↑' : '↕'}</span></button></th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{table.columns.map(c => <td key={c.key} data-numeric={typeof row[c.key] === 'number' || undefined}>{cell(row[c.key])}</td>)}</tr>)}</tbody></table>
    {!rows.length && <div className="analysis-empty-chart">{query ? 'No rows match your search.' : 'No rows for this selection.'}</div>}</div>
    <div className="analysis-pagination"><span>{filtered.length ? `${page * 100 + 1}–${Math.min((page + 1) * 100, filtered.length)} of ${filtered.length.toLocaleString()}` : '0 rows'}</span><div><button disabled={!page} onClick={() => setPage(page - 1)}>Previous</button>
      <span>{page + 1} / {pages}</span><button disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button></div></div></section>;
}
