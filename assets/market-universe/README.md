# Static public market directory

This bundle makes every supplied listing browseable and searchable before any data connection exists. It contains public/default identity metadata and artwork only. Coverage is an optional caller-supplied overlay; unknown/not-connected never means a connected source confirmed no data. It does not contain prices, captured observations, jobs, vendor runtime clients, configured consumer membership or a security-master service.

The exact current counts, dates, source evidence and gaps are generated in [COVERAGE.md](COVERAGE.md). The inventory includes equities, funds, warrants, bonds and other source-published instruments. It does not represent the same number of distinct companies, and it does not claim all world tickers. A complete source-scope status is deliberately narrower than exchange-wide completeness. No index constituent list is used as a whole-market directory.

`catalog.json` is the canonical readable-contract catalogue (`assets`, four existing boards, and unchanged dated fund-holdings snapshots). `snapshots/*.json` are normalized public source inventories, not raw scraped pages or observations. `sources.json` defines exact adapters/scopes, URL/parameters, minimum-row guards, limitations and rights notes. `coverage-report.json` records offered/fetched/accepted/rejected/duplicate counts, page receipts, retrieval timestamps, source dates, hashes and completeness evidence. `source-attempts.json` records blocked/unparsed official sources and the actual alternate used.

`catalog.compact.json` is an optional smaller transport with a versioned column/dictionary schema. The exported `frontend/market-universe/catalogue-loader` decoder returns the same instrument identities. Consumers may load that JSON at their own package/OCI URL; the installed example uses the compact transport and a small manifest of separately emitted local image URLs. The catalogue and group JSON are emitted as package assets and loaded in parallel during module initialization; the existing named array exports remain ready when the module resolves. Those data tables and SVG bodies are not embedded into the initial JavaScript. Only visible page images are requested, with no requests to issuer websites or image services at runtime. The example build uses a relative asset base so package mount paths are respected.

## Identity and provenance

A new identity is `LISTING:<MIC>:<percent-encoded exact local symbol>`. Symbols are strings: share classes, punctuation, leading zeros and cross-venue duplicates survive. `mic` identifies the source's venue/segment; ISO operating-MIC relationships and venue country are retained in `venues.json`. Provider Hong Kong symbols are normalized to the official five-character code with their source spelling preserved. No local ticker is invented when a directory has only an ISIN/WKN.

Existing `assetId`s such as `EQUITY:AAPL`, `EQUITY:700-HK` and every original holdings/group/navigation reference remain valid. A verified `listingId` and aliases supplement those IDs. Legacy display tickers remain unchanged. Official directories win over provider supplements; a provider alias is linked only through a unique venue/operating-venue + ISIN + trading-currency match. Missing fields can be supplemented on an exact, nonconflicting listing identity, with field sources retained. Alternate names remain searchable. Currency, issuer domicile, sector and instrument type are never inferred from a country flag, ticker suffix or logo domain.

`listingCountry` means country of the trading venue, not issuer domicile or fund exposure. `listingAsOf` is the source's date when supplied; `metadataRetrievedAt` is separate. A retrieval date is never substituted for a missing source as-of. Legacy `source`/`asof` remain as supplied, with changed legacy fields preserved in `legacyMetadata`; old data is not relabelled as newly verified. EWH/SPY/XLK now use their official US directory venue rather than the legacy NMS placeholder.

Fresh snapshots describe securities present in that source scope at its date. Old records are retained when a refresh fails, shrinks unexpectedly or no longer includes a listing; `retained-not-in-latest-source` is not a delisting assertion. A failed/truncated fetch never deletes valid catalogue entries. Dated holdings remain distinct from current listing status and are not refreshed or fabricated.

## Navigation and runtime

`groups.json` materializes region, sector/classification, dated holdings and venue groups. Region/venue membership and counts are generated from the catalogue. Original non-region group memberships and navigation IDs/links are preserved. `navigation.json` retains Americas, Europe (including UK/Switzerland) and Asia Pacific (including Australia), existing baskets and ETF shortcuts. Fund exposure is distinct from listing region and only explicit holdings-group links open recorded constituents.

The workbench pages 30 universe/live rows and 18 history rows, requests history evidence only for the visible page and does not precompute history cells for the full inventory. Immutable catalogue identity/search indexes are cached. Search includes MIC, local symbol, ISIN, canonical/legacy aliases and alternate names. All listings remain available without a coverage connection; data filters apply only when deliberately selected. Backfill output remains a review-only draft and submits no work.

## Artwork

`artwork.json` records every bundled file's source URL, actual media type, source/sanitized checksum, bytes, fetch date when known, role, attribution and known rights status. Existing artwork whose original fetch date/licence was not supplied remains explicitly unknown. Provenance is not a licence grant; notices live in [NOTICES.md](NOTICES.md).

Resolution order is an explicit curated override, official issuer/fund artwork, verified instrument artwork, labelled exposure/underlying/category icon, then a deterministic generated monogram. Authentic artwork counts are separate from flag/category/ticker-tile fallbacks. Images are deduplicated and reused only with an existing verified association or exact ISIN relationship. There are no invented issuer-to-domain mappings. Missing/failed images produce a small readable monogram; changing an identity/image resets its failure state.

EWH uses a permissively licensed Hong Kong exposure flag while retaining its US listing country. SPY retains SPDR artwork. A usable authentic blue XLK tile was not found: current SSGA's published XLK tile is magenta. The blue XLK tile is explicitly a curated ticker fallback, never an authentic logo claim. Configured futures roots use specifically verified public product/benchmark artwork or permissive underlying-country flags when available, with a generic category icon otherwise. Continuous `1!` series appear only as artwork provenance; this bundle does not register an infinite contract inventory. Unverified @CO/VIX product mappings remain unverified.

SVG authoring rejects scripts, events, `foreignObject`, HTML/error bodies, external references, entities/doctype, unbounded dimensions and oversized files. There is no inline SVG execution at runtime. Public provider artwork has no presumed redistribution or trademark grant; its source and uncertainty remain in the manifest.

## Reproducible offline refresh

Authoring requires Python 3.11+ with the small pinned dependencies in `scripts/market-universe/requirements.txt`; Node 24+ is recommended for the repository's TypeScript-stripping checks. No Python dependency enters the frontend runtime. Use a research cache outside the checkout; raw downloads and HTTP metadata are not committed.

```sh
python3 -m venv /path/to/authoring-venv
/path/to/authoring-venv/bin/pip install -r scripts/market-universe/requirements.txt
/path/to/authoring-venv/bin/python scripts/market-universe/refresh.py --cache /path/to/research-cache --refresh
/path/to/authoring-venv/bin/python scripts/market-universe/artwork.py --cache /path/to/research-cache
node scripts/market-universe/pack.mjs
node scripts/market-universe/report.mjs
node scripts/market-universe/check.mjs
```

`--source nasdaq --source us-other` selects adapters. `--offline` requires existing raw cache, `--compile-only` rebuilds from checked normalized snapshots, and default cached requests resume without downloading them again. `--refresh` conditionally revalidates GETs using ETag/Last-Modified when available. Each source has bounded workers, timeout/retry/backoff, response-size limits, minimum rows and structural/page-total guards. HTTP pages are cached atomically. A greater-than-20% source shrink requires inspection and is rejected rather than silently applied. Failed sources return a visible error/nonzero refresh result after successful sources compile, retaining last good outputs. To replace an invalid cached response, rerun that source with `--refresh` after inspecting the diagnostic.

After a metadata compile, rerun artwork, pack and report to regenerate derived bindings/transports/receipts. `artwork.py --offline` reuses cached metadata/images; original asset fetch dates stay unchanged. Check cache location/disk before a broad fetch. No credentials, paid subscriptions, auth changes, scheduled services or backfills are required.

Validation:

```sh
/path/to/authoring-venv/bin/python -m unittest discover -s scripts/market-universe -p 'test_*.py'
node scripts/market-universe/check.mjs
npm run audit:boundary
npm run typecheck
node examples/sampo-installed-apps/build.mjs
CHROMIUM_PATH=/path/to/chromium node packages/vfo-workspace-core/tests/check-universe-workbench-browser.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/market-universe/check-scale.mjs
```

The import fixtures exercise real public source structures, stale workbook dimensions, missing numeric symbols/fields, pagination truncation, cross-venue collisions, a failed source, safe asset validation and idempotent cached retrieval. Catalogue checks cover unique IDs/listings, every original group/holding/navigation reference, compact transport identity equivalence, artwork roles and source accounting. Browser receipts report full-catalogue disconnected search, page limits, mounted local assets and measured timings. A standalone SDK fixture is not a live-deployment qualification; no pilot deployment is performed by refresh/build commands.
