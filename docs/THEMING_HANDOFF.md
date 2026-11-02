# Theme and market workspace contributor handoff

This is frontend-only presentation work. Use synthetic fixtures: no Data Engine
service, private data catalogue, credentials or production deployment is required.

## Repository ownership and what is included

| Location | Responsibility |
| --- | --- |
| This repository, frontend | Reusable market-universe, coverage, surface, risk and report components; interaction state; normalized provider contracts; synthetic demos. |
| Sampo | Host theme selection, appearance service, material resolver and shared surface/SDK contracts. |
| Consuming application/deployment | Actual asset catalogue, data readers, endpoint bindings, branding palette and source credentials. |

The Market Universe page **is in this repository**, principally
[MarketHome.tsx](../packages/vfo-workspace-core/src/market/MarketHome.tsx) and
[command-node.tsx](../packages/vfo-workspace-core/src/command-node.tsx).

The asset UI is here too:
[AssetBadge.tsx](../packages/vfo-workspace-core/src/market/AssetBadge.tsx),
[contracts.ts](../packages/vfo-workspace-core/src/market/contracts.ts),
[UniverseFilterBar.tsx](../packages/vfo-workspace-core/src/market/UniverseFilterBar.tsx),
[group presentation](../packages/vfo-workspace-core/src/market/group-presentation.ts)
and [filtering](../packages/vfo-workspace-core/src/market/filters.ts).
[assets/](../assets/README.md) contains the contract notes and a fictitious catalogue
example, not a complete downloadable asset collection.

Downloaded logos, actual fund-holdings snapshots and deployment-specific merged
universes are **not included**. Monograms and synthetic fixtures work without them.
Keep provenance with supplied asset data; do not copy a private site's directory
or company theme into this repository. Future redistributable asset collections
can use the existing directory contract without changing these components.

## Current state

- The host has separate color-mode and material axes. Its three profile labels
  are Industrial (matte), Studio (satin) and Glass.
- Host color-mode choices are light, dark and system. Explicit personal settings
  take precedence over workspace defaults; system follows the device.
- The SDK already provides appearance subscriptions and semantic surface roles.
  Do not introduce a second theme engine or global event bus.
- The shared group picker and newer controls consume host semantic tokens.
- Older workspace/tearsheet styles still contain fixed presentation colors.
  Some fixed colors represent domain meaning and should remain stable.
- Surface3D currently observes attributes on html/body. The host applies theme
  changes to its workspace element, so this observer can miss them. A subsequent
  data update may repaint the plot, but theme changes must repaint immediately.
- A consuming brand may override every background/surface color across all
  materials. That can make materials look alike even when profile selection
  works. Qualify the generic UI with a neutral palette as well as an injected
  contrasting test palette; do not bake a specific brand into the components.

This handoff identifies remaining work; it does not claim full theme compliance.

## Desired behavior

1. Light/dark/system changes update every visible control, chart, popup, table and
   tearsheet immediately.
2. Material changes preserve their intended differences in chrome, depth, border
   treatment and elevation while analytical reading surfaces stay legible.
3. A theme change preserves the selected asset/date, group filters, checked
   tickers, camera, slice selection and open tearsheet.
4. It does not refetch data, recreate an application session, rerun calculations,
   submit a repair or alter any output.
5. Standalone components and synthetic demos remain usable without a Sampo host.

## Workstream 1: one appearance path and correct chart updates

Use the existing SDK useAppearance/Surface contracts at the host-facing composition
boundary. Keep reusable renderers supplied by ordinary visual props or the existing
component context. Do not make a standalone chart require an installed host just
to mount. The standalone demo should inject a synthetic appearance.

Translate the accepted appearance into one stable set of semantic visual values.
CSS handles ordinary DOM updates; imperative renderers receive the same revision
or visual inputs. Do not inspect a backend environment to choose a color mode.

For [charts.tsx](../packages/vfo-workspace-core/src/charts.tsx):

- React to the actual appearance change, not only mutations on html/body.
- Prefer the SDK appearance signal in the Sampo composition. If a DOM-only
  fallback is retained, observe the instance's actual theme ancestors and
  disconnect it on unmount; do not observe the entire document subtree.
- Update Plotly layout colors without recomputing native samples or rebuilding
  the numerical model. Use relayout/react as appropriate, preserving camera,
  uirevision and selected slices.
- Cover axes, gridlines, hover labels, colorbar, backgrounds and controls.
- Keep updates bounded and ordered with the current Plotly lifecycle; avoid
  creating a new plot merely because a color changed.
- Reuse the existing lossless data and exact-publication contracts unchanged.

## Workstream 2: semantic CSS and surface roles

Start with:

- [operations.css](../packages/vfo-workspace-core/src/operations.css)
- [market.css](../packages/vfo-workspace-core/src/market/market.css)
- [groups.css](../packages/vfo-workspace-core/src/market/groups.css)
- [workspace.css](../packages/vfo-workspace-core/src/workspace.css)
- [volatility.css](../packages/vfo-workspace-core/src/volatility/volatility.css)
- Existing styles under packages/vfo-workspace-core/src/ticker.

Replace fixed reading backgrounds, foregrounds, borders, muted text and hover
fills with semantic roles. Keep defaults for standalone use. Use existing surface
roles for canvas, content, inset, chrome, raised and floating surfaces.

Keep fit/overlay/bid-ask/status colors semantically distinct. Maintain readable
contrast in both modes; do not recolor all data series to the brand accent.
A Glass theme must not blur tables, text or WebGL content indiscriminately.
Respect reduced motion, reduced transparency, contrast and forced-color settings.

Use existing role contracts for radius/elevation/material treatment where they
apply. Avoid detecting a theme by its display name or adding one CSS branch per
material to every widget.

## Workstream 3: targeted cleanup and useful development previews

- Format touched compressed CSS/component routines into readable sections.
- Consolidate duplicate visual values and conflicting overrides into one role
  mapping; avoid stacking another broad theme override stylesheet.
- Remove selectors/rendering paths only after confirming they are unused.
  The discontinued dynamic-ranking boards are candidates; do not remove supported
  provider fields or financial calculations merely because a board was removed.
- Keep group membership/provenance separate from presentation; maintain the
  [market group contract](../packages/vfo-workspace-core/MARKET-GROUPS.md).
- Preserve the source coverage/ directory in Git. Only generated root coverage
  output is ignored. A clean clone must contain the coverage components.
- Check nested package metadata: the root uses the qualified 0.2 SDK cohort,
  while the standalone workspace-core manifest still advertises older optional
  peer ranges. Align/document supported peers before independently packaging it.
  Do not republish changed bytes under an existing immutable SDK version.
- Expand the synthetic preview to expose both color modes, system-mode simulation
  and all three materials through the existing appearance contract.
- Use a representative synthetic group library and a small transparent fixture
  logo set. No private asset bundle should be necessary to review the UI.
- Review existing HTML/CSS/SVG/table rendering in the analysis and Risk Lens
  components after the VFO path is sound; share established role conventions
  rather than introducing a separate theme implementation for each workspace.

The first PR should fix the chart appearance signal and the main workspace/group
surfaces. Follow with the rest of the tearsheet controls and cleanup in small,
reviewable increments. Separate any necessary generic Sampo resolver/SDK fix into
its own upstream change; consuming-application palette changes belong outside
this repository.

## Local setup

Requires the repository's supported Node version, npm and access to the pinned
Sampo GitHub release assets. The current SDK cohort is
0.2.0-alpha.20261102.1 from Sampo v1.0.0-beta.2.

An authenticated GitHub CLI can seed npm's external content cache using the
existing helper. No public npm/PyPI publication is required. A collaborator needs
access to the referenced Sampo release as well as this repository.

~~~powershell
.\scripts\Cache-SampoSdk.ps1
npm ci --prefer-offline
npm run check
npm run build
npm run demo
~~~

npm run demo serves the standalone synthetic volatility workspace.
npm run demo:risk serves the synthetic Risk Lens.

The expanded synthetic market fixture and its browser journey are
[synthetic-market.tsx](../packages/vfo-workspace-core/tests/synthetic-market.tsx)
and [check-market-browser.mjs](../packages/vfo-workspace-core/tests/check-market-browser.mjs).
Run the browser journey from the repository root:

~~~powershell
node packages/vfo-workspace-core/tests/check-market-browser.mjs
~~~

Use the existing Playwright installation; provision its Chromium browser if absent.
Keep preview listeners on loopback and screenshot/build output outside source.
No application deployment or live source is part of these commands.

## Acceptance matrix

| Scenario | Required evidence |
| --- | --- |
| Industrial, Studio, Glass x light/dark | Six screenshots with readable controls, popup surfaces, tables and charts. |
| System light -> dark -> light | Existing mounted components update without a data refresh. |
| Material change while investigating an asset | Selection, camera, slice, date and active pane preserved. |
| Two widgets sharing an app session | Both update visually; the session/query is not recreated. |
| Group picker open during a theme change | Readable popup and selected chips; no lost selection. |
| Repeated changes and unmount | No observer/subscription leak or stale plot update. |
| Narrow viewport | No clipping/overflow of filters, popovers or tearsheets. |
| Reduced motion/transparency and contrast | Supported fallbacks remain explicit and readable. |
| Offline synthetic provider | No unexpected external calls or backend writes. |
| Fresh clone/packaged consumer | Required source files present; no dependency on a sibling checkout. |

Check network/provider counters as well as pixels: theme-only actions must not
call data methods. Test cases should exercise behavior and lifecycle boundaries,
not merely assert that a color constant occurs in the implementation.

Before handing off a PR, run the public boundary audit, affected typechecks/tests,
the production build and the relevant synthetic browser journeys. Record what was
rendered versus what was only statically checked. Do not claim authenticated
deployment acceptance from a synthetic screenshot.

## Boundaries and definition of done

Preserve public component and provider contracts, native financial values,
market/coverage parity and backfill review semantics. Add no database/cache
drivers, live endpoints, credentials or job definitions to this UI repo. Do not
restart external services as part of frontend testing.

The result should be reviewable from a clean checkout with synthetic data, with a
small shared visual contract, immediate theme updates, readable source and no
dependence on an organization's data installation.

The source currently retains its existing UNLICENSED designation. The owner
chooses distribution/contribution licensing separately from this presentation PR.
