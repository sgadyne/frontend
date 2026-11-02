import {riskLensPresentation} from './presentation';
import type {ExposureRow} from '../../domain/types';
import {displayAsset, groupIdentity, normalizedUnderlying, selectOverlapRows, type LensMetric, type LensMode} from './model';

export type ScopePresetId = 'all' | 'positions-default' | 'trades-default' | 'overlap-default' | null;
export type ScopeSelection = readonly string[] | null;

export interface RiskLensScope {
  mode: LensMode;
  presetId: ScopePresetId;
  /** null means every book; [] is an explicitly empty book selection. */
  books: ScopeSelection;
  /** null means every tag except excludedTags; [] is explicitly no tags. */
  tags: ScopeSelection;
  excludedTags: readonly string[];
}

export interface ScopeOption {id: string; label: string;}
export interface ScopePreset {id: Exclude<ScopePresetId, null>; label: string;}
export interface ScopeDimension {
  id: 'books' | 'tags';
  label: string;
  options: readonly ScopeOption[];
  value: ScopeSelection;
  excluded: readonly ScopeOption[];
}

export interface ScopeFilterOptions {
  query?: string;
  assetClass?: string;
  excludedTags?: readonly string[];
  cutoff?: number;
}

export interface OverlapScopeResult {
  rows: ExposureRow[];
  peerRows: ExposureRow[];
  referenceRows: ExposureRow[];
  qualifyingGroups: number;
  excludedUnpriced: number;
}

export interface AppliedLensContext {
  mode: LensMode;
  endpoint: string;
  horizon: string;
  baseDate: string | null;
  endDate: string | null;
  scope: RiskLensScope;
  metric: LensMetric;
  /** A single unit is only stated when every displayed group uses that unit. */
  unit: string | null;
  units: readonly string[];
  source: string | readonly string[] | null;
}

const DEFAULT_PRESET: Record<LensMode, Exclude<ScopePresetId, null>> = {
  positions: 'positions-default',
  trades: 'trades-default',
  overlap: 'overlap-default',
};



function unique(values: readonly string[]) { return [...new Set(values)]; }

function equalSelection(a: ScopeSelection, b: ScopeSelection) {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizedSelection(value: ScopeSelection): ScopeSelection {
  return value === null ? null : unique(value);
}

export function getDefaultScopePresetId(mode: LensMode) { return DEFAULT_PRESET[mode]; }

export function createDefaultScope(mode: LensMode): RiskLensScope {
  return {mode, presetId: DEFAULT_PRESET[mode], books: null, tags: null, excludedTags: [...riskLensPresentation.defaultExclusions[mode]]};
}

export function applyScopePreset(scope: RiskLensScope, id: Exclude<ScopePresetId, null>): RiskLensScope {
  if (id === 'all') return {mode: scope.mode, presetId: 'all', books: null, tags: null, excludedTags: []};
  if (id !== DEFAULT_PRESET[scope.mode]) throw new Error(`Preset ${id} is not available in ${scope.mode} mode.`);
  return createDefaultScope(scope.mode);
}

export function setScopeDimension(scope: RiskLensScope, dimension: 'books' | 'tags', value: ScopeSelection): RiskLensScope {
  const selection = normalizedSelection(value);
  if (equalSelection(scope[dimension], selection) && (dimension !== 'tags' || scope.excludedTags.length === 0)) return scope;
  return dimension === 'books'
    ? {...scope, presetId: null, books: selection}
    : {...scope, presetId: null, tags: selection, excludedTags: []};
}

export function getScopePresets(mode: LensMode): ScopePreset[] {
  return [
    {id: DEFAULT_PRESET[mode], label: riskLensPresentation.defaultLabels[mode]},
    {id: 'all', label: 'All books & tags'},
  ];
}

export function getActiveScopePresetId(scope: RiskLensScope): ScopePresetId { return scope.presetId; }

export function getScopeDimensions(
  scope: RiskLensScope,
  bookOptions: readonly string[],
  tagOptions: readonly string[],
  sourceExcludedTags: readonly string[] = [],
): ScopeDimension[] {
  const availableBooks = unique(bookOptions).filter(book => !riskLensPresentation.excludedBooks.includes(book) && !(scope.mode === 'overlap' && book === riskLensPresentation.referenceBook));
  const availableTags = unique(tagOptions).filter(tag => !riskLensPresentation.excludedTags.includes(tag)
    && !(scope.mode === 'overlap' && sourceExcludedTags.includes(tag)));
  const excludedBookIds = bookOptions.filter(book=>riskLensPresentation.excludedBooks.includes(book));
  const excludedTagIds = [...new Set([
    ...scope.excludedTags,
    ...(scope.mode === 'overlap' ? sourceExcludedTags.filter(tag => tagOptions.includes(tag)) : []),
    ...tagOptions.filter(tag=>riskLensPresentation.excludedTags.includes(tag)),
  ])].sort((a, b) => a.localeCompare(b));
  const excludedTagSet = new Set(excludedTagIds);
  const excluded = excludedTagIds.map(tag => ({id: tag, label: tag}));
  const tagValue = scope.tags !== null ? scope.tags.filter(tag => availableTags.includes(tag))
    : availableTags.length === 0 ? null
      : excludedTagSet.size ? availableTags.filter(tag => !excludedTagSet.has(tag)) : null;
  return [
    {id: 'books', label: scope.mode === 'overlap' ? 'Peer books' : 'Books', options: availableBooks.map(value => ({id: value, label: value})),
      value: scope.books === null ? null : scope.books.filter(book => availableBooks.includes(book)),
      excluded: excludedBookIds.map(book => ({id: book, label: book}))},
    {id: 'tags', label: scope.mode === 'overlap' ? 'Peer tags' : 'Tags', options: availableTags.map(value => ({id: value, label: value})), value: tagValue, excluded},
  ];
}

function selected(values: ScopeSelection, value: string) {
  return values === null || values.includes(value);
}

function matchesScopeTag(tag: string, scope: RiskLensScope) {
  return scope.tags === null ? !scope.excludedTags.includes(tag) : scope.tags.includes(tag);
}

function matchesGlobal(row: ExposureRow, {query = '', assetClass = 'all'}: ScopeFilterOptions, overlap = false) {
  if (assetClass !== 'all' && assetClass && row.asset_class !== assetClass) return false;
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  const identityLabel = overlap ? groupIdentity(row, true).label : normalizedUnderlying(row);
  return [row.underlying, identityLabel, row.pod, row.tag, displayAsset(row), row.asset_class, row.currency, row.context, row.exposure_id]
    .some(value => value?.toLocaleLowerCase().includes(needle));
}

function baseRows(rows: readonly ExposureRow[]) {
  return rows.filter(row => !riskLensPresentation.excludedTags.includes(row.tag) && !riskLensPresentation.excludedBooks.includes(row.pod));
}

export function filterScopedRows(rows: readonly ExposureRow[], scope: RiskLensScope, options: ScopeFilterOptions = {}): ExposureRow[] {
  if (scope.mode === 'overlap') return resolveOverlapScope(rows, scope, options).rows;
  if (scope.books?.length === 0 || scope.tags?.length === 0) return [];
  return baseRows(rows).filter(row => selected(scope.books, row.pod) && matchesScopeTag(row.tag, scope) && matchesGlobal(row, options));
}

/**
 * Overlap has a separate reference universe: publication-approved reference rows
 * define qualifying keys, while user book/tag choices filter peer rows only.
 * The existing Risk Lens qualification routine owns cutoff and valued-peer
 * semantics; this adapter makes the mode-specific row scope explicit.
 */
export function resolveOverlapScope(
  rows: readonly ExposureRow[],
  scope: RiskLensScope,
  {excludedTags = [], cutoff = riskLensPresentation.defaultOverlapCutoff, query = '', assetClass = 'all'}: ScopeFilterOptions = {},
): OverlapScopeResult {
  if (scope.mode !== 'overlap') throw new Error('resolveOverlapScope requires overlap mode.');
  if (scope.books?.length === 0 || scope.tags?.length === 0) {
    return {rows: [], peerRows: [], referenceRows: [], qualifyingGroups: 0, excludedUnpriced: 0};
  }
  const sourceExcluded = new Set(excludedTags);
  const eligibleRows = baseRows(rows).filter(row => !sourceExcluded.has(row.tag));
  const peerCandidates = eligibleRows.filter(row => row.pod !== riskLensPresentation.referenceBook
    && selected(scope.books, row.pod)
    && matchesScopeTag(row.tag, scope));
  const qualifying = selectOverlapRows(eligibleRows, peerCandidates, cutoff);
  const qualifyingIds = new Set(qualifying.rows.map(row => groupIdentity(row, true).id));
  const peerSet = new Set(qualifying.rows);
  const referenceRows = eligibleRows.filter(row => row.pod === riskLensPresentation.referenceBook
    && qualifyingIds.has(groupIdentity(row, true).id)
    && matchesGlobal(row, {query, assetClass}, true));
  const peerRows = qualifying.rows.filter(row => matchesGlobal(row, {query, assetClass}, true));
  const rowsInSourceOrder = eligibleRows.filter(row => (row.pod === riskLensPresentation.referenceBook
    ? qualifyingIds.has(groupIdentity(row, true).id)
    : peerSet.has(row)) && matchesGlobal(row, {query, assetClass}, true));
  return {
    rows: rowsInSourceOrder,
    peerRows,
    referenceRows,
    qualifyingGroups: qualifying.qualifyingGroups,
    excludedUnpriced: qualifying.excludedUnpriced,
  };
}

export function createAppliedContext(input: {
  mode: LensMode;
  endpoint: string;
  horizon: string;
  baseDate: string | null;
  endDate: string | null;
  metric: LensMetric;
  units: readonly string[];
  source: string | readonly string[] | null;
  scope?: RiskLensScope;
}): AppliedLensContext {
  const units = unique(input.units);
  return {
    mode: input.mode,
    endpoint: input.endpoint,
    horizon: input.horizon,
    baseDate: input.baseDate,
    endDate: input.endDate,
    scope: input.scope?.mode === input.mode ? input.scope : createDefaultScope(input.mode),
    metric: input.metric,
    unit: units.length === 1 ? units[0] : null,
    units,
    source: input.source,
  };
}

export function withScope(context: AppliedLensContext, scope: RiskLensScope): AppliedLensContext {
  if (context.mode !== scope.mode) throw new Error('Scope mode must match the applied context mode.');
  return {...context, scope};
}
