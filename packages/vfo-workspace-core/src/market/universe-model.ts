export type Instrument = {
  assetId: string;
  ticker: string;
  name: string;
  region?: string;
  country?: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  instrumentType?: string;
  logo?: string;
  source?: string;
  asof?: string;
};
export type MarketGroup = {
  id: string;
  title: string;
  category: string;
  assetIds: string[];
  revision?: string;
  asof?: string;
  provenance?: string;
  pinnedFundIds?: string[];
};
export type MarketNavigation = {
  schemaVersion: 1;
  regions: {
    id: string;
    title: string;
    shortTitle: string;
    description: string;
    groupId: string;
    featuredAssetIds: string[];
    etfs: { assetId: string; label: string; groupId?: string }[];
  }[];
  collections: {
    id: string;
    title: string;
    description: string;
    regionId: string;
    assetIds: string[];
    etfIds: string[];
  }[];
};
export type CoverageStatus =
  | "ready"
  | "stale"
  | "partial"
  | "missing"
  | "failed"
  | "unknown"
  | "not-connected";
export type IntervalStatus =
  | "available"
  | "partial"
  | "gap"
  | "failed"
  | "unknown";
export type CoverageInterval = {
  start: string;
  end: string;
  status: IntervalStatus;
  source: string;
  dataset: string;
  detail?: string;
};
export type CoverageRow = {
  assetId: string;
  quotes: CoverageStatus;
  surfaces: CoverageStatus;
  source: string;
  asOf: string;
  intervals: CoverageInterval[];
  issues?: string[];
  historyIssues?: string[];
};
export type CoverageSnapshot = {
  asOf: string;
  kind: "demo" | "observed";
  label: string;
  rows: CoverageRow[];
};
export type MarketFilters = {
  query: string;
  region: string;
  group: string;
  type: string;
  coverage: string;
  watchlistOnly: boolean;
};
export type BackfillDraft = {
  schemaVersion: 1;
  kind: "market-backfill-draft";
  execution: "not-submitted";
  evidence: "demo" | "observed" | "unavailable";
  catalogueRevision: string;
  createdAt: string;
  source: string;
  dataset: string;
  policy: "full-window" | "confirmed-gaps";
  window: { start: string; end: string; endExclusive: true };
  assetIds: string[];
  ranges: { assetId: string; start: string; end: string }[];
  unresolvedAssetIds: string[];
  reason: string;
  evidenceAsOf?: string;
  evidenceLabel?: string;
};
export const emptyMarketFilters: MarketFilters = {
  query: "",
  region: "",
  group: "",
  type: "",
  coverage: "",
  watchlistOnly: false,
};
export const coverageLabels: Record<CoverageStatus, string> = {
  ready: "Available",
  stale: "Stale",
  partial: "Partial",
  missing: "Missing",
  failed: "Failed",
  unknown: "Unknown",
  "not-connected": "Not connected",
};
export const intervalLabels: Record<IntervalStatus, string> = {
  available: "Recorded",
  partial: "Partial",
  gap: "Confirmed gap",
  failed: "Failed",
  unknown: "Unknown",
};
export function dateIsValid(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export type CoverageScope = { source: string; dataset: string };
const statuses = new Set(Object.keys(coverageLabels));
const intervalStatuses = new Set(Object.keys(intervalLabels));
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
export const timestampIsValid = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  dateIsValid(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
export function intervalIsValid(value: unknown): value is CoverageInterval {
  return record(value) && typeof value.start === "string" &&
    typeof value.end === "string" && dateIsValid(value.start) &&
    dateIsValid(value.end) && value.start < value.end &&
    text(value.source) && text(value.dataset) &&
    typeof value.status === "string" && intervalStatuses.has(value.status);
}
export function normalizeCoverageSnapshot(value: unknown): {
  snapshot?: CoverageSnapshot; issues: string[];
} {
  if (value === undefined) return { issues: [] };
  if (!record(value) || !["demo", "observed"].includes(String(value.kind)) || !Array.isArray(value.rows))
    return { issues: ["Coverage snapshot is malformed. Evidence is unavailable."] };
  const issues: string[] = [];
  const rows = new Map<string, CoverageRow>();
  const snapshotTimeIsValid = timestampIsValid(value.asOf);
  if (!snapshotTimeIsValid) issues.push("Snapshot as-of time is missing or invalid.");
  for (const candidate of value.rows) {
    if (!record(candidate) || !text(candidate.assetId)) {
      issues.push("An evidence row has no instrument identity and was excluded.");
      continue;
    }
    const rowIssues: string[] = [], historyIssues: string[] = [];
    if (!snapshotTimeIsValid) historyIssues.push("Snapshot as-of time is invalid; historical evidence needs provider review.");
    const validSource = text(candidate.source);
    const validTime = timestampIsValid(candidate.asOf);
    if (!validSource) rowIssues.push("Evidence source is missing.");
    if (!validTime) rowIssues.push("Evidence as-of time is missing or invalid.");
    const status = (key: "quotes" | "surfaces"): CoverageStatus => {
      const s = candidate[key];
      if (typeof s !== "string" || !statuses.has(s)) {
        rowIssues.push("Unrecognized " + key + " evidence state.");
        return "unknown";
      }
      return validSource && validTime && snapshotTimeIsValid ? s as CoverageStatus : "unknown";
    };
    const intervals: CoverageInterval[] = [];
    if (!Array.isArray(candidate.intervals)) historyIssues.push("Historical intervals are missing or malformed.");
    else for (const i of candidate.intervals) {
      if (!intervalIsValid(i)) historyIssues.push("A historical interval is malformed; confirmed gaps are unavailable for this instrument.");
      else intervals.push({ start: i.start, end: i.end, status: i.status, source: i.source, dataset: i.dataset,
        ...(typeof i.detail === "string" ? { detail: i.detail } : {}) });
    }
    if (Array.isArray(candidate.historyIssues) && candidate.historyIssues.length)
      historyIssues.push("Historical evidence was marked invalid by its provider.");
    const row: CoverageRow = { assetId: candidate.assetId, source: validSource ? candidate.source as string : "",
      asOf: validTime ? candidate.asOf as string : "", quotes: status("quotes"), surfaces: status("surfaces"), intervals };
    const previous = rows.get(row.assetId);
    if (previous) {
      row.quotes = row.surfaces = "unknown";
      row.intervals = [...previous.intervals, ...row.intervals];
      historyIssues.push("Duplicate instrument evidence rows conflict; inspect the provider snapshot.");
      rowIssues.push("Duplicate instrument evidence rows.");
    }
    if (rowIssues.length) row.issues = [...new Set(rowIssues)];
    if (historyIssues.length) row.historyIssues = [...new Set(historyIssues)];
    issues.push(...rowIssues.map(i => row.assetId + ": " + i), ...historyIssues.map(i => row.assetId + ": " + i));
    rows.set(row.assetId, row);
  }
  return { snapshot: { kind: value.kind as CoverageSnapshot["kind"],
    label: text(value.label) ? value.label : "Coverage evidence", asOf: timestampIsValid(value.asOf) ? value.asOf : "",
    rows: [...rows.values()] }, issues };
}
export function coverageScopes(snapshot?: CoverageSnapshot): CoverageScope[] {
  const scopes = new Map<string, CoverageScope>();
  for (const row of snapshot?.rows ?? []) for (const i of row.intervals) {
    if (intervalIsValid(i)) scopes.set(JSON.stringify([i.source, i.dataset]), { source: i.source, dataset: i.dataset });
  }
  return [...scopes.values()].sort((a, b) => a.source.localeCompare(b.source) || a.dataset.localeCompare(b.dataset));
}
export function historyIntervals(row?: CoverageRow, scope?: CoverageScope) {
  if (row?.historyIssues?.length) return [];
  return (Array.isArray(row?.intervals) ? row.intervals : []).filter(i => intervalIsValid(i) &&
    (!scope || (i.source === scope.source && i.dataset === scope.dataset)));
}
export function filterInstruments(
  assets: readonly Instrument[],
  groups: readonly MarketGroup[],
  navigation: MarketNavigation,
  filters: MarketFilters,
  coverage: ReadonlyMap<string, CoverageRow>,
  watchlist: ReadonlySet<string>,
) {
  const region = navigation.regions.find((r) => r.id === filters.region),
    regionIds = region
      ? new Set(groups.find((g) => g.id === region.groupId)?.assetIds ?? [])
      : null;
  const group = groups.find((g) => g.id === filters.group),
    collection = navigation.collections.find((g) => g.id === filters.group);
  const members = group
    ? new Set(group.assetIds)
    : collection
      ? new Set(collection.assetIds)
      : null;
  const words = filters.query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return assets.filter(
    (a) =>
      (!regionIds || regionIds.has(a.assetId)) &&
      (!members || members.has(a.assetId)) &&
      (!filters.type ||
        (filters.type === "funds"
          ? a.instrumentType === "ETF"
          : a.instrumentType !== "ETF")) &&
      (!filters.watchlistOnly || watchlist.has(a.assetId)) &&
      (!filters.coverage ||
        (filters.coverage === "attention"
          ? ["stale", "partial"].includes(
              coverage.get(a.assetId)?.surfaces ?? "",
            )
          : (coverage.get(a.assetId)?.surfaces ?? "not-connected") ===
            filters.coverage)) &&
      words.every((w) =>
        [
          a.ticker,
          a.name,
          a.assetId,
          a.region,
          a.exchange,
          a.sector,
          a.industry,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(w),
      ),
  );
}
export function intervalAt(
  row: CoverageRow | undefined,
  start: string,
  end: string,
  scope?: CoverageScope,
): CoverageInterval | undefined {
  if (!dateIsValid(start) || !dateIsValid(end) || start >= end) return undefined;
  const intervals = historyIntervals(row, scope).filter(i => i.start < end && i.end > start);
  if (!intervals.length) return undefined;
  const pairs = new Set(intervals.map(i => JSON.stringify([i.source, i.dataset])));
  if (pairs.size > 1) return { start, end, status: "unknown", source: "Multiple sources", dataset: "Multiple products",
    detail: "Choose one source and data product to inspect historical evidence." };
  const ordered = [...intervals].sort((a, b) => a.start.localeCompare(b.start));
  let cursor = start;
  for (const i of ordered) { if (i.start > cursor) break; if (i.end > cursor) cursor = i.end; }
  const continuous = cursor >= end;
  const sameStatus = intervals.every(i => i.status === intervals[0].status);
  if (continuous && sameStatus) return { ...intervals[0], start, end };
  return {
    start,
    end,
    status: "partial",
    source: intervals[0].source,
    dataset: intervals[0].dataset,
    detail: "Incomplete or conflicting evidence within this source and product; inspect the recorded intervals.",
  };
}
export function weeklyWindows(start: string, end: string) {
  if (!dateIsValid(start) || !dateIsValid(end) || end <= start) return [];
  const result: { start: string; end: string }[] = [];
  const days = (Date.parse(end) - Date.parse(start)) / 86400000,
    step = Math.max(1, Math.ceil(days / 7 / 26)) * 7;
  let d = start;
  while (d < end) {
    const stop = new Date(Math.min(Date.parse(end + "T00:00:00Z"), Date.parse(d + "T00:00:00Z") + step * 86400000))
      .toISOString()
      .slice(0, 10);
    result.push({ start: d, end: stop < end ? stop : end });
    d = stop;
  }
  return result;
}
export function makeBackfillDraft(input: {
  assetIds: string[];
  catalogueIds: ReadonlySet<string>;
  catalogueRevision: string;
  coverage?: CoverageSnapshot;
  start: string;
  end: string;
  source: string;
  dataset: string;
  policy: BackfillDraft["policy"];
  reason: string;
  now?: string;
}): BackfillDraft {
  if (
    !dateIsValid(input.start) ||
    !dateIsValid(input.end) ||
    input.end <= input.start
  )
    throw Error("Choose a valid start and an end after it. End is excluded.");
  if ((Date.parse(input.end) - Date.parse(input.start)) / 86400000 > 3660)
    throw Error("Limit a draft to ten calendar years.");
  if (!["full-window", "confirmed-gaps"].includes(input.policy)) throw Error("Choose a valid range policy.");
  if (!input.dataset.trim()) throw Error("Choose a data product.");
  if (!input.reason.trim() || !input.source.trim())
    throw Error("Choose a source and give the draft a reason.");
  const ids = [...new Set(input.assetIds)];
  if (!ids.length) throw Error("Select at least one instrument.");
  if (ids.length > 100) throw Error("Limit this draft to 100 instruments.");
  if (ids.some((id) => !input.catalogueIds.has(id)))
    throw Error("A selected instrument is not in this catalogue revision.");
  const coverage = normalizeCoverageSnapshot(input.coverage).snapshot;
  const source = input.source.trim(), dataset = input.dataset.trim();
  const rows = new Map(coverage?.rows.map((r) => [r.assetId, r]) ?? []),
    ranges: BackfillDraft["ranges"] = [],
    unresolved: string[] = [];
  for (const assetId of ids) {
    if (input.policy === "full-window") {
      ranges.push({ assetId, start: input.start, end: input.end });
      continue;
    }
    const evidence = historyIntervals(rows.get(assetId), { source, dataset });
    const gaps = evidence
      .filter(
        (i) =>
          i.source === source &&
          i.dataset === dataset &&
          i.status === "gap" &&
          i.start < input.end &&
          i.end > input.start &&
          !evidence.some(
            (other) =>
              other !== i &&
              other.source === i.source &&
              other.dataset === i.dataset &&
              other.status !== "gap" &&
              other.start < i.end &&
              other.end > i.start,
          ),
      )
      .map((i) => ({
        assetId,
        start: i.start < input.start ? input.start : i.start,
        end: i.end > input.end ? input.end : i.end,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
    if (!gaps.length) unresolved.push(assetId);
    for (const gap of gaps) {
      const last = ranges.at(-1);
      if (last && last.assetId === assetId && last.end >= gap.start)
        last.end = last.end > gap.end ? last.end : gap.end;
      else ranges.push(gap);
    }
  }
  return {
    schemaVersion: 1,
    kind: "market-backfill-draft",
    execution: "not-submitted",
    evidence: coverage?.kind ?? "unavailable",
    catalogueRevision: input.catalogueRevision,
    createdAt: input.now ?? new Date().toISOString(),
    source,
    dataset,
    policy: input.policy,
    window: { start: input.start, end: input.end, endExclusive: true },
    assetIds: ids,
    ranges,
    unresolvedAssetIds: unresolved,
    reason: input.reason.trim(),
    ...(coverage ? { evidenceAsOf: coverage.asOf, evidenceLabel: coverage.label } : {}),
  };
}
