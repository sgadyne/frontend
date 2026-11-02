import {riskLensPresentation} from './presentation';
import {useMemo} from 'react';
import {useAppSession, type WidgetProps} from '@sampo/sdk-react';
import {formatDate, formatDateRange, formatMillions, formatSignedMillions} from '../../domain/format';
import type {ExposureRow} from '../../domain/types';
import {displayAsset, portfolioStats} from './model';
import {toContributionData} from './contributionChart';
import {buildExposureLeaders, toSelectionItems} from './leaders';
import {getActiveScopePresetId, getScopeDimensions, getScopePresets} from './scope';
import {RiskLensSession} from './session';
import {RiskLensSessionProvider, useRiskLensSession, useRiskLensSessionInstance} from './sessionProvider';
import ExposureTable from '../../components/ExposureTable';
import HistoryPanel from '../../components/HistoryPanel';
import ContributionChart from '../../widgets/contributions/ContributionChart';
import {SelectionCarousel} from '../../widgets/selection';
import {ScopeBar} from '../../widgets/scope';
import {Button, SearchField, SelectField, SegmentedControl} from '../../ui/foundation';
import {MetricCard, PanelHeader, PublicationProvenance, ResultState, StatusBadge} from '../../ui/status';
import {formatNumericValue} from '../../ui/format';

const DEFAULT_HORIZONS = ['1D', '1W', '1M', '3M', 'YTD'];
const ENDPOINT_OPTIONS = [{value: 'EOD', label: 'EOD'}, {value: 'Live', label: 'Live'}] as const;

type WidgetKind = 'scope' | 'summary' | 'contributions' | 'exposures' | 'history';

function SessionWidget({kind, ...props}: WidgetProps & {kind: WidgetKind}) {
  const session = useAppSession<RiskLensSession>(props.sessionId ?? '');
  if (!props.sessionId) throw new Error(`The Risk Lens ${kind} widget requires a session association.`);
  return <RiskLensSessionProvider session={session}>
    <WidgetPanel kind={kind} instanceId={props.instanceId} />
  </RiskLensSessionProvider>;
}

function WidgetPanel({kind, instanceId}: {kind: WidgetKind; instanceId: string}) {
  const session = useRiskLensSessionInstance();
  const state = useRiskLensSession();
  const view = useMemo(() => session.getView(), [session, state]);
  const scope = state.scopeByMode[state.mode];
  const sourceRows = state.mode === 'trades'
    ? state.trades?.data?.rows ?? [] : state.comparison?.data?.rows ?? [];
  const bookOptions = useMemo(() => [...new Set(sourceRows.map(row => row.pod).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [sourceRows]);
  const tagOptions = useMemo(() => [...new Set(sourceRows.map(row => row.tag).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [sourceRows]);
  const assetOptions = useMemo(() => [...new Set(sourceRows.map(row => row.asset_class).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [sourceRows]);
  const tradeMode = state.mode === 'trades';
  const overlapMode = state.mode === 'overlap';
  const activeEnvelope = tradeMode ? state.trades : state.comparison;
  const activeLoading = tradeMode ? state.tradesLoading : state.comparisonLoading;
  const activeError = tradeMode ? state.tradesError : state.comparisonError;
  const hasError = Boolean(activeError || (!activeLoading && activeEnvelope?.state === 'error'));
  const hasActiveData = Boolean(activeEnvelope?.data && (activeEnvelope.state === 'ready' || activeEnvelope.state === 'partial'));
  const stats = portfolioStats(view.rows);
  const historyStamp = state.comparison?.data?.stamp ?? null;
  const modeTitle = state.mode === 'positions' ? 'Positions' : tradeMode ? 'Trades' : 'Reference overlap';
  const scopePresetLabel = getScopePresets(state.mode).find(item => item.id === getActiveScopePresetId(scope))?.label ?? 'Custom';

  if (kind === 'scope') {
    const tabs = [{id: 'positions', label: 'Positions'}, {id: 'trades', label: 'Trades'}, {id: 'overlap', label: 'Reference overlap'}] as const;
    const horizonOptions = [...new Set([...(state.context?.horizons?.filter(value => value !== 'CUSTOM') ?? DEFAULT_HORIZONS), ...DEFAULT_HORIZONS])]
      .map(value => ({value, label: value}));
    horizonOptions.push({value: 'CUSTOM', label: 'Custom dates'});
    const assetOptionsForSelect = [{value: 'all', label: 'All asset classes'}, ...assetOptions.map(value => {
      const sample = sourceRows.find(row => row.asset_class === value);
      return {value, label: sample ? displayAsset(sample) : value};
    })];
    if (state.assetClass !== 'all' && !assetOptions.includes(state.assetClass)) assetOptionsForSelect.push({value: state.assetClass, label: state.assetClass});
    const scopeDimensions = getScopeDimensions(scope, bookOptions, tagOptions, overlapMode ? state.comparison?.data?.excluded_tags ?? [] : []);
    const retainedEndDate = session.retainedEndDate;
    const controlEndDate = state.endpoint === 'Live' && !(state.comparison?.data && (state.comparison.state === 'ready' || state.comparison.state === 'partial')) ? '' : retainedEndDate;
    return <div className="risk-lens-widget risk-lens-scope-widget" data-instance-id={instanceId}>
      <div className="lens-workspace-tabs" role="tablist" aria-label="Risk views">
        {tabs.map((tab, index) => <button key={tab.id} id={`${instanceId}-mode-${tab.id}`} type="button" role="tab"
          aria-selected={state.mode === tab.id} aria-controls={`${instanceId}-scope-panel`} tabIndex={state.mode === tab.id ? 0 : -1}
          onClick={() => session.setMode(tab.id)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
            if (next === null) return;
            event.preventDefault();
            session.setMode(tabs[next].id);
            document.getElementById(`${instanceId}-mode-${tabs[next].id}`)?.focus();
          }}>{tab.label}</button>)}
      </div>
      <div id={`${instanceId}-scope-panel`} role="tabpanel" aria-labelledby={`${instanceId}-mode-${state.mode}`}>
      <div className="lens-period-controls">
        <SelectField id={`${instanceId}-horizon`} label="Horizon" value={state.horizon} onChange={value => session.chooseHorizon(value)}
          options={horizonOptions} className="lens-control lens-control--horizon" disabled={tradeMode || state.comparisonLoading} />
        <SegmentedControl label="Pricing endpoint" value={state.endpoint} onChange={value => session.chooseEndpoint(value)} options={ENDPOINT_OPTIONS} disabled={tradeMode || state.comparisonLoading} />
        {state.horizon === 'CUSTOM' ? <>
          <label className="date-control"><span>Start date</span><input type="date" value={state.startDate} max={retainedEndDate || undefined} disabled={tradeMode || state.endpoint === 'Live'} onChange={event => session.setStartDate(event.currentTarget.value)} /></label>
          <label className="date-control"><span>{state.endpoint === 'Live' ? 'Source as-of' : 'End date'}</span><input type="date" value={controlEndDate} disabled={tradeMode || state.endpoint === 'Live'} onChange={event => session.setEndDate(event.currentTarget.value)} /></label>
          <Button variant="primary" onClick={() => session.applyDateRange()} disabled={tradeMode || state.endpoint === 'Live' || !state.startDate || !retainedEndDate || state.startDate > retainedEndDate || state.comparisonLoading}>Apply dates</Button>
        </> : <>
          <label className="date-control"><span>{state.endpoint === 'Live' ? 'Source as-of' : 'End date'}</span><input type="date" value={controlEndDate} disabled={tradeMode || state.endpoint === 'Live'} onChange={event => session.setEndDate(event.currentTarget.value)} /></label>
          <Button variant="secondary" onClick={() => session.applyEndDate()} disabled={tradeMode || state.endpoint === 'Live' || !retainedEndDate || state.comparisonLoading}>Apply date</Button>
        </>}
      </div>
      <ScopeBar context={[
        {label: 'Window', value: activeEnvelope?.data?.meta.base_date && activeEnvelope.data.meta.end_date ? `${activeEnvelope.data.meta.horizon} · ${formatDateRange(activeEnvelope.data.meta.base_date, activeEnvelope.data.meta.end_date)}` : 'Unavailable'},
        {label: 'Units', value: [...new Set(view.groups.map(group => group.unit))].join('; ') || (hasActiveData ? 'No visible groups' : activeLoading ? 'Reading' : 'Unavailable')},
        ...(overlapMode ? [{label: 'Reference book', value: riskLensPresentation.referenceBook}] : []),
      ]} presets={getScopePresets(state.mode)} activePresetId={getActiveScopePresetId(scope)} defaultPresetId={`${state.mode}-default`}
        dimensions={scopeDimensions} onPresetChange={id => session.applyScopePreset(id as 'all' | `${typeof state.mode}-default`)}
        onDimensionChange={(dimension, value) => { if (dimension === 'books' || dimension === 'tags') session.setScopeDimension(dimension, value); }}
        onReset={() => session.resetFilters()} />
      <div className="lens-filter-panel">
        <div className="lens-filter-panel__search"><SearchField id={`${instanceId}-query`} label="Search exposures" value={state.query}
          onChange={value => session.setQuery(value)} placeholder="Search underlying, book, asset class, or tag" /></div>
        <SelectField id={`${instanceId}-asset-class`} label="Asset class" value={state.assetClass} onChange={value => session.setAssetClass(value)} options={assetOptionsForSelect} className="lens-control lens-control--asset" />
        {overlapMode && <label className="cutoff-control"><span>Gross reference risk cutoff</span><span className="cutoff-control__input"><input type="number" min="0" step="0.05" value={state.cutoffText} onChange={event => session.setCutoffText(event.currentTarget.value)} aria-label="Gross reference risk cutoff"/><small>$M / day</small></span></label>}
        <div className="lens-filter-panel__metric"><span>Rank by</span><SegmentedControl label="Contribution metric" value={state.metric} onChange={value => session.setMetric(value)} options={[{value: 'delta', label: 'Delta'}, {value: 'risk', label: 'Daily risk'}]} /></div>
      </div>
      </div>
    </div>;
  }

  if (kind === 'summary') {
    const sourceAsOf = activeEnvelope?.freshness?.source_as_of ?? activeEnvelope?.data?.meta.live_source_as_of;
    const units = [...new Set(view.groups.map(group => group.unit))];
    return <div className="risk-lens-widget risk-lens-summary-widget" data-instance-id={instanceId}>
      <header className="lens-topbar"><div className="lens-breadcrumb"><h2>Risk Lens</h2><strong>{modeTitle}</strong></div>
        <div className="lens-topbar__actions"><StatusBadge status={activeLoading ? 'loading' : hasError ? 'error' : activeEnvelope?.state === 'missing' ? 'missing' : activeEnvelope?.state === 'partial' ? 'partial' : 'ready'} label={activeLoading ? 'Reading' : hasError ? 'Unavailable' : activeEnvelope?.state === 'partial' ? 'Partial' : activeEnvelope?.state === 'missing' ? 'Missing' : 'Ready'} />
          <Button variant="secondary" onClick={() => session.refresh()} disabled={activeLoading}>Refresh</Button></div></header>
      {activeEnvelope?.state === 'partial' && <ResultState status="partial" title="Partial publication" description={activeEnvelope.message ?? 'Some source observations are unavailable. Totals preserve missing values as unknown.'} detail={activeEnvelope.coverage?.complete === false ? 'Coverage is incomplete for this result.' : undefined} />}
      <section className="lens-metrics" aria-label="Selected portfolio metrics" aria-busy={activeLoading}>
        <MetricCard label={tradeMode ? 'Trade delta exposure' : overlapMode ? 'Matched delta exposure' : 'Net delta exposure'} value={stats.netExposure == null ? null : formatSignedMillions(stats.netExposure, 2)} unit="USD m" note={overlapMode ? 'Reference book + scoped peers' : 'Eligible rows · end of period'} loading={activeLoading} />
        <MetricCard label={tradeMode ? 'Trade delta move' : 'Net delta move'} value={stats.exposureChange == null ? null : formatSignedMillions(stats.exposureChange, 2)} unit="USD m delta" note="Prepared period movement" loading={activeLoading} tone={stats.exposureChange != null && stats.exposureChange < 0 ? 'negative' : stats.exposureChange != null && stats.exposureChange > 0 ? 'positive' : 'neutral'} />
        <MetricCard label="Net daily risk" value={stats.netDailyRisk == null ? null : formatSignedMillions(stats.netDailyRisk, 3)} unit="USD m / day" note={stats.pricedRows < stats.totalRows ? <span className="lens-coverage-warning">{stats.pricedRows}/{stats.totalRows} known</span> : undefined} loading={activeLoading} />
        <MetricCard label="Gross daily risk" value={stats.grossDailyRisk == null ? null : formatMillions(stats.grossDailyRisk, 3)} unit="USD m / day" note="Sum of absolute daily risk" loading={activeLoading} />
      </section>
      <PublicationProvenance namespace={state.context?.namespace ? `${state.context.namespace.scope} / ${state.context.namespace.environment}` : null}
        source={activeEnvelope?.data?.meta.source} sourceAsOf={sourceAsOf} publicationRevision={activeEnvelope?.publication}
        publicationAgeSeconds={activeEnvelope?.freshness?.publication_age_seconds} resultState={activeLoading ? null : hasError ? 'error' : activeEnvelope?.state}
        freshnessState={activeEnvelope?.freshness?.state} />
      <div className="lens-summary-meta">{view.rows.length} rows · {units.join('; ') || 'No visible groups'} · {activeEnvelope?.data?.stamp ?? 'No publication stamp'}</div>
    </div>;
  }

  if (kind === 'contributions') {
    const leaders = view.leaders;
    const items = toSelectionItems(leaders);
    const chartItems = toContributionData(view.groups, state.metric);
    return <div className="risk-lens-widget risk-lens-contribution-widget" data-instance-id={instanceId}>
      <SelectionCarousel density="compact" eyebrow="By absolute net daily risk" heading="Largest exposures" items={items}
        selectedId={state.inspectorOpen ? view.selectedGroup?.id ?? null : null} onSelect={item => session.selectContribution(item.id)} />
      <section className="lens-panel lens-contribution-panel" aria-label="Ranked contribution overview">
        <PanelHeader title={overlapMode ? 'Matched contribution overview' : tradeMode ? 'Trade contribution overview' : 'Contribution overview'} meta={<span>{view.groups.length} groups</span>} />
        <div className="lens-panel__body lens-contribution-body lens-contribution-body--chart">
          {overlapMode && view.overlap?.rows.length === 0
            ? <ResultState status="empty" title="No peer groups clear the cutoff" description="Try a lower gross-risk cutoff or include more books and tags." />
            : <ContributionChart items={chartItems} selectedId={view.selectedGroup?.id ?? null} onSelect={item => session.selectContribution(item.id)}
              formatValue={value => formatNumericValue(value, {maximumSignificantDigits: 10, unavailableText: 'Unavailable'}).text} emptyMessage="No groups match the current filters." />}
        </div>
      </section>
    </div>;
  }

  if (kind === 'exposures') {
    const copyContext = [
      {label: 'Data', value: (activeEnvelope?.fixture ?? activeEnvelope?.data?.meta.fixture ?? state.context?.fixture) ? 'Synthetic fixture' : 'Published real data'},
      {label: 'View', value: modeTitle},
      {label: 'Endpoint', value: activeEnvelope?.data?.meta.endpoint ?? (tradeMode ? 'Published trades' : state.endpoint)},
      {label: 'Horizon', value: activeEnvelope?.data?.meta.horizon ?? state.horizon},
      {label: 'Comparison stamp', value: activeEnvelope?.data?.stamp ?? 'Not supplied'},
    ];
    return <div className="risk-lens-widget risk-lens-table-widget" data-instance-id={instanceId}>
      <section className="lens-panel lens-table-panel" aria-label="Exposure rows">
        <div className="lens-table-panel__heading"><PanelHeader title={tradeMode ? 'Published trade exposures' : overlapMode ? 'Matched exposure rows' : 'Exposure rows'}
          eyebrow={tradeMode ? 'Prepared trade result' : 'Underlying-level detail'}
          subtitle={tradeMode ? 'Trade view shows published trade exposure and risk; it is not a replay of historical intraday trades.' : 'Select a row to inspect settled exposure history.'}
          meta={<span>{view.rows.length} rows</span>} /></div>
        <ExposureTable rows={view.rows} selectedKey={state.selectedKey} onSelect={(row: ExposureRow) => session.selectRow(row)} copyContext={copyContext} />
      </section>
    </div>;
  }

  const row = view.selectedRow;
  if (!state.inspectorOpen) return <div className="risk-lens-widget risk-lens-history-widget" data-instance-id={instanceId}><ResultState status="empty" title="Choose an exposure" description="Select a contribution or table row to inspect its history." /></div>;
  const comparisonLabel = activeEnvelope?.data ? tradeMode ? `Published trades · ${formatDate(activeEnvelope.data.meta.end_date)}`
    : `${formatDate(activeEnvelope.data.meta.base_date)} → ${formatDate(activeEnvelope.data.meta.end_date)} · ${state.endpoint} · ${activeEnvelope.data.meta.horizon}` : undefined;
  const scopeLabel = `${modeTitle} · ${scopePresetLabel}${overlapMode ? ' · Reference book · Peer scope' : ''} · Books: ${scope.books === null ? 'All' : scope.books.length ? scope.books.join(', ') : 'None'} · Tags: ${scope.tags === null ? scope.excludedTags.length ? `Ex ${scope.excludedTags.join(', ')}` : 'All' : scope.tags.length ? scope.tags.join(', ') : 'None'}${state.query ? ` · Search: ${state.query}` : ''}${state.assetClass !== 'all' ? ` · ${state.assetClass}` : ''}`;
  return <div className="risk-lens-widget risk-lens-history-widget" data-instance-id={instanceId}>
    <HistoryPanel row={row} leader={view.selectedLeader} onSelectRow={(next: ExposureRow) => session.selectRow(next)} historyStamp={tradeMode ? null : historyStamp}
      history={state.history} loading={state.historyLoading || state.comparisonLoading} fixture={activeEnvelope?.fixture ?? activeEnvelope?.data?.meta.fixture ?? state.context?.fixture ?? false}
      riskBasis={activeEnvelope?.data?.meta.sigma_basis} scopeLabel={scopeLabel} comparisonLabel={comparisonLabel} range={state.range}
      onRangeChange={value => session.setRange(value)} error={state.historyError} />
  </div>;
}

export function RiskLensScopeWidget(props: WidgetProps) { return <SessionWidget {...props} kind="scope" />; }
export function RiskLensSummaryWidget(props: WidgetProps) { return <SessionWidget {...props} kind="summary" />; }
export function RiskLensContributionWidget(props: WidgetProps) { return <SessionWidget {...props} kind="contributions" />; }
export function RiskLensExposureWidget(props: WidgetProps) { return <SessionWidget {...props} kind="exposures" />; }
export function RiskLensHistoryWidget(props: WidgetProps) { return <SessionWidget {...props} kind="history" />; }
