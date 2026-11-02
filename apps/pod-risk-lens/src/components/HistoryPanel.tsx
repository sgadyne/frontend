import {Fragment, useMemo, useState} from 'react';
import type {Envelope, ExposureRow, HistoryData, HistoryRecord} from '../domain/types';
import {formatDate, formatMillions, formatSignedMillions} from '../domain/format';
import TimeSeriesChart, {type TimeSeriesPoint} from '../widgets/charts/TimeSeriesChart';
import type {ExposureLeader, ExposureMeasure} from '../features/risk-lens/leaders';
import {aggregateLeaderHistory, type LeaderHistoryPoint} from '../features/risk-lens/leaderHistory';
import './HistoryPanel.css';

export interface HistoryPanelProps {
  row: ExposureRow | null;
  history: Envelope<HistoryData> | null;
  loading: boolean;
  range: string;
  onRangeChange: (range: string) => void;
  error?: string | null;
  leader?: ExposureLeader | null;
  onSelectRow?: (row: ExposureRow) => void;
  historyStamp?: string | null;
  comparisonLabel?: string | null;
  fixture?: boolean | null;
  scopeLabel?: string | null;
  riskBasis?: string | null;
}

interface DailyPoint {
  date: string;
  deltaM: number | null;
  signedRiskM: number | null;
  grossRiskM: number | null;
}

const RANGE_OPTIONS = ['1M', '3M', 'YTD'];
const finiteOrNull = (value: number | null | undefined) => value != null && Number.isFinite(value) ? value : null;

function validHistoryDate(value: string | undefined) {
  const date = value?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

function recordsForExposure(records: HistoryRecord[], exposureId: string) {
  return records.filter(record => record[2] === exposureId && validHistoryDate(record[0]));
}

function historyBooks(records: HistoryRecord[], exposureId: string) {
  return [...new Set(recordsForExposure(records, exposureId).map(record => record[1]).filter(book => book.trim().length > 0))]
    .sort((a, b) => a.localeCompare(b));
}

function sumMetric(records: HistoryRecord[], index: 3 | 4 | 5): number | null {
  if (records.length === 0) return null;
  const values = records.map(record => finiteOrNull(record[index]));
  // A missing book observation makes an all-book total incomplete; preserve a gap.
  if (values.some(value => value === null)) return null;
  return (values as number[]).reduce((total, value) => total + value, 0);
}

function aggregateHistory(records: HistoryRecord[], exposureId: string, book: string | null, coverage?: HistoryData['coverage']): DailyPoint[] {
  const coverageByDate = new Map<string, {complete: boolean; pricing_complete?: boolean}>();
  for (const [rawDate, status] of Object.entries(coverage ?? {})) {
    const date = validHistoryDate(rawDate);
    if (date) coverageByDate.set(date, status);
  }
  const hasCoverageMetadata = coverageByDate.size > 0;
  const byDate = new Map<string, HistoryRecord[]>();
  const firstDateByBook = new Map<string, string>();
  const books = historyBooks(records, exposureId);
  for (const record of recordsForExposure(records, exposureId)) {
    const date = validHistoryDate(record[0]);
    if (!date) continue;
    const bucket = byDate.get(date) ?? [];
    bucket.push(record);
    byDate.set(date, bucket);
    if (record[1].trim()) {
      const firstDate = firstDateByBook.get(record[1]);
      if (!firstDate || date < firstDate) firstDateByBook.set(record[1], date);
    }
  }
  const dates = new Set([...byDate.keys(), ...coverageByDate.keys()]);
  const metricFor = (date: string, daily: HistoryRecord[], metric: 3 | 4 | 5) => {
    const dateCoverage = coverageByDate.get(date);
    if (dateCoverage?.complete === false) return null;

    if (book !== null) {
      const bookRecords = daily.filter(record => record[1] === book);
      if (bookRecords.length > 0) return sumMetric(bookRecords, metric);
      const firstObservedDate = firstDateByBook.get(book);
      return dateCoverage?.complete === true && firstObservedDate && date >= firstObservedDate ? 0 : null;
    }

    if (!hasCoverageMetadata) return sumMetric(daily, metric);
    if (daily.some(record => !record[1].trim())) return null;
    let total = 0;
    if (books.length === 0) return null;
    for (const knownBook of books) {
      const bookRecords = daily.filter(record => record[1] === knownBook);
      if (bookRecords.length > 0) {
        const value = sumMetric(bookRecords, metric);
        if (value === null) return null;
        total += value;
        continue;
      }
      const firstObservedDate = firstDateByBook.get(knownBook);
      if (dateCoverage?.complete === true && firstObservedDate && date >= firstObservedDate) continue;
      // A missing row is unknown until that book has appeared on a complete date.
      return null;
    }
    return total;
  };

  return [...dates].sort((a, b) => a.localeCompare(b)).map(date => {
    const daily = byDate.get(date) ?? [];
    return {
      date,
      deltaM: metricFor(date, daily, 3),
      signedRiskM: metricFor(date, daily, 4),
      grossRiskM: metricFor(date, daily, 5),
    };
  });
}

function shortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'}).format(parsed);
}

function exactSignedMillions(value: number) {
  const formatted = value === 0 || Object.is(value, -0) ? '0'
    : new Intl.NumberFormat('en-US', {maximumSignificantDigits: 8, signDisplay: 'exceptZero'}).format(value);
  return `${formatted} $M / day`;
}

function measureText(value: ExposureMeasure) {
  if (value.value == null || !Number.isFinite(value.value)) return '—';
  return value.value === 0 || Object.is(value.value, -0) ? '0'
    : new Intl.NumberFormat('en-US', {maximumSignificantDigits: 8, signDisplay: 'exceptZero'}).format(value.value);
}

function coverageText(value: ExposureMeasure) {
  if (value.coverage === 'complete') return null;
  return `${value.totalCount - value.missingCount}/${value.totalCount} known · ${value.coverage}`;
}

function leaderBookRank(leader: ExposureLeader) {
  return leader.scopedBooks.map(book => {
    const rows = leader.rows.filter(row => row.pod === book);
    const known = rows.map(row => finiteOrNull(row.signed_risk_end_m));
    const complete = known.length > 0 && known.every(value => value !== null);
    const value = complete ? (known as number[]).reduce((sum, next) => sum + next, 0) : null;
    return {book, complete, value};
  }).sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    if (!a.complete) return a.book.localeCompare(b.book);
    return Math.abs(b.value ?? 0) - Math.abs(a.value ?? 0) || a.book.localeCompare(b.book);
  }).map(item => item.book);
}

function bookSeriesId(book: string) { return `leader-history:book:${book}`; }

function LeaderMeasureCard({label, value}: {label: string; value: ExposureMeasure}) {
  const coverage = coverageText(value);
  return <article className={`history-summary-card${value.coverage === 'complete' ? '' : ' is-incomplete'}`}>
    <span className="history-summary-label">{label}</span>
    <strong>{measureText(value)} <small>{value.unit}</small></strong>
    {coverage && <span className="history-summary-coverage">{coverage}</span>}
  </article>;
}

function LeaderContributors({leader, onSelectRow, onSelectBook}: {
  leader: ExposureLeader; onSelectRow?: (row: ExposureRow) => void; onSelectBook: (book: string) => void;
}) {
  return <section className="history-contributors" aria-labelledby="history-contributor-heading">
    <div className="history-section-heading">
      <div><h3 id="history-contributor-heading">Book and tag contributors</h3>
        <p>Grouped by the published book and tag labels. Selecting a tile scopes both history charts to that book.</p></div>
    </div>
    <div className="history-contributor-grid">
      {leader.contributors.map(contributor => {
        const content = <>
          <span className="history-contributor-heading"><strong>{contributor.pod}</strong><span>{contributor.tag}</span></span>
          <span className="history-contributor-values">
            <span><small>Start</small><strong title={String(contributor.start.value)}>{measureText(contributor.start)}</strong></span>
            <span><small>Current</small><strong title={String(contributor.current.value)}>{measureText(contributor.current)}</strong></span>
            <span><small>Movement</small><strong title={String(contributor.change.value)}>{measureText(contributor.change)}</strong></span>
          </span>
          {([
            ['Start', contributor.start], ['Current', contributor.current], ['Movement', contributor.change],
            ['Risk start', contributor.signedRiskStart], ['Signed daily risk', contributor.signedRiskCurrent], ['Risk movement', contributor.signedRiskChange],
          ] as const).filter(([, value]) => value.coverage !== 'complete').map(([label, value]) =>
            <span className="history-summary-coverage" key={`${label}:${value.unit}`}>{label}: {coverageText(value)}</span>)}
          <span className="history-contributor-risk">Signed daily risk · {measureText(contributor.signedRiskCurrent)} $M / day</span>
          <span className="history-contributor-count">{contributor.rows.length} scoped row{contributor.rows.length === 1 ? '' : 's'}</span>
        </>;
        return onSelectRow
          ? <button className="history-contributor-card" type="button" key={contributor.id}
            aria-label={`Select ${contributor.pod} ${contributor.tag} contributor`}
            onClick={() => { onSelectBook(contributor.pod); onSelectRow(contributor.rows[0]); }}>{content}</button>
          : <article className="history-contributor-card" key={contributor.id}>{content}</article>;
      })}
    </div>
  </section>;
}

function LeaderInspector({
  row, leader, history, loading, range, onRangeChange, error, onSelectRow, historyStamp, comparisonLabel, fixture: sourceFixture, scopeLabel, riskBasis,
}: {
  row: ExposureRow | null; leader: ExposureLeader; history: Envelope<HistoryData> | null; loading: boolean;
  range: string; onRangeChange: (range: string) => void; error?: string | null; onSelectRow?: (row: ExposureRow) => void;
  historyStamp?: string | null; comparisonLabel?: string | null; fixture?: boolean | null; scopeLabel?: string | null; riskBasis?: string | null;
}) {
  const records = history?.data?.records ?? [];
  const rankedBooks = useMemo(() => leaderBookRank(leader), [leader]);
  const scopeChoices = useMemo(() => new Set(['totals', 'top-five', 'all-books', ...leader.scopedBooks.map(book => `book:${book}`)]), [leader.scopedBooks]);
  const [scopeState, setScopeState] = useState<{leaderId: string; choice: string}>({leaderId: leader.id, choice: 'totals'});
  const scopeChoice = scopeState.leaderId === leader.id && scopeChoices.has(scopeState.choice) ? scopeState.choice : 'totals';
  const setScopeChoice = (choice: string) => setScopeState({leaderId: leader.id, choice});
  const selectedBook = scopeChoice.startsWith('book:') ? scopeChoice.slice(5) : null;
  const visibleBooks = scopeChoice === 'top-five' ? rankedBooks.slice(0, 5)
    : scopeChoice === 'all-books' ? rankedBooks
    : selectedBook ? [selectedBook] : [];
  const byBookHistory = useMemo(() => aggregateLeaderHistory(records, leader.historyPairs, history?.data?.coverage),
    [records, leader.historyPairs, history?.data?.coverage]);
  const selectedSeries = useMemo(() => {
    if (scopeChoice === 'totals') return [{id: 'leader-history:totals', label: 'Scoped total', unit: '$M / day', color: '#3269cf'}];
    return visibleBooks.map((book, index) => ({
      id: bookSeriesId(book), label: book, unit: '$M / day',
      color: ['#3269cf', '#49a58e', '#ce7a87', '#7799bf', '#a68fb9', '#549ca3', '#8caa75'][index % 7],
    }));
  }, [scopeChoice, visibleBooks]);
  const makeChartPoints = (key: 'deltaM' | 'signedRiskM') => byBookHistory.dates.map((date, index) => ({
    date,
    values: Object.fromEntries(selectedSeries.map(series => {
      const point: LeaderHistoryPoint | undefined = scopeChoice === 'totals'
        ? byBookHistory.totals[index]
        : byBookHistory.byBook[series.label]?.[index];
      return [series.id, point?.[key] ?? null];
    })),
  }));
  const riskChartPoints = useMemo(() => makeChartPoints('signedRiskM'), [byBookHistory, selectedSeries, scopeChoice]);
  const deltaChartPoints = useMemo(() => makeChartPoints('deltaM'), [byBookHistory, selectedSeries, scopeChoice]);
  const freshness = history?.freshness?.state;
  const fixture = sourceFixture ?? history?.fixture ?? false;
  const coverage = history?.data?.coverage;
  const hasIncompleteCoverage = Object.values(coverage ?? {}).some(day => day.complete === false);
  const hasIncompletePricing = Object.values(coverage ?? {}).some(day => day.pricing_complete === false);
  const errorMessage = error || history?.error || (history?.state === 'error' ? history.message || 'History could not be loaded.' : null);
  const hasHistoryPoints = byBookHistory.dates.length > 0 && byBookHistory.books.length > 0;
  const activeScope = selectedBook ?? (scopeChoice === 'top-five' ? 'top five books' : scopeChoice === 'all-books' ? 'all scoped books' : 'totals under current filters');
  const historyEmptyMessage = loading ? 'Loading exact-stamp exposure history…'
    : errorMessage ? 'History is unavailable while the request is in error.'
    : history?.state === 'missing' ? 'No settled exposure history is published for this selection.'
    : 'No matching dated history records are available for the scoped books and risk IDs.';

  return <>
    <header className="history-panel-header history-panel-header--leader">
      <div>
        <p className="history-panel-eyebrow">Selected exposure · {leader.assetClass}</p>
        <h2>{leader.label}</h2>
        <div className="history-panel-identifiers">
          <span>{leader.rows.length} scoped rows</span><span>{leader.scopedBooks.length} books</span><span>{leader.unit}</span>
        </div>
      </div>
      {row && <span className="history-panel-selected-book">Selected row · {row.pod} / {row.tag}</span>}
    </header>

    <div className="history-window-note">
      <strong>Applied scope</strong><span>{scopeLabel || 'Scope details are not supplied.'}</span>
      <strong>Comparison window</strong><span>{comparisonLabel || 'Not supplied by the active comparison.'}</span>
    </div>

    <section className="history-leader-measures" aria-label="Exposure and risk start current and movement">
      <div className="history-measure-group">
        <h3>{leader.unit === '$M / day' ? 'Signed daily risk' : 'Exposure'}</h3>
        <div className="history-summary history-summary--three">
          <LeaderMeasureCard label="Start" value={leader.start} />
          <LeaderMeasureCard label="Current" value={leader.current} />
          <LeaderMeasureCard label={leader.unit === '$M / day' ? 'Risk-equivalent movement' : 'Period movement'} value={leader.change} />
        </div>
      </div>
      {leader.unit !== '$M / day' && <div className="history-measure-group">
        <h3>Signed daily risk</h3>
        <div className="history-summary history-summary--three">
          <LeaderMeasureCard label="Start" value={leader.signedRiskStart} />
          <LeaderMeasureCard label="Current" value={leader.signedRiskCurrent} />
          <LeaderMeasureCard label="Risk-equivalent movement" value={leader.signedRiskChange} />
        </div>
      </div>}
    </section>

    {leader.mode === 'trades' ? <section className="history-chart-section" aria-label="Trade history unavailable">
      <div className="history-chart-empty" role="status">This view contains published trade exposure values. No dated trade history is supplied, so a historical trade path is not shown.</div>
    </section> : <>
      <section className="history-chart-section" aria-labelledby="leader-risk-history-heading">
        <div className="history-section-heading history-section-heading--leader">
          <div><h3 id="leader-risk-history-heading">Signed daily-risk history</h3>
            <p>{scopeChoice === 'totals' ? 'Totals under current filters' : `Book comparison · overlaid lines · ${activeScope}`}</p></div>
          <div className="history-history-controls">
            <label className="history-panel-scope-control"><span>History view</span>
              <select aria-label="History view" value={scopeChoice} onChange={event => setScopeChoice(event.target.value)}>
                <option value="totals">Totals under current filters</option>
                <option value="top-five">Top five · book comparison</option>
                <option value="all-books">All books · line comparison</option>
                {leader.scopedBooks.map(book => <option key={book} value={`book:${book}`}>{book}</option>)}
              </select>
            </label>
            <div className="history-range-switch" role="group" aria-label="History range">
              {RANGE_OPTIONS.map(option => <button key={option} type="button" aria-pressed={range === option}
                className={range === option ? 'is-active' : ''} onClick={() => onRangeChange(option)}>{option}</button>)}
            </div>
          </div>
        </div>
        {hasHistoryPoints ? <TimeSeriesChart key={`${leader.id}:${scopeChoice}:risk`} ariaLabel="Signed daily risk history for selected exposure group"
          series={selectedSeries} points={riskChartPoints} includeZero showLegend={scopeChoice !== 'totals'}
          emptyMessage="No signed daily-risk values are available for this range." formatDate={shortDate} formatValue={exactSignedMillions} />
          : <div className="history-chart-empty" role="status">{historyEmptyMessage}</div>}
      </section>

      {leader.hasDeltaHistory && <section className="history-chart-section" aria-labelledby="leader-delta-history-heading">
        <div className="history-section-heading">
          <div><h3 id="leader-delta-history-heading">Delta exposure history</h3>
            <p>{scopeChoice === 'totals' ? 'Totals under current filters' : `Book comparison · overlaid lines · ${activeScope}`}</p></div>
        </div>
        {hasHistoryPoints ? <TimeSeriesChart key={`${leader.id}:${scopeChoice}:delta`} ariaLabel="Delta exposure history for selected exposure group"
          series={selectedSeries.map(series => ({...series, unit: '$M'}))} points={deltaChartPoints} includeZero showLegend={false}
          emptyMessage="No delta-exposure history is available for this range." formatDate={shortDate}
          formatValue={value => `${value === 0 || Object.is(value, -0) ? '0' : new Intl.NumberFormat('en-US', {maximumSignificantDigits: 8, signDisplay: 'exceptZero'}).format(value)} $M`} />
          : <div className="history-chart-empty" role="status">{historyEmptyMessage}</div>}
      </section>}
    </>}

    <LeaderContributors leader={leader} onSelectRow={onSelectRow} onSelectBook={book => setScopeChoice(`book:${book}`)} />

    <div className="history-panel-status" aria-live="polite">
      {loading && <span className="history-status-loading">{hasHistoryPoints ? 'Refreshing exact-stamp history…' : 'Loading history…'}</span>}
      {!loading && errorMessage && <span className="history-status-error">{errorMessage}</span>}
      {!loading && !errorMessage && history?.state === 'partial' && <span className="history-status-partial">Partial history returned.</span>}
      {!loading && hasIncompleteCoverage && <span className="history-status-partial">Incomplete source dates remain gaps across each risk-ID/book pair.</span>}
      {!loading && hasIncompletePricing && <span className="history-status-partial">Pricing coverage is incomplete for one or more dates; available observations are retained.</span>}
      {freshness === 'stale' && <span className="history-status-stale">Data may be stale.</span>}
    </div>

    <details className="history-source">
      <summary>Source, comparison stamp and coverage</summary>
      <dl>
        <dt>Applied scope</dt><dd>{scopeLabel || 'Not supplied'}</dd>
        <dt>Comparison window</dt><dd>{comparisonLabel || 'Not supplied'}</dd>
        <dt>Published risk basis</dt><dd>{riskBasis || 'Not supplied'}</dd>
        <dt>Pinned history stamp</dt><dd>{historyStamp || 'Not supplied'}</dd>
        {history?.publication && <><dt>History response revision</dt><dd>{history.publication}</dd></>}
        {leader.provenance.sources.map(source => <Fragment key={`source:${source}`}><dt>Exposure source</dt><dd>{source}</dd></Fragment>)}
        {leader.provenance.factorDates.map(date => <Fragment key={`factor-date:${date}`}><dt>Factor date</dt><dd>{formatDate(date)}</dd></Fragment>)}
        {leader.provenance.factorSources.map(source => <Fragment key={`factor-source:${source}`}><dt>Factor source</dt><dd>{source}</dd></Fragment>)}
        {leader.provenance.factorFallbacks.map(fallback => <Fragment key={`factor-fallback:${fallback}`}><dt>Factor fallback</dt><dd>{fallback}</dd></Fragment>)}
        {leader.provenance.contexts.map(context => <Fragment key={`context:${context}`}><dt>Context</dt><dd>{context}</dd></Fragment>)}
        {history?.data?.start && <><dt>Returned history start</dt><dd>{formatDate(history.data.start)}</dd></>}
        {history?.data?.end && <><dt>Returned history end</dt><dd>{formatDate(history.data.end)}</dd></>}
        <dt>History scope</dt><dd>{leader.scopedBooks.length} current scoped book(s) · {leader.riskIds.length} risk ID(s)</dd>
        <dt>Data feed</dt><dd>{fixture ? 'Synthetic fixture · no market feed' : leader.mode === 'trades' ? 'Published trade exposure values' : 'Published settled exposure history'}</dd>
      </dl>
      {leader.mode === 'trades' && <p className="history-provenance-note">Trade rows publish prepared values only. No dated trade history is supplied here. Factor source and fallback measures appear only when the active publication supplies them.</p>}
      {leader.mode !== 'trades' && !leader.provenance.factorSources.length && !leader.provenance.factorFallbacks.length
        && <p className="history-provenance-note">The active publication does not include factor-source or fallback detail.</p>}
    </details>
  </>;
}

function HistoryPanel({row, leader = null, history, loading, range, onRangeChange, error = null, onSelectRow, historyStamp, comparisonLabel, fixture: activeFixture, scopeLabel, riskBasis}: HistoryPanelProps) {
  const records = history?.data?.records ?? [];
  const books = useMemo(() => row ? historyBooks(records, row.exposure_id) : [], [records, row?.exposure_id]);
  const [bookChoice, setBookChoice] = useState<{exposureId: string; book: string} | null>(null);
  const selectedBook = row && bookChoice?.exposureId === row.exposure_id && books.includes(bookChoice.book) ? bookChoice.book : null;
  const dataCoverage = history?.data?.coverage;
  const points = useMemo(() => row ? aggregateHistory(records, row.exposure_id, selectedBook, dataCoverage) : [],
    [records, dataCoverage, row?.exposure_id, selectedBook]);
  const chartPoints = useMemo<TimeSeriesPoint[]>(() => points.map(point => ({
    date: point.date,
    values: {risk: point.signedRiskM},
  })), [points]);
  const first = points[0] ?? null;
  const latest = points[points.length - 1] ?? null;
  const errorMessage = error || history?.error || (history?.state === 'error' ? history.message || 'History could not be loaded.' : null);
  const hasSelectedHistory = points.length > 0;
  const freshness = history?.freshness?.state;
  const fixture = history?.fixture ?? false;
  const hasIncompleteCoverage = Object.values(dataCoverage ?? {}).some(day => day.complete === false);
  const hasIncompletePricing = Object.values(dataCoverage ?? {}).some(day => day.pricing_complete === false);
  const historyScope = selectedBook ?? 'all books';
  const riskLabel = selectedBook ? `Latest net daily risk · ${selectedBook}` : 'Latest net daily risk · all books';
  const grossLabel = selectedBook ? `Latest gross daily risk · ${selectedBook}` : 'Latest gross daily risk · all books';
  const chartLabel = selectedBook ? `Net daily risk · ${selectedBook}` : 'Net daily risk across all books';

  if (leader) return <aside className="history-panel history-panel--leader" aria-label="Exposure inspector">
    <LeaderInspector row={row} leader={leader} history={history} loading={loading} range={range}
      onRangeChange={onRangeChange} error={error} onSelectRow={onSelectRow} historyStamp={historyStamp}
      comparisonLabel={comparisonLabel} fixture={activeFixture} scopeLabel={scopeLabel} riskBasis={riskBasis} />
  </aside>;

  return <aside className="history-panel" aria-label="Exposure history">
    <header className="history-panel-header">
      <div>
        <p className="history-panel-eyebrow">Exposure history</p>
        <h2>{row ? row.underlying : 'No exposure selected'}</h2>
        {row && <div className="history-panel-identifiers">
          <span className="history-pod-tag">{row.pod}</span>
          <span>{row.tag}</span>
          <span>{row.currency}</span>
        </div>}
      </div>
      {row && <label className="history-panel-scope-control">
        <span>History scope</span>
        <select aria-label="History book scope" value={selectedBook ?? ''} onChange={event => setBookChoice(
          event.target.value ? {exposureId: row.exposure_id, book: event.target.value} : null,
        )}>
          <option value="">All books</option>
          {books.map(book => <option key={book} value={book}>{book}</option>)}
        </select>
      </label>}
    </header>

    {!row ? <div className="history-panel-empty" role="status">Select an exposure to view its risk history.</div> : <>
      <section className="history-summary" aria-label="Risk summary">
        <article className="history-summary-card history-summary-card-primary">
          <span className="history-summary-label">Selected pod · end signed risk</span>
          <strong>{formatSignedMillions(row.signed_risk_end_m, 3)} <small>$M / day</small></strong>
        </article>
        <article className="history-summary-card">
          <span className="history-summary-label">{riskLabel}</span>
          <strong>{formatSignedMillions(latest?.signedRiskM, 3)} <small>$M / day</small></strong>
        </article>
        <article className="history-summary-card">
          <span className="history-summary-label">{grossLabel}</span>
          <strong>{formatMillions(latest?.grossRiskM, 3)} <small>$M / day</small></strong>
        </article>
      </section>

      <div className="history-change-line">
        <span>{selectedBook ? `Delta exposure record · ${selectedBook}` : 'Delta exposure records · all books'}</span>
        <strong>{formatSignedMillions(first?.deltaM)} <span aria-hidden="true">→</span> {formatSignedMillions(latest?.deltaM)} <small>$M</small></strong>
        <span className="history-change-dates">First to latest observation · {first ? shortDate(first.date) : '—'} to {latest ? shortDate(latest.date) : '—'}</span>
      </div>

      <section className="history-chart-section" aria-labelledby="history-chart-heading">
        <div className="history-section-heading">
          <div>
            <h3 id="history-chart-heading">Net daily risk</h3>
            <p>Signed risk · {historyScope} · aggregated by date</p>
          </div>
          <div className="history-range-switch" role="group" aria-label="History range">
            {RANGE_OPTIONS.map(option => <button key={option} type="button" aria-pressed={range === option}
              className={range === option ? 'is-active' : ''} onClick={() => onRangeChange(option)}>{option}</button>)}
          </div>
        </div>
        {hasSelectedHistory ? <TimeSeriesChart
          ariaLabel={chartLabel}
          series={[{id: 'risk', label: selectedBook ? `${selectedBook} net risk` : 'Net daily risk', unit: '$M / day'}]}
          points={chartPoints}
          includeZero
          showLegend={false}
          emptyMessage="No net daily-risk values are available for this range."
          formatDate={shortDate}
          formatValue={exactSignedMillions}
        /> : <div className="history-chart-empty" role="status">
          {loading ? 'Loading history for this exposure…' : errorMessage ? 'History is unavailable while the request is in error.'
            : history?.state === 'missing' ? 'No history is available for this exposure.' : 'No matching history records are available for this exposure.'}
        </div>}
      </section>

      <div className="history-panel-status" aria-live="polite">
        {loading && <span className="history-status-loading">{hasSelectedHistory ? 'Refreshing history…' : 'Loading history…'}</span>}
        {!loading && errorMessage && <span className="history-status-error">{errorMessage}</span>}
        {!loading && !errorMessage && history?.state === 'partial' && <span className="history-status-partial">Partial history returned.</span>}
        {!loading && hasIncompleteCoverage && <span className="history-status-partial">Dates with incomplete history coverage are shown as gaps.</span>}
        {!loading && hasIncompletePricing && <span className="history-status-partial">Pricing coverage is incomplete for one or more dates; available observations are retained.</span>}
        {!loading && !errorMessage && history?.state === 'missing' && <span>No history is available for this exposure.</span>}
        {!loading && !errorMessage && history?.state === 'ready' && !hasSelectedHistory && <span>No records match this exposure.</span>}
        {freshness === 'stale' && <span className="history-status-stale">Data may be stale.</span>}
      </div>
      <details className="history-source">
        <summary>Source and coverage</summary>
        <dl>
          {row.source && <><dt>Exposure source</dt><dd>{row.source}</dd></>}
          {row.factor_date && <><dt>Factor date</dt><dd>{formatDate(row.factor_date)}</dd></>}
          {history?.data?.start && <><dt>History start</dt><dd>{formatDate(history.data.start)}</dd></>}
          {history?.data?.end && <><dt>History end</dt><dd>{formatDate(history.data.end)}</dd></>}
          {history?.coverage && <><dt>Coverage</dt><dd>{history.coverage.complete ? 'Complete' : 'Partial'}{history.coverage.pricing_complete === false ? ' · pricing incomplete' : ''}</dd></>}
          <dt>Data feed</dt><dd>{fixture ? 'Synthetic fixture · no market feed' : 'Market history'}</dd>
        </dl>
      </details>
    </>}
  </aside>;
}

export default HistoryPanel;
