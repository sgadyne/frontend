import {formatDataValue, type JsonValue} from '@sampo/contracts';
import type {Series, Table} from './contracts.ts';

export const views = [
  {id: 'history', label: 'Performance', description: 'Historical PnL and drawdown', icon: 'chart'},
  {id: 'risk', label: 'Risk & attribution', description: 'Contributions and portfolio risk', icon: 'layers'},
  {id: 'positions', label: 'Positions', description: 'Holdings and exposure', icon: 'grid'},
  {id: 'factors', label: 'Factors & PCA', description: 'Factor sensitivities and components', icon: 'branches'},
  {id: 'events', label: 'Events & tails', description: 'Event windows and tail scenarios', icon: 'pulse'},
  {id: 'what-if', label: 'Portfolio construction', description: 'Preview changes against the baseline', icon: 'sliders'},
  {id: 'tables', label: 'Data tables', description: 'Explore the published tables', icon: 'table'},
  {id: 'jobs', label: 'Maintenance', description: 'Recorded job status', icon: 'clock'},
] as const;

export function historyGroups(series: Series[]) {
  const main = series.filter(s => ['cumulative', 'baseline', 'parent'].includes(s.id));
  return {main, daily: series.filter(s => s.id === 'daily'), drawdown: series.filter(s => s.id === 'drawdown'),
    rolling: series.filter(s => s.id === 'rolling-rms'), nodes: series.filter(s => s.id.startsWith('node:')),
    other: series.filter(s => !['cumulative', 'baseline', 'parent', 'daily', 'drawdown', 'rolling-rms'].includes(s.id) && !s.id.startsWith('node:'))};
}

export function lineSegments(points: Series['points'], x: (date: string) => number, y: (value: number) => number) {
  const result: {path: string; start: number; end: number}[] = [];
  let path = '', start = 0, end = 0;
  const close = () => {if (path) result.push({path, start, end}); path = '';};
  for (const point of points) {
    if (point.value === null) {close(); continue;}
    const px = x(point.date);
    if (!path) start = px;
    end = px;
    path += `${path ? ' L' : 'M'}${px} ${y(point.value)}`;
  }
  close();
  return result;
}

export type TableSort = {key: string; descending: boolean} | null;
export function tableRows(table: Table, query: string, sort: TableSort) {
  const needle = query.trim().toLocaleLowerCase();
  const rows = table.rows.filter(row => !needle || table.columns.some(c => formatDataValue(row[c.key] ?? null).toLocaleLowerCase().includes(needle)));
  if (!sort) return rows;
  return rows.sort((a, b) => {
    const x = a[sort.key], y = b[sort.key];
    if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
    if (y === null || y === undefined) return -1;
    const order = typeof x === 'number' && typeof y === 'number' ? x - y : formatDataValue(x).localeCompare(formatDataValue(y), undefined, {numeric: true});
    return sort.descending ? -order : order;
  });
}

export function tableCsv(table: Table, rows = table.rows) {
  const cell = (value: JsonValue | undefined) => {
    let text = value === null || value === undefined ? '' : typeof value === 'string' ? value : formatDataValue(value);
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return [table.columns.map(c => cell(c.label)).join(','), ...rows.map(row => table.columns.map(c => cell(row[c.key])).join(','))].join('\r\n');
}
