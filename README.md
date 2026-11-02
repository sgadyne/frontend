# Frontend components

Reusable React components and workspaces for risk, portfolio analysis and volatility investigation. This repository contains rendering, interaction state, normalized data shapes, caller-supplied provider interfaces, optional Sampo widget/session factories and explicitly synthetic demonstrations.

Application namespaces, installed contribution IDs, source bindings, environment selection, actual data locations, credentials, private catalogues, company presentation settings and release/deployment composition are supplied by the consumer outside this repository.

## Source layout

| Location | Contents |
|---|---|
| `apps/pod-risk-lens/src` | Risk Lens app view, reusable panels, UI controls and generic session factory. |
| `packages/risk-lens-data` | Provider interface and clearly labelled synthetic demo fixtures. |
| `packages/vfo-workspace-core` | Volatility explorer, universe/coverage views and an injected-provider session. |
| `apps/vfo-operations/src` | Parameterized exports for a consumer-owned Sampo composition. |
| `packages/analysis-workspaces` | Cluster and report-workbench components with supplied bindings/report definitions. |
| `apps/workspace-demo`, `apps/risk-lens-demo` | Standalone synthetic demos. |
| `scripts` | Component builds, boundary checks and initial-commit helper. |

The component library does not publish a firm's application manifest or select its data service. A consumer constructs its app/session using a provider and supplies any logical identifiers. The report workbench receives report definitions as props; it does not ship a firm's report catalogue.

## Local development

```powershell
./scripts/Cache-SampoSdk.ps1
npm ci --prefer-offline
npm run check
npm run build
npm run demo:risk
# Separately: npm run demo
```

The cache helper uses the authenticated GitHub CLI to download the pinned beta.2 SDK assets to a temporary directory outside this source tree, verifies their SHA-256 hashes, and adds them to npm's content cache. It requires GitHub access to the Sampo release; no token or machine-specific path is stored in this repository. Third-party dependencies resolve normally.

The demos serve synthetic fixtures only. They do not fall back to external market or portfolio sources. Build Risk Lens demo with `npm run build:risk:demo`; preview it with `npm run preview:risk`.

## Composing an application

```tsx
import {RiskLens} from "./apps/pod-risk-lens/src/index";

// The caller supplies this interface. Components know no endpoint or binding.
<RiskLens provider={provider} />
```

Package consumers can import the documented `frontend/risk/*`, `frontend/vfo/*` and `frontend/analysis` export paths. Sampo consumers can use `createRiskLensApplication` with an injected provider factory, or `createWorkspaceExtension(applicationId, provider)` for volatility. Cluster requires explicit metadata/job/result configuration; report workspaces receive explicit report definitions and a configured reader. Missing configuration is displayed as unavailable rather than selecting a deployment default.

Preserve shared application-session ownership when several panels observe one selection. Source acquisition, financial calculation, maintenance schedules and publication remain backend responsibilities.

## Checks

- `npm run check`: boundary audit, component typechecks and unit tests.
- `npm run test:risk-browser`: injected synthetic-provider browser check.
- `npm run build`: generic component libraries; no deployment manifests.
- `npm --prefix packages/analysis-workspaces run test:cluster-browser`: eight-view synthetic Cluster browser checks.
- `npm --prefix packages/analysis-workspaces run test:browser`: synthetic report-workbench browser checks.
- `npm run audit:boundary`: rejects private names/source references and concrete endpoints in component code.

## First repository commit

```powershell
.\scripts\First-Commit.ps1 -WhatIf
.\scripts\First-Commit.ps1
```

The helper creates only the initial local commit. It checks source, stages an explicit public allowlist and rejects generated/private paths. It does not choose a remote, publish an artifact or push source. Git author identity must already be configured.

## Distribution

The source currently retains its existing `UNLICENSED` designation pending the owner's licence choice. Third-party notices remain with their distributions. Actual application deployments, branding, private data and downloaded asset collections are not part of this source tree.

## Theme and market workspace contributions

Start with [the theme cleanup handoff](docs/THEMING_HANDOFF.md). It identifies the
market-universe and asset components, the data-free development workflow,
remaining appearance work and the acceptance matrix.

To checkpoint the completed public source changes and this handoff:

```powershell
.\scripts\Commit-Frontend-Handoff.ps1 -WhatIf
.\scripts\Commit-Frontend-Handoff.ps1
# Optional: use -Push to push the resulting branch to origin.
```
