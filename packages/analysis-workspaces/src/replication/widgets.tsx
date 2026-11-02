import {useId, useMemo, useState, type ReactNode} from 'react';
import {formatDataValue, type JsonValue} from '@sampo/contracts';
import {Icon} from '../Icon.tsx';
import {HistoryChart} from '../visuals.tsx';
import {lineSegments, tableCsv, tableRows, type TableSort} from '../presentation.ts';
import type {Table} from '../contracts.ts';
import type {Chart, FilterDefinition} from './contracts.ts';

const number = (v: number | null) => v === null ? '—' : v.toLocaleString(undefined, {maximumFractionDigits: 2});
export function Panel({title, unit, children}: {title: string; unit?: string; children: ReactNode}) {
  const [expanded, setExpanded] = useState(false), id = useId();
  return <section className={`rep-panel${expanded ? ' is-expanded' : ''}`} role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-labelledby={id} onKeyDown={e => {if (e.key === 'Escape') setExpanded(false);}}>
    <header><div><h2 id={id}>{title}</h2>{unit && <span>{unit}</span>}</div><button aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`} onClick={() => setExpanded(x => !x)}><Icon name={expanded ? 'close' : 'expand'} size={15} /></button></header>{children}</section>;
}
export function ChartWidget({chart, onFilter, onInspect}: {chart: Chart; onFilter: (filters: Record<string, string[]>) => void; onInspect: (title: string, row: Record<string, JsonValue>) => void}) {
  if (chart.kind === 'timeline') return <HistoryChart title={chart.title} series={chart.series} bars={chart.bars} />;
  if (chart.kind === 'bar') {
    const limit = chart.points.reduce((m, p) => Math.max(m, Math.abs(p.value ?? 0)), 1);
    return <Panel title={chart.title} unit={chart.unit}><div className="rep-bars">{chart.points.map(p => <button key={p.id} className="rep-bar-row" onClick={() => p.filters ? onFilter(p.filters) : onInspect(p.label, {value: p.value, unit: chart.unit})}><span title={p.label}>{p.label}</span><span className="rep-bar-track"><i style={{left: p.value !== null && p.value < 0 ? `${50 - Math.abs(p.value) / limit * 50}%` : '50%', width: `${Math.abs(p.value ?? 0) / limit * 50}%`, background: p.value !== null && p.value < 0 ? 'var(--analysis-negative)' : 'var(--analysis-accent)'}} /></span><strong>{number(p.value)}</strong></button>)}</div>{!chart.points.length && <Empty title="No matching observations" />}</Panel>;
  }
  if (chart.kind === 'heatmap') {
    const cells = new Map(chart.cells.map(c => [JSON.stringify([c.x, c.y]), c])), max = chart.cells.reduce((m, c) => Math.max(m, Math.abs(c.value ?? 0)), 1);
    return <Panel title={chart.title} unit={chart.unit}><div className="rep-matrix-scroll"><table className="rep-matrix"><thead><tr><th />{chart.x.map(x => <th key={x} title={x}>{chart.xLabels?.[x]??x}</th>)}</tr></thead><tbody>{chart.y.map(y => <tr key={y}><th title={y}>{chart.yLabels?.[y]??y}</th>{chart.x.map(x => {const value = cells.get(JSON.stringify([x, y]))?.value ?? null; return <td key={x}><button title={`${y} / ${x}: ${number(value)} ${chart.unit}`} style={{background: value === null ? 'transparent' : `color-mix(in srgb, ${value < 0 ? 'var(--analysis-negative)' : 'var(--analysis-secondary)'} ${Math.round(8 + Math.abs(value) / max * 60)}%, var(--analysis-panel))`}} onClick={() => onInspect(chart.title, {expiry: y, tenor: x, value, unit: chart.unit})}>{number(value)}</button></td>;})}</tr>)}</tbody></table></div><footer className="rep-matrix-legend"><span>Negative</span><i /><span>Positive · {chart.unit}</span></footer></Panel>;
  }
  const values = chart.points.flatMap(p => p.value === null ? [] : [p.value]), low = values.reduce((a, b) => Math.min(a, b), 0), high = values.reduce((a, b) => Math.max(a, b), 0), span = high - low || 1;
  const x = (i: number) => 65 + i * 720 / Math.max(chart.points.length - 1, 1), y = (v: number) => 235 - (v - low) / span * 190;
  const segments = lineSegments(chart.points.map((p, i) => ({date: String(i), value: p.value})), d => x(Number(d)), y);
  return <Panel title={chart.title} unit={chart.unit}><svg className="rep-curve" viewBox="0 0 830 285" aria-label={chart.title} role="img"><line x1="65" x2="785" y1={y(0)} y2={y(0)} className="analysis-zero" />
    {[low, high].map((v, i) => <text key={i} x="55" y={y(v)} textAnchor="end">{number(v)}</text>)}{segments.map((s, i) => <path key={i} d={s.path} fill="none" stroke="var(--analysis-accent)" strokeWidth="2" />)}
    {chart.points.map((p, i) => <g key={i}>{p.value !== null && <circle cx={x(i)} cy={y(p.value)} r="3" fill="var(--analysis-accent)"><title>{p.label}: {number(p.value)} {chart.unit}</title></circle>}<text x={x(i)} y="266" textAnchor="middle">{p.label}</text></g>)}</svg></Panel>;
}

export function ResultGrid({table, columns, onColumns, onInspect}: {table: Table; columns?: string[]; onColumns: (columns: string[]) => void; onInspect: (title: string, row: Record<string, JsonValue>) => void}) {
  const [query, setQuery] = useState(''), [sort, setSort] = useState<TableSort>(null), [requestedPage, setPage] = useState(0);
  const selected = table.columns.filter(c => !columns || columns.includes(c.key)), display = selected.length ? selected : table.columns;
  const rows = useMemo(() => tableRows(table, query, sort), [table, query, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / 100)), page = Math.min(requestedPage, pages - 1);
  function download() {const url = URL.createObjectURL(new Blob([tableCsv({...table, columns: display}, rows)], {type: 'text/csv;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = table.id.replace(/[^a-z\d_-]/gi, '-') + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);}
  return <section className="rep-grid"><header><div><h2>{table.title}</h2><span>{rows.length.toLocaleString()} rows</span></div><div className="rep-grid-tools"><label className="analysis-search"><Icon name="search" size={14} /><input type="search" aria-label={`Search ${table.title}`} placeholder="Search rows…" value={query} onChange={e => {setQuery(e.target.value); setPage(0);}} /></label>
    <details className="rep-column-picker"><summary>Columns</summary><div>{table.columns.map(c => <label key={c.key}><input type="checkbox" checked={display.some(d => d.key === c.key)} disabled={display.length === 1 && display[0].key === c.key} onChange={e => onColumns(e.target.checked ? [...display.map(d => d.key), c.key] : display.filter(d => d.key !== c.key).map(d => d.key))} />{c.label}</label>)}</div></details><button onClick={download}><Icon name="download" size={14} />CSV</button></div></header>
    <div className="rep-grid-scroll"><table><thead><tr><th className="rep-inspect-column"><span className="analysis-sr-only">Inspect row</span></th>{display.map(c => <th key={c.key} aria-sort={sort?.key === c.key ? sort.descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => {setSort({key: c.key, descending: sort?.key === c.key && !sort.descending}); setPage(0);}}>{c.label}{c.unit && <small>{c.unit}</small>}<span>{sort?.key === c.key ? sort.descending ? '↓' : '↑' : '↕'}</span></button></th>)}</tr></thead><tbody>{rows.slice(page * 100, (page + 1) * 100).map((row, i) => <tr key={i}><td><button className="rep-inspect-row" aria-label={`Inspect row ${page * 100 + i + 1}`} onClick={() => onInspect(table.title, row)}><Icon name="chevron" size={13} /></button></td>{display.map(c => <td key={c.key} title={formatDataValue(row[c.key] ?? null)} data-numeric={typeof row[c.key] === 'number' || undefined}>{typeof row[c.key] === 'number' ? (row[c.key] as number).toLocaleString(undefined, {maximumFractionDigits: 6}) : formatDataValue(row[c.key] ?? null)}</td>)}</tr>)}</tbody></table></div>
    {!rows.length && <Empty title={query ? 'No rows match your search' : 'No rows for this selection'} />}
    <footer><span>{rows.length ? `${page * 100 + 1}–${Math.min((page + 1) * 100, rows.length)} of ${rows.length.toLocaleString()}` : '0 rows'}</span><div><button disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>{page + 1} / {pages}</span><button disabled={page === pages - 1} onClick={() => setPage(page + 1)}>Next</button></div></footer>
  </section>;
}
export function HierarchyPicker({filter, selected, onChange}: {filter: FilterDefinition; selected: string[]; onChange: (values: string[]) => void}) {
  const [query, setQuery] = useState(''), [shown, setShown] = useState(100);
  const options = filter.options.filter(o => o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <details className="rep-hierarchy"><summary>{filter.label}<span>{selected.length ? `${selected.length} selected` : 'All'}</span></summary><div><label className="analysis-search"><Icon name="search" size={14} /><input aria-label={`Search ${filter.label}`} type="search" placeholder="Search…" value={query} onChange={e => {setQuery(e.target.value); setShown(100);}} /></label><button onClick={() => onChange([])} disabled={!selected.length}>Clear selection</button>
    <div className="rep-hierarchy-options">{options.slice(0, shown).map(o => <label key={o.id}><input type="checkbox" checked={selected.includes(o.id)} onChange={e => onChange(e.target.checked ? [...selected, o.id] : selected.filter(id => id !== o.id))} /><span title={o.label}>{o.label}</span></label>)}</div>{shown < options.length && <button onClick={() => setShown(n => n + 100)}>Show more</button>}<small>{options.length.toLocaleString()} matching options</small></div></details>;
}
export function Empty({title, detail, children}: {title: string; detail?: string; children?: ReactNode}) {return <div className="rep-empty"><Icon name="layers" size={28} /><h2>{title}</h2>{detail && <p>{detail}</p>}{children}</div>;}
