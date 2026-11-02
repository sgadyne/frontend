import type {HistoryData, HistoryRecord} from '../../domain/types';
import type {ExposureHistoryPair} from './leaders';

export interface LeaderHistoryPoint {
  date: string;
  deltaM: number | null;
  signedRiskM: number | null;
  grossRiskM: number | null;
}

export interface LeaderHistorySeries {
  dates: string[];
  books: string[];
  totals: LeaderHistoryPoint[];
  byBook: Record<string, LeaderHistoryPoint[]>;
}

const finiteOrNull = (value: number | null | undefined) => value != null && Number.isFinite(value) ? value : null;

export function validHistoryDate(value: string | undefined) {
  const date = value?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

function metricValue(records: readonly HistoryRecord[], index: 3 | 4 | 5) {
  if (!records.length) return null;
  const values = records.map(record => finiteOrNull(record[index]));
  return values.some(value => value === null) ? null : (values as number[]).reduce((sum, value) => sum + value, 0);
}

/**
 * Aggregates only current scoped (risk ID, book) pairs. A missing pair is zero
 * only on a complete source date after that exact pair first appeared.
 */
export function aggregateLeaderHistory(
  records: readonly HistoryRecord[],
  pairs: readonly ExposureHistoryPair[],
  coverage?: HistoryData['coverage'],
): LeaderHistorySeries {
  const pairKeys = new Set(pairs.map(pair => JSON.stringify([pair.riskId, pair.book])));
  const scopedRecords = records.filter(record => pairKeys.has(JSON.stringify([record[2], record[1]])) && validHistoryDate(record[0]));
  const coverageByDate = new Map<string, {complete: boolean; pricing_complete?: boolean}>();
  for (const [rawDate, status] of Object.entries(coverage ?? {})) {
    const date = validHistoryDate(rawDate);
    if (date) coverageByDate.set(date, status);
  }
  const pairRecords = new Map<string, HistoryRecord[]>();
  const firstDateByPair = new Map<string, string>();
  for (const record of scopedRecords) {
    const date = validHistoryDate(record[0]);
    if (!date) continue;
    const key = JSON.stringify([record[2], record[1]]);
    pairRecords.set(`${date}\u0000${key}`, [...(pairRecords.get(`${date}\u0000${key}`) ?? []), record]);
    const first = firstDateByPair.get(key);
    if (!first || date < first) firstDateByPair.set(key, date);
  }
  const dates = [...new Set([...coverageByDate.keys(), ...scopedRecords.map(record => validHistoryDate(record[0])).filter((date): date is string => date !== null)])]
    .sort((a, b) => a.localeCompare(b));
  const books = [...new Set(pairs.map(pair => pair.book).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const valueFor = (date: string, expectedPairs: readonly ExposureHistoryPair[], index: 3 | 4 | 5): number | null => {
    if (!expectedPairs.length || coverageByDate.get(date)?.complete === false) return null;
    let total = 0;
    for (const pair of expectedPairs) {
      const key = JSON.stringify([pair.riskId, pair.book]);
      const observations = pairRecords.get(`${date}\u0000${key}`) ?? [];
      if (observations.length) {
        const value = metricValue(observations, index);
        if (value === null) return null;
        total += value;
        continue;
      }
      const firstObservedDate = firstDateByPair.get(key);
      if (coverageByDate.get(date)?.complete === true && firstObservedDate && date >= firstObservedDate) continue;
      return null;
    }
    return total;
  };

  const point = (date: string, expectedPairs: readonly ExposureHistoryPair[]): LeaderHistoryPoint => ({
    date,
    deltaM: valueFor(date, expectedPairs, 3),
    signedRiskM: valueFor(date, expectedPairs, 4),
    grossRiskM: valueFor(date, expectedPairs, 5),
  });
  const byBook = Object.fromEntries(books.map(book => [book, dates.map(date => point(date, pairs.filter(pair => pair.book === book)))]));
  const totals = dates.map(date => point(date, pairs));
  return {dates, books, totals, byBook};
}
