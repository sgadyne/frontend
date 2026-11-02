# Normalized workspace provider

A `ProviderRoot` publishes safe environment labels and returns a scoped `Provider`. Environments are arbitrary safe identifiers: no fixed local/UAT/prod list in the UI. The host authenticates and authorizes each request; the browser never receives upstream credentials or filesystem paths.

| Contract | Purpose |
|---|---|
| profiles | Available environment IDs, labels and explicit write availability |
| list / detail | Entire configured asset universe, current evidence, identity and revision |
| surface / evaluatedSurface | Accepted immutable model revision, listed expiries, native grid, exact optional cut |
| bands | Genuine native input IV/errors, pinned to model/context/as-of, paged |
| site | Presentation, classification directory, branded same-origin assets and board definitions |
| market | Native market summaries, precise as-of/tenor/units, optional EOD baselines and trends |
| analytics | Accepted generation manifests and paged results; no invented historical results |
| draft / save / preview / push / receipts | CAS-scoped custom intent and native comparison; site chooses delivery binding |
| command | Coverage, exact generations/quotes, groups and explicit backfill validation/submission/status |

The HTTP adapter uses a configurable same-origin base (`/workspace/v1` by default). Typed fields and methods are authoritative in `src/model.ts`, `src/market/contracts.ts`, `src/command-client.ts` and `src/data/http-provider.mjs`.

## Integrity and availability

Asset, scope, environment and model generation fence every asynchronous read. Native cuts carry coordinate kind/value; K/F must be converted by the native model per expiry, never selected from a nearby grid node. Historical input bands default to all actual inputs in the selected expiry; term views explicitly select matching actual quotes per expiry. Missing inputs, baselines, metrics and source bindings render unavailable. Boards rank only observed values, with provisional labels while loading.

Coverage describes evidence retained by its provider, not a claim that all external history was scanned. Integrity verification is distinct from financial fit-quality assessment. Gap selection freezes source/date windows in a repair basket; no page load or navigation submits a backfill. The private server owns idempotency, admission, authorization and delivery.

## Private backend composition

The current private server adapter lives outside this package at `integrations/firm-vfo`. Native source-schema projection is separately installed in the platform as a private `vfo.workspace.native` entry point. The reusable API delegates normalized market/surface/input/history reads to installed providers. Firm cache key layouts, historical file formats, source clients and numerical licences are private concerns.

This boundary qualifies distribution of the workspace core. It does not certify that the entire platform worker repository is public: its legacy firm runtime and source integrations still require an independent legal/security review.

## Asset relationships

The optional `site.industries` contract groups funds with dated, sourced holding records and independent `classificationMembers`. Reported fund membership is not a company industry classification. The UI preserves unmapped holdings without granting them a configured market identity. Sector/industry granularity and provenance remain explicit in the site directory.
