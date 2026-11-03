import type { Instrument, MarketFilters, MarketGroup, MarketNavigation } from "./universe-model";

export type MarketUniverseState = {
  version: 1;
  view: "universe" | "live" | "history";
  filters: MarketFilters;
  watchlist: string[];
  selected: string[];
  focused?: string;
  inspectTab?: "identity" | "coverage" | "surface";
  page?: number;
  sort?: "featured" | "az";
  showDemo?: boolean;
  source?: string;
  dataset?: string;
  historyStart?: string;
  historyEnd?: string;
};
type Catalogue = {
  assets: readonly Instrument[];
  groups: readonly MarketGroup[];
  navigation: MarketNavigation;
  historyWindow: { start: string; end: string };
};
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const string = (v: unknown, limit = 180) => typeof v === "string" ? v.slice(0, limit) : "";
const choice = <T extends string>(v: unknown, values: readonly T[], fallback: T): T =>
  values.includes(v as T) ? v as T : fallback;
/** Rendering state only. Unknown fields and identities never enter a restored selection. */
export function normalizeMarketState(value: unknown, catalogue: Catalogue): Required<MarketUniverseState> {
  const candidate = object(value);
  const s = candidate.version === undefined || candidate.version === 1 ? candidate : {};
  const f = object(s.filters), ids = new Set(catalogue.assets.map(a => a.assetId));
  const list = (v: unknown) => Array.isArray(v)
    ? [...new Set(v.filter((id): id is string => typeof id === "string" && ids.has(id)))].slice(0, 100) : [];
  const date = (v: unknown, fallback: string) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v ? v : fallback;
  return {
    version: 1,
    view: choice(s.view, ["universe", "live", "history"], "universe"),
    filters: {
      query: string(f.query, 160),
      region: catalogue.navigation.regions.some(r => r.id === f.region) ? string(f.region) : "",
      group: catalogue.groups.some(g => g.id === f.group) || catalogue.navigation.collections.some(c => c.id === f.group) ? string(f.group) : "",
      type: choice(f.type, ["", "funds", "equities"], ""),
      coverage: choice(f.coverage, ["", "attention", "ready", "stale", "partial", "missing", "failed", "unknown", "not-connected"], ""),
      watchlistOnly: f.watchlistOnly === true,
    },
    watchlist: list(s.watchlist), selected: list(s.selected),
    focused: typeof s.focused === "string" && ids.has(s.focused) ? s.focused : "",
    inspectTab: choice(s.inspectTab, ["identity", "coverage", "surface"], "identity"),
    page: Number.isInteger(s.page) && (s.page as number) >= 0 ? Math.min(s.page as number, 10000) : 0,
    sort: choice(s.sort, ["featured", "az"], "featured"),
    showDemo: s.showDemo !== false, source: string(s.source), dataset: string(s.dataset),
    historyStart: date(s.historyStart, catalogue.historyWindow.start),
    historyEnd: date(s.historyEnd, catalogue.historyWindow.end),
  };
}
