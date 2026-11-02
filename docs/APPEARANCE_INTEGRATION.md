# Appearance and analytical workspaces · 0.3.1

## Ownership

| Layer | Owns | Does not own |
|---|---|---|
| Sampo host | Resolved appearance, navigation authority, workspace/session lifetime | Financial calculations |
| Frontend presentation | Semantic CSS variables, chart colours, accessible surfaces | A separate theme resolver or data client |
| App components | Selection, camera, tab state and explicit analysis actions | Installed identities or deployment bindings |
| Consumer composition | Names, manifests, providers, source mappings and authorized links | Duplicated renderer theming |

Hosted Risk Lens, VFO, Cluster and Replication consume the existing SDK appearance service. Theme updates change rendering inputs without rebuilding sessions, rereading results or running jobs. Standalone consumers can wrap their view in AppearanceProvider from frontend/presentation/core with a resolved AppearanceSnapshot. SampoAppearanceProvider from frontend/presentation reads the host service directly.

The root frontend package ships all sibling source directories used by its export paths. Consume this root package; standalone leaf-source tarball distribution is not qualified by this checkpoint.

## Rendering and navigation

- Six optional host presets compose the existing matte, satin and glass materials: Industrial Slate/Graphite, Studio Porcelain/Dusk, Glass Mist/Aurora. They do not change deployment or widget contracts.
- Numerical content stays on stable reading surfaces. Glass decorates floating chrome with tint, blur, highlights and shadow. This is a CSS glass treatment, not a physical optical simulator.
- The synthetic shell restores Library (with collapsed Recents), Workspaces, Activity and Settings. Ctrl/Command K opens a floating search bubble. The search has opaque matte/satin surfaces and glass surfaces only in glass mode.
- Search and app links resolve declared, exact Sampo addresses. Demo activity is session navigation history, not an audit log or authorization mechanism.
- VFO selection opens a right-side rounded sheet, approximately half the desktop viewport. Surface, Analytics and Custom VFO are full tab views, with arrow/Home/End keyboard navigation. Surface is default; Live/Historical and Prepare backfill retain their existing meaning.
- Views mount when first visited and remain mounted thereafter. Reduced motion/transparency and efficient rendering disable expensive decoration.

## Corporate component checkout

This increment keeps the published beta.2 / 0.2.0-alpha.20261102.1 SDK cohort. It does not require an Engine update or data migration.

    git fetch origin
    git switch feature/sampo-workspace-presentation
    ./scripts/Cache-SampoSdk.ps1
    npm ci --prefer-offline
    npm run check
    npm run build

The authenticated GitHub cache step is necessary for the private Sampo release URLs. An unauthenticated fresh npm install can return 404; do not replace those URLs with credentials. Keep your own names, bindings, provider factories and app manifests. Install the resulting root package into your existing consumer composition and rebuild its widget artifacts.

## Synthetic integrated preview

The preview uses actual components with synthetic providers and an SDK host. It is separate from the production Sampo deployment. All four apps remain disconnected from live data.

For the optional six-preset preview, use a Sampo source checkout containing feature/analytical-theme-presets-public, then in PowerShell:

    $env:SAMPO_SOURCE_ROOT = 'C:/src/sampo'
    npm run demo:analysis

Open http://127.0.0.1:5186/. On macOS/Linux, use SAMPO_SOURCE_ROOT=/path/to/sampo npm run demo:analysis. This source alias is preview-only; normal component builds use pinned SDK packages. The six-preset Sampo module is a separate source commit, not a newly published SDK package or production settings rollout.

## Verification and remaining work

npm run check runs boundary audit, types and 62 component/domain tests. npm run test:appearance exercises all four apps across six presets, camera/selection persistence, absence of extra reads/jobs, linked back navigation, accessibility preferences and narrow layouts. npm run test:shell-browser checks search focus/keyboard behaviour, material differences, the three VFO views and backfill navigation. Browser tests require a running preview and installed Playwright Chromium; PLAYWRIGHT_CHROMIUM_EXECUTABLE can select an existing binary.

This checkpoint was exercised in Chromium on Linux with synthetic data. Real corporate provider wiring, Windows execution and browser-specific glass fidelity still need checking in the consuming environment. Plotly remains a large lazy-loaded chunk. Risk Lens's existing module-level presentation configuration remains a follow-up for independent concurrent consumer compositions. Preset adoption and the search shell in the production Sampo hub remain a separate integration step.

AG Grid Enterprise is not required by these screens; current table components use their existing renderers.
