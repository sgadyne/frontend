# Installed app demonstrations

Risk Lens, VFO, Cluster and Replication are independent Sampo releases. This directory composes the existing app components with local synthetic providers; it does not implement a Sampo shell.

For declarations, bounded state, exact destinations and the installed navigation harness, see [the SDK authoring recipe](AUTHORING.md).

Sampo owns OIDC identity, authorized environments, Library navigation, Dockview tabs, settings, appearance, portals and workspace persistence. Market metadata is the bundled static reference catalogue; coverage and data/job adapters are synthetic. The notice inside every app states that no live data or backend jobs are connected. Cluster's Run analysis is an in-memory fixture response; VFO prepares local backfill drafts without executing jobs.

## Build

From the repository root, install the locked dependencies and run:

    node examples/sampo-installed-apps/build.mjs

This builds four app-specific source closures and emits four independent OCI layouts under .review/installed-{risk,vfo,cluster,replication}-layout. Each has its own application identity, linked entry, contribution and release digest. The build rejects imports of another app’s exclusive modules and writes module/byte receipts under `.review/app-closures`. Opening VFO brings in its static catalogue, metadata artwork and market component; it does not fetch Risk, Cluster or Replication implementations. React and the Sampo SDK remain host externals. All four demo versions are 1.2.0 on exact SDK cohort `0.2.0-alpha.20261102.5`; retained releases remain separately addressable. Per-app notices include bundled dependency licenses, and VFO carries the supplied metadata/artwork rights notice. Install through Sampo's standard stage, approve and install workflow, then grant the applications to the intended accounts.

The exact SDK cohort is checked by manifest.mjs. Application IDs are example.risk-lens, example.vfo, example.cluster and example.replication. These are demonstration packages, not corporate backend bindings.

## Real-host qualification

Qualified on Sampo main 5bd0b03 plus the host-app-presentation branch: actual OIDC login, OCI admission/install, four app renders, the prior VFO 3D tearsheet (the current market catalogue revision is qualified separately below), Cluster synthetic run, Replication table and workspace Save/reload. The applications consume the host appearance through SampoAppearanceProvider. Styles are scoped during the installed build to protect host navigation.

The separate apps/analysis-demo shell is an isolated visual preview only. Do not deploy it as Sampo or carry its account/navigation/settings implementations into the host.

## Follow-up

Keep app layout, chart appearance and tearsheet improvements. Only consolidate presentation helpers with demonstrated reuse. Shared chart/table primitives used by Cluster and Replication remain shared; app-exclusive components are excluded from the other outputs. Connect corporate data bindings separately; this demo does not qualify live backend workflows.

## Market-universe workbench

The installed VFO example now composes `MarketUniverseWorkbench` with the bundled static catalogue and a separate coverage fixture. It offers region / ETF / sector / curated-basket navigation, search, watchlists, live availability, historical coverage and a reviewed backfill draft. A name remains visible when no data is bound.

| Layer | Location | Responsibility |
| --- | --- | --- |
| Reference metadata and dated memberships | `assets/market-universe/catalog.json`, `groups.json` | Supplied instrument identities and membership evidence |
| Editorial navigation | `assets/market-universe/navigation.json` | Explicit regional shortcuts, ETF exposure links and curated baskets |
| Reusable presentation | `packages/vfo-workspace-core/src/market/UniverseWorkbench.tsx` | Browser, coverage matrix, instrument sheet, draft composer |
| Pure calculations / contracts | `packages/vfo-workspace-core/src/market/universe-model.ts` | Filtering, interval display, source/product-specific gap selection |
| Demo composition | `VfoMarket.tsx`, `market-universe-data.ts`, `coverage-fixture.json` | Host appearance/view state, existing logos, explicitly synthetic coverage |

There is no security-master service, polling loop, vendor connector or backend job. The 2,020 supplied records are a useful starting catalogue, not a claim of complete exchange coverage. The 36 coverage rows are fixed UI scenarios. No market prices or fitted surfaces are fabricated. The existing volatility workspace and native surface APIs remain intact; a deployment may supply `renderSurface(instrument)` to use its real renderer in the instrument sheet.

The demo treats configured ETF shortcuts as ETF display entries; this does not rewrite the source catalogue. Listing region and fund exposure region are distinct: a US-listed regional ETF may appear as a Europe or Asia shortcut. Only explicit, dated holdings groups can open a constituent list.

### Review flow

1. Open VFO in the real Sampo workspace. Try Europe / ASML, Asia / Tencent, then XLK's **Explore holdings**.
2. Disable **Demo coverage**. All names remain; data states become **Not connected**.
3. Star an instrument, open **Watchlist**, then switch to **Live coverage** or **History & backfills**.
4. Click a history bucket to inspect evidence in the right-hand sheet. Escape closes the sheet and restores focus.
5. Select instruments and **Prepare backfill**. Review a full-window request or confirmed gaps and export JSON.

The planner freezes the selected identities and catalogue revision. Dates are UTC calendar dates with an exclusive end. Gap selection requires matching source **and** data product, clips and merges confirmed intervals, and excludes unknown, failed or conflicting evidence. Full-window intent does not claim that data is absent. Exports carry `execution: "not-submitted"` and demo/observed/unavailable evidence provenance. Execution and authorization belong to the consumer deployment. Weekly or grouped-week matrix buckets cover the whole selected range; they are not a market trading calendar. Every matrix and mini timeline uses a single explicit source/product pair. Adjacent consistent evidence can cover a bucket; conflicting or incomplete evidence stays partial. Malformed intervals or duplicate instrument evidence block confirmed-gap selection for that instrument. Invalid live timestamps/statuses render Unknown. The draft export includes the snapshot label/as-of time. A missing source identifier must be entered explicitly for full-window intent.

View, filters, watchlist, selection, inspector, page, sort, coverage source/product and date window use Sampo's widget view-state callback. The reusable component retains `version: 1` and the existing `initialState`/`onStateChange` props, and accepts optional controlled `state` plus `renderRelated(instrument)`. Controlled callers must update the supplied state when `onStateChange` fires; the host persistence callback alone need not rerender a widget. A catalogue-aware rendering-state normalizer drops unknown identities and unsupported fields. Scroll/focus retention belongs to the route adapter. Drafts and execution intent are never included in portable rendering state. Mutable state is per widget, not a global singleton. A real coverage adapter supplies a `CoverageSnapshot`; no host authentication or job permissions are duplicated here.

### Checks and refinement boundary

Run the component typecheck and pure model tests:

```sh
node node_modules/typescript/bin/tsc -p examples/sampo-installed-apps/tsconfig.json
node --test packages/vfo-workspace-core/tests/universe-workbench.test.mjs
```

The model tests use Node's TypeScript stripping (Node 24 recommended). `scripts/check-market-universe.mjs` accepts `SAMPO_URL`, `SAMPO_STORAGE_STATE`, optional `CHROMIUM_PATH`, `SAMPO_WORKSPACE` and `REVIEW_DIR`. Use a review account: the script changes that browser's local widget draft but does not submit jobs or save the server workspace. Its auth-state file must stay private.

After visual review, refinements can deepen the catalogue assets, instrument-specific renderer composition, chart/coverage affordances and per-app chunking. Live adapters, retention semantics, calendars, coverage freshness policies and authorized backfill execution are separate integration work. Keep the catalogue/coverage distinction, source/product provenance and no-submit demo boundary.

Market-universe v1 review passed in the real Sampo host: catalogue / region / ETF membership, no-data browsing, watchlist, live and historical views, source/product-safe draft JSON, invalid-input handling, command palette, sheet focus restoration, 900px layout and reduced motion. Browser checks reported no page exceptions or failed same-origin requests. The affected typechecks, public-boundary audit and all 47 existing/frontend model tests passed. Screenshots and machine-readable receipts are kept in the ignored review directory.

### Presentation and packaging refinement checks

The synthetic component browser fixture tests source/product isolation, malformed evidence, review-only exports, controlled restoration, selection/reset, an unbound surface, six light/dark material combinations, reduced effects, and 900/600/390px layouts. It is a component qualification, separate from the installed host permission and exact-history checks:

```sh
CHROMIUM_PATH=/path/to/chromium node packages/vfo-workspace-core/tests/check-universe-workbench-browser.mjs
node examples/sampo-installed-apps/build.mjs
```

Evidence is written to ignored `.review/universe-workbench` and `.review/app-closures` directories. The real-host harness remains `scripts/check-market-universe.mjs`, with exact-route/cross-app acceptance in `scripts/check-app-links.mjs`. Never treat component screenshots as evidence for live data, authorization, backend execution or Windows.
