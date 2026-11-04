# Market artwork source research

Research snapshot: 2026-11-04 UTC. artwork.json records the default bundle and exact per-file lineage. It excludes the unclear-rights bulk collection unless an author explicitly passes --include-unclear-rights-ticker-logo-collections.

## Default issuer artwork: Simple Icons

- Package: https://registry.npmjs.org/simple-icons/-/simple-icons-16.36.0.tgz; repository: https://github.com/simple-icons/simple-icons.
- Package retrieved at 2026-11-04T01:29:06Z; 6,515,454 bytes; SHA-256 2069d8e682dda3aa05fa71de36c0ab17984e62d2bd34d7082c4a85e0691b4235; npm SHA-512 sha512-+VNPPkqSOLidFeSgBKUWX4n50WPpDC09hav+BgS26anIF1oQOlGBb8LvwGR+6fYRjo+B6CiKzNBceMPkSVXANQ==.
- The package contains 3,467 icon records. The default manifest records 288 unique, sanitized icon SVG files (367,760 bytes), bound to 891 Equity listings across 645 issuer identity groups. Four ambiguous name groups and five custom-licence records are skipped. Source records are joined by a unique exact normalized issuer name/title/alias, never by ticker, domain, substring or derivative. Issuer identity reuse is bounded to existing issuerId or exact normalized company name plus listing country.
- The Simple Icons license at https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md applies CC0 to the project, while its disclaimer at https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md says this does not imply every included icon is CC0, individual licence metadata can be incomplete, and a missing licence record does not mean the icon is unlicensed. Per-icon licence status and source URLs are preserved. NC, ND and custom entries are skipped. Trademark rights remain with each owner.

Across 58,027 Equity catalogue records, the default has 1,406 total authentic artwork bindings / 1,000 identities when existing instrument-level marks are included. The separately labelled direct issuer-art category has 891 listing bindings / 645 issuer identities; the other 515 authentic Equity records retain instrument-art labels. Regional totals and direct issuer counts are shown in artwork.json and generated COVERAGE.md.

| Region | Equity records | Total authentic artwork | Direct issuer artwork | Issuer identities with direct art | Instrument art |
| --- | ---: | ---: | ---: | ---: | ---: |
| Americas | 5,428 | 130 | 119 | 117 | 11 |
| Asia | 27,300 | 179 | 122 | 109 | 57 |
| Europe | 25,293 | 1,097 | 650 | 419 | 447 |
| Total | 58,027 | 1,406 | 891 | 645 | 515 |

Within the 5,409-row official US Equity directory scope, there are 129 authentic artwork bindings / 127 identities overall: 119 direct issuer-art listings / 117 issuer identities and 10 instrument-art listings.

## ETF sponsor artwork

The existing iwm.svg is a TradingView rendering of the iShares wordmark. It is labelled fund-sponsor-artwork, and matching iShares ETF names can reuse it. It covers 463 of 5,775 US ETFs and 3,102 of 27,489 global ETFs. This is a sponsor identity, not product-specific ETF artwork. Product artwork remains 2 of 5,775 US ETFs and 5 of 27,489 global ETFs. The original TradingView source did not supply a redistribution or trademark grant; this remains explicit in each manifest entry.

## Optional broad US source: unclear logo rights

Two old public collections provide ticker/name/logo rows with PNGs:

- Nasdaq collection: https://github.com/ahmeterenodaci/Nasdaq-Stock-Exchange-including-Symbols-and-Logos/tree/9d6e5c100d4e2c1f9282e5d5e766361702027e12, commit 9d6e5c100d4e2c1f9282e5d5e766361702027e12, last pushed 2023-10-06T15:10:47Z. Its README claims Nasdaq listing data and documents symbol, name, and logoUrl.
- NYSE collection: https://github.com/ahmeterenodaci/New-York-Stock-Exchange--NYSE--including-Symbols-and-Logos/tree/26a4ced07f7f402a97dee874d32cb2bdb1b806e3, commit 26a4ced07f7f402a97dee874d32cb2bdb1b806e3, last pushed 2023-10-06T20:30:30Z. Its README claims NYSE listing data and provides the same fields.

The repositories contain MIT license files, but neither README nor manifest assigns an individual image licence or original source to each brand mark. The importer does not claim the repository MIT license covers logo assets. It requires explicit opt-in, uses pinned archives, and limits matching to Equity rows where the exact exchange MIC and local symbol agree and the normalized full company names match. It never applies those symbols outside US XNAS/XNYS or to ETFs and derivatives.

The pinned archives were retrieved at 2026-11-04T01:33:41Z (Nasdaq) and 2026-11-04T01:33:42Z (NYSE):

| Collection | Retrieved | Archive bytes | JSON rows | Exact US Equity candidates | Added listings after existing art | Distinct issuer identities | New deduplicated SVGs | Archive SHA-256 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Nasdaq / XNAS | 2026-11-04T01:33:41Z | 8,577,842 | 5,101 | 1,990 | 1,934 | 1,920 | 1,919 | 89504e6193917860f02bbe60b2b082f8e2e3c5a225558ccc45f69766138f3497 |
| NYSE / XNYS | 2026-11-04T01:33:42Z | 9,606,387 | 5,541 | 1,214 | 1,153 | 1,136 | 1,134 | 0702469d78cb0ec9a820f3d9ac24c91598a6a8f1a66b23062d03707002015410 |
| Total | — | 18,184,229 | 10,642 | 3,204 | 3,087 | 3,054 | 3,051 | - |

An opt-in run starting from the default bundle produced 3,216 authentic US Equity listing bindings / 3,181 identities out of 5,409 official US Equity listings (59.5%). Within that total are 3,206 direct issuer-art listings / 3,171 issuer identities, plus 10 instrument-art listings. The opt-in source adds 3,087 direct issuer-art listing bindings / 3,054 identity groups to the default bundle. The total default artwork directory is 450 SVG files / 874,084 bytes; with the opt-in archives it is 3,501 files / 6,741,540 bytes. The imported PNGs are wrapped in SVGs with validated, embedded data:image/png payloads; there are no runtime image requests. The complete archive and per-image hashes, exact asset URLs, retrieval times and join evidence are written to artwork.json when the flag is used. The default bundle contains none of these source images.

The exact source archive URLs, expected hashes, source JSON URLs, license URLs and opt-in state are also recorded in the default artwork.json. The optional importer rejects any archive hash/size change and any image that fails bounded PNG validation or SVG sanitization.

## Other paths investigated

- Wikidata/Commons was checked against the supplied US Equity directory. Only three rows produced an exact symbol-and-company-name logo match, so it cannot provide bulk US coverage.
- Simple Icons is reusable as a repeatable name resolver but does not include most smaller listed companies.
- tickerlogo.com advertises a large US logo catalogue but its own page says reference and authorized use only; it was not bulk-imported.
- A public US logo repository with an informational/educational-use note was reviewed, but its pinned checkout contained no company-logo image files.
- Paid/API-key services and sources that expressly restrict bulk download or redistribution were excluded. No paid source, authentication wall or anti-bot protection was bypassed.

Authentic means artwork was associated with an issuer, ETF product or ETF sponsor identity in the records. It does not mean the project owns the art, that an applicable rights grant exists, or that a brand endorses this directory.
