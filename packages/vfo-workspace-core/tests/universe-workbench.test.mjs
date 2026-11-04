import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  filterInstruments,
  emptyMarketFilters,
  intervalAt,
  weeklyWindows,
  makeBackfillDraft,
  normalizeCoverageSnapshot,
  coverageScopes,
  historyIntervals,
} from "../src/market/universe-model.ts";
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const catalog = read("../../../assets/market-universe/catalog.json"),
  groups = read("../../../assets/market-universe/groups.json"),
  nav = read("../../../assets/market-universe/navigation.json");
const fixture = read(
  "../../../examples/sampo-installed-apps/coverage-fixture.json",
);
test("static navigation references only registered catalogue entries and groups", () => {
  const ids = new Set(catalog.assets.map((a) => a.assetId)),
    gs = new Set(groups.groups.map((g) => g.id));
  assert.equal(ids.size, catalog.assets.length);
  for (const r of nav.regions) {
    assert.ok(gs.has(r.groupId));
    for (const id of r.featuredAssetIds) assert.ok(ids.has(id), id);
    for (const e of r.etfs) {
      assert.ok(ids.has(e.assetId));
      if (e.groupId) assert.ok(gs.has(e.groupId));
    }
  }
  for (const c of nav.collections) {
    assert.ok(nav.regions.some((r) => r.id === c.regionId));
    for (const id of [...c.assetIds, ...c.etfIds]) assert.ok(ids.has(id), id);
  }
  for (const row of fixture.rows) assert.ok(ids.has(row.assetId));
});
const filter = (filters = {}, coverage = new Map()) =>
  filterInstruments(
    catalog.assets,
    groups.groups,
    nav,
    { ...emptyMarketFilters, ...filters },
    coverage,
    new Set(),
  );
test("catalogue membership is independent of coverage and supports regions, baskets and lookup", () => {
  assert.equal(filter().length, catalog.assets.length);
  assert.equal(
    filter({}, new Map(fixture.rows.map((r) => [r.assetId, r]))).length,
    catalog.assets.length,
  );
  for (const r of nav.regions)
    assert.equal(
      filter({ region: r.id }).length,
      groups.groups.find((g) => g.id === r.groupId).assetIds.length,
    );
  for (const c of nav.collections)
    assert.deepEqual(
      new Set(filter({ group: c.id }).map((a) => a.assetId)),
      new Set(c.assetIds),
    );
  assert.equal(
    filter({ query: "AAPL" }).some((a) => a.ticker === "AAPL"),
    true,
  );
  assert.equal(filter({ coverage: "not-connected" }).length, catalog.assets.length);
  assert.equal(filter({ coverage: "ready" }).length, 0);
});
const gap = (
  start,
  end,
  status = "gap",
  dataset = "volatility-surfaces",
  source = "demo-archive",
) => ({ start, end, status, dataset, source });
const snapshot = {
  asOf: "2026-11-02T14:00:00Z",
  kind: "demo",
  label: "Test",
  rows: [
    {
      assetId: "A",
      quotes: "unknown",
      surfaces: "partial",
      source: "demo-archive",
      asOf: "2026-11-02T14:00:00Z",
      intervals: [
        gap("2026-08-01", "2026-08-08"),
        gap("2026-08-08", "2026-08-15"),
        gap("2026-08-15", "2026-08-22", "unknown"),
        gap("2026-08-22", "2026-08-29", "failed"),
      ],
    },
  ],
};
const base = {
  assetIds: ["A"],
  catalogueIds: new Set(["A", "B"]),
  catalogueRevision: "fixture",
  coverage: snapshot,
  start: "2026-08-03",
  end: "2026-08-29",
  source: "demo-archive",
  dataset: "volatility-surfaces",
  policy: "confirmed-gaps",
  reason: "UI test",
  now: "2026-11-02T00:00:00Z",
};
test("confirmed gaps are clipped and merged, unknown/failed excluded, input unmodified", () => {
  const before = JSON.stringify(snapshot);
  const draft = makeBackfillDraft(base);
  assert.deepEqual(draft.ranges, [
    { assetId: "A", start: "2026-08-03", end: "2026-08-15" },
  ]);
  assert.equal(draft.execution, "not-submitted");
  assert.equal(draft.evidence, "demo");
  assert.equal(JSON.stringify(snapshot), before);
});
test("gap evidence must match both source and data product; no evidence is not a gap", () => {
  for (const change of [
    { source: "other" },
    { dataset: "quotes" },
    { coverage: undefined },
    { assetIds: ["B"] },
  ]) {
    const draft = makeBackfillDraft({ ...base, ...change });
    assert.equal(draft.ranges.length, 0);
    assert.equal(draft.unresolvedAssetIds.length, 1);
  }
  const full = makeBackfillDraft({
    ...base,
    coverage: undefined,
    policy: "full-window",
  });
  assert.equal(full.evidence, "unavailable");
  assert.equal(full.ranges.length, 1);
});
test("draft validation rejects invalid dates, reversed windows, missing identity and oversize selections", () => {
  for (const change of [
    { start: "2026-02-30" },
    { end: base.start },
    { assetIds: [] },
    { assetIds: ["not-in-catalogue"] },
    { reason: "" },
    { dataset: "" },
    { start: "2000-01-01" },
  ])
    assert.throws(() => makeBackfillDraft({ ...base, ...change }));
  const ids = Array.from({ length: 101 }, (_, i) => String(i));
  assert.throws(() =>
    makeBackfillDraft({ ...base, assetIds: ids, catalogueIds: new Set(ids) }),
  );
});
test("partial and conflicting evidence cannot establish full-bucket coverage", () => {
  const row = {
    ...snapshot.rows[0],
    intervals: [gap("2026-08-01", "2026-08-08", "available")],
  };
  assert.equal(intervalAt(row, "2026-08-01", "2026-08-08").status, "available");
  assert.equal(intervalAt(row, "2026-08-01", "2026-08-15").status, "partial");
  assert.equal(intervalAt(row, "2026-09-01", "2026-09-08"), undefined);
  row.intervals.push(gap("2026-08-03", "2026-08-05"));
  assert.equal(intervalAt(row, "2026-08-01", "2026-08-08").status, "partial");
});
test("overview buckets cover the full requested window without omitted weeks", () => {
  for (const [start, end] of [
    ["2026-08-03", "2026-11-02"],
    ["2020-01-01", "2026-11-02"],
  ]) {
    const windows = weeklyWindows(start, end);
    assert.ok(windows.length <= 26);
    assert.equal(windows[0].start, start);
    assert.equal(windows.at(-1).end, end);
    for (let i = 1; i < windows.length; i++)
      assert.equal(windows[i].start, windows[i - 1].end);
  }
  assert.deepEqual(weeklyWindows("invalid", "2026-11-02"), []);
});

test("conflicting evidence excludes a claimed gap from automatic range selection", () => {
  const coverage = structuredClone(snapshot);
  coverage.rows[0].intervals.push(gap("2026-08-04", "2026-08-10", "available"));
  assert.equal(makeBackfillDraft({ ...base, coverage }).ranges.length, 0);
});

test("historical buckets never combine products or sources; continuous adjacent evidence fills a bucket", () => {
  const row = { ...snapshot.rows[0], intervals: [gap("2026-08-01", "2026-08-08", "available"),
    gap("2026-08-08", "2026-08-15", "available"), gap("2026-08-01", "2026-08-15", "gap", "quotes"),
    gap("2026-08-01", "2026-08-15", "failed", "volatility-surfaces", "other-source")] };
  assert.equal(intervalAt(row, "2026-08-01", "2026-08-15").status, "unknown");
  assert.equal(intervalAt(row, "2026-08-01", "2026-08-15", { source: "demo-archive", dataset: "volatility-surfaces" }).status, "available");
  assert.equal(intervalAt(row, "2026-08-01", "2026-08-15", { source: "demo-archive", dataset: "quotes" }).status, "gap");
  assert.equal(intervalAt(row, "2026-08-01", "2026-08-15", { source: "other-source", dataset: "quotes" }), undefined);
  assert.equal(coverageScopes({ ...snapshot, rows: [row] }).length, 3);
});

test("malformed intervals, duplicate rows and invalid live timestamps stay unavailable to automatic gap selection", () => {
  for (const change of [null, { start: "2026-02-30" }, { end: "2026-08-01" }, { status: "unsupported" }, { source: "" }, { dataset: "" }]) {
    const coverage = structuredClone(snapshot);
    coverage.rows[0].intervals.push(change === null ? null : { ...coverage.rows[0].intervals[0], ...change });
    const checked = normalizeCoverageSnapshot(coverage);
    assert.ok(checked.issues.length);
    assert.deepEqual(historyIntervals(checked.snapshot.rows[0]), []);
    assert.equal(makeBackfillDraft({ ...base, coverage }).ranges.length, 0);
  }
  assert.equal(makeBackfillDraft({ ...base, coverage: { ...snapshot, asOf: "invalid" } }).ranges.length, 0);
  assert.equal(intervalAt({ ...snapshot.rows[0], intervals: {} }, base.start, base.end), undefined);
  const duplicate = { ...snapshot, rows: [snapshot.rows[0], snapshot.rows[0]] };
  assert.equal(makeBackfillDraft({ ...base, coverage: duplicate }).ranges.length, 0);
  const checked = normalizeCoverageSnapshot({ ...snapshot, rows: [{ ...snapshot.rows[0], asOf: "not-a-date", surfaces: "unrecognized" }] });
  assert.equal(checked.snapshot.rows[0].quotes, "unknown"); assert.equal(checked.snapshot.rows[0].surfaces, "unknown");
  assert.ok(checked.issues.length >= 2);
  for (const value of [null, {}, { kind: "live", rows: [] }, { kind: "observed", rows: null }]) {
    assert.equal(normalizeCoverageSnapshot(value).snapshot, undefined);
    assert.equal(makeBackfillDraft({ ...base, coverage: value }).ranges.length, 0);
  }
});

test("draft exports explicit provenance, rejects unsupported policy, and bucket generation handles year boundaries", () => {
  const draft = makeBackfillDraft({ ...base, source: " demo-archive ", dataset: " volatility-surfaces " });
  assert.equal(draft.source, "demo-archive"); assert.equal(draft.dataset, "volatility-surfaces");
  assert.equal(draft.evidenceAsOf, snapshot.asOf); assert.equal(draft.evidenceLabel, snapshot.label);
  assert.throws(() => makeBackfillDraft({ ...base, policy: "infer-gaps" }));
  const windows = weeklyWindows("9998-01-01", "9999-12-31");
  assert.equal(windows.at(-1).end, "9999-12-31"); assert.ok(windows.length <= 26);
});

test("equity and ETF scope excludes debt, warrants and unknown classifications without hiding them from all",()=>{
 const types=["Equity","ETF","ADR","TDR","Depositary receipt","REIT","Bond","Warrant","Unknown","Preferred share","ETN"];
 const assets=types.map((instrumentType,i)=>({assetId:String(i),ticker:String(i),name:instrumentType,instrumentType}));
 const select=type=>filterInstruments(assets,[],{regions:[],collections:[]},{...emptyMarketFilters,type},new Map(),new Set()).map(a=>a.instrumentType);
 assert.deepEqual(select("equities-etfs"),types.slice(0,6));
 assert.deepEqual(select(""),types);
});
