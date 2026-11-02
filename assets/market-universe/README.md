# Static market-universe bundle

`catalog.json` contains 2,020 static public/default asset identities and metadata records, four static universe boards, 16 dated fund-holdings snapshots and their classification memberships. It contains no live prices, observations, environment selection or deployment-specific universe membership. Source and as-of fields are retained from the input records. The six records whose region was `NONE` have no `region` field; no region was inferred.

`groups.json` contains 41 materialized default groups: three regions, 11 sectors, 11 sourced classifications and 16 fund-holdings groups. Holdings membership is drawn from the recorded asset IDs. `pinnedFundIds` identifies the fund to show in group presentation; it does not add the fund to its own holdings. Per-fund source URLs and as-of dates remain in the catalogue and on holdings groups.

`logos/` contains the 119 SVG files referenced by the catalogue. Their `brandSource` URLs are retained with each asset as provenance. The source bundle did not provide a licence or redistribution notice, so these URLs do not assert usage rights. Check applicable terms before redistributing the artwork. No private company or application branding is included.

The root package exports the catalogue as `frontend/market-universe/catalog.json`, groups as `frontend/market-universe/groups.json`, and SVGs under `frontend/market-universe/logos/*`. Consumer deployment profiles may bind these files by filesystem path; those paths and all environment-specific selection stay outside this repository. `catalog.example.json` remains a fictitious, synthetic sample.

## Navigation configuration

`navigation.json` adds three region entry points, six curated ticker baskets and explicit ETF shortcuts beside the existing groups. It is exported as `frontend/market-universe/navigation.json`. All members and fund links reference existing asset IDs. An ETF's exposure shortcut is separate from its listing region; only an explicit `groupId` opens a dated constituent group. There is no inference of holdings, new instrument registration or automatic refresh. Edit this file to change the frontend navigation; edit the source catalogue/groups deliberately to change reference membership.

The reusable `frontend/market-universe/workbench` component accepts these configurations and an optional coverage snapshot. The installed example keeps its synthetic coverage fixture under `examples/sampo-installed-apps`; it is not part of the reference-data bundle.
