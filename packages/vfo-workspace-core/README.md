# Volatility workspace core

Reusable React workspace components and normalized data contracts. This package contains the market boards, universe navigator, linked ticker tear sheet, native IV/density viewer, analytics panels, custom-model editor, historical coverage inspector and reviewed repair basket.

The default view is a scatter plot with hidden axes. One bottom-left Slice explorer contains both the selection controls and 2D tear sheet, collapsed on initial load. Pinned inputs and parameters are expanded inside Analytics. Cross-expiry cuts preserve an exact coordinate: K/F by default, or explicit normalized strike / absolute strike. The numerical provider evaluates that coordinate at every expiry; quote uncertainty bands remain actual observed inputs, never synthetic fitted error bars.

## Composition

```tsx
import {VolatilityWorkspace, VfoSession, createHttpProvider} from '@vfo/workspace-core';
const session = new VfoSession({signal}, {}, createHttpProvider('/workspace/v1'));
session.bindScope('personal:example', 'personal:example:1');
// Render with the session and its observable state, or use the optional Sampo adapter.
```

The optional `./sampo` entry exports `createWorkspaceExtension(applicationId, provider)`. It composes this package with Sampo without owning deployment, authentication or private endpoints.

## Ownership

- `src/market`: generic asset directory, market observations and board presentation.
- `src/ticker`, `src/volatility`: linked model, analytics and custom-intent views.
- `src/command-*`, `src/coverage`, `src/history.ts`: coverage evidence and explicit request review.
- `src/data/http-provider.mjs`: same-origin normalized transport; no source credentials.
- `src/model.ts`, `src/market/contracts.ts`: public contracts.

A private application supplies its backend binding and application identifier. Firm SQL/OneTick/Redis schemas, AQS/native licensing, source mappings, credentials, identities and machine paths belong in private integrations and external deployment files. The browser receives normalized data and safe profile labels only.

`node packages/vfo-workspace-core/build.mjs` builds the core independently of private adapters. `node packages/vfo-workspace-core/audit.mjs` checks its source boundary. Neither needs a running database or private deployment.

This is a distribution candidate, not a publication or licence grant. It remains private / UNLICENSED pending owner review. Public ticker logos are external site assets and are not included; review their rights separately before distribution. Plotly and Motion retain their upstream notices in build output.

Market boards can declare ETF portfolios with dated holding weights and separate sourced sector classifications. Funds remain pinned above scrollable company lists. Only configured asset IDs can open fitted-model views; other holdings remain visible and non-actionable. Branding and membership datasets are external site assets, excluded from this package.
