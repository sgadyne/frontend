# App routes with the existing Sampo SDK

The installed examples use the exact `0.2.0-alpha.20261102.5` SDK cohort. The domain components remain reusable; the files in this directory are explicitly synthetic consumer compositions. Each `*-entry.tsx` exports one app's runtime, widget and session factory. Sampo owns the shell, account, environment, Dockview, appearance, authorized resolution and draft Save.

1. Declare one stable entry and its meaningful destinations in a linked descriptor. `createAppDescriptor(name)` is the generator used by the independent packages. `linked.json` is its generated VFO descriptor. VFO has five routes under the same `example.vfo` application and one `vfo` entry. A view route requires its own singleton `view`; the instrument route requires the catalogue's canonical `instrumentId`. Validate the descriptor against the packaged contributions before packing.
2. Give every route a closed, bounded `selectionSchema` and a rendering-only `portableState.schema`. The allowed schema subset comes from `@sampo/contracts`; it is not unrestricted JSON Schema. The host passes the selected object in `WidgetProps.config`, personal rendering state in `viewState`, and retains changes from `onViewStateChange`. The component does not receive `routeId`, so every distinction needed to render must be present in the validated selection.
3. Validate at the adapter, then pass normalized state into the existing domain component. `VfoMarket.tsx` uses the workbench state callback and its controlled restoration seam. An absent/empty legacy state and the original version-1 workbench state restore conservatively. The VFO portable contract version is **2**, while the existing workbench state discriminator stays **1**. The two versions identify different contracts. Unknown future state versions, unknown keys, invalid selections and oversized state are rejected. Unknown catalogue IDs are never converted from tickers or replaced with another instrument.
4. Use the host navigation services and appearance provider. Do not build another router, permission cache, app catalogue or theme picker.

For an explicitly supplied, authorized exact release selector:

```tsx
import {DestinationLink} from '@sampo/sdk-react';
import {appRouteAddress, type LinkedRouteVersion} from '@sampo/contracts';

function InstrumentLink({instrumentId, version}: {
  instrumentId: string;
  version: LinkedRouteVersion;
}) {
  const address = appRouteAddress(
    {publisherId: 'sampo.synthetic', applicationId: 'example.vfo', entryId: 'vfo'},
    'vfo.instrument',
    {instrumentId, view: 'history'},
    version,
  );
  return <DestinationLink address={address} presentation="peek">Inspect coverage</DestinationLink>;
}
```

The caller supplies the release selector; never choose a release by sorting versions. Current selectors require an explicitly configured installation and target. For metadata exploration use `publishedEntryAddress(qualifiedEntry)` with `DestinationLink`. Missing navigation service disables the control; denied or unsupported resolution displays an unavailable state. A reference is neither an installation dependency nor a permission grant.

VFO declares metadata references to Risk Lens and Replication; both refer back to VFO. These receivers do not recognize VFO catalogue IDs, so those links open entry overviews and explain that there is no portfolio/report mapping. They carry no instrument selection. Target titles and backlinks are resolved under host authority. Cluster deliberately has no references and works independently.

Peek is temporary. The host provides its Open and Add to draft actions. Add freezes validated state and an exact destination, rechecks authority, and changes only the personal draft. Save remains a separate host action. The app never calls a draft transaction or submits a job while following a link. Retained queries/sessions belong to SDK lifetime owners; closing one sibling must not dispose another owner's lease.

The portable state is intentionally bounded: VFO carries filters, watchlist, checked selection, inspector/page/coverage display controls and local scroll/focus; Risk Lens carries view controls and normalized all/none scopes without result bodies; Replication carries recognized report/view, retained snapshot/filter selections, bounded saved views and table display preferences. Cluster carries only the selected display view. Its calculation settings, construction proposals, saved analyses and calculated results stay local and are not deep-link/history promises. Restore never executes a calculation.

## Checks

From the repository root (Node 24):

```sh
node --test examples/sampo-installed-apps/linked-state.test.mjs examples/sampo-installed-apps/linked-journey.test.mjs
node node_modules/typescript/bin/tsc -p examples/sampo-installed-apps/tsconfig.json
node scripts/audit-public.mjs
node examples/sampo-installed-apps/build.mjs
```

`scripts/check-app-links.mjs` is the real-host journey harness. Supply `SAMPO_URL`, a private `SAMPO_STORAGE_STATE`, `SAMPO_WORKSPACE`, the explicitly selected `SAMPO_VFO_RELEASE` digest, and a canonical `SAMPO_INSTRUMENT_ID`. Optional `CHROMIUM_PATH` and `REVIEW_DIR` control local execution. `SAMPO_RESTRICTED_STORAGE_STATE` enables a second-account denial check. The harness changes only the review browser's personal draft and never Saves or submits a job. Keep auth files and screenshots/receipts in ignored review storage. Missing second-account evidence is reported as unqualified; synthetic SDK tests are not evidence of live ACL enforcement.

For a new immutable release from reviewed built assets, pass an explicit unused version and a separate output directory: `node manifest.mjs vfo 1.2.2 /absolute/new/reviewed-output`. The ordinary fixture default remains 1.2.1. Verify that every asset hash matches the reviewed candidate before packing; a changed digest must not replace already published bytes under the same version. App versions and the pinned SDK cohort are independent.
