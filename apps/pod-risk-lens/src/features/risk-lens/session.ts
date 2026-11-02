import {riskLensPresentation} from './presentation';
import type {ComparisonData, ContextResponse, Envelope, ExposureRow, HistoryData} from '../../domain/types';
import {rowKey} from '../../domain/types';
import {
  buildExposureGroups, finite, groupIdentity, metricValue,
  type LensMetric, type LensMode,
} from './model';
import {buildExposureLeaders} from './leaders';
import {
  applyScopePreset, createDefaultScope, filterScopedRows, resolveOverlapScope,
  setScopeDimension, type RiskLensScope, type ScopePresetId, type ScopeSelection,
} from './scope';

/**
 * Private, serializable application state. Null and [] retain their distinct
 * meanings in scope selections: null means all, while [] means none.
 */
export interface RiskLensSessionState {
  version: 1;
  mode: LensMode;
  metric: LensMetric;
  horizon: string;
  endpoint: string;
  endDate: string;
  eodEndDate: string;
  liveEndDate: string;
  startDate: string;
  query: string;
  assetClass: string;
  scopeByMode: Record<LensMode, RiskLensScope>;
  cutoffText: string;
  selectedKey: string | null;
  inspectorOpen: boolean;
  range: string;
}

export type RiskLensJsonValue = null | boolean | number | string | RiskLensJsonValue[] | {[key: string]: RiskLensJsonValue};

export interface RiskLensSessionSnapshot extends RiskLensSessionState {
  context: ContextResponse | null;
  contextLoading: boolean;
  contextError: string | null;
  comparison: Envelope<ComparisonData> | null;
  comparisonLoading: boolean;
  comparisonError: string | null;
  trades: Envelope<ComparisonData> | null;
  tradesLoading: boolean;
  tradesError: string | null;
  history: Envelope<HistoryData> | null;
  historyLoading: boolean;
  historyError: string | null;
}

import type {RiskLensDataProvider} from '../../../../../packages/risk-lens-data/contracts';
import type {PreparedDataProvider} from '@sampo/contracts';
export type {RiskLensDataProvider} from '../../../../../packages/risk-lens-data/contracts';

const initialState = (): RiskLensSessionState => ({
  version: 1,
  mode: 'positions',
  metric: 'delta',
  horizon: '1D',
  endpoint: 'Live',
  endDate: '',
  eodEndDate: '',
  liveEndDate: '',
  startDate: '',
  query: '',
  assetClass: 'all',
  scopeByMode: {
    positions: createDefaultScope('positions'),
    trades: createDefaultScope('trades'),
    overlap: createDefaultScope('overlap'),
  },
  cutoffText: riskLensPresentation.defaultOverlapCutoff.toFixed(2),
  selectedKey: null,
  inspectorOpen: false,
  range: '1M',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validMode(value: unknown): value is LensMode {
  return value === 'positions' || value === 'trades' || value === 'overlap';
}

function validScope(value: unknown, mode: LensMode): value is RiskLensScope {
  if (!isRecord(value) || value.mode !== mode) return false;
  const validSelection = (input: unknown) => input === null
    || (Array.isArray(input) && input.every(item => typeof item === 'string'));
  return validSelection(value.books) && validSelection(value.tags)
    && Array.isArray(value.excludedTags) && value.excludedTags.every(item => typeof item === 'string')
    && (value.presetId === null || value.presetId === 'all' || value.presetId === `${mode}-default`);
}

function restoreState(initial: unknown): RiskLensSessionState {
  const defaults = initialState();
  const source = isRecord(initial) && 'state' in initial ? initial.state : initial;
  if (!isRecord(source)) return defaults;
  const restored: RiskLensSessionState = {...defaults};
  if (validMode(source.mode)) restored.mode = source.mode;
  if (source.metric === 'delta' || source.metric === 'risk') restored.metric = source.metric;
  if (typeof source.horizon === 'string' && source.horizon) restored.horizon = source.horizon;
  if (source.endpoint === 'Live' || source.endpoint === 'EOD') restored.endpoint = source.endpoint;
  for (const key of ['endDate', 'eodEndDate', 'liveEndDate', 'startDate', 'query', 'cutoffText', 'range'] as const) {
    if (typeof source[key] === 'string') restored[key] = source[key] as never;
  }
  if (typeof source.assetClass === 'string') restored.assetClass = source.assetClass;
  if (typeof source.selectedKey === 'string' || source.selectedKey === null) restored.selectedKey = source.selectedKey;
  if (typeof source.inspectorOpen === 'boolean') restored.inspectorOpen = source.inspectorOpen;
  if (isRecord(source.scopeByMode)) {
    const scopeByMode = {...defaults.scopeByMode};
    for (const mode of ['positions', 'trades', 'overlap'] as const) {
      if (validScope(source.scopeByMode[mode], mode)) {
        scopeByMode[mode] = {
          ...source.scopeByMode[mode],
          books: source.scopeByMode[mode].books === null ? null : [...source.scopeByMode[mode].books],
          tags: source.scopeByMode[mode].tags === null ? null : [...source.scopeByMode[mode].tags],
          excludedTags: [...source.scopeByMode[mode].excludedTags],
        };
      }
    }
    restored.scopeByMode = scopeByMode;
  }
  // Older standalone snapshots kept the context's EOD date in `endDate` even
  // while Live was selected. Only a publication-derived Live date is reusable.
  if (restored.endpoint === 'Live' && !restored.liveEndDate) restored.endDate = '';
  return restored;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * One Risk Lens controller for one app instance. The host can retain this
 * object for several widgets; separate factory calls stay isolated.
 */
export class RiskLensSession {
  private listeners = new Set<() => void>();
  private state: RiskLensSessionSnapshot;
  private contextRequest = 0;
  private comparisonRequest = 0;
  private tradesRequest = 0;
  private historyRequest = 0;
  private historyKey: string | null = null;
  private started = false;
  private disposed = false;
  private abortSignal?: AbortSignal;
  private abortListener?: () => void;

  constructor(initial: unknown, private readonly provider: RiskLensDataProvider) {
    const durable = restoreState(initial);
    this.state = {
      ...durable,
      context: null, contextLoading: true, contextError: null,
      comparison: null, comparisonLoading: true, comparisonError: null,
      trades: null, tradesLoading: true, tradesError: null,
      history: null, historyLoading: false, historyError: null,
    };
  }

  readonly getSnapshot = (): RiskLensSessionSnapshot => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  serialize(): RiskLensJsonValue {
    const {version, mode, metric, horizon, endpoint, endDate, eodEndDate, liveEndDate,
      startDate, query, assetClass, scopeByMode, cutoffText, selectedKey, inspectorOpen, range} = this.state;
    return JSON.parse(JSON.stringify({
      version, mode, metric, horizon, endpoint, endDate, eodEndDate, liveEndDate,
      startDate, query, assetClass, scopeByMode, cutoffText, selectedKey, inspectorOpen, range,
    })) as RiskLensJsonValue;
  }

  /** Attach the host session lifetime and load its initial publication once. */
  start(signal?: AbortSignal): void {
    if (this.started && !this.disposed) return;
    this.started = true;
    this.disposed = false;
    this.abortSignal = signal;
    if (signal?.aborted) {
      this.dispose();
      return;
    }
    this.abortListener = () => this.dispose();
    signal?.addEventListener('abort', this.abortListener, {once: true});
    void this.readContext();
    const {horizon, endpoint, endDate, startDate} = this.state;
    void this.readComparison(horizon, endpoint, endDate || undefined, horizon === 'CUSTOM' ? startDate || undefined : undefined);
    void this.readTrades();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    ++this.contextRequest;
    ++this.comparisonRequest;
    ++this.tradesRequest;
    ++this.historyRequest;
    this.historyKey = null;
    if (this.abortSignal && this.abortListener) this.abortSignal.removeEventListener('abort', this.abortListener);
    this.abortSignal = undefined;
    this.abortListener = undefined;
    this.listeners.clear();
  }

  get scope(): RiskLensScope { return this.state.scopeByMode[this.state.mode]; }

  get visibleRows(): ExposureRow[] {
    const {mode, comparison, trades, query, assetClass, cutoffText} = this.state;
    const scope = this.scope;
    const positionRows = comparison?.data && (comparison.state === 'ready' || comparison.state === 'partial') ? comparison.data.rows : [];
    if (mode === 'overlap') {
      const number = Number(cutoffText);
      return resolveOverlapScope(positionRows, scope, {
        excludedTags: comparison?.data?.excluded_tags ?? [],
        cutoff: Number.isFinite(number) && number >= 0 ? number : riskLensPresentation.defaultOverlapCutoff,
        query,
        assetClass,
      }).rows;
    }
    const sourceRows = mode === 'trades'
      ? trades?.data && (trades.state === 'ready' || trades.state === 'partial') ? trades.data.rows : []
      : positionRows;
    return filterScopedRows(sourceRows, scope, {query, assetClass});
  }

  getView() {
    const {mode, metric, comparison, trades, selectedKey} = this.state;
    const rows = this.visibleRows;
    const groups = buildExposureGroups(rows, metric, mode === 'overlap');
    const leaders = buildExposureLeaders(groups, metric, mode);
    const selectedRow = rows.find(row => rowKey(row) === selectedKey) ?? null;
    const selectedGroup = groups.find(group => group.rows.some(row => rowKey(row) === selectedKey)) ?? null;
    const selectedLeader = leaders.find(leader => leader.id === selectedGroup?.id) ?? null;
    const source = mode === 'trades' ? trades : comparison;
    return {
      rows, groups, leaders, selectedRow, selectedGroup, selectedLeader, source,
      overlap: mode === 'overlap'
        ? resolveOverlapScope(comparison?.data?.rows ?? [], this.scope, {
          excludedTags: comparison?.data?.excluded_tags ?? [],
          cutoff: Number.isFinite(Number(this.state.cutoffText)) && Number(this.state.cutoffText) >= 0 ? Number(this.state.cutoffText) : riskLensPresentation.defaultOverlapCutoff,
          query: this.state.query,
          assetClass: this.state.assetClass,
        })
        : null,
    };
  }

  setMode(mode: LensMode): void {
    if (mode === this.state.mode) return;
    this.update({mode, inspectorOpen: false, selectedKey: null});
    this.reconcileSelectionAndHistory();
  }

  setMetric(metric: LensMetric): void { if (metric !== this.state.metric) { this.update({metric}); this.refreshHistory(); } }
  setQuery(query: string): void { if (query !== this.state.query) { this.update({query}); this.reconcileSelectionAndHistory(); } }
  setAssetClass(assetClass: string): void { if (assetClass !== this.state.assetClass) { this.update({assetClass}); this.reconcileSelectionAndHistory(); } }
  setCutoffText(cutoffText: string): void { if (cutoffText !== this.state.cutoffText) { this.update({cutoffText}); this.reconcileSelectionAndHistory(); } }
  setStartDate(startDate: string): void { if (startDate !== this.state.startDate) this.update({startDate}); }
  setEndDate(endDate: string): void { if (endDate !== this.state.endDate) this.update({endDate}); }
  setRange(range: string): void { if (range !== this.state.range) { this.update({range}); this.refreshHistory(); } }

  setScope(scope: RiskLensScope): void {
    if (scope.mode !== this.state.mode) return;
    this.update({scopeByMode: {...this.state.scopeByMode, [this.state.mode]: scope}});
    this.reconcileSelectionAndHistory();
  }

  setScopeDimension(dimension: 'books' | 'tags', selection: ScopeSelection): void {
    this.setScope(setScopeDimension(this.scope, dimension, selection));
  }

  applyScopePreset(id: Exclude<ScopePresetId, null>): void {
    this.setScope(applyScopePreset(this.scope, id));
  }

  resetFilters(): void {
    this.update({
      scopeByMode: {...this.state.scopeByMode, [this.state.mode]: createDefaultScope(this.state.mode)},
      query: '', assetClass: 'all',
    });
    this.reconcileSelectionAndHistory();
  }

  selectRow(row: ExposureRow): void {
    const key = rowKey(row);
    if (this.visibleRows.some(candidate => rowKey(candidate) === key)) {
      this.update({selectedKey: key, inspectorOpen: true});
      this.refreshHistory();
    }
  }

  selectContribution(groupId: string): void {
    const group = this.getView().groups.find(candidate => candidate.id === groupId);
    const row = group?.rows.find(candidate => finite(metricValue(candidate, this.state.metric))) ?? group?.rows[0];
    if (row) this.selectRow(row);
  }

  closeInspector(): void { if (this.state.inspectorOpen) this.update({inspectorOpen: false}); }

  chooseHorizon(horizon: string): void {
    this.update({horizon});
    if (horizon === 'CUSTOM') {
      this.update({startDate: this.state.startDate || this.state.comparison?.data?.meta.base_date.slice(0, 10) || ''});
      return;
    }
    this.update({startDate: ''});
    void this.readComparison(horizon, this.state.endpoint, this.retainedEndDate || undefined);
  }

  chooseEndpoint(endpoint: string): void {
    const currentDate = this.retainedEndDate;
    if (this.state.endpoint === 'Live' && currentDate) this.update({liveEndDate: currentDate});
    else if (this.state.endpoint === 'EOD' && currentDate) this.update({eodEndDate: currentDate});
    const nextDate = this.endpointEndDate(endpoint);
    this.update({endpoint, endDate: nextDate || ''});
    if (this.state.horizon === 'CUSTOM' && !this.state.startDate) return;
    void this.readComparison(this.state.horizon === 'CUSTOM' && this.state.startDate ? 'CUSTOM' : this.state.horizon,
      endpoint, nextDate || undefined, this.state.horizon === 'CUSTOM' ? this.state.startDate || undefined : undefined);
  }

  applyDateRange(): void {
    const {startDate} = this.state;
    if (!startDate || !this.retainedEndDate || startDate > this.retainedEndDate) return;
    void this.readComparison('CUSTOM', this.state.endpoint, this.retainedEndDate, startDate);
  }

  applyEndDate(): void {
    if (!this.retainedEndDate) return;
    void this.readComparison(this.state.horizon, this.state.endpoint, this.retainedEndDate);
  }

  refresh(): void {
    void this.readContext();
    if (this.state.mode === 'trades') void this.readTrades();
    else if (this.state.horizon !== 'CUSTOM' || this.state.startDate) {
      void this.readComparison(this.state.horizon === 'CUSTOM' && this.state.startDate ? 'CUSTOM' : this.state.horizon,
        this.state.endpoint, this.retainedEndDate || undefined,
        this.state.horizon === 'CUSTOM' ? this.state.startDate || undefined : undefined);
    }
  }

  get retainedEndDate(): string {
    return this.state.endDate || this.endpointEndDate(this.state.endpoint) || '';
  }

  private endpointEndDate(endpoint: string): string | undefined {
    if (endpoint === 'Live') return this.state.liveEndDate || undefined;
    return this.state.eodEndDate || this.state.context?.snapshot.data?.meta.end_date?.slice(0, 10)
      || (this.state.comparison?.data?.meta.endpoint === 'EOD' ? this.state.comparison.data.meta.end_date?.slice(0, 10) : undefined);
  }

  private update(patch: Partial<RiskLensSessionSnapshot>): void {
    if (this.disposed) return;
    this.state = {...this.state, ...patch};
    for (const listener of this.listeners) listener();
  }

  private async readContext(): Promise<void> {
    const requestId = ++this.contextRequest;
    this.update({contextLoading: true, contextError: null});
    try {
      const result = await this.provider.loadContext();
      if (this.disposed || requestId !== this.contextRequest) return;
      const latestDate = result.snapshot.data?.meta.end_date ?? result.snapshot.data?.meta.base_date;
      const date = latestDate?.slice(0, 10);
      this.update({
        context: result,
        ...(date ? {
          eodEndDate: this.state.eodEndDate || date,
          ...(this.state.endpoint === 'EOD' && !this.state.endDate ? {endDate: date} : {}),
        } : {}),
        range: result.ranges.includes(this.state.range) ? this.state.range : (result.ranges[0] ?? '1M'),
      });
    } catch (error) {
      if (!this.disposed && requestId === this.contextRequest) this.update({contextError: errorMessage(error, 'Could not read source context.')});
    } finally {
      if (!this.disposed && requestId === this.contextRequest) this.update({contextLoading: false});
    }
  }

  private async readComparison(horizon: string, endpoint: string, end?: string, start?: string): Promise<void> {
    const requestId = ++this.comparisonRequest;
    ++this.historyRequest;
    this.historyKey = null;
    const requestedEnd = end || this.endpointEndDate(endpoint);
    this.update({comparisonLoading: true, comparisonError: null, comparison: null, inspectorOpen: false,
      selectedKey: null, history: null, historyError: null, historyLoading: false});
    try {
      const result = await this.provider.loadComparison(horizon, endpoint, requestedEnd || undefined, start || undefined);
      if (this.disposed || requestId !== this.comparisonRequest) return;
      const returnedEndDate = result.state === 'ready' || result.state === 'partial' ? result.data?.meta.end_date : undefined;
      const actualDate = returnedEndDate?.slice(0, 10);
      this.update({
        comparison: result,
        ...(actualDate ? {
          ...(endpoint === 'Live' ? {liveEndDate: actualDate} : {eodEndDate: actualDate}),
          ...(endpoint === this.state.endpoint ? {endDate: actualDate} : {}),
        } : {}),
      });
    } catch (error) {
      if (!this.disposed && requestId === this.comparisonRequest) this.update({comparisonError: errorMessage(error, 'Could not load the prepared comparison.')});
    } finally {
      if (!this.disposed && requestId === this.comparisonRequest) {
        this.update({comparisonLoading: false});
        this.reconcileSelectionAndHistory();
      }
    }
  }

  private async readTrades(): Promise<void> {
    const requestId = ++this.tradesRequest;
    this.update({tradesLoading: true, tradesError: null, trades: null, inspectorOpen: false, selectedKey: null});
    try {
      const result = await this.provider.loadTrades();
      if (!this.disposed && requestId === this.tradesRequest) this.update({trades: result});
    } catch (error) {
      if (!this.disposed && requestId === this.tradesRequest) this.update({tradesError: errorMessage(error, 'Could not load published trade exposures.')});
    } finally {
      if (!this.disposed && requestId === this.tradesRequest) {
        this.update({tradesLoading: false});
        this.reconcileSelectionAndHistory();
      }
    }
  }

  private reconcileSelectionAndHistory(): void {
    if (this.disposed) return;
    const loading = this.state.mode === 'trades' ? this.state.tradesLoading : this.state.comparisonLoading;
    if (!loading) {
      const rows = this.visibleRows;
      let selectedKey = this.state.selectedKey;
      if (!rows.length) selectedKey = null;
      else if (!selectedKey || !rows.some(row => rowKey(row) === selectedKey)) {
        const sourceRows = this.state.mode === 'trades'
          ? this.state.trades?.data?.rows ?? [] : this.state.comparison?.data?.rows ?? [];
        const priorRow = sourceRows.find(row => rowKey(row) === selectedKey);
        const priorGroupId = priorRow ? groupIdentity(priorRow, this.state.mode === 'overlap').id : null;
        const groups = buildExposureGroups(rows, this.state.metric, this.state.mode === 'overlap');
        const replacement = groups.find(group => group.id === priorGroupId)?.rows[0] ?? rows[0];
        selectedKey = rowKey(replacement);
      }
      if (selectedKey !== this.state.selectedKey) this.update({selectedKey});
    }
    this.refreshHistory();
  }

  private refreshHistory(): void {
    if (this.disposed) return;
    const view = this.getView();
    const {mode, range, comparison} = this.state;
    const stamp = mode === 'trades' ? null : comparison?.data?.stamp ?? null;
    const ids = view.selectedLeader?.riskIds ?? (view.selectedRow ? [view.selectedRow.exposure_id] : []);
    const key = stamp && ids.length ? JSON.stringify([stamp, ids, range]) : null;
    if (key === this.historyKey) return;
    this.historyKey = key;
    const requestId = ++this.historyRequest;
    if (!key || !stamp) {
      this.update({history: null, historyLoading: false, historyError: null});
      return;
    }
    this.update({history: null, historyLoading: true, historyError: null});
    void this.provider.loadHistory(stamp, ids, range).then(result => {
      if (!this.disposed && requestId === this.historyRequest) this.update({history: result});
    }).catch(error => {
      if (!this.disposed && requestId === this.historyRequest) this.update({historyError: errorMessage(error, 'Could not load settled exposure history.')});
    }).finally(() => {
      if (!this.disposed && requestId === this.historyRequest) this.update({historyLoading: false});
    });
  }
}

export interface RiskLensAppServices {workspaceId: string; sessionId: string; signal: AbortSignal; data?: PreparedDataProvider;}
export interface RiskLensApplicationFactory {
  createSession(services: RiskLensAppServices, initial: RiskLensJsonValue): RiskLensSession;
}

/** Structurally implements the generic SDK ApplicationFactory contract. */
export function createRiskLensApplication(provider: RiskLensDataProvider | ((services: RiskLensAppServices) => RiskLensDataProvider)): RiskLensApplicationFactory {
  return {
    createSession(services, initial) {
      const session = new RiskLensSession(initial, typeof provider === 'function' ? provider(services) : provider);
      session.start(services.signal);
      return session;
    },
  };
}
