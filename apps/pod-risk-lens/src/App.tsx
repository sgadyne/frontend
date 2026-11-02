import {riskLensPresentation} from './features/risk-lens/presentation';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {ChangeEvent} from 'react';
import type {ComparisonData, Envelope, ExposureRow} from './domain/types';
import {useAppSession, useHost, type WidgetProps} from '@sampo/sdk-react';
import {formatDate, formatDateRange, formatMillions, formatSignedMillions} from './domain/format';
import {formatNumericValue} from './ui/format';
import {
  displayAsset, portfolioStats,
} from './features/risk-lens/model';
import type {LensMode} from './features/risk-lens/model';
import {toContributionData} from './features/risk-lens/contributionChart';
import {buildExposureLeaders, toSelectionItems} from './features/risk-lens/leaders';
import {SelectionCarousel} from './widgets/selection';
import {ScopeBar} from './widgets/scope';
import {getScopePresets, getScopeDimensions, getActiveScopePresetId, createAppliedContext} from './features/risk-lens/scope';
import {RiskLensSession} from './features/risk-lens/session';
import type {RiskLensDataProvider} from '../../../packages/risk-lens-data/contracts';
import {RiskLensSessionProvider, useRiskLensSession, useRiskLensSessionInstance} from './features/risk-lens/sessionProvider';
import ExposureTable from './components/ExposureTable';
import HistoryPanel from './components/HistoryPanel';
import ContributionChart from './widgets/contributions/ContributionChart';
import type {ContributionDatum} from './widgets/contributions/contracts';
import {Button, SearchField, SelectField, SegmentedControl} from './ui/foundation';
import {MetricCard, PanelHeader, PublicationProvenance, ResultState, StatusBadge} from './ui/status';
import type {StatusKind} from './ui/status';
import {CommandPalette} from './ui/workspace';
import type {CommandEntry} from './ui/workspace';

const DEFAULT_HORIZONS = ['1D', '1W', '1M', '3M', 'YTD'];
const ENDPOINT_OPTIONS = [{value: 'EOD', label: 'EOD'}, {value: 'Live', label: 'Live'}] as const;
function dateLabel(value?: string | null) {
  return value ? formatDate(value) : 'Date unavailable';
}

function formatNumber(value: number | null | undefined, digits = 2, signed = false) {
  return signed ? formatSignedMillions(value, digits) : formatMillions(value, digits);
}

function freshness(view: Envelope<ComparisonData> | null): {status: StatusKind; label: string; detail?: string} {
  const state = view?.freshness?.state;
  if (state === 'fresh') {
    const age = view?.freshness?.publication_age_seconds;
    return {status: 'fresh', label: 'Fresh', detail: age != null && Number.isFinite(age) ? `${Math.max(0, Math.round(age / 60))}m ago` : undefined};
  }
  if (state === 'stale') return {status: 'stale', label: 'Stale'};
  return {status: 'ready', label: 'Publication status unknown'};
}

function ScopeEmpty({title, description}: {title: string; description: string}) {
  return <ResultState status="empty" title={title} description={description} />;
}

export default function App({provider, portalContainer}: {provider: RiskLensDataProvider; portalContainer?: HTMLElement}) {
  const [session] = useState(() => new RiskLensSession(null, provider));
  const mountGeneration = useRef(0);
  useEffect(() => {
    const generation = ++mountGeneration.current;
    session.start();
    return () => queueMicrotask(() => {
      if (mountGeneration.current === generation) session.dispose();
    });
  }, [session]);
  return <RiskLensSessionProvider session={session}>
    <RiskLensAppView portalContainer={portalContainer} />
  </RiskLensSessionProvider>;
}

/** Full-app widget mount; the host owns this session's creation and lifetime. */
export function RiskLensApplicationWidget(props: WidgetProps) {
  const host = useHost();
  const session = useAppSession<RiskLensSession>(props.sessionId ?? '');
  if (!props.sessionId) throw new Error('The Risk Lens app widget requires an application session association.');
  return <RiskLensSessionProvider session={session}>
    <RiskLensAppView portalContainer={host.getPortalContainer()} />
  </RiskLensSessionProvider>;
}

export function RiskLensAppView({portalContainer}: {portalContainer?: HTMLElement}) {
  const session = useRiskLensSessionInstance();
  const snapshot = useRiskLensSession();
  const {
    context, contextLoading, contextError, comparison, comparisonLoading, comparisonError,
    trades, tradesLoading, tradesError, mode, metric, horizon, endpoint, startDate,
    query, assetClass, scopeByMode, cutoffText, selectedKey, inspectorOpen, range, history,
    historyLoading, historyError,
  } = snapshot;
  const scope = scopeByMode[mode];
  const setMetric = (value: 'delta' | 'risk') => session.setMetric(value);
  const setQuery = (value: string) => session.setQuery(value);
  const setAssetClass = (value: string) => session.setAssetClass(value);
  const setStartDate = (value: string) => session.setStartDate(value);
  const setEndDate = (value: string) => session.setEndDate(value);
  const setCutoffText = (value: string) => session.setCutoffText(value);
  const setRange = (value: string) => session.setRange(value);
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const selectionTrigger = useRef<HTMLElement | SVGElement | null>(null);
  const provenanceMenu = useRef<HTMLDetailsElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (provenanceMenu.current?.open && !provenanceMenu.current.contains(event.target as Node)) provenanceMenu.current.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  const view = useMemo(() => session.getView(), [session, snapshot]);
  const positionRows = comparison && (comparison.state === 'ready' || comparison.state === 'partial') ? comparison.data?.rows ?? [] : [];
  const tradeRows = trades && (trades.state === 'ready' || trades.state === 'partial') ? trades.data?.rows ?? [] : [];
  const sourceRows = mode === 'trades' ? tradeRows : positionRows;
  const sourceLoading = mode === 'trades' ? tradesLoading : comparisonLoading;
  const bookOptions = useMemo(() => [...new Set(sourceRows.map(row => row.pod).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [sourceRows]);
  const tagOptions = useMemo(() => [...new Set(sourceRows.map(row => row.tag).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [sourceRows]);
  const assetOptions = useMemo(() => [...new Set(sourceRows.map(row => row.asset_class).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [sourceRows]);

  const scopeDimensions = useMemo(() => getScopeDimensions(scope, bookOptions, tagOptions, mode === 'overlap' ? comparison?.data?.excluded_tags ?? [] : []), [scope, bookOptions, tagOptions, mode, comparison?.data?.excluded_tags]);
  const cutoffNumber = Number(cutoffText);
  const overlapCutoff = Number.isFinite(cutoffNumber) && cutoffNumber >= 0 ? cutoffNumber : 0.2;
  const overlapResult = view.overlap ?? {rows: [], peerRows: [], referenceRows: [], qualifyingGroups: 0, excludedUnpriced: 0};
  const visibleRows = view.rows;
  const groups = view.groups;
  const contributionItems = useMemo(() => toContributionData(groups, metric), [groups, metric]);
  const leaders = view.leaders;
  const selectionItems = useMemo(() => toSelectionItems(leaders), [leaders]);

  const activeLoading = sourceLoading;
  const activeEnvelope = mode === 'trades' ? trades : comparison;
  const activeFixture = activeEnvelope?.fixture ?? activeEnvelope?.data?.meta.fixture ?? context?.fixture ?? false;
  const activeError = mode === 'trades' ? tradesError : comparisonError;
  const retainedEndDate = session.retainedEndDate;
  const controlEndDate = endpoint === 'Live' && !(comparison?.data && (comparison.state === 'ready' || comparison.state === 'partial')) ? '' : retainedEndDate;
  const selectedRow = view.selectedRow;
  const selectedGroupId = view.selectedGroup?.id ?? null;
  const selectedLeader = view.selectedLeader;
  const hasActiveData = Boolean(activeEnvelope?.data && (activeEnvelope.state === 'ready' || activeEnvelope.state === 'partial'));

  const selectMode = (nextMode: LensMode) => session.setMode(nextMode);
  const resetScope = () => session.resetFilters();
  const applyDateRange = () => session.applyDateRange();
  const chooseHorizon = (value: string) => session.chooseHorizon(value);
  const chooseEndpoint = (value: string) => session.chooseEndpoint(value);
  const refresh = () => session.refresh();

  const selectContribution = (item: ContributionDatum) => {
    if (!item) return;
    if (!inspectorOpen && (document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement)) selectionTrigger.current = document.activeElement;
    session.selectContribution(item.id);
  };
  const selectExposureRow = (row: ExposureRow) => {
    if (!inspectorOpen && (document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement)) selectionTrigger.current = document.activeElement;
    session.selectRow(row);
  };
  const closeInspector = () => {
    session.closeInspector();
    requestAnimationFrame(() => {
      if (selectionTrigger.current?.isConnected) selectionTrigger.current.focus({preventScroll: true});
      else document.getElementById(`lens-tab-${mode}`)?.focus({preventScroll: true});
    });
  };
  const stepExposure = (direction: number) => {
    const index = groups.findIndex(group => group.id === selectedGroupId);
    const group = groups[(index + direction + groups.length) % groups.length];
    if (group) selectContribution(contributionItems.find(item => item.id === group.id)!);
  };
  useEffect(() => {
    if (!inspectorOpen) return;
    inspectorHeading.current?.focus({preventScroll: true});
    inspectorHeading.current?.scrollIntoView({block: 'start'});
  }, [inspectorOpen]);

  const stats = portfolioStats(visibleRows);
  const totalVisible = visibleRows.length;
  const assetOptionsForSelect = [{value: 'all', label: 'All asset classes'}, ...assetOptions.map(value => {
    const sample = sourceRows.find(row => row.asset_class === value);
    return {value, label: sample ? displayAsset(sample) : value};
  })];
  if (assetClass !== 'all' && !assetOptions.includes(assetClass)) assetOptionsForSelect.push({value: assetClass, label: assetClass});
  const horizonOptions = [...new Set([...(context?.horizons?.filter(value => value !== 'CUSTOM') ?? DEFAULT_HORIZONS), ...DEFAULT_HORIZONS])]
    .map(value => ({value, label: value}));
  horizonOptions.push({value: 'CUSTOM', label: 'Custom dates'});
  const tradeMode = mode === 'trades';
  const overlapMode = mode === 'overlap';
  const hasReferenceBook = positionRows.some(row => row.pod === riskLensPresentation.referenceBook);
  const hasError = Boolean(activeError || (!activeLoading && activeEnvelope?.state === 'error'));
  const missingData = !activeLoading && !hasError && (!activeEnvelope?.data || activeEnvelope.state === 'missing');
  const partial = activeEnvelope?.state === 'partial';
  const dateEnd = hasActiveData ? activeEnvelope?.data?.meta.end_date ?? activeEnvelope?.data?.meta.date : undefined;
  const pendingCustom = horizon === 'CUSTOM' && !tradeMode && !activeLoading && hasActiveData && activeEnvelope?.data?.meta.horizon !== 'CUSTOM';
  const freshnessInfo = freshness(activeEnvelope ?? null);
  const sourceAsOf = activeEnvelope?.freshness?.source_as_of ?? activeEnvelope?.data?.meta.live_source_as_of;
  const formatter = (value: number | null) => formatNumericValue(value, {maximumSignificantDigits: 10, unavailableText: 'Unavailable'}).text;

  const commands = useMemo<CommandEntry[]>(() => [
    {id: 'positions', label: 'Open positions', description: 'Compare prepared position exposures', keywords: ['risk', 'portfolio'], group: 'Views', onSelect: () => selectMode('positions')},
    {id: 'trades', label: 'Open trades', description: 'Review published trade exposures', keywords: ['trade', 'execution'], group: 'Views', onSelect: () => selectMode('trades')},
    {id: 'overlap', label: 'Open Reference overlap', description: 'Compare peers against the Reference book book', keywords: ['overlap', 'peers'], group: 'Views', onSelect: () => selectMode('overlap')},
    {id: 'delta', label: 'Rank by delta exposure', keywords: ['metric', 'notional'], group: 'Measure', onSelect: () => setMetric('delta')},
    {id: 'risk', label: 'Rank by daily risk', keywords: ['volatility', 'sigma'], group: 'Measure', onSelect: () => setMetric('risk')},
    {id: 'refresh', label: 'Refresh current publication', keywords: ['reload', 'read'], group: 'Data', onSelect: refresh},
  ], [refresh, selectMode]);

  const modeTitle = mode === 'positions' ? 'Positions' : tradeMode ? 'Trades' : 'Reference overlap';
  const topStatus: {status: StatusKind; label: string; detail?: string} = activeLoading ? {status: 'loading', label: 'Reading'} : hasError ? {status: 'error', label: 'Unavailable'}
    : missingData ? {status: 'missing', label: 'Missing'} : partial ? {status: 'partial' as const, label: 'Partial'} : freshnessInfo;

  const appliedContext = createAppliedContext({
    mode, endpoint: hasActiveData ? activeEnvelope?.data?.meta.endpoint ?? endpoint : tradeMode ? 'Published trades' : endpoint,
    horizon: hasActiveData ? activeEnvelope?.data?.meta.horizon ?? horizon : horizon,
    baseDate: hasActiveData ? activeEnvelope?.data?.meta.base_date ?? null : null, endDate: hasActiveData ? activeEnvelope?.data?.meta.end_date ?? null : null,
    metric, units: groups.map(group => group.unit), source: activeEnvelope?.data?.meta.source ?? null, scope,
  });
  const scopePresetLabel = getScopePresets(mode).find(preset => preset.id === getActiveScopePresetId(scope))?.label ?? 'Custom';
  const copyContext = [
    {label: 'Data', value: activeFixture ? 'Synthetic fixture' : 'Published real data'},
    {label: 'Namespace', value: context?.namespace ? `${context.namespace.scope} / ${context.namespace.environment}` : 'Unavailable'},
    {label: 'View', value: modeTitle}, {label: 'Endpoint', value: appliedContext.endpoint}, {label: 'Horizon', value: appliedContext.horizon},
    {label: 'Base date', value: appliedContext.baseDate ?? 'Unavailable'}, {label: 'End date', value: appliedContext.endDate ?? 'Unavailable'},
    {label: 'Period exactness', value: hasActiveData && activeEnvelope?.data?.meta.exact != null ? String(activeEnvelope.data.meta.exact) : 'Not supplied'},
    {label: 'Scope preset', value: scopePresetLabel},
    ...(overlapMode ? [{label: 'Reference book', value: riskLensPresentation.referenceBook}] : []),
    {label: overlapMode ? 'Peer books' : 'Books', value: scope.books === null ? 'All' : scope.books.length ? scope.books.join(', ') : 'None'},
    {label: overlapMode ? 'Peer tags' : 'Tags', value: scope.tags === null ? scope.excludedTags.length ? `All except ${scope.excludedTags.join(', ')}` : 'All' : scope.tags.length ? scope.tags.join(', ') : 'None'},
    {label: 'Source exclusions', value: [...new Set([
      ...(sourceRows.some(row => row.pod === 'GMMS' || row.tag === 'GMMS') ? ['GMMS'] : []),
      ...(overlapMode ? comparison?.data?.excluded_tags ?? [] : []),
    ])].join(', ') || 'None present'},
    {label: 'Search', value: query || 'None'}, {label: 'Asset filter', value: assetClass === 'all' ? 'All asset classes' : assetClass},
    {label: 'Metric', value: metric === 'risk' ? 'Signed daily risk' : 'Delta / native factor risk'},
    {label: 'Published risk basis', value: activeEnvelope?.data?.meta.sigma_basis ?? 'Not supplied'},
    {label: 'Units', value: appliedContext.units.join('; ') || 'No visible groups'},
    {label: 'Rows', value: String(visibleRows.length)}, {label: 'Source', value: activeEnvelope?.data?.meta.source ?? 'Unavailable'},
    {label: 'Result state', value: activeEnvelope?.state ?? 'Unavailable'},
    {label: 'Source coverage', value: activeEnvelope?.coverage ? String(activeEnvelope.coverage.complete) : 'Not supplied'},
    {label: 'Pricing coverage', value: activeEnvelope?.coverage?.pricing_complete == null ? 'Not supplied' : String(activeEnvelope.coverage.pricing_complete)},
    {label: 'Freshness state', value: activeEnvelope?.freshness?.state ?? 'Not supplied'},
    {label: 'Publication revision', value: activeEnvelope?.publication ?? 'Not supplied'},
    {label: 'Comparison stamp', value: activeEnvelope?.data?.stamp ?? 'Not supplied'},
    {label: 'Source observation', value: sourceAsOf ?? 'Not supplied'},
  ];

  return <div className="risk-lens-shell">
    <main className="lens-main" id="risk-lens">
      <header className="lens-topbar">
        <div className="lens-breadcrumb"><a className="lens-wordmark" href="#risk-lens" aria-label="Risk Lens home">Risk Lens</a><span aria-hidden="true">/</span><h1>Risk Lens</h1><strong>{modeTitle}</strong></div>
        <div className="lens-topbar__actions">
          {activeFixture && <StatusBadge status="ready" label="Synthetic demo" />}
          {viewDateLabel(dateEnd) && <span className="lens-publication-date">As of {dateLabel(dateEnd)}</span>}
          <StatusBadge status={topStatus.status} label={topStatus.label} detail={topStatus.status === 'fresh' ? topStatus.detail : undefined} />
        <details className="lens-provenance" ref={provenanceMenu} onKeyDown={event => {
          if (event.key === 'Escape' && provenanceMenu.current?.open) {
            event.stopPropagation(); provenanceMenu.current.open = false; provenanceMenu.current.querySelector('summary')?.focus();
          }
        }}>
          <summary>Publication details <span>Source observation: {sourceAsOf ?? 'Not supplied'}</span></summary>
          <PublicationProvenance
            namespace={context?.namespace ? `${context.namespace.scope} / ${context.namespace.environment}` : null}
            source={activeEnvelope?.data?.meta.source}
            sourceAsOf={sourceAsOf}
            publicationRevision={activeEnvelope?.publication}
            publicationAgeSeconds={activeEnvelope?.freshness?.publication_age_seconds}
            resultState={activeLoading ? null : hasError ? 'error' : activeEnvelope?.state}
            freshnessState={activeEnvelope?.freshness?.state}
          />
        </details>

          <Button variant="secondary" onClick={refresh} disabled={activeLoading} aria-label="Refresh current view">Refresh</Button>
          <Button variant="primary" onClick={() => setPaletteOpen(true)} aria-label="Search actions" aria-keyshortcuts="Control+K Meta+K">⌘ / Ctrl K</Button>
        </div>
      </header>

      <div className="lens-content">
        <div className="lens-workspace-tabs" role="tablist" aria-label="Risk views">
          {([{id: 'positions', label: 'Positions'}, {id: 'trades', label: 'Trades'}, {id: 'overlap', label: 'Reference overlap'}] as const).map((tab, index, tabs) => (
            <button key={tab.id} type="button" role="tab" id={`lens-tab-${tab.id}`} aria-selected={mode === tab.id}
              aria-controls="lens-view-panel" tabIndex={mode === tab.id ? 0 : -1} onClick={() => selectMode(tab.id)}
              onKeyDown={event => {
                const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
                if (next === null) return;
                event.preventDefault(); selectMode(tabs[next].id); document.getElementById(`lens-tab-${tabs[next].id}`)?.focus();
              }}>{tab.label}</button>
          ))}
          <span className="lens-workspace-tabs__environment">{context?.namespace?.scope} / {context?.namespace?.environment}</span>
        </div>
        <div id="lens-view-panel" role="tabpanel" aria-labelledby={`lens-tab-${mode}`}>

        <section className="lens-context-bar" aria-label="Analysis context">
        <section className="lens-period-panel" aria-label="Risk view controls">
          <div className="lens-period-controls">
            <SelectField id="lens-horizon" label="Horizon" value={horizon}
              onChange={chooseHorizon} options={horizonOptions} className="lens-control lens-control--horizon" disabled={tradeMode || comparisonLoading} />
            <SegmentedControl label="Pricing endpoint" value={endpoint} onChange={chooseEndpoint} options={ENDPOINT_OPTIONS} disabled={tradeMode || comparisonLoading} />
            {horizon === 'CUSTOM' ? <>
              <label className="date-control"><span>Start date</span><input type="date" value={startDate} max={retainedEndDate || undefined} disabled={tradeMode || endpoint === 'Live'} onChange={(event: ChangeEvent<HTMLInputElement>) => setStartDate(event.currentTarget.value)} /></label>
              <label className="date-control"><span>{endpoint === 'Live' ? 'Source as-of' : 'End date'}</span><input type="date" value={controlEndDate} disabled={tradeMode || endpoint === 'Live'} onChange={(event: ChangeEvent<HTMLInputElement>) => setEndDate(event.currentTarget.value)} /></label>
              <Button variant="primary" onClick={applyDateRange} disabled={tradeMode || endpoint === 'Live' || !startDate || !retainedEndDate || startDate > retainedEndDate || comparisonLoading}>Apply dates</Button>
            </> : <>
              <label className="date-control date-control--end"><span>{endpoint === 'Live' ? 'Source as-of' : 'End date'}</span><input type="date" value={controlEndDate} disabled={tradeMode || endpoint === 'Live'} onChange={(event: ChangeEvent<HTMLInputElement>) => setEndDate(event.currentTarget.value)} /></label>
              <Button variant="secondary" onClick={() => session.applyEndDate()} disabled={tradeMode || endpoint === 'Live' || !retainedEndDate || comparisonLoading}>Apply date</Button>
            </>}
            {hasActiveData && activeEnvelope?.data?.meta.exact === false && <span className="period-estimate" role="status">Estimated period</span>}
          </div>
        </section>

        <ScopeBar context={[
          {label: 'Window', value: appliedContext.baseDate && appliedContext.endDate ? `${appliedContext.horizon} · ${formatDateRange(appliedContext.baseDate, appliedContext.endDate)}` : 'Unavailable'},
          {label: 'Units', value: appliedContext.unit ?? (appliedContext.units.length ? `${appliedContext.units.join('; ')} (separate)` : hasActiveData ? 'No visible groups' : activeLoading ? 'Reading' : 'Unavailable')},
          ...(overlapMode ? [{label: 'Reference book', value: riskLensPresentation.referenceBook}] : []),
        ]}
          presets={getScopePresets(mode)} activePresetId={getActiveScopePresetId(scope)} defaultPresetId={`${mode}-default`}
          dimensions={scopeDimensions} onPresetChange={id => session.applyScopePreset(id as 'all' | `${LensMode}-default`)}
          onDimensionChange={(dimension, value) => { if (dimension === 'books' || dimension === 'tags') session.setScopeDimension(dimension, value); }}
          onReset={resetScope} />

        <section className="lens-filter-panel" aria-label="Portfolio filters">
          <div className="lens-filter-panel__search">
            <SearchField id="lens-query" label="Search exposures" value={query} onChange={setQuery} placeholder="Search underlying, book, asset class, or tag" />
          </div>
          <SelectField id="lens-asset-class" label="Asset class" value={assetClass} onChange={setAssetClass} options={assetOptionsForSelect} className="lens-control lens-control--asset" />
          {overlapMode && <label className="cutoff-control"><span>Gross reference risk cutoff</span><span className="cutoff-control__input"><input type="number" min="0" step="0.05" value={cutoffText} onChange={event => setCutoffText(event.currentTarget.value)} aria-label="Gross reference risk cutoff"/><small>$M / day</small></span></label>}
          <div className="lens-filter-panel__metric">
            <span>Rank by</span>
            <SegmentedControl label="Contribution metric" value={metric} onChange={setMetric} options={[
              {value: 'delta', label: 'Delta'}, {value: 'risk', label: 'Daily risk'},
            ]} />
          </div>
        </section>

        </section>
        {pendingCustom && <div className="lens-context-warning" role="status">Custom dates not applied. Showing {activeEnvelope?.data?.meta.endpoint} {activeEnvelope?.data?.meta.horizon}. {endpoint === 'Live' ? 'Choose EOD to apply a custom date range.' : 'Choose dates and apply them to update the view.'}</div>}
        {contextError && <div className="lens-context-warning" role="status">Source context unavailable: {contextError}</div>}

        {(query || assetClass !== 'all') && <div className="lens-selection-context" aria-label="Active portfolio scope">
          <span>Search and asset filter</span>
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear exposure search">{query} &#215;</button>}
          {assetClass !== 'all' && <button type="button" onClick={() => setAssetClass('all')} aria-label="Clear asset class filter">{assetClass} &#215;</button>}
          <button type="button" onClick={resetScope}>Reset scope</button>
        </div>}
        {activeLoading && <ResultState status="loading" title="Reading prepared publication" description={`Loading ${modeTitle.toLocaleLowerCase()} for the selected period.`} />}
        {hasError && <ResultState status="error" title={tradeMode ? 'Trade view unavailable' : 'Risk view unavailable'}
          description={activeError ?? activeEnvelope?.error ?? activeEnvelope?.message ?? 'The prepared source returned an error.'}
          action={{label: 'Retry', onAction: refresh}} />}
        {missingData && <ResultState status="missing" title={tradeMode ? 'No published trade result' : `No prepared ${endpoint} result for ${horizon === 'CUSTOM' ? 'custom dates' : horizon}`}
          description={activeEnvelope?.message ?? 'This period and pricing endpoint have no published result. Choose another available view.'} />}
        {overlapMode && !hasError && !missingData && !comparisonLoading && comparison?.data && !hasReferenceBook && <ResultState status="missing"
          title="Reference book book is not in this publication"
          description="Overlap requires a published reference book to compare against these peers. No zero-overlap result is inferred." />}
        {partial && <ResultState status="partial" title="Partial publication"
          description={activeEnvelope?.message ?? 'Some source observations are unavailable. Totals preserve missing values as unknown.'}
          detail={activeEnvelope?.coverage?.complete === false ? 'Coverage is incomplete for this result.' : undefined} />}

        {hasActiveData && !hasError && !missingData && !(overlapMode && !comparisonLoading && !hasReferenceBook) && <>
          <div className="lens-focus-strip">
            <SelectionCarousel density="compact" eyebrow="By absolute net daily risk" heading="Largest exposures" items={selectionItems} selectedId={inspectorOpen ? selectedGroupId : null}
              onSelect={item => { const datum = contributionItems.find(candidate => candidate.id === item.id); if (datum) selectContribution(datum); }} />
          <section className="lens-metrics" aria-label="Selected portfolio metrics" aria-busy={activeLoading}>
            <MetricCard label={tradeMode ? 'Trade delta exposure' : overlapMode ? 'Matched delta exposure' : 'Net delta exposure'}
              value={stats.netExposure == null ? null : formatNumber(stats.netExposure, 2, true)} unit="USD m"
              note={overlapMode ? 'Reference book + scoped peers' : 'Eligible rows · end of period'} loading={activeLoading} />
            <MetricCard label={tradeMode ? 'Trade delta move' : 'Net delta move'}
              value={stats.exposureChange == null ? null : formatNumber(stats.exposureChange, 2, true)} unit="USD m delta"
              note="Prepared period movement" loading={activeLoading} tone={stats.exposureChange != null && stats.exposureChange < 0 ? 'negative' : stats.exposureChange != null && stats.exposureChange > 0 ? 'positive' : 'neutral'} />
            <MetricCard label="Net daily risk" value={stats.netDailyRisk == null ? null : formatNumber(stats.netDailyRisk, 3, true)} unit="USD m / day"
              note={stats.pricedRows < stats.totalRows ? <span className="lens-coverage-warning">{stats.pricedRows}/{stats.totalRows} known</span> : undefined} loading={activeLoading} />
            <MetricCard label="Gross daily risk" value={stats.grossDailyRisk == null ? null : formatNumber(stats.grossDailyRisk, 3)} unit="USD m / day"
              note="Sum of absolute daily risk" loading={activeLoading} />
          </section>
          </div>

          {overlapMode && <div className="overlap-summary" role="status">
            <strong>{overlapResult.qualifyingGroups} matched underlying groups</strong>
            <span>Reference books and scoped peers · gross reference risk above {formatNumber(overlapCutoff, 2)} $M / day</span>
            {overlapResult.excludedUnpriced > 0 && <span>{overlapResult.excludedUnpriced} reference groups excluded because gross risk was unavailable.</span>}
          </div>}

          <section className={`lens-workspace-grid${inspectorOpen ? ' lens-workspace-grid--inspecting' : ''}`} aria-label="Exposure workspace">
            {inspectorOpen && <div className="lens-history-wrap" onKeyDown={event => {
              if (event.key === 'Escape' && !event.defaultPrevented && !(event.target instanceof HTMLSelectElement)) { event.stopPropagation(); closeInspector(); }
            }}>
              <div className="lens-inspector-toolbar">
                <h2 ref={inspectorHeading} tabIndex={-1}>Exposure inspector</h2>
                <div role="group" aria-label="Browse exposures">
                  <button type="button" onClick={() => stepExposure(-1)} disabled={groups.length < 2} aria-label="Previous exposure">&#8592;</button>
                  <span>{Math.max(0, groups.findIndex(group => group.id === selectedGroupId)) + 1} / {groups.length}</span>
                  <button type="button" onClick={() => stepExposure(1)} disabled={groups.length < 2} aria-label="Next exposure">&#8594;</button>
                </div>
                <button type="button" onClick={closeInspector} aria-label="Close exposure inspector">&#215;</button>
              </div>
              <HistoryPanel row={selectedRow} leader={selectedLeader} onSelectRow={selectExposureRow} historyStamp={tradeMode ? null : comparison?.data?.stamp} history={history} loading={historyLoading || comparisonLoading}
                fixture={activeFixture}
                riskBasis={activeEnvelope?.data?.meta.sigma_basis}
                scopeLabel={`${modeTitle} · ${scopePresetLabel}${overlapMode ? ' · Reference book · Peer scope' : ''} · Books: ${scope.books === null ? 'All' : scope.books.length ? scope.books.join(', ') : 'None'} · Tags: ${scope.tags === null ? scope.excludedTags.length ? `Ex ${scope.excludedTags.join(', ')}` : 'All' : scope.tags.length ? scope.tags.join(', ') : 'None'}${query ? ` · Search: ${query}` : ''}${assetClass !== 'all' ? ` · ${assetClass}` : ''}`}
                comparisonLabel={activeEnvelope?.data ? tradeMode ? `Published trades · ${dateLabel(dateEnd)}` : `${dateLabel(activeEnvelope.data.meta.base_date)} → ${dateLabel(activeEnvelope.data.meta.end_date)} · ${endpoint} · ${activeEnvelope.data.meta.horizon}` : undefined}
                range={range} onRangeChange={setRange} error={historyError} />
            </div>}

            <div className="lens-analysis-column">
              <section className="lens-panel lens-contribution-panel" aria-label="Ranked contribution overview">
                <PanelHeader title={overlapMode ? 'Matched contribution overview' : tradeMode ? 'Trade contribution overview' : 'Contribution overview'}
                  meta={<span>{groups.length} groups</span>} />
                <div className="lens-panel__body lens-contribution-body lens-contribution-body--chart">
                  {overlapMode && !overlapResult.rows.length
                    ? <ScopeEmpty title="No peer groups clear the cutoff" description="Try a lower gross-risk cutoff or include more books and tags." />
                    : <ContributionChart items={contributionItems} selectedId={selectedGroupId} onSelect={selectContribution}
                      formatValue={formatter} emptyMessage="No groups match the current filters." />}
                </div>
              </section>

              <section className="lens-panel lens-table-panel" aria-label="Exposure rows">
                <div className="lens-table-panel__heading">
                  <PanelHeader title={tradeMode ? 'Published trade exposures' : overlapMode ? 'Matched exposure rows' : 'Exposure rows'}
                    eyebrow={tradeMode ? 'Prepared trade result' : 'Underlying-level detail'}
                    subtitle={tradeMode ? 'Trade view shows published trade exposure and risk; it is not a replay of historical intraday trades.' : 'Select a row to inspect settled exposure history.'}
                    meta={<span>{totalVisible} rows</span>} />
                </div>
                <div className="lens-table-wrap">
                  <ExposureTable rows={visibleRows} selectedKey={selectedKey} onSelect={selectExposureRow} copyContext={copyContext} />
                </div>
              </section>
            </div>

          </section>
          <footer className="lens-footer">
            <span>Values remain null when source coverage is missing; zero is preserved as a reported value.</span>
            <span>{activeEnvelope?.data?.meta.source ?? 'Prepared source'} · {dateLabel(dateEnd)}</span>
          </footer>
        </>}
        </div>
      </div>
    </main>
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} entries={commands} label="Search Risk Lens actions" portalContainer={portalContainer} />
  </div>;
}

function viewDateLabel(value?: string | null) {
  return value ? dateLabel(value) : '';
}
