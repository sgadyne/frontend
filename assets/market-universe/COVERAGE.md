# Public listing coverage

Generated 2026-11-03T22:06:40Z. 210,576 catalogue records; 53 source MICs plus 144 retained legacy references. These are security listings/trading admissions, including bonds and structured products; they are not 210,576 distinct companies.

`complete-source-scope` means every row within the named public source scope was consumed, with the evidence below. It is not a claim to all instruments at all venues or all markets worldwide. `provider-snapshot` means the public provider total and pagination were exhausted; exchange-wide completeness is unverified. `partial` is explicit. Source dates differ from retrieval times. None of these statuses describes price/history availability.

## Source snapshots

| Source | Scope/status | As of | Retrieved UTC | Offered / fetched | Accepted | Rejected / duplicate | Pages |
| --- | --- | --- | --- | --- | ---: | --- | ---: |
| [nasdaq](https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt) | Nasdaq listed securities excluding test issues / **complete-source-scope** | 2026-11-03 | 2026-11-03T21:14:58Z | 5,608 / 5,608 | 5,600 | 8 / 0 | 1 |
| [us-other](https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt) | Other US listed securities excluding tests: NYSE, NYSE American, NYSE Arca, Cboe/BATS, IEX, TXSE and NYSE Texas codes actually present / **complete-source-scope** | 2026-11-03 | 2026-11-03T21:14:58Z | 7,668 / 7,668 | 7,639 | 29 / 0 | 1 |
| [hkex](https://www.hkex.com.hk/eng/services/trading/securities/securitieslists/ListOfSecurities.xlsx) | HKEX full list of securities: equities, GEM, ETPs, REITs, debt, warrants and CBBCs / **complete-source-scope** | 2026-11-04 | 2026-11-03T21:14:59Z | 17,309 / 17,309 | 17,309 | 0 / 0 | 1 |
| [jpx](https://www.jpx.co.jp/english/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_e.xlsx) | TSE month-end listed issues / **complete-source-scope** | 2026-09-30 | 2026-11-03T21:20:19Z | 4,447 / 4,447 | 4,447 | 0 / 0 | 1 |
| [xetra](https://www.cashmarket.deutsche-boerse.com/resource/blob/1528/b52ea43a2edac92e8283d40645d1c076/data/t7-xetr-allTradableInstruments.csv) | Xetra active instruments with official local mnemonic (including secondary trading admissions) / **complete-source-scope** | 2026-11-03 | 2026-11-03T21:15:02Z | 5,551 / 5,551 | 5,544 | 7 / 0 | 1 |
| [frankfurt](https://www.cashmarket.deutsche-boerse.com/resource/blob/2289108/af62aa4116e6e5ec6953702081cea715/data/t7-xfra-BF-allTradableInstruments.csv) | Frankfurt active instruments with official local mnemonic (including secondary trading admissions) / **partial** | 2026-11-03 | 2026-11-03T21:15:07Z | 56,210 / 56,210 | 22,781 | 33,429 / 0 | 1 |
| [nse](https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv) | NSE main-board equity securities / **complete-source-scope** | not supplied | 2026-11-03T21:14:59Z | 2,623 / 2,623 | 2,623 | 0 / 0 | 1 |
| [nse-etf](https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv) | NSE exchange traded funds / **complete-source-scope** | not supplied | 2026-11-03T21:14:59Z | 359 / 359 | 359 | 0 / 0 | 1 |
| [asx](https://www.asx.com.au/asx/research/ASXListedCompanies.csv) | ASX company directory / **partial** | 2026-11-04 | 2026-11-03T21:14:59Z | 2,060 / 2,060 | 2,060 | 0 / 0 | 1 |
| [twse-isin](https://isin.twse.com.tw/isin/C_public.jsp?strMode=2) | TWSE domestic listed security ISIN directory / **complete-source-scope** | 2026-11-04 | 2026-11-03T21:17:00Z | 41,768 / 41,768 | 41,768 | 0 / 0 | 1 |
| [tpex-isin](https://isin.twse.com.tw/isin/C_public.jsp?strMode=4) | TPEX domestic OTC security ISIN directory / **complete-source-scope** | 2026-11-04 | 2026-11-03T21:17:00Z | 13,864 / 13,864 | 13,864 | 0 / 0 | 1 |
| [twse](https://openapi.twse.com.tw/v1/opendata/t187ap03_L) | TWSE open-data listed company inventory / **partial** | 2026-11-02 | 2026-11-03T21:15:00Z | 1,099 / 1,099 | 1,099 | 0 / 0 | 1 |
| [tpex](https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O) | TPEX open-data listed company inventory / **partial** | 2026-11-03 | 2026-11-03T21:15:13Z | 897 / 897 | 897 | 0 / 0 | 1 |
| [krx](https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13) | KRX KIND listed-company inventory / **partial** | not supplied | 2026-11-03T21:15:06Z | 2,765 / 2,765 | 2,765 | 0 / 0 | 1 |
| [lse](https://docs.londonstockexchange.com/reports/instruments/Instrument%20list.xlsx) | LSE public instrument report / **complete-source-scope** | 2026-10-31 | 2026-11-03T21:20:19Z | 52,788 / 52,788 | 52,788 | 0 / 0 | 1 |
| [euronext](https://live.euronext.com/en/products/equities/list) | Euronext official public equities directory, all returned venues including Growth/Access and Italian markets / **complete-source-scope** | not supplied | 2026-11-03T21:25:51Z | 3,820 / 3,820 | 3,820 | 0 / 0 | 4 |
| [euronext-etf](https://live.euronext.com/en/products/etfs/list) | Euronext official public ETF directory / **complete-source-scope** | not supplied | 2026-11-03T21:25:55Z | 4,315 / 4,315 | 4,315 | 0 / 0 | 5 |
| [tv-sse](https://scanner.tradingview.com/global/scan) | Public provider inventory for SSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:42Z | 3,485 / 3,485 | 3,484 | 1 / 0 | 4 |
| [tv-szse](https://scanner.tradingview.com/global/scan) | Public provider inventory for SZSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:43Z | 4,025 / 4,025 | 4,024 | 1 / 0 | 5 |
| [tv-bse](https://scanner.tradingview.com/global/scan) | Public provider inventory for BSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:45Z | 5,752 / 5,752 | 5,185 | 567 / 0 | 6 |
| [tv-nse](https://scanner.tradingview.com/global/scan) | Public provider inventory for NSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:47Z | 4,123 / 4,123 | 3,580 | 543 / 0 | 5 |
| [tv-sgx](https://scanner.tradingview.com/global/scan) | Public provider inventory for SGX: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:48Z | 2,257 / 2,257 | 646 | 1,611 / 0 | 3 |
| [tv-six](https://scanner.tradingview.com/global/scan) | Public provider inventory for SIX: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:49Z | 2,590 / 2,590 | 2,589 | 1 / 0 | 3 |
| [tv-bme](https://scanner.tradingview.com/global/scan) | Public provider inventory for BME: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:50Z | 306 / 306 | 305 | 1 / 0 | 1 |
| [tv-lse](https://scanner.tradingview.com/global/scan) | Public provider inventory for LSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:53Z | 8,144 / 8,144 | 8,144 | 0 / 0 | 9 |
| [tv-mil](https://scanner.tradingview.com/global/scan) | Public provider inventory for MIL: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:53Z | 408 / 408 | 408 | 0 / 0 | 1 |
| [tv-omxsto](https://scanner.tradingview.com/global/scan) | Public provider inventory for OMXSTO: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:54Z | 867 / 867 | 866 | 1 / 0 | 1 |
| [tv-omxhex](https://scanner.tradingview.com/global/scan) | Public provider inventory for OMXHEX: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:54Z | 199 / 199 | 198 | 1 / 0 | 1 |
| [tv-omxcop](https://scanner.tradingview.com/global/scan) | Public provider inventory for OMXCOP: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:54Z | 185 / 185 | 184 | 1 / 0 | 1 |
| [tv-omxice](https://scanner.tradingview.com/global/scan) | Public provider inventory for OMXICE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:55Z | 29 / 29 | 29 | 0 / 0 | 1 |
| [tv-omxtse](https://scanner.tradingview.com/global/scan) | Public provider inventory for OMXTSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:55Z | 31 / 31 | 30 | 1 / 0 | 1 |
| [tv-omxrse](https://scanner.tradingview.com/global/scan) | Public provider inventory for OMXRSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:55Z | 12 / 12 | 12 | 0 / 0 | 1 |
| [tv-omxvse](https://scanner.tradingview.com/global/scan) | Public provider inventory for OMXVSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:56Z | 25 / 25 | 25 | 0 / 0 | 1 |
| [tv-asx](https://scanner.tradingview.com/global/scan) | Public provider inventory for ASX: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:57Z | 2,233 / 2,233 | 2,233 | 0 / 0 | 3 |
| [tv-krx](https://scanner.tradingview.com/global/scan) | Public provider inventory for KRX: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:59Z | 4,421 / 4,421 | 4,317 | 104 / 0 | 5 |
| [tv-twse](https://scanner.tradingview.com/global/scan) | Public provider inventory for TWSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:24:59Z | 1,363 / 1,363 | 1,363 | 0 / 0 | 2 |
| [tv-tpex](https://scanner.tradingview.com/global/scan) | Public provider inventory for TPEX: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:25:00Z | 1,385 / 1,385 | 1,385 | 0 / 0 | 2 |
| [tv-hkex](https://scanner.tradingview.com/global/scan) | Public provider inventory for HKEX: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:25:02Z | 4,260 / 4,260 | 3,050 | 1,210 / 0 | 5 |
| [tv-tse](https://scanner.tradingview.com/global/scan) | Public provider inventory for TSE: stocks, funds and depositary receipts only / **provider-snapshot** | not supplied | 2026-11-03T21:25:04Z | 4,248 / 4,248 | 4,248 | 0 / 0 | 5 |

## Evidence and limits

### nasdaq

Terminal File Creation Time footer present; every non-test directory row consumed. Exchange codes from Nasdaq Symbol Directory Definitions.

Rights/source notice: Nasdaq Trader Symbol Lookup states directory information supplied without restriction or further licensing requirement; https://www.nasdaqtrader.com/Trader.aspx?id=symbollookup. NFN datasets have separate terms and are excluded.

Rejected: {"test-issue":8}. Source rows are not silently reclassified as accepted.

### us-other

Terminal File Creation Time footer present; every non-test directory row consumed. Exchange codes from Nasdaq Symbol Directory Definitions.

Rights/source notice: Nasdaq Trader Symbol Lookup states directory information supplied without restriction or further licensing requirement; https://www.nasdaqtrader.com/Trader.aspx?id=symbollookup. NFN datasets have separate terms and are excluded.

Rejected: {"test-issue":29}. Source rows are not silently reclassified as accepted.

### hkex

Full List of Securities workbook; worksheet dimensions reset and all XML rows consumed, including GEM, funds, debt and structured securities.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

### jpx

Every issue in the official month-end TSE workbook consumed; other Japanese exchanges and Tokyo PRO not asserted.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

### xetra

All rows of official allTradableInstruments CSV consumed. Securities without a local mnemonic are explicitly excluded; trading admission is distinct from primary listing.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

Rejected: {"no-local-symbol":2,"inactive":5}. Source rows are not silently reclassified as accepted.

### frankfurt

All rows of official allTradableInstruments CSV consumed. Securities without a local mnemonic are explicitly excluded; trading admission is distinct from primary listing.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

- Source includes 35k+ bonds often lacking mnemonic; unsymbolized rows rejected explicitly. Does not imply primary issuer listing in Germany.

Rejected: {"no-local-symbol":33428,"inactive":1}. Source rows are not silently reclassified as accepted.

### nse

Entire official CSV consumed; listed scope is NSE main-board equity securities. No source-wide as-of date supplied; retrieval time is separate.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

### nse-etf

Entire official CSV consumed; listed scope is NSE exchange traded funds. No source-wide as-of date supplied; retrieval time is separate.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

### asx

Entire official company CSV consumed. Company inventory excludes ETP issuers, wholesale debt issuers and duplicate entities in stapled securities; not a complete security inventory.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

- Company inventory excludes ETP issuers, wholesale debt issuers, duplicate entities of stapled securities; not all instruments.

### twse-isin

Official domestic listed/OTC ISIN directory, entire single HTML security table consumed. Numeric/local codes preserved including ETFs, preferred shares, warrants and other published categories; source says formal listing notices prevail. No currency inferred.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

- Domestic securities directory only; foreign market segments, bonds, emerging markets or instruments outside this page are not asserted.

### tpex-isin

Official domestic listed/OTC ISIN directory, entire single HTML security table consumed. Numeric/local codes preserved including ETFs, preferred shares, warrants and other published categories; source says formal listing notices prevail. No currency inferred.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

- Domestic securities directory only; foreign market segments, bonds, emerging markets or instruments outside this page are not asserted.

### twse

Entire open-data company inventory consumed; no claim to preferred shares, ETFs, warrants or other classes.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

- Company inventory; not all security classes.

### tpex

Entire open-data company inventory consumed; no claim to preferred shares, ETFs, warrants or other classes.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

- Company inventory; not all security classes.

### krx

Entire KRX KIND listed-company export consumed; company inventory does not include all preferred share classes, ETFs or other securities. Venue segment not supplied; MIC XKRX is operating market.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

- Operating MIC XKRX; company export has no reliable venue segment and excludes preferred shares and funds.

### lse

Both official All Equity and All Non-Equity aggregate sheets consumed exactly once; accepted row counts checked against declared Number of Instruments. Includes AIM, main market, international securities and funds; operating MIC XLON used with sourced segment.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

### euronext

Official public directory gateway read from its page configuration, no index constituent lists. Stable total and exact page lengths validated through final page. Directory quote cells discarded; identifiers/name/currency only. No source snapshot as-of supplied.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

### euronext-etf

Official public directory gateway read from its page configuration, no index constituent lists. Stable total and exact page lengths validated through final page. Directory quote cells discarded; identifiers/name/currency only. No source snapshot as-of supplied.

Rights/source notice: Public official directory; source copyright/terms retained. No open redistribution licence located; factual identifiers only, no price observations.

### tv-sse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1}. Source rows are not silently reclassified as accepted.

### tv-szse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1}. Source rows are not silently reclassified as accepted.

### tv-bse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":567}. Source rows are not silently reclassified as accepted.

### tv-nse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":543}. Source rows are not silently reclassified as accepted.

### tv-sgx

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1611}. Source rows are not silently reclassified as accepted.

### tv-six

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1}. Source rows are not silently reclassified as accepted.

### tv-bme

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1}. Source rows are not silently reclassified as accepted.

### tv-lse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

### tv-mil

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

### tv-omxsto

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1}. Source rows are not silently reclassified as accepted.

### tv-omxhex

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1}. Source rows are not silently reclassified as accepted.

### tv-omxcop

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1}. Source rows are not silently reclassified as accepted.

### tv-omxice

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

### tv-omxtse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1}. Source rows are not silently reclassified as accepted.

### tv-omxrse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

### tv-omxvse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

### tv-asx

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

### tv-krx

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":104}. Source rows are not silently reclassified as accepted.

### tv-twse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

### tv-tpex

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

### tv-hkex

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

Rejected: {"outside-stock-fund-dr-scope":1210}. Source rows are not silently reclassified as accepted.

### tv-tse

Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.

Rights/source notice: Publicly displayed factual listing metadata via TradingView scanner. No open redistribution licence located; provenance is not a licence grant. No TradingView bulk artwork collected.

- All provider pages enumerated; provider coverage is not certified exchange-wide. No quote/history fields retrieved. Unknown source as-of; retrieval time reported separately.

## Venue inventory

Counts are deduplicated catalogue records by exact source MIC, not issuer domicile. Euronext segment MICs remain separate. Xetra/Frankfurt include secondary trading admissions; a German venue does not imply a German issuer. ISO 10383 operating MIC/country mappings are recorded in `venues.json`. Shared-source offered/rejected totals are reported in the source table above; per-venue normalized accepted counts are reproducible from each checked snapshot.

| MIC | Venue | Country | Catalogue records | Accepted source rows (overlap retained for audit) |
| --- | --- | --- | ---: | --- |
| ALXB | EURONEXT GROWTH BRUSSELS | BE | 6 | euronext: 6 |
| ALXL | EURONEXT GROWTH LISBON | PT | 1 | euronext: 1 |
| ALXP | EURONEXT GROWTH PARIS | FR | 293 | euronext: 293 |
| ARCX | NYSE ARCA | US | 2,749 | us-other: 2,749 |
| BATS | CBOE BZX U.S. EQUITIES EXCHANGE | US | 1,676 | us-other: 1,676 |
| BGEM | BORSA ITALIANA GLOBAL EQUITY MARKET | IT | 1,007 | euronext: 1,007 |
| ENXL | EURONEXT ACCESS LISBON | PT | 15 | euronext: 15 |
| ETFP | ELECTRONIC ETF, ETC/ETN AND OPEN-END FUNDS MARKET | IT | 2,540 | euronext-etf: 2,540 |
| ETLX | EUROTLX | IT | 416 | euronext: 416 |
| EXGM | EURONEXT GROWTH MILAN | IT | 235 | euronext: 235 |
| MERK | EURONEXT GROWTH - OSLO | NO | 86 | euronext: 86 |
| MLXB | EURONEXT ACCESS BRUSSELS | BE | 8 | euronext: 8 |
| MTAA | EURONEXT MILAN | IT | 201 | euronext: 201 |
| MTAH | BORSA ITALIANA - TRADING AFTER HOURS | IT | 592 | euronext: 592 |
| ROCO | TAIPEI EXCHANGE | TW | 14,233 | tpex-isin: 13,864; tpex: 897; tv-tpex: 1,385 |
| TXSE | TEXAS STOCK EXCHANGE | US | 22 | us-other: 22 |
| XAMC | EURONEXT AMSTERDAM – MULTI-CURRENCY TRADING | NL | 345 | euronext-etf: 345 |
| XAMS | EURONEXT - EURONEXT AMSTERDAM | NL | 669 | euronext: 125; euronext-etf: 544 |
| XASE | NYSE AMERICAN LLC | US | 310 | us-other: 310 |
| XASX | ASX - ALL MARKETS | AU | 2,509 | asx: 2,060; tv-asx: 2,233 |
| XBOM | BSE LTD | IN | 5,185 | tv-bse: 5,185 |
| XBRU | EURONEXT - EURONEXT BRUSSELS | BE | 107 | euronext: 105; euronext-etf: 2 |
| XCSE | NASDAQ COPENHAGEN A/S | DK | 184 | tv-omxcop: 184 |
| XESM | EURONEXT GROWTH DUBLIN | IE | 7 | euronext: 7 |
| XETR | XETRA | DE | 5,544 | xetra: 5,544 |
| XFRA | DEUTSCHE BOERSE AG | DE | 22,781 | frankfurt: 22,781 |
| XHEL | NASDAQ HELSINKI LTD | FI | 198 | tv-omxhex: 198 |
| XHKG | HONG KONG EXCHANGES AND CLEARING LTD | HK | 17,309 | hkex: 17,309; tv-hkex: 3,050 |
| XICE | NASDAQ ICELAND HF. | IS | 29 | tv-omxice: 29 |
| XKRX | KOREA EXCHANGE (STOCK MARKET) | KR | 4,439 | krx: 2,765; tv-krx: 4,317 |
| XLIS | EURONEXT - EURONEXT LISBON | PT | 32 | euronext: 32 |
| XLIT | AB NASDAQ VILNIUS | LT | 25 | tv-omxvse: 25 |
| XLON | LONDON STOCK EXCHANGE | GB | 54,799 | lse: 52,788; tv-lse: 8,144 |
| XMAD | BOLSA DE MADRID | ES | 305 | tv-bme: 305 |
| XMIL | BORSA ITALIANA S.P.A. | IT | 52 | tv-mil: 408 |
| XMLI | EURONEXT ACCESS PARIS | FR | 140 | euronext: 140 |
| XMSM | EURONEXT DUBLIN | IE | 16 | euronext: 16 |
| XNAS | NASDAQ - ALL MARKETS | US | 5,600 | nasdaq: 5,600 |
| XNSE | NATIONAL STOCK EXCHANGE OF INDIA | IN | 3,591 | nse: 2,623; nse-etf: 359; tv-nse: 3,580 |
| XNYS | NEW YORK STOCK EXCHANGE, INC. | US | 2,882 | us-other: 2,882 |
| XOAS | EURONEXT EXPAND OSLO | NO | 10 | euronext: 10 |
| XOSL | OSLO BORS | NO | 197 | euronext: 195; euronext-etf: 2 |
| XPAR | EURONEXT - EURONEXT PARIS | FR | 1,137 | euronext: 328; euronext-etf: 809 |
| XPMC | EURONEXT PARIS – MULTI-CURRENCY TRADING | FR | 75 | euronext: 2; euronext-etf: 73 |
| XRIS | NASDAQ RIGA AS | LV | 12 | tv-omxrse: 12 |
| XSES | SINGAPORE EXCHANGE | SG | 646 | tv-sgx: 646 |
| XSHE | SHENZHEN STOCK EXCHANGE | CN | 4,024 | tv-szse: 4,024 |
| XSHG | SHANGHAI STOCK EXCHANGE | CN | 3,484 | tv-sse: 3,484 |
| XSTO | NASDAQ STOCKHOLM AB | SE | 866 | tv-omxsto: 866 |
| XSWX | SIX SWISS EXCHANGE | CH | 2,589 | tv-six: 2,589 |
| XTAI | TAIWAN STOCK EXCHANGE | TW | 41,768 | twse-isin: 41,768; twse: 1,099; tv-twse: 1,363 |
| XTAL | NASDAQ TALLINN AS | EE | 30 | tv-omxtse: 30 |
| XTKS | TOKYO STOCK EXCHANGE | JP | 4,456 | jpx: 4,447; tv-tse: 4,248 |
| legacy-unverified | Retained legacy references without newly verified listing identity | — | 144 | — |

## US directory venue accounting

| MIC | Offered | Accepted non-test | Rejected tests |
| --- | ---: | ---: | ---: |
| XNAS | 5,608 | 5,600 | 8 |
| XNYS | 2,894 | 2,882 | 12 |
| ARCX | 2,751 | 2,749 | 2 |
| BATS | 1,678 | 1,676 | 2 |
| XASE | 315 | 310 | 5 |
| TXSE | 26 | 22 | 4 |
| XCHI | 1 | 0 | 1 |
| IEXG | 3 | 0 | 3 |

## Instrument and artwork totals

Instrument types: Warrant: 60,483; Equity: 58,027; Bond: 48,260; ETF: 27,489; CBBC: 5,904; Fund: 2,933; Structured Finance Products: 1,782; ETN: 1,646; ETP: 935; ETC: 717; Preferred share: 482; Unspecified: 398; Depositary receipt: 329; Unit: 315; ADR: 294; Security: 221; Right: 141; Securitised derivatives: 139; Future: 38; REIT: 17; TDR: 10; Index: 6; OTHER: 4; Asset-backed security: 4; Other equity-like financial instruments: 2.

Artwork: 450 local SVG files (874,084 bytes); 4,536 records bound to authentic issuer/instrument artwork; 205,982 generated monograms; zero missing badges. Separate roles: underlying-country: 14; underlying-product: 21; category: 3; instrument-artwork: 517; fund-artwork: 10; monogram: 205,982; issuer-artwork: 891; fund-sponsor-artwork: 3,118; country-exposure: 19; ticker-tile: 1. Country/underlying/category/ticker tiles are not counted as authentic logos. Source copyright/trademark rights remain with their owners. See artwork.json and NOTICES.md.

Transport: canonical JSON 92,118,041 bytes; compact JSON 24,516,487 bytes, gzip 4,244,173 bytes. Compact rows decode to the same listing identities; images remain separate emitted assets.


### Artwork coverage by asset class and region

| Asset class | Region | Catalogue records | Authentic artwork bindings | Direct issuer artwork bindings | Issuer identities with direct art |
| --- | --- | ---: | ---: | ---: | ---: |
| ADR | All regions | 294 | 0 | — | — |
| ADR | Americas | 294 | 0 | — | — |
| Asset-backed security | All regions | 4 | 0 | — | — |
| Asset-backed security | Asia | 4 | 0 | — | — |
| Bond | All regions | 48,260 | 0 | — | — |
| Bond | Americas | 161 | 0 | — | — |
| Bond | Asia | 1,320 | 0 | — | — |
| Bond | Europe | 46,779 | 0 | — | — |
| CBBC | All regions | 5,904 | 0 | — | — |
| CBBC | Asia | 5,904 | 0 | — | — |
| Depositary receipt | All regions | 329 | 0 | — | — |
| Depositary receipt | Americas | 12 | 0 | — | — |
| Depositary receipt | Asia | 120 | 0 | — | — |
| Depositary receipt | Europe | 197 | 0 | — | — |
| ETC | All regions | 717 | 13 | — | — |
| ETC | Europe | 717 | 13 | — | — |
| ETF | All regions | 27,489 | 3,107 | — | — |
| ETF | Americas | 5,775 | 465 | — | — |
| ETF | Asia | 4,975 | 61 | — | — |
| ETF | Europe | 16,739 | 2,581 | — | — |
| ETN | All regions | 1,646 | 3 | — | — |
| ETN | Asia | 20 | 0 | — | — |
| ETN | Europe | 1,626 | 3 | — | — |
| ETP | All regions | 935 | 5 | — | — |
| ETP | Asia | 935 | 5 | — | — |
| Equity | All regions | 58,027 | 1,406 | 891 | 645 |
| Equity | Americas | 5,428 | 130 | 119 | 117 |
| Equity | Asia | 27,300 | 179 | 122 | 109 |
| Equity | Europe | 25,293 | 1,097 | 650 | 419 |
| Fund | All regions | 2,933 | 0 | — | — |
| Fund | Asia | 641 | 0 | — | — |
| Fund | Europe | 2,292 | 0 | — | — |
| Future | All regions | 38 | 0 | — | — |
| Future | Americas | 38 | 0 | — | — |
| Index | All regions | 6 | 2 | — | — |
| Index | Americas | 2 | 1 | — | — |
| Index | Asia | 1 | 1 | — | — |
| Index | Europe | 3 | 0 | — | — |
| OTHER | All regions | 4 | 0 | — | — |
| OTHER | Europe | 4 | 0 | — | — |
| Other equity-like financial instruments | All regions | 2 | 0 | — | — |
| Other equity-like financial instruments | Europe | 2 | 0 | — | — |
| Preferred share | All regions | 482 | 0 | — | — |
| Preferred share | Americas | 454 | 0 | — | — |
| Preferred share | Asia | 28 | 0 | — | — |
| REIT | All regions | 17 | 0 | — | — |
| REIT | Asia | 17 | 0 | — | — |
| Right | All regions | 141 | 0 | — | — |
| Right | Americas | 141 | 0 | — | — |
| Securitised derivatives | All regions | 139 | 0 | — | — |
| Securitised derivatives | Europe | 139 | 0 | — | — |
| Security | All regions | 221 | 0 | — | — |
| Security | Americas | 221 | 0 | — | — |
| Structured Finance Products | All regions | 1,782 | 0 | — | — |
| Structured Finance Products | Europe | 1,782 | 0 | — | — |
| TDR | All regions | 10 | 0 | — | — |
| TDR | Asia | 10 | 0 | — | — |
| Unit | All regions | 315 | 0 | — | — |
| Unit | Americas | 315 | 0 | — | — |
| Unspecified | All regions | 398 | 0 | — | — |
| Unspecified | Asia | 398 | 0 | — | — |
| Warrant | All regions | 60,483 | 0 | — | — |
| Warrant | Americas | 457 | 0 | — | — |
| Warrant | Asia | 60,025 | 0 | — | — |
| Warrant | Europe | 1 | 0 | — | — |

US official Equity artwork: 129 / 5,409 total authentic listings (119 direct issuer art across 117 issuer identities; 10 instrument-art rows). US ETF artwork: 2 product marks and 463 sponsor marks / 5,775 listings.

## Remaining source queue

- Mainland China (SSE/SZSE), BSE, Singapore, SIX, Spain and Nordic/Baltic markets currently have full enumerated public provider snapshots; official exchange-wide security completeness is unverified. The provider scope is stocks, funds and depositary receipts, with other instrument classes explicitly excluded.
- Japan uses the official September 2026 TSE month-end workbook plus a separate provider supplement. Other Japanese regional exchanges and Tokyo PRO are not asserted.
- NSE official main-board equity and ETF files are complete for their source scopes; SME/other securities are supplemented by provider inventory. The attempted official SME URL timed out.
- ASX official file is a company inventory (2,060 rows), not all instruments; the provider supplement adds its public stock/fund/DR coverage. Wholesale debt and other classes are unqualified.
- KRX official file is a company export; preferreds/funds/other provider listings supplement it. No full official class/segment inventory is asserted.
- Frankfurt excludes source rows without a local mnemonic (mostly bonds). No synthetic ticker is invented from an ISIN or WKN.
- TWSE/TPEX domestic ISIN tables include their full published security categories; emerging/foreign/bond segments outside those exact pages remain unqualified.
- Additional regional venues outside the configured source registry have not been claimed. This bundle is not all world tickers.
- A usable authentic blue XLK tile was not found. The current official SSGA page uses magenta; the blue tile is a labelled curated fallback. Futures retain only the configured roots, with 1! series used solely as icon provenance. @CO/VIX mappings remain unverified and use a category icon.

Failed/blocked official attempts and available alternates are recorded in source-attempts.json. Source URLs are provenance, not licence grants. Refresh commands and retention policy are in README.md.
