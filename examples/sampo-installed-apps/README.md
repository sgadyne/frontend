# Installed app demonstrations

Risk Lens, VFO, Cluster and Replication are independent Sampo releases. This directory composes the existing app components with local synthetic providers; it does not implement a Sampo shell.

Sampo owns OIDC identity, authorized environments, Library navigation, Dockview tabs, settings, appearance, portals and workspace persistence. Only data and job adapters are synthetic. The notice inside every app states that no live data or backend jobs are connected. Cluster's Run analysis is an in-memory fixture response; Custom VFO does not run a calibration service.

## Build

From the repository root, install the locked dependencies and run:

    node examples/sampo-installed-apps/build.mjs

This builds one shared source closure and emits four independent OCI layouts under .review/installed-{risk,vfo,cluster,replication}-layout. Each has its own application identity, linked entry, contribution and release digest. React and the Sampo SDK remain host externals. Install through Sampo's standard stage, approve and install workflow, then grant the applications to the intended accounts.

The exact SDK cohort is checked by manifest.mjs. Application IDs are example.risk-lens, example.vfo, example.cluster and example.replication. These are demonstration packages, not corporate backend bindings.

## Real-host qualification

Qualified on Sampo main 5bd0b03 plus the host-app-presentation branch: actual OIDC login, OCI admission/install, four app renders, VFO 3D tearsheet, Cluster synthetic run, Replication table and workspace Save/reload. The applications consume the host appearance through SampoAppearanceProvider. Styles are scoped during the installed build to protect host navigation.

The separate apps/analysis-demo shell is an isolated visual preview only. Do not deploy it as Sampo or carry its account/navigation/settings implementations into the host.

## Follow-up

Keep app layout, chart appearance and tearsheet improvements. Consolidate reusable overlays and chart adapters in the presentation package. Deduplicate fixture service adapters and split shared build chunks per application when optimizing distribution size. Connect corporate data bindings separately; this demo does not qualify live backend workflows.
