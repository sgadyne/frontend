"""Opt-in importer for US exchange-keyed ticker-logo repositories with unclear mark rights."""
import base64, collections, hashlib, io, json, pathlib, re, struct, zipfile
from urllib.parse import urlparse
from simple_icons_artwork import identity_key, normalize_company_name
from refresh import STAMP

COLLECTIONS = (
    {
        'id': 'nasdaq-github-logo-collection',
        'repo': 'ahmeterenodaci/Nasdaq-Stock-Exchange-including-Symbols-and-Logos',
        'commit': '9d6e5c100d4e2c1f9282e5d5e766361702027e12',
        'venueMic': 'XNAS', 'jsonFile': 'nasdaq.json',
        'archiveSha256': '89504e6193917860f02bbe60b2b082f8e2e3c5a225558ccc45f69766138f3497',
        'archiveBytes': 8577842,
        'licenseUrl': 'https://github.com/ahmeterenodaci/Nasdaq-Stock-Exchange-including-Symbols-and-Logos/blob/9d6e5c100d4e2c1f9282e5d5e766361702027e12/LICENSE',
    },
    {
        'id': 'nyse-github-logo-collection',
        'repo': 'ahmeterenodaci/New-York-Stock-Exchange--NYSE--including-Symbols-and-Logos',
        'commit': '26a4ced07f7f402a97dee874d32cb2bdb1b806e3',
        'venueMic': 'XNYS', 'jsonFile': 'nyse.json',
        'archiveSha256': '0702469d78cb0ec9a820f3d9ac24c91598a6a8f1a66b23062d03707002015410',
        'archiveBytes': 9606387,
        'licenseUrl': 'https://github.com/ahmeterenodaci/New-York-Stock-Exchange--NYSE--including-Symbols-and-Logos/blob/26a4ced07f7f402a97dee874d32cb2bdb1b806e3/LICENSE',
    },
)
OWNER = 'https://github.com/ahmeterenodaci'
LICENSE_CAVEAT = (
    'The repository includes an MIT license for its software and documentation, but it does not identify '
    'individual copyright or redistribution licences for the company logo images. No logo copyright or '
    'trademark grant is inferred; marks remain with their owners. This source is excluded by default and '
    'requires explicit authoring opt-in; this status is not a legal determination.'
)
RIGHTS_URL = 'https://github.com/ahmeterenodaci/Nasdaq-Stock-Exchange-including-Symbols-and-Logos/blob/main/LICENSE'


def _png_dimensions(data):
    if len(data) < 24 or data[:8] != bytes([137, 80, 78, 71, 13, 10, 26, 10]) or data[12:16] != b'IHDR':
        raise ValueError('Collection asset is not a PNG with an IHDR header')
    width, height = struct.unpack('>II', data[16:24])
    if not (0 < width <= 8192 and 0 < height <= 8192 and width * height <= 16_000_000):
        raise ValueError('PNG dimensions exceed the bounded logo image limits')
    if len(data) > 180_000:
        raise ValueError('PNG exceeds the 256 KB source-file limit')
    return width, height


def _wrap_png(data):
    width, height = _png_dimensions(data)
    encoded = base64.b64encode(data).decode('ascii')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}"><image x="0" y="0" width="{width}" height="{height}" '
        f'href="data:image/png;base64,{encoded}"/></svg>'
    ).encode('ascii')


def _archive_root(archive):
    names = archive.namelist()
    roots = {name.split('/', 1)[0] for name in names if '/' in name}
    if len(roots) != 1:
        raise ValueError('Pinned GitHub archive has an unexpected root layout')
    return next(iter(roots))


def import_us_exchange_ticker_logos(assets, files, fetch, sanitize_svg, bundle, overrides=None, preexisting_bindings=None):
    """Import exact US venue+symbol+normalized-name matches; call only behind CLI opt-in."""
    overrides = overrides or {}
    preexisting_bindings = preexisting_bindings or {}
    source_notes = []
    errors = []
    bindings = {}
    added_files = set()
    already_covered = 0
    unmatched = 0
    ambiguous = 0
    invalid_images = 0
    hash_to_file = {entry.get('sha256'): name for name, entry in files.items() if entry.get('sha256')}

    eligible = collections.defaultdict(list)
    for asset in assets:
        if asset.get('instrumentType') != 'Equity' or asset.get('listingCountry') != 'US':
            continue
        mic = asset.get('mic')
        if mic in ('XNAS', 'XNYS') and asset.get('localSymbol'):
            eligible[(mic, asset['localSymbol'])].append(asset)

    for collection in COLLECTIONS:
        repo = collection['repo']
        commit = collection['commit']
        archive_url = f'https://codeload.github.com/{repo}/zip/{commit}'
        source_json_url = f'https://raw.githubusercontent.com/{repo}/{commit}/{collection["jsonFile"]}'
        archive_bytes, fetch_meta = fetch.get(archive_url)
        archive_sha = hashlib.sha256(archive_bytes).hexdigest()
        if len(archive_bytes) != collection['archiveBytes'] or archive_sha != collection['archiveSha256']:
            raise ValueError('Pinned third-party logo archive hash/size mismatch for ' + repo)
        listing_bindings = 0
        unique_issuers = set()
        skipped_existing = skipped_unmatched = skipped_ambiguous = missing_assets = 0

        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
            root = _archive_root(archive)
            archive_members = set(archive.namelist())
            json_path = root + '/' + collection['jsonFile']
            if json_path not in archive_members:
                raise ValueError('Pinned collection JSON missing: ' + json_path)
            records = json.loads(archive.read(json_path))
            if not isinstance(records, list) or len(records) < 1000:
                raise ValueError('Pinned collection has unexpectedly few logo rows')
            verified_matches = 0
            new_files_for_collection = set()

            for record in records:
                symbol = record.get('symbol')
                company_name = record.get('name')
                logo_url = record.get('logoUrl')
                if not isinstance(symbol, str) or not symbol or not isinstance(company_name, str) or not company_name:
                    skipped_unmatched += 1
                    continue
                key = (collection['venueMic'], symbol)
                candidates = eligible.get(key, [])
                normalized_name = normalize_company_name(company_name)
                matches = [a for a in candidates if normalize_company_name(a.get('name')) == normalized_name]
                if len(matches) != 1:
                    if len(matches) > 1:
                        skipped_ambiguous += 1
                    else:
                        skipped_unmatched += 1
                    continue
                asset = matches[0]
                verified_matches += 1
                existing_file=files.get(asset.get('logoFile'),{}) if asset.get('logoFile') else {}
                if existing_file.get('optInOnlyUnclearRights') and existing_file.get('sourceCollectionId')==collection['id']:
                    bindings[asset['assetId']]={'file':asset['logoFile'],'issuerIdentity':identity_key(asset),'method':'verified-us-venue-symbol-and-normalized-company-name','collectionSource':collection['id'],'venueMic':collection['venueMic'],'sourceTicker':symbol,'sourceName':company_name,'label':company_name+' company logo','rights':LICENSE_CAVEAT}
                    listing_bindings += 1
                    identity=identity_key(asset)
                    if identity:unique_issuers.add(identity)
                    skipped_existing += 1
                    continue
                if asset['assetId'] in preexisting_bindings:
                    skipped_existing += 1
                    continue
                if asset['assetId'] in overrides:
                    skipped_existing += 1
                    continue
                if asset.get('logoFile'):
                    skipped_existing += 1
                    continue

                parsed = urlparse(str(logo_url or ''))
                expected_repo_path = '/gh/' + repo + '/'
                if parsed.hostname != 'cdn.jsdelivr.net' or not parsed.path.startswith(expected_repo_path):
                    errors.append({'assetId': asset['assetId'], 'source': collection['id'], 'error': 'Unexpected source logo URL; rejected'})
                    continue
                image_name = parsed.path[len(expected_repo_path):]
                image_parts = image_name.split('/')
                if len(image_parts) != 2 or image_parts[0] != 'logos' or not image_parts[1].startswith('_') or not image_parts[1].endswith('.png'):
                    errors.append({'assetId': asset['assetId'], 'source': collection['id'], 'error': 'Unexpected source image path; rejected'})
                    continue
                zip_image_path = root + '/' + image_name
                if zip_image_path not in archive_members:
                    missing_assets += 1
                    continue
                raw = archive.read(zip_image_path)
                try:
                    wrapped = _wrap_png(raw)
                    safe = sanitize_svg(wrapped)
                except Exception as exc:
                    invalid_images += 1
                    errors.append({'assetId': asset['assetId'], 'source': collection['id'], 'error': str(exc)})
                    continue

                safe_sha = hashlib.sha256(safe).hexdigest()
                filename = hash_to_file.get(safe_sha)
                if filename is None:
                    filename = 'research-logo-' + safe_sha[:24] + '.svg'
                    out_path = pathlib.Path(bundle) / 'logos' / filename
                    out_path.write_bytes(safe)
                    files[filename] = {
                        'sourceUrl': f'https://raw.githubusercontent.com/{repo}/{commit}/{image_name}',
                        'sourceCollectionUrl': f'https://github.com/{repo}/tree/{commit}/logos',
                        'sourceJsonUrl': source_json_url,
                        'sourceRow': {'venueMic': collection['venueMic'], 'ticker': symbol, 'companyName': company_name},
                        'sourceRecordLogoUrl': logo_url,
                        'sourceCollectionId': collection['id'],
                        'sourcePackageUrl': archive_url,
                        'sourcePackageRetrievedAt': fetch_meta.get('retrievedAt'),
                        'retrievedAt': fetch_meta.get('retrievedAt'),
                        'sourcePackageSha256': archive_sha,
                        'sourcePackageBytes': len(archive_bytes),
                        'sourceSha256': hashlib.sha256(raw).hexdigest(),
                        'sourceBytes': len(raw), 'sourceMediaType': 'image/png',
                        'sha256': safe_sha, 'bytes': len(safe),
                        'mediaType': 'image/svg+xml', 'role': 'issuer-artwork',
                        'authentic': True, 'optInOnlyUnclearRights': True,
                        'attribution': 'Original company/brand owner; collection publisher Ahmet Eren Odaci; original artwork creator/source not identified in collection metadata.',
                        'rights': LICENSE_CAVEAT,
                        'rightsUrl': collection['licenseUrl'],
                        'sanitizedAt': STAMP(),
                    }
                    hash_to_file[safe_sha] = filename
                    added_files.add(filename)
                else:
                    entry = files[filename]
                    alternate = entry.setdefault('alternateSourceCollections', [])
                    source_ref = {'sourceUrl': f'https://raw.githubusercontent.com/{repo}/{commit}/{image_name}', 'sourcePackageUrl': archive_url, 'sourcePackageSha256': archive_sha, 'sourceTicker': symbol, 'sourceName': company_name}
                    if source_ref not in alternate:
                        alternate.append(source_ref)
                new_files_for_collection.add(filename)
                bindings[asset['assetId']] = {
                    'file': filename, 'issuerIdentity': identity_key(asset),
                    'method': 'verified-us-venue-symbol-and-normalized-company-name',
                    'collectionSource': collection['id'], 'venueMic': collection['venueMic'],
                    'sourceTicker': symbol, 'sourceName': company_name,
                    'label': company_name + ' company logo',
                    'rights': LICENSE_CAVEAT,
                }
                listing_bindings += 1
                identity = identity_key(asset)
                if identity:
                    unique_issuers.add(identity)

        source_notes.append({
            'id': collection['id'], 'repository': repo,
            'repositoryUrl': 'https://github.com/' + repo,
            'repositoryCommit': commit,
            'repositoryLastPushedAt': {'nasdaq-github-logo-collection':'2023-10-06T15:10:47Z','nyse-github-logo-collection':'2023-10-06T20:30:30Z'}[collection['id']],
            'repositoryLicense': 'MIT for repository software/documentation; not asserted for third-party logo artwork',
            'licenseUrl': collection['licenseUrl'],
            'readmeUrl': f'https://github.com/{repo}/blob/{commit}/README.md',
            'sourceJsonUrl': source_json_url,
            'archiveUrl': archive_url,
            'archiveRetrievedAt': fetch_meta.get('retrievedAt'),
            'archiveSha256': archive_sha, 'archiveBytes': len(archive_bytes),
            'jsonRecordCount': len(records),
            'venueMic': collection['venueMic'],
            'verifiedCandidateListingMatches': verified_matches,
            'matchedListingBindings': listing_bindings,
            'matchedUniqueIssuerIdentities': len(unique_issuers),
            'newUniqueArtworkFiles': len(new_files_for_collection & added_files),
            'skippedAlreadyCoveredOrCurated': skipped_existing,
            'skippedUnmatchedOrDifferentCompany': skipped_unmatched,
            'skippedAmbiguousIdentity': skipped_ambiguous,
            'missingImageFileCount': missing_assets,
            'invalidImageFileCount': invalid_images,
            'rightsStatus': 'unclear-third-party-logo-permission',
            'rightsCaveat': LICENSE_CAVEAT,
            'resolverRule': f'Only Equity rows listed in the US venue MIC {collection["venueMic"]}; exact source ticker equals localSymbol and normalized full company names agree. No bare/global ticker matching, no ETFs/derivatives, no alternate venue reuse.',
        })

    metadata = {
        'includedInThisBuild': True,
        'defaultDistribution': False,
        'sourcePolicy': 'Explicit CLI opt-in only. The source repository license does not state that it licenses third-party logos. Default builds exclude these assets.',
        'matchedListingBindings': len(bindings),
        'matchedUniqueIssuerIdentities': len({b['issuerIdentity'] for b in bindings.values() if b.get('issuerIdentity')}),
        'newUniqueArtworkFiles': len(added_files),
        'collectionSources': source_notes,
    }
    return bindings, metadata, errors
