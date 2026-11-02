import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  coverageLabels,
  intervalLabels,
  emptyMarketFilters,
  filterInstruments,
  intervalAt,
  weeklyWindows,
  makeBackfillDraft,
  type Instrument,
  type MarketGroup,
  type MarketNavigation,
  type CoverageSnapshot,
  type CoverageRow,
  type CoverageStatus,
  type MarketFilters,
  type BackfillDraft,
  type CoverageInterval,
} from "./universe-model";
import "./universe-workbench.css";

type View = "universe" | "live" | "history";
export type MarketUniverseState = {
  version: 1;
  view: View;
  filters: MarketFilters;
  watchlist: string[];
  selected: string[];
};
export type MarketUniverseProps = {
  assets: Instrument[];
  groups: MarketGroup[];
  navigation: MarketNavigation;
  catalogueRevision: string;
  catalogueAsOf: string;
  coverage?: CoverageSnapshot;
  historyWindow: { start: string; end: string };
  initialState?: Partial<MarketUniverseState>;
  onStateChange?: (state: MarketUniverseState) => void;
  onDraft?: (draft: BackfillDraft) => void;
  renderSurface?: (instrument: Instrument) => ReactNode;
};
const n = (value: number) => value.toLocaleString();
const date = (value: string) =>
  new Date(value + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
function Mark({ kind = "globe" }: { kind?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {kind === "search" ? (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      ) : kind === "layers" ? (
        <>
          <path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5" />
        </>
      ) : kind === "pulse" ? (
        <path d="M2 12h5l3-7 4 14 3-7h5" />
      ) : kind === "history" ? (
        <>
          <path d="M4 5v5h5M4 10a8 8 0 1 1 1 8" />
          <path d="M12 7v5l3 2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M5 6h14M5 18h14" />
        </>
      )}
    </svg>
  );
}
function Badge({
  asset,
  size = "normal",
}: {
  asset: Instrument;
  size?: "normal" | "large";
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [asset.logo]);
  return (
    <span className={"mu-badge " + size}>
      {asset.logo && !failed ? (
        <img
          src={asset.logo}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{asset.ticker.replace(/[^a-z0-9]/gi, "").slice(0, 2)}</span>
      )}
    </span>
  );
}
function Status({ value = "not-connected" }: { value?: CoverageStatus }) {
  return (
    <span className={"mu-status is-" + value}>
      <i />
      {coverageLabels[value]}
    </span>
  );
}
function Pill({ children }: { children: ReactNode }) {
  return <span className="mu-pill">{children}</span>;
}
function download(draft: BackfillDraft) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(draft, null, 2) + "\n"], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "market-backfill-draft.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MarketUniverseWorkbench(props: MarketUniverseProps) {
  const {
    assets,
    groups,
    navigation,
    coverage,
    catalogueRevision,
    catalogueAsOf,
    historyWindow,
  } = props;
  const [view, setView] = useState<View>(
    ["universe", "live", "history"].includes(props.initialState?.view ?? "")
      ? props.initialState!.view!
      : "universe",
  );
  const [filters, setFilters] = useState<MarketFilters>({
    ...emptyMarketFilters,
    ...props.initialState?.filters,
  });
  const [watchlist, setWatchlist] = useState<string[]>(
    props.initialState?.watchlist?.slice(0, 100) ?? [],
  );
  const [selected, setSelected] = useState<string[]>(
    props.initialState?.selected?.slice(0, 100) ?? [],
  );
  const [showDemo, setShowDemo] = useState(true),
    [page, setPage] = useState(0),
    [sort, setSort] = useState<"featured" | "az">("featured");
  const [source, setSource] = useState(""),
    [focused, setFocused] = useState<string | null>(null),
    [inspectTab, setInspectTab] = useState<"identity" | "coverage" | "surface">(
      "identity",
    ),
    [interval, setInterval] = useState<CoverageInterval | null>(null);
  const [planning, setPlanning] = useState(false),
    [notice, setNotice] = useState(""),
    [historyStart, setHistoryStart] = useState(historyWindow.start),
    [historyEnd, setHistoryEnd] = useState(historyWindow.end);
  const closeInspector = useRef<HTMLButtonElement>(null),
    opener = useRef<HTMLElement | null>(null),
    stateCallback = useRef(props.onStateChange);
  stateCallback.current = props.onStateChange;
  const activeCoverage =
    coverage?.kind === "demo" && !showDemo ? undefined : coverage;
  const rows = useMemo(
    () => new Map(activeCoverage?.rows.map((r) => [r.assetId, r]) ?? []),
    [activeCoverage],
  );
  const byId = useMemo(
      () => new Map(assets.map((a) => [a.assetId, a])),
      [assets],
    ),
    groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]),
    watch = useMemo(() => new Set(watchlist), [watchlist]);
  const query = useDeferredValue(filters.query),
    pageSize = view === "history" ? 18 : 30;
  const region = navigation.regions.find((r) => r.id === filters.region),
    group = groupById.get(filters.group),
    collection = navigation.collections.find((c) => c.id === filters.group);
  const filtered = useMemo(
    () =>
      filterInstruments(
        assets,
        groups,
        navigation,
        { ...filters, query },
        rows,
        watch,
      ).filter((a) => !source || rows.get(a.assetId)?.source === source),
    [assets, groups, navigation, filters, query, rows, watch, source],
  );
  const featured = useMemo(
    () =>
      new Map(
        navigation.regions
          .flatMap((r) => r.featuredAssetIds)
          .map((id, i) => [id, i]),
      ),
    [navigation],
  );
  const ordered = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        sort === "az"
          ? a.ticker.localeCompare(b.ticker)
          : (featured.get(a.assetId) ?? 99999) -
              (featured.get(b.assetId) ?? 99999) ||
            a.ticker.localeCompare(b.ticker),
      ),
    [filtered, sort, featured],
  );
  const visible = ordered.slice(page * pageSize, (page + 1) * pageSize),
    selectedSet = new Set(selected);
  const windows = weeklyWindows(historyStart, historyEnd),
    timeline = windows;
  const active = focused ? byId.get(focused) : undefined,
    activeRow = focused ? rows.get(focused) : undefined;
  const coverageCounts = useMemo(() => {
    const counts = {
      ready: 0,
      stale: 0,
      partial: 0,
      missing: 0,
      failed: 0,
      unknown: 0,
      "not-connected": 0,
    };
    for (const a of filtered)
      counts[rows.get(a.assetId)?.surfaces ?? "not-connected"]++;
    return counts;
  }, [filtered, rows]);
  const saved = JSON.stringify({
    version: 1,
    view,
    filters,
    watchlist,
    selected,
  });
  useEffect(() => {
    stateCallback.current?.(JSON.parse(saved));
  }, [saved]);
  useEffect(
    () => setPage(0),
    [filters, query, view, source, sort, activeCoverage],
  );
  useEffect(() => {
    if (focused) closeInspector.current?.focus({ preventScroll: true });
  }, [focused]);
  function field<K extends keyof MarketFilters>(
    key: K,
    value: MarketFilters[K],
  ) {
    setFilters((old) => ({ ...old, [key]: value }));
  }
  function chooseRegion(id: string) {
    setFilters({ ...emptyMarketFilters, region: id });
    setSource("");
    setFocused(null);
  }
  function chooseGroup(id: string) {
    setFilters((old) => ({
      ...old,
      query: "",
      group: id,
      coverage: "",
      watchlistOnly: false,
    }));
    setSource("");
  }
  function open(
    assetId: string,
    tab: "identity" | "coverage" | "surface" = "identity",
    cell: CoverageInterval | null = null,
  ) {
    opener.current = document.activeElement as HTMLElement;
    setFocused(assetId);
    setInspectTab(tab);
    setInterval(cell);
  }
  function close() {
    setFocused(null);
    opener.current?.focus({ preventScroll: true });
  }
  function toggle(id: string) {
    setSelected((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 100
          ? [...old, id]
          : old,
    );
  }
  function favorite(id: string) {
    setWatchlist((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 100
          ? [...old, id]
          : old,
    );
  }
  function selectPage() {
    const ids = visible.map((a) => a.assetId),
      all = ids.every((id) => selectedSet.has(id));
    setSelected((old) =>
      all
        ? old.filter((id) => !ids.includes(id))
        : [...new Set([...old, ...ids])].slice(0, 100),
    );
  }
  function prepare(id?: string) {
    if (id) setSelected([id]);
    setPlanning(true);
  }
  const title =
    group?.title ??
    collection?.title ??
    (filters.watchlistOnly
      ? "Your watchlist"
      : (region?.title ?? "Global markets"));
  const regionalEtfs =
    region?.etfs ?? navigation.regions.flatMap((r) => r.etfs);
  const availableSources = [
    ...new Set(activeCoverage?.rows.map((r) => r.source) ?? []),
  ];
  const showGroupMembership = group?.category === "fund-holdings";
  return (
    <main
      className="mu-workbench"
      data-testid="market-universe-workbench"
      onKeyDown={(e) => {
        if (e.key === "Escape" && focused && !planning) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <header className="mu-top">
        <div>
          <small>VFO · MARKET ENVIRONMENT</small>
          <h1>Markets</h1>
        </div>
        <nav aria-label="Market workspace views">
          {(
            [
              ["universe", "Universe", "globe"],
              ["live", "Live coverage", "pulse"],
              ["history", "History & backfills", "history"],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                setView(id);
                setFocused(null);
              }}
            >
              <Mark kind={icon} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mu-top-meta">
          <span className="mu-static">
            <i />
            Static catalogue
          </span>
          <small>
            {n(assets.length)} names · {catalogueAsOf}
          </small>
        </div>
      </header>
      <div className="mu-layout">
        <aside className="mu-navigator" aria-label="Market navigation">
          <button
            className={
              !filters.region && !filters.watchlistOnly ? "is-active" : ""
            }
            onClick={() => chooseRegion("")}
          >
            <Mark />
            <span>All markets</span>
            <small>{n(assets.length)}</small>
          </button>
          <button
            className={filters.watchlistOnly ? "is-active" : ""}
            onClick={() =>
              setFilters({ ...emptyMarketFilters, watchlistOnly: true })
            }
          >
            <span className="mu-star">☆</span>
            <span>Watchlist</span>
            <small>{watchlist.length}</small>
          </button>
          <h2>Regions</h2>
          {navigation.regions.map((r) => (
            <button
              key={r.id}
              className={filters.region === r.id ? "is-active" : ""}
              onClick={() => chooseRegion(r.id)}
            >
              <span className={"mu-region-dot " + r.id} />
              <span>{r.title}</span>
              <small>{n(groupById.get(r.groupId)?.assetIds.length ?? 0)}</small>
            </button>
          ))}
          <h2>Collections</h2>
          {navigation.collections
            .filter((c) => !filters.region || c.regionId === filters.region)
            .map((c) => (
              <button
                key={c.id}
                className={filters.group === c.id ? "is-active" : ""}
                onClick={() => {
                  setFilters({
                    ...emptyMarketFilters,
                    region: c.regionId,
                    group: c.id,
                  });
                  setSource("");
                }}
              >
                <Mark kind="layers" />
                <span>{c.title}</span>
                <small>{c.assetIds.length}</small>
              </button>
            ))}
          <details className="mu-sector-nav">
            <summary>
              Sector classifications <span>11</span>
            </summary>
            {groups
              .filter((g) => g.category === "sector")
              .map((g) => (
                <button
                  key={g.id}
                  className={filters.group === g.id ? "is-active" : ""}
                  onClick={() => chooseGroup(g.id)}
                >
                  <span>{g.title}</span>
                  <small>{g.assetIds.length}</small>
                </button>
              ))}
          </details>
          <div className="mu-nav-foot">
            <Mark kind="layers" />
            <p>
              Catalogue first.
              <br />
              <strong>Data is optional.</strong>
            </p>
            <small>Static selections, not an exhaustive listing feed.</small>
          </div>
        </aside>
        <section className="mu-main">
          <div className="mu-heading">
            <div>
              <div className="mu-breadcrumb">
                Markets <span>/</span> {region?.shortTitle ?? "Global"}{" "}
                {group || collection ? (
                  <>
                    <span>/</span>Collection
                  </>
                ) : null}
              </div>
              <h2>{title}</h2>
              <p>
                {showGroupMembership
                  ? "Dated fund holdings from the supplied group configuration."
                  : (collection?.description ??
                    region?.description ??
                    "Browse instruments, explore groups and see what data is available.")}
              </p>
            </div>
            <div className="mu-coverage-mode">
              {coverage?.kind === "demo" ? (
                <label>
                  <input
                    type="checkbox"
                    checked={showDemo}
                    onChange={(e) => setShowDemo(e.target.checked)}
                  />
                  Demo coverage
                </label>
              ) : (
                <span>{coverage?.label ?? "No data source connected"}</span>
              )}
              <small>
                {coverage?.kind === "demo"
                  ? "Illustrative states only · no market prices"
                  : "Coverage is independent of catalogue membership"}
              </small>
            </div>
          </div>
          {view === "universe" &&
          !filters.query &&
          !filters.group &&
          !filters.watchlistOnly ? (
            <>
              <div className="mu-region-overview">
                {navigation.regions
                  .filter((r) => !filters.region || r.id === filters.region)
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => chooseRegion(r.id)}
                      className={"mu-region-tile " + r.id}
                    >
                      <span className="mu-contour" aria-hidden="true">
                        <Mark />
                      </span>
                      <small>
                        {r.id === "americas"
                          ? "01"
                          : r.id === "europe"
                            ? "02"
                            : "03"}{" "}
                        / REGION
                      </small>
                      <h3>{r.title}</h3>
                      <div>
                        <strong>
                          {n(groupById.get(r.groupId)?.assetIds.length ?? 0)}
                        </strong>
                        <span>catalogue names</span>
                        <b>↗</b>
                      </div>
                    </button>
                  ))}
              </div>
              <div className="mu-section-caption">
                <h3>ETF pathways</h3>
                <span>Curated shortcuts · holdings are separate and dated</span>
              </div>
              <div className="mu-etf-strip">
                {regionalEtfs.map((e) => {
                  const a = byId.get(e.assetId);
                  return a ? (
                    <article key={a.assetId}>
                      <button onClick={() => open(a.assetId)}>
                        <Badge asset={a} />
                        <span>
                          <b>{a.ticker}</b>
                          <small>{e.label}</small>
                        </span>
                        <span className="mu-arrow">↗</span>
                      </button>
                      {e.groupId ? (
                        <button
                          className="mu-holdings-link"
                          onClick={() => chooseGroup(e.groupId!)}
                        >
                          Explore holdings{" "}
                          <span>
                            {groupById.get(e.groupId)?.assetIds.length ?? 0} →
                          </span>
                        </button>
                      ) : (
                        <small className="mu-fund-note">
                          Exposure shortcut
                        </small>
                      )}
                    </article>
                  ) : null;
                })}
              </div>
            </>
          ) : null}
          {collection ? (
            <div className="mu-group-context">
              <span>
                <Mark kind="layers" />
                Curated basket · {collection.assetIds.length} members
              </span>
              <div>
                Related ETFs{" "}
                {collection.etfIds.map((id) => {
                  const a = byId.get(id);
                  return a ? (
                    <button key={id} onClick={() => open(id)}>
                      {a.ticker} ↗
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          ) : null}
          {group ? (
            <div className="mu-group-context">
              <span>
                <Mark kind="layers" />
                {showGroupMembership
                  ? "Recorded holdings"
                  : "Classification"} · {group.assetIds.length} members{" "}
                {group.asof ? "· " + group.asof : ""}
              </span>
              <div>
                {group.pinnedFundIds?.map((id) => {
                  const a = byId.get(id);
                  return a ? (
                    <button key={id} onClick={() => open(id)}>
                      Open {a.ticker} ↗
                    </button>
                  ) : null;
                })}
                <button onClick={() => field("group", "")}>
                  Clear group ×
                </button>
              </div>
            </div>
          ) : null}
          {view !== "universe" ? (
            <section
              className="mu-health-summary"
              aria-label="Coverage summary"
            >
              <div>
                <small>IN CURRENT SELECTION</small>
                <strong>{n(filtered.length)}</strong>
                <span>catalogue names</span>
              </div>
              <button onClick={() => field("coverage", "ready")}>
                <small>SURFACES AVAILABLE</small>
                <strong className="mu-good">{coverageCounts.ready}</strong>
                <span>
                  {activeCoverage?.kind === "demo"
                    ? "demo scenario"
                    : "recorded observations"}
                </span>
              </button>
              <button onClick={() => field("coverage", "attention")}>
                <small>STALE / PARTIAL</small>
                <strong className="mu-warn">
                  {coverageCounts.stale + coverageCounts.partial}
                </strong>
                <span>inspect before use</span>
              </button>
              <button onClick={() => field("coverage", "not-connected")}>
                <small>NOT CONNECTED</small>
                <strong>{n(coverageCounts["not-connected"])}</strong>
                <span>still searchable</span>
              </button>
            </section>
          ) : null}
          <div className="mu-tools">
            <label className="mu-search">
              <Mark kind="search" />
              <input
                type="search"
                aria-label="Search market catalogue"
                placeholder="Search symbol, company, exchange…"
                value={filters.query}
                onChange={(e) => field("query", e.target.value)}
              />
            </label>
            <select
              aria-label="Instrument type"
              value={filters.type}
              onChange={(e) => field("type", e.target.value)}
            >
              <option value="">All instruments</option>
              <option value="equities">Other instruments</option>
              <option value="funds">ETFs</option>
            </select>
            <select
              aria-label="Surface coverage filter"
              value={filters.coverage}
              onChange={(e) => field("coverage", e.target.value)}
            >
              <option value="">All coverage</option>
              <option value="attention">Stale / partial</option>
              {Object.entries(coverageLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort instruments"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="featured">Featured first</option>
              <option value="az">Symbol A–Z</option>
            </select>
            {filters.query || filters.coverage || filters.type ? (
              <button
                className="mu-text"
                onClick={() =>
                  setFilters((old) => ({
                    ...old,
                    query: "",
                    coverage: "",
                    type: "",
                  }))
                }
              >
                Reset filters
              </button>
            ) : null}
          </div>
          {view === "history" ? (
            <div className="mu-history-controls">
              <label>
                From{" "}
                <input
                  type="date"
                  aria-label="Coverage start"
                  value={historyStart}
                  onChange={(e) => setHistoryStart(e.target.value)}
                />
              </label>
              <label>
                Until · excluded{" "}
                <input
                  type="date"
                  aria-label="Coverage end"
                  value={historyEnd}
                  onChange={(e) => setHistoryEnd(e.target.value)}
                />
              </label>
              <select
                aria-label="Coverage source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">All recorded sources</option>
                {availableSources.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <span>Week-based evidence buckets · not a trading calendar</span>
            </div>
          ) : null}
          <div className="mu-results-heading">
            <h3>
              {view === "universe"
                ? "Instruments"
                : view === "live"
                  ? "Live data availability"
                  : "Historical coverage"}{" "}
              <span>{n(filtered.length)}</span>
            </h3>
            <div>
              {selected.length ? (
                <>
                  <b>{selected.length} selected</b>
                  <button className="mu-text" onClick={() => setSelected([])}>
                    Clear
                  </button>
                </>
              ) : null}
              <button
                className="mu-primary"
                disabled={!selected.length}
                onClick={() => prepare()}
              >
                Prepare backfill <span>↗</span>
              </button>
            </div>
          </div>
          {view === "history" ? (
            <>
              <div className="mu-legend">
                {Object.entries(intervalLabels).map(([id, label]) => (
                  <span key={id}>
                    <i className={"mu-cell " + id} />
                    {label}
                  </span>
                ))}
                <small>Blank evidence stays unknown.</small>
              </div>
              {!windows.length ? (
                <p className="mu-error" role="alert">
                  Choose a valid coverage window with an end after its start.
                </p>
              ) : null}
              {windows.length &&
              Date.parse(windows[0].end) - Date.parse(windows[0].start) >
                7 * 86400000 ? (
                <p className="mu-soft-note">
                  Grouped weeks cover the full window. Select a shorter range
                  for weekly detail.
                </p>
              ) : null}
              <div className="mu-matrix-scroll">
                <table className="mu-table mu-matrix">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Select visible instruments"
                          checked={
                            !!visible.length &&
                            visible.every((a) => selectedSet.has(a.assetId))
                          }
                          onChange={selectPage}
                        />
                      </th>
                      <th>Instrument</th>
                      {timeline.map((w) => (
                        <th key={w.start}>
                          <span>{date(w.start)}</span>
                        </th>
                      ))}
                      <th>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => (
                      <tr key={a.assetId}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={"Select " + a.ticker}
                            checked={selectedSet.has(a.assetId)}
                            onChange={() => toggle(a.assetId)}
                          />
                        </td>
                        <td>
                          <button
                            className="mu-instrument compact"
                            onClick={() => open(a.assetId, "coverage")}
                          >
                            <Badge asset={a} />
                            <span>
                              <b>{a.ticker}</b>
                              <small>{a.name}</small>
                            </span>
                          </button>
                        </td>
                        {timeline.map((w) => {
                          const cell = intervalAt(
                              rows.get(a.assetId),
                              w.start,
                              w.end,
                            ),
                            status = cell?.status ?? "unknown";
                          return (
                            <td key={w.start}>
                              <button
                                className={"mu-cell " + status}
                                aria-label={
                                  a.ticker +
                                  " " +
                                  w.start +
                                  " to " +
                                  w.end +
                                  ": " +
                                  intervalLabels[status]
                                }
                                title={
                                  intervalLabels[status] +
                                  (cell?.detail ? " · " + cell.detail : "")
                                }
                                onClick={() =>
                                  open(
                                    a.assetId,
                                    "coverage",
                                    cell ?? {
                                      ...w,
                                      status: "unknown",
                                      source: "Unbound",
                                      dataset: "volatility-surfaces",
                                      detail:
                                        "No evidence supplied for this interval.",
                                    },
                                  )
                                }
                              />
                            </td>
                          );
                        })}
                        <td>
                          <span className="mu-history-count">
                            {rows
                              .get(a.assetId)
                              ?.intervals.filter(
                                (i) => i.status === "available",
                              ).length ?? "—"}
                            <small>recorded buckets</small>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="mu-table-scroll">
              <table className="mu-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Select visible instruments"
                        checked={
                          !!visible.length &&
                          visible.every((a) => selectedSet.has(a.assetId))
                        }
                        onChange={selectPage}
                      />
                    </th>
                    <th>Instrument</th>
                    <th>{view === "live" ? "Source" : "Region / venue"}</th>
                    <th>{view === "live" ? "Quotes" : "Type"}</th>
                    <th>Surface coverage</th>
                    <th>{view === "live" ? "Last evidence" : "History"}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => {
                    const row = rows.get(a.assetId);
                    return (
                      <tr
                        key={a.assetId}
                        className={focused === a.assetId ? "is-focused" : ""}
                      >
                        <td>
                          <input
                            type="checkbox"
                            aria-label={"Select " + a.ticker}
                            checked={selectedSet.has(a.assetId)}
                            onChange={() => toggle(a.assetId)}
                          />
                        </td>
                        <td>
                          <button
                            className="mu-instrument"
                            onClick={() => open(a.assetId)}
                          >
                            <Badge asset={a} />
                            <span>
                              <b>{a.ticker}</b>
                              <small>{a.name}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span>
                            {view === "live"
                              ? (row?.source ?? "No source bound")
                              : (a.region ?? "Unclassified")}
                          </span>
                          <small>
                            {view === "live"
                              ? activeCoverage?.kind === "demo"
                                ? "Synthetic scenario"
                                : ""
                              : (a.exchange ?? "Venue not supplied")}
                          </small>
                        </td>
                        <td>
                          {view === "live" ? (
                            <Status value={row?.quotes} />
                          ) : (
                            <Pill>{a.instrumentType ?? "Unclassified"}</Pill>
                          )}
                        </td>
                        <td>
                          <button
                            className="mu-status-open"
                            onClick={() => open(a.assetId, "coverage")}
                          >
                            <Status value={row?.surfaces} />
                          </button>
                        </td>
                        <td>
                          {view === "live" ? (
                            <>
                              <span>
                                {row ? date(row.asOf.slice(0, 10)) : "—"}
                              </span>
                              <small>
                                {row
                                  ? new Date(row.asOf)
                                      .toISOString()
                                      .slice(11, 16) + " UTC"
                                  : "No evidence"}
                              </small>
                            </>
                          ) : (
                            <div
                              className="mu-mini-timeline"
                              aria-label={a.ticker + " history summary"}
                            >
                              {Array.from({ length: 13 }, (_, i) => (
                                <i
                                  key={i}
                                  className={
                                    "mu-cell " +
                                    (row?.intervals[i]?.status ?? "unknown")
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            className={
                              "mu-favorite " +
                              (watch.has(a.assetId) ? "is-on" : "")
                            }
                            aria-label={
                              (watch.has(a.assetId) ? "Remove " : "Watch ") +
                              a.ticker
                            }
                            aria-pressed={watch.has(a.assetId)}
                            onClick={() => favorite(a.assetId)}
                          >
                            {watch.has(a.assetId) ? "★" : "☆"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!visible.length ? (
            <div className="mu-empty">
              <Mark kind="search" />
              <h3>
                {filters.watchlistOnly
                  ? "Nothing in this watchlist yet"
                  : "No instruments match"}
              </h3>
              <p>
                {filters.watchlistOnly
                  ? "Star an instrument to keep it here."
                  : "Try another symbol or clear the filters. Catalogue membership never depends on data availability."}
              </p>
              <button
                onClick={() => {
                  setFilters(emptyMarketFilters);
                  setSource("");
                }}
              >
                Browse all markets
              </button>
            </div>
          ) : null}
          <footer className="mu-pagination">
            <span>
              {filtered.length ? page * pageSize + 1 : 0}–
              {Math.min((page + 1) * pageSize, filtered.length)} of{" "}
              {n(filtered.length)}{" "}
              <small>
                ·{" "}
                {
                  selected.filter(
                    (id) => !filtered.some((a) => a.assetId === id),
                  ).length
                }{" "}
                selected outside this filter
              </small>
            </span>
            <div>
              <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
                ← Previous
              </button>
              <button
                disabled={(page + 1) * pageSize >= filtered.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </footer>
          <p className="mu-provenance">
            {activeCoverage?.kind === "demo"
              ? "Coverage colors are a fixed UI fixture. They do not describe actual feed health or retained data."
              : "No observation is inferred from a catalogue entry."}{" "}
            Catalogue as of {catalogueAsOf}; supplied metadata may be
            incomplete.
          </p>
        </section>
      </div>
      {active ? (
        <aside
          className="mu-inspector"
          data-sampo-surface="floating"
          aria-label={"Instrument details: " + active.ticker}
        >
          <div className="mu-inspector-top">
            <span>INSTRUMENT</span>
            <button
              ref={closeInspector}
              className="mu-close"
              aria-label="Close instrument details"
              onClick={close}
            >
              ×
            </button>
          </div>
          <header>
            <Badge asset={active} size="large" />
            <div>
              <h2>{active.ticker}</h2>
              <p>{active.name}</p>
              <span>
                {active.exchange ?? "Unspecified venue"} ·{" "}
                {active.currency ?? "Currency not supplied"}
              </span>
            </div>
            <button
              className="mu-favorite"
              aria-label={"Watch " + active.ticker}
              aria-pressed={watch.has(active.assetId)}
              onClick={() => favorite(active.assetId)}
            >
              {watch.has(active.assetId) ? "★" : "☆"}
            </button>
          </header>
          <nav
            className="mu-inspector-tabs"
            aria-label="Instrument detail views"
          >
            {(["identity", "coverage", "surface"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={inspectTab === t}
                onClick={() => setInspectTab(t)}
              >
                {t === "identity"
                  ? "Overview"
                  : t === "coverage"
                    ? "Coverage"
                    : "Surface"}
              </button>
            ))}
          </nav>
          <div className="mu-inspector-body">
            {inspectTab === "identity" ? (
              <>
                <div className="mu-inspector-summary">
                  <small>CATALOGUE IDENTITY</small>
                  <h3>{active.name}</h3>
                  <p>
                    Reference identity, group membership and available data.
                  </p>
                </div>
                <dl className="mu-facts">
                  <div>
                    <dt>Region</dt>
                    <dd>{active.region ?? "Unclassified"}</dd>
                  </div>
                  <div>
                    <dt>Instrument type</dt>
                    <dd>{active.instrumentType ?? "Unclassified"}</dd>
                  </div>
                  <div>
                    <dt>Currency</dt>
                    <dd>{active.currency ?? "Not supplied"}</dd>
                  </div>
                  <div>
                    <dt>Exchange</dt>
                    <dd>{active.exchange ?? "Not supplied"}</dd>
                  </div>
                </dl>
                <h3>Groups & pathways</h3>
                <div className="mu-memberships">
                  {groups
                    .filter(
                      (g) =>
                        g.category !== "region" &&
                        g.assetIds.includes(active.assetId),
                    )
                    .map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          chooseGroup(g.id);
                          close();
                        }}
                      >
                        <span>
                          {g.title}
                          <small>
                            {g.category === "fund-holdings"
                              ? "Dated holdings · " +
                                (g.asof ?? "date not supplied")
                              : g.category}
                          </small>
                        </span>
                        →
                      </button>
                    ))}
                  {navigation.collections
                    .filter((g) => g.assetIds.includes(active.assetId))
                    .map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setFilters({
                            ...emptyMarketFilters,
                            region: g.regionId,
                            group: g.id,
                          });
                          close();
                        }}
                      >
                        <span>
                          {g.title}
                          <small>Curated basket</small>
                        </span>
                        →
                      </button>
                    ))}
                </div>
                <small className="mu-soft-note">
                  Group overlap is intentional. Holdings, classifications and
                  curated baskets stay distinct.
                </small>
                <div className="mu-detail-source">
                  <small>METADATA</small>
                  <code>{active.assetId}</code>
                  <p>
                    {active.source ?? "Static configuration"} ·{" "}
                    {active.asof ?? catalogueAsOf}
                  </p>
                </div>
              </>
            ) : null}
            {inspectTab === "coverage" ? (
              <>
                <div className="mu-coverage-detail">
                  <div>
                    <small>QUOTES</small>
                    <Status value={activeRow?.quotes} />
                  </div>
                  <div>
                    <small>SURFACES</small>
                    <Status value={activeRow?.surfaces} />
                  </div>
                </div>
                <p className="mu-soft-note">
                  {activeCoverage?.kind === "demo"
                    ? "Illustrative coverage fixture. No live source is connected."
                    : "Coverage evidence comes from the supplied snapshot."}
                </p>
                {interval ? (
                  <div className="mu-interval-detail">
                    <small>SELECTED INTERVAL</small>
                    <h3>
                      {date(interval.start)} → {date(interval.end)}
                    </h3>
                    <Pill>{intervalLabels[interval.status]}</Pill>
                    <p>
                      {interval.detail ?? "Recorded state for this interval."}
                    </p>
                    <small>{interval.source} · end excluded</small>
                  </div>
                ) : null}
                <h3>Recorded history</h3>
                <div className="mu-interval-list">
                  {activeRow?.intervals.length ? (
                    activeRow.intervals.map((i) => (
                      <button
                        key={i.start + i.source}
                        onClick={() => setInterval(i)}
                      >
                        <i className={"mu-cell " + i.status} />
                        <span>
                          {date(i.start)} – {date(i.end)}
                          <small>
                            {i.source} · {intervalLabels[i.status]}
                          </small>
                        </span>
                        <span>↗</span>
                      </button>
                    ))
                  ) : (
                    <div className="mu-empty compact">
                      <h3>No historical evidence</h3>
                      <p>
                        Unknown is not a confirmed gap. You can still prepare a
                        full-window draft.
                      </p>
                    </div>
                  )}
                </div>
                <button
                  className="mu-primary"
                  onClick={() => prepare(active.assetId)}
                >
                  Prepare backfill for {active.ticker} ↗
                </button>
              </>
            ) : null}
            {inspectTab === "surface" ? (
              props.renderSurface ? (
                props.renderSurface(active)
              ) : (
                <div className="mu-empty mu-surface-empty">
                  <Mark kind="layers" />
                  <h3>No surface bound</h3>
                  <p>
                    The catalogue does not fabricate a price, quote or
                    volatility surface. A deployment can provide its existing
                    surface renderer here.
                  </p>
                  <button onClick={() => setInspectTab("coverage")}>
                    Inspect coverage →
                  </button>
                </div>
              )
            ) : null}
          </div>
          <footer>
            <span>
              {activeCoverage?.kind === "demo"
                ? "Demo coverage · no live feed"
                : "Catalogue view"}
            </span>
            <button
              onClick={() => {
                setFilters({ ...emptyMarketFilters, query: active.assetId });
                setSource("");
                close();
              }}
            >
              Find in universe ↗
            </button>
          </footer>
        </aside>
      ) : null}
      {planning ? (
        <BackfillComposer
          assets={assets}
          selected={selected}
          coverage={activeCoverage}
          catalogueRevision={catalogueRevision}
          start={historyStart}
          end={historyEnd}
          onClose={() => setPlanning(false)}
          onDraft={(draft) => {
            props.onDraft?.(draft);
            setNotice("Draft prepared locally. Nothing was submitted.");
          }}
        />
      ) : null}
      {notice ? (
        <div className="mu-toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      ) : null}
    </main>
  );
}

function BackfillComposer({
  assets,
  selected,
  coverage,
  catalogueRevision,
  start: initialStart,
  end: initialEnd,
  onClose,
  onDraft,
}: {
  assets: Instrument[];
  selected: string[];
  coverage?: CoverageSnapshot;
  catalogueRevision: string;
  start: string;
  end: string;
  onClose: () => void;
  onDraft: (draft: BackfillDraft) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [start, setStart] = useState(initialStart),
    [end, setEnd] = useState(initialEnd),
    [source, setSource] = useState(
      coverage?.rows[0]?.source ?? "unbound-source",
    ),
    [dataset, setDataset] = useState("volatility-surfaces"),
    [policy, setPolicy] = useState<BackfillDraft["policy"]>("full-window"),
    [reason, setReason] = useState(
      "Review historical coverage for the selected instruments",
    ),
    [error, setError] = useState(""),
    [draft, setDraft] = useState<BackfillDraft | null>(null);
  const byId = new Map(assets.map((a) => [a.assetId, a]));
  useEffect(() => {
    const opener = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      opener?.focus?.();
    };
  }, []);
  const signature = JSON.stringify({
    start,
    end,
    source,
    dataset,
    policy,
    reason,
    selected,
    coverage,
    catalogueRevision,
  });
  useEffect(() => {
    setDraft(null);
    setError("");
  }, [signature]);
  function review() {
    try {
      const value = makeBackfillDraft({
        assetIds: selected,
        catalogueIds: new Set(byId.keys()),
        catalogueRevision,
        coverage,
        start,
        end,
        source,
        dataset,
        policy,
        reason,
      });
      setDraft(value);
      onDraft(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft could not be prepared.");
    }
  }
  return (
    <dialog
      ref={dialog}
      className="mu-planner"
      aria-label="Prepare backfill draft"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <small>HISTORICAL OPERATIONS</small>
          <h2>Prepare a backfill</h2>
          <p>Freeze the selection. Review the ranges. Export the intent.</p>
        </div>
        <button
          className="mu-close"
          aria-label="Close backfill draft"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="mu-plan-body">
        <div className="mu-plan-boundary">
          <Mark kind="layers" />
          <div>
            <strong>Draft only</strong>
            <p>
              No jobs, source queries or configuration writes are performed
              here. {coverage?.kind === "demo" ? "Evidence is synthetic." : ""}
            </p>
          </div>
        </div>
        <div className="mu-plan-selection">
          <small>{selected.length} INSTRUMENTS</small>
          <div>
            {selected.slice(0, 20).map((id) => (
              <Pill key={id}>{byId.get(id)?.ticker ?? id}</Pill>
            ))}
            {selected.length > 20 ? <Pill>+{selected.length - 20}</Pill> : null}
          </div>
        </div>
        <div className="mu-plan-fields">
          <label>
            Source
            <select
              aria-label="Draft source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {[
                ...new Set([
                  source,
                  ...(coverage?.rows.map((r) => r.source) ?? []),
                ]),
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Data product
            <select
              aria-label="Draft data product"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
            >
              <option value="volatility-surfaces">Volatility surfaces</option>
              <option value="quotes">Quotes</option>
              <option value="ohlcv">Price history</option>
            </select>
          </label>
          <label>
            From · included
            <input
              type="date"
              aria-label="Draft start"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Until · excluded
            <input
              type="date"
              aria-label="Draft end"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <fieldset className="mu-plan-policy">
          <legend>Range policy</legend>
          <label>
            <input
              type="radio"
              name="mu-policy"
              checked={policy === "full-window"}
              onChange={() => setPolicy("full-window")}
            />
            <span>
              <strong>Full selected window</strong>
              <small>
                Explicit request; does not claim the data is missing.
              </small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="mu-policy"
              checked={policy === "confirmed-gaps"}
              onChange={() => setPolicy("confirmed-gaps")}
            />
            <span>
              <strong>Confirmed gaps only</strong>
              <small>Unknown and failed intervals are excluded.</small>
            </span>
          </label>
        </fieldset>
        <label className="mu-reason">
          Reason
          <input
            aria-label="Draft reason"
            maxLength={240}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error ? (
          <p className="mu-error" role="alert">
            {error}
          </p>
        ) : null}
        {draft ? (
          <section className="mu-reviewed" aria-label="Reviewed draft">
            <h3>
              {draft.ranges.length} ranges prepared <Pill>Not submitted</Pill>
            </h3>
            {!draft.ranges.length ? (
              <p>
                No confirmed gaps match. Unknown coverage has not been converted
                into a backfill request.
              </p>
            ) : (
              <div className="mu-plan-ranges">
                {draft.ranges.slice(0, 12).map((r, i) => (
                  <div key={i}>
                    <b>{byId.get(r.assetId)?.ticker}</b>
                    <span>
                      {r.start} → {r.end}
                    </span>
                  </div>
                ))}
                {draft.ranges.length > 12 ? (
                  <small>
                    +{draft.ranges.length - 12} ranges in the exported draft
                  </small>
                ) : null}
              </div>
            )}
            {draft.unresolvedAssetIds.length ? (
              <p>
                {draft.unresolvedAssetIds.length} instruments have no matching
                confirmed gap evidence.
              </p>
            ) : null}
            <small>
              Catalogue {catalogueRevision.slice(0, 12)} · evidence:{" "}
              {draft.evidence}
            </small>
          </section>
        ) : null}
      </div>
      <footer>
        <span>Execution remains deployment-owned.</span>
        <button onClick={onClose}>Cancel</button>
        {draft ? (
          <button
            className="mu-primary"
            disabled={!draft.ranges.length}
            onClick={() => download(draft)}
          >
            Export JSON ↓
          </button>
        ) : (
          <button className="mu-primary" onClick={review}>
            Review draft →
          </button>
        )}
      </footer>
    </dialog>
  );
}
