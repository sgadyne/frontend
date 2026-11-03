import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMarketState } from "../src/market/universe-state.ts";
const catalogue = {
  assets: [{ assetId: "A" }, { assetId: "B" }], groups: [{ id: "group" }],
  navigation: { regions: [{ id: "region" }], collections: [{ id: "basket" }] },
  historyWindow: { start: "2026-08-03", end: "2026-11-02" },
};
test("render state retains supported inspector and coverage controls without draft intent", () => {
  const state = normalizeMarketState({ version: 1, view: "history", filters: { query: "A", region: "region", group: "basket" },
    focused: "A", inspectTab: "coverage", page: 4, sort: "az", showDemo: false, source: "archive", dataset: "quotes",
    historyStart: "2026-09-01", historyEnd: "2026-10-01", selected: ["B", "B"], watchlist: ["A"],
    execution: "submit", credentials: "excluded", scrollTop: 200 }, catalogue);
  assert.equal(state.version, 1); assert.equal(state.focused, "A"); assert.equal(state.page, 4);
  assert.equal(state.dataset, "quotes"); assert.equal(state.historyStart, "2026-09-01");
  assert.equal(state.showDemo, false); assert.deepEqual(state.selected, ["B"]);
  assert.equal(state.execution, undefined); assert.equal(state.credentials, undefined); assert.equal(state.scrollTop, undefined);
  assert.deepEqual(normalizeMarketState(state, catalogue), state);
});
test("malformed or stale restore state is bounded to current catalogue and safe defaults", () => {
  const state = normalizeMarketState({ view: "invalid", filters: { query: 10, region: "removed", group: "removed", type: {}, watchlistOnly: "yes" },
    watchlist: ["removed", "A", "A", null], selected: "A", focused: "removed", page: -1,
    historyStart: "2026-02-30", historyEnd: {}, inspectTab: "invalid" }, catalogue);
  assert.equal(state.view, "universe"); assert.equal(state.filters.query, ""); assert.equal(state.filters.region, "");
  assert.equal(state.filters.group, ""); assert.equal(state.filters.watchlistOnly, false);
  assert.deepEqual(state.watchlist, ["A"]); assert.deepEqual(state.selected, []); assert.equal(state.focused, "");
  assert.equal(state.historyStart, catalogue.historyWindow.start); assert.equal(state.page, 0);
  assert.deepEqual(normalizeMarketState({ version: 9, view: "history" }, catalogue), normalizeMarketState({}, catalogue));
  assert.equal(normalizeMarketState(null, catalogue).view, "universe");
});

test("history pagination reaches the tail of a full regional inventory", () => {
  const large = {...catalogue,assets:Array.from({length:210576},(_,i)=>({assetId:'LISTING:TEST:'+i,ticker:String(i),name:'Synthetic scale record'}))};
  const state=normalizeMarketState({view:'history',page:11698},large);
  assert.equal(state.page,11698);
  assert.equal(normalizeMarketState({view:'history',page:1e9},large).page,Math.ceil(large.assets.length/18)-1);
});
