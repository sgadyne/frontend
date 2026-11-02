# Analysis workbench components

Generic Cluster and report-workbench React components with normalized data schemas, shared charts/tables and explicit Sampo host-service use.

The consumer supplies metadata/job/result bindings and application identity. Report definitions are supplied as props to `ReplicationWorkspace`; no firm's report catalogue or application manifest ships here. Missing job configuration leaves execution unavailable.

`npm run build:analysis` builds the component library. Private deployment composition, OCI manifests, release pins and publication live in the consuming installation. Synthetic browser fixtures demonstrate eight Cluster views and 22 configurable report examples without external requests.
