# Market assets snapshot

Source: frontend commit `a6e2b52bb5d6a84e34095184e20cf3edfa579c71`.
This immutable ZIP is a convenience snapshot on `feature/market-assets`; main and the deployed apps are unchanged.

[Download the ZIP](market-assets-a6e2b52.zip) · [SHA-256 checksum](SHA256SUMS)

| Contents | Size / count |
| --- | --- |
| Listing records | 210,576 |
| Tracked market directory | 504 files / 182,974,783 bytes |
| Default artwork | 450 SVGs / 874,084 bytes |
| ZIP, including authoring scripts and root licence | 19,132,967 bytes (19.13 MB / 18.25 MiB) |
| Expanded ZIP | 518 files / 183,099,339 bytes |
| Canonical catalogue JSON | 92,118,041 bytes |
| Compact runtime catalogue JSON | 24,516,487 bytes (4,244,173 gzip bytes in the reviewed build) |

The inventory is listings across the documented US/Americas, European and Asia-Pacific source scopes, including multiple instrument types and cross-listings. It is not 210,576 unique companies, a complete worldwide security master, a logo for every listing, or a live market-data feed. The source snapshot dates and gaps are retained in the coverage reports.

Artwork has 891 direct Equity issuer bindings across 645 issuer identities, plus 515 separately labelled Equity instrument-art bindings. ETF sponsor marks, product art, exposure flags, generated tiles and monograms remain distinct. The optional 3,087 unclear-rights ticker-logo collection bindings are excluded from this default snapshot. Original source/rights notices remain authoritative; packaging supplies no additional redistribution or trademark rights.

## Included

- `assets/market-universe/`: canonical and compact catalogues, groups, navigation, normalized source snapshots, artwork, provenance, licences, coverage reports and refresh documentation.
- `scripts/market-universe/`: import, artwork, compact packing, reporting, checks and small fixtures.
- Root `LICENSE`.

No node_modules, credentials, raw research caches, private data, prices, observation history, app build output or optical runtime are included. This is a data/asset and authoring-tools snapshot, not a runnable copy of the four frontend apps.

## Use

Extract the ZIP; start with `frontend-market-assets/assets/market-universe/README.md`, `COVERAGE.md`, `NOTICES.md` and `ARTWORK-RESEARCH.md`.
Existing app consumers should continue using the frontend package/OCI release and its exported catalogue loader. The compact JSON uses a versioned column/dictionary encoding; do not treat it as the canonical object-array format. The application loader and workbench remain in the source repository.

Verify on macOS:

```sh
cd distributions/market-assets
shasum -a 256 -c SHA256SUMS
unzip -t market-assets-a6e2b52.zip
```

## Reproduce from a frontend checkout

```sh
git archive --format=zip --prefix=frontend-market-assets/   --output=market-assets-a6e2b52.zip   a6e2b52bb5d6a84e34095184e20cf3edfa579c71   assets/market-universe scripts/market-universe LICENSE
```

The source commit fixes the file bytes and timestamps. ZIP CRCs, safe relative entry paths and the SHA-256 digest were verified before publication. This is intentionally one snapshot rather than an accumulating binary history; subsequent bulk downloads should preferably be release attachments.
