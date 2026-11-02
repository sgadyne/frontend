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
): CoverageInterval | undefined {
  const intervals =
    row?.intervals.filter((i) => i.start < end && i.end > start) ?? [];
  if (!intervals.length) return undefined;
  // Partial temporal evidence never becomes proof for an entire displayed interval.
  const covered = intervals.filter((i) => i.start <= start && i.end >= end);
  if (intervals.length === 1 && covered.length === 1) return covered[0];
  return {
    start,
    end,
    status: "partial",
    source: [...new Set(intervals.map((i) => i.source))].join(", "),
    dataset: intervals[0].dataset,
    detail: "Mixed or partial recorded coverage; inspect the source intervals.",
  };
}
export function weeklyWindows(start: string, end: string) {
  if (!dateIsValid(start) || !dateIsValid(end) || end <= start) return [];
  const result: { start: string; end: string }[] = [];
  const days = (Date.parse(end) - Date.parse(start)) / 86400000,
    step = Math.max(1, Math.ceil(days / 7 / 26)) * 7;
  let d = start;
  while (d < end) {
    const stop = new Date(Date.parse(d + "T00:00:00Z") + step * 86400000)
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
  if (!input.dataset.trim()) throw Error("Choose a data product.");
  if (!input.reason.trim() || !input.source.trim())
    throw Error("Choose a source and give the draft a reason.");
  const ids = [...new Set(input.assetIds)];
  if (!ids.length) throw Error("Select at least one instrument.");
  if (ids.length > 100) throw Error("Limit this draft to 100 instruments.");
  if (ids.some((id) => !input.catalogueIds.has(id)))
    throw Error("A selected instrument is not in this catalogue revision.");
  const rows = new Map(input.coverage?.rows.map((r) => [r.assetId, r]) ?? []),
    ranges: BackfillDraft["ranges"] = [],
    unresolved: string[] = [];
  for (const assetId of ids) {
    if (input.policy === "full-window") {
      ranges.push({ assetId, start: input.start, end: input.end });
      continue;
    }
    const gaps = (rows.get(assetId)?.intervals ?? [])
      .filter(
        (i) =>
          i.source === input.source &&
          i.dataset === input.dataset &&
          i.status === "gap" &&
          i.start < input.end &&
          i.end > input.start &&
          !(rows.get(assetId)?.intervals ?? []).some(
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
    evidence: input.coverage?.kind ?? "unavailable",
    catalogueRevision: input.catalogueRevision,
    createdAt: input.now ?? new Date().toISOString(),
    source: input.source,
    dataset: input.dataset,
    policy: input.policy,
    window: { start: input.start, end: input.end, endExclusive: true },
    assetIds: ids,
    ranges,
    unresolvedAssetIds: unresolved,
    reason: input.reason.trim(),
  };
}
