# Market group catalogue contract

A provider may return `site.marketGroups` with `{revision, groups}`. Each group has a stable `id`, a human-readable `title`, a `category`, a content `revision`, and a deduplicated `assetIds` array of canonical configured asset IDs. Optional `provenance` and `asof` describe the source; `pinnedFundIds` identifies funds for presentation and does not implicitly add them to holdings membership. Group revisions and the catalogue revision identify immutable content. The provider owns materialization and revision generation.

For example, an external directory may contain:

```json
{"groups":[{"id":"sample-holdings","title":"Sample fund holdings","category":"fund-holdings","assetIds":["EQUITY:EXAMPLE"],"pinnedFundIds":["EQUITY:FUND"],"provenance":"Illustrative source","asof":"2026-01-01"}]}
```

This is synthetic data. A provider should reject duplicate IDs and normalize/deduplicate members when preparing the catalogue. Fund holdings and independent classifications should be distinct groups. Group selections are unioned; search and classification filters intersect that union. Groups are navigation selections, not builder scope or execution requests. Backfill review freezes resolved members independently and records the catalogue identity and a digest of the selected group identities in its execution group identity.
