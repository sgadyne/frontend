# Local SDK v2 source candidate

These public SDK archives were built from Sampo `feature/sdk-v2` commit
`bed32342355fc4f32e076977c0cb93fe0a3044a8`. Source package versions and declared
dependencies are preserved, including the supported `0.2.0-alpha.20261031.1`
cohort and `@sampo/design-tokens@0.1.0`.

The commit-specific directory and lockfile integrity hashes identify this
candidate; the cohort number alone does not prove that a host includes the new
registered-job API. No SDK API or compatibility check was patched. The local
build omitted optional theme/spatial renderer builds, which are not packaged
here. Only contracts, client, runtime, sdk-react, tooling and design-tokens are
included. The existing Sampo installation was not upgraded.

Replace these local archives with the CI-qualified distributions from the same
source revision when that release is published. Cluster requires the host's
registered-job service. An older host displays an unavailable Run action; it
does not fall back to an application dispatcher.
