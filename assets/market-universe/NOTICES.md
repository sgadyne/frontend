# Source and artwork notices

Public retrieval and a provenance URL do not themselves grant redistribution, copyright or trademark rights. Exact per-source notes accompany `sources.json`/`coverage-report.json`; per-image notes and checksums accompany `artwork.json`.

The Nasdaq Trader Symbol Lookup page states that its directory information is supplied without restriction or further licensing requirement. This bundle uses `nasdaqlisted.txt` and `otherlisted.txt`, not the separately restricted Nasdaq Fund Network dataset. Exchange code F/TXSE is verified against the TXSE ID Codes page and Nasdaq's additional-listing-market notice; outdated directory documentation alone is not treated as an exhaustive code map.

Other exchange and public-provider inventory sources retain their copyright/terms. The normalized files retain factual names, codes, venue/type identifiers and source-published metadata only. No open redistribution licence was located for those sources, and no grant is implied here. Where a public directory response also contains quote cells, those cells are discarded and never committed as observations. The offline research cache is outside the repository.

Country flags come from [flag-icons](https://github.com/lipis/flag-icons), Copyright 2013 Panayiotis Lipiridis and contributors, under the MIT licence reproduced in `flag-icons-LICENSE.txt`. They are exposure/underlying-country icons, not issuer logos or listing-country assertions.

The original 119 instrument/issuer SVGs arrived with TradingView provenance URLs but without an original fetch date or licence/redistribution notice. Those uncertainties remain recorded. Existing SPDR artwork for SPY is retained. Authentic artwork means the image is associated with the supplied instrument/issuer; it does not mean that this repository owns it or has an unrestricted licence. Trademark and copyright rights remain with their owners.

A small set of additional futures product/benchmark icons was fetched only after verifying each configured root against a public TradingView symbol response. The file/source/continuous-reference association is recorded. Country icons use the MIT flags above. No bulk proprietary image library was scraped. No open redistribution or trademark grant was located for the TradingView product/benchmark icons; the uncertainty is explicit in each record. These are labelled underlying icons, not authentic issuer logos.

The blue XLK ticker tile and generic futures category icon are original generated SVG presentation fallbacks. They do not assert an official fund/exchange logo. Current SSGA's published sector page styles XLK in magenta (`#FF28C8`); a usable authentic blue tile was not found. The requested blue presentation is therefore labelled as a curated fallback.

Every bundled SVG is parsed and checked for allowed elements/attributes, bounded dimensions/bytes and local-only references. Script/event/foreign content, external references, XML entities/doctype and HTML error responses are rejected. Failed or unavailable artwork falls back to a deterministic monogram, without remote requests or trackers. Generated monograms are not included in authentic-logo totals.


The current artwork refresh adds 288 hash-deduplicated SVG files (367,760 bytes) from the pinned simple-icons@16.36.0 npm package. The project states that its repository is CC0 but that this does not imply all included icons are CC0; its disclaimer advises checking individual icon licences, and says a missing licence entry does not imply an icon has no licence. The package SHA-256/SHA-512, source URL, per-icon licence status where supplied, source link, and retrieval date are recorded in artwork.json. Non-commercial, no-derivatives and custom licence records are skipped. No trademark rights are inferred.

The pre-existing IWM artwork is the iShares wordmark. It is used only as a visibly labelled fund-sponsor mark for ETF names beginning with iShares. It is not counted as product-specific fund artwork. The source is a TradingView rendering; no redistribution grant or trademark licence was supplied.

Two public US ticker-logo collections were evaluated for wider coverage. Their MIT repository license files do not identify a copyright or redistribution licence for individual logo images. The importer is therefore excluded from default artwork generation and requires the explicit --include-unclear-rights-ticker-logo-collections authoring flag. If enabled, exact source package hashes, image hashes, repository commits, URLs, timestamps, venue/ticker/name joins, and the unresolved rights caveat are stored in the manifest. This is not a conclusion that redistribution is permitted.
