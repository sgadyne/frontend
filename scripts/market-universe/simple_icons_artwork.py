"""Pinned Simple Icons authoring import with issuer-name-only matching."""
import base64, collections, hashlib, html, io, json, pathlib, re, tarfile, unicodedata
from refresh import STAMP

PACKAGE_VERSION = '16.36.0'
PACKAGE_URL = f'https://registry.npmjs.org/simple-icons/-/simple-icons-{PACKAGE_VERSION}.tgz'
PACKAGE_SHA512 = '+VNPPkqSOLidFeSgBKUWX4n50WPpDC09hav+BgS26anIF1oQOlGBb8LvwGR+6fYRjo+B6CiKzNBceMPkSVXANQ=='
PACKAGE_LICENSE_URL = 'https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md'
DISCLAIMER_URL = 'https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md'
REPOSITORY_URL = 'https://github.com/simple-icons/simple-icons'
MANUAL_ISSUER_ALIASES = {'meta platforms': 'meta'}

LEGAL_SUFFIXES = tuple((x,) for x in (
    'inc', 'incorporated', 'corporation', 'corp', 'company', 'co', 'plc',
    'limited', 'ltd', 'llc', 'llp', 'ag', 'se', 'sa', 'nv', 'gmbh', 'oy',
    'oyj', 'ab', 'asa', 'spa', 'sarl', 'bv', 'pte', 'pty', 'kgaa', 'kk',
    'holdings', 'holding', 'group',
)) + (
    ('p', 'l', 'c'), ('s', 'a'), ('s', 'p', 'a'), ('s', 'a', 'r', 'l'),
    ('n', 'v'), ('b', 'v'), ('a', 's'), ('a', 's', 'a'), ('s', 'e'),
)
SECURITY_SUFFIXES = (
    ('common', 'stock', 'when', 'issued'), ('common', 'stock'),
    ('common', 'shares'), ('ordinary', 'shares'), ('ordinary', 'share'),
    ('depositary', 'shares'), ('depository', 'shares'), ('shares',), ('stock',),
)


def normalize_company_name(value):
    value = html.unescape(str(value or '')).casefold().replace('&', ' and ')
    value = unicodedata.normalize('NFKD', value)
    value = ''.join(ch for ch in value if not unicodedata.combining(ch))
    tokens = re.findall(r'[^\W_]+', value, flags=re.UNICODE)
    while tokens:
        previous = tuple(tokens)
        if tokens and tokens[0] == 'the': tokens = tokens[1:]
        if tokens and tokens[-1] == 'the': tokens = tokens[:-1]
        for suffix in SECURITY_SUFFIXES:
            if len(tokens) >= len(suffix) and tuple(tokens[-len(suffix):]) == suffix:
                tokens = tokens[:-len(suffix)]
                break
        else:
            if len(tokens) >= 2 and tokens[-2] == 'class': tokens = tokens[:-2]
            elif len(tokens) >= 2 and tokens[-2] == 'series': tokens = tokens[:-2]
            elif tokens and tokens[-1] in ('new', 'when', 'issued'): tokens = tokens[:-1]
        for suffix in sorted(LEGAL_SUFFIXES, key=len, reverse=True):
            if len(tokens) >= len(suffix) and tuple(tokens[-len(suffix):]) == suffix:
                tokens = tokens[:-len(suffix)]
                break
        if tuple(tokens) == previous: break
    return ' '.join(tokens)


def identity_key(asset):
    explicit = asset.get('issuerId')
    if isinstance(explicit, str) and explicit.strip():
        return 'issuer-id:' + explicit.strip()
    name = normalize_company_name(asset.get('name'))
    if not name: return None
    return 'issuer-name:' + str(asset.get('listingCountry') or asset.get('region') or 'unknown') + ':' + name


def _index_icons(icon_records):
    names = collections.defaultdict(set)
    by_slug = {}
    for item in icon_records:
        slug = item.get('slug')
        if not isinstance(slug, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
            continue
        by_slug[slug] = item
        candidates = [item.get('title')]
        aliases = item.get('aliases') or {}
        candidates.extend(aliases.get('aka') or [])
        candidates.extend((aliases.get('loc') or {}).values())
        for candidate in candidates:
            key = normalize_company_name(candidate)
            if key: names[key].add(slug)
    for alias, slug in MANUAL_ISSUER_ALIASES.items():
        if slug in by_slug: names[normalize_company_name(alias)].add(slug)
    return names, by_slug


def _icon_rights(icon):
    license_data = icon.get('license') or {}
    license_type = license_data.get('type')
    if not license_type:
        return ('unspecified',
            'Simple Icons provides no per-icon licence record for this artwork. The package-level CC0 licence is not a blanket licence for all included marks; no redistribution grant is inferred. Trademark rights remain with the owner.')
    return (license_type,
        f'Simple Icons reports the individual artwork licence as {license_type} ({license_data.get("url") or "no licence URL supplied"}). This source metadata may be stale and does not grant trademark rights; the brand owner retains those rights.')


def import_simple_icons(assets, files, fetch, sanitize_svg, bundle):
    """Import unique, exact issuer-name matches for Equity rows only."""
    source_bytes, fetch_meta = fetch.get(PACKAGE_URL)
    actual_integrity = base64.b64encode(hashlib.sha512(source_bytes).digest()).decode('ascii')
    if actual_integrity != PACKAGE_SHA512:
        raise ValueError('Simple Icons package SHA-512 integrity mismatch')
    with tarfile.open(fileobj=io.BytesIO(source_bytes), mode='r:gz') as archive:
        package_info = json.loads(archive.extractfile('package/package.json').read())
        if package_info.get('version') != PACKAGE_VERSION:
            raise ValueError('Simple Icons archive version does not match the pinned release')
        icon_records = json.loads(archive.extractfile('package/data/simple-icons.json').read())
        if not isinstance(icon_records, list) or len(icon_records) < 3000:
            raise ValueError('Simple Icons metadata is unexpectedly small')
        name_index, icon_by_slug = _index_icons(icon_records)
        members = {m.name: m for m in archive.getmembers() if m.isfile() and m.name.startswith('package/icons/')}
        entries = {}
        for asset in assets:
            if asset.get('instrumentType') != 'Equity': continue
            key = identity_key(asset)
            if key: entries.setdefault(key, []).append(asset)
        existing_by_identity = collections.defaultdict(set)
        for key, group in entries.items():
            for asset in group:
                image = asset.get('logoFile')
                entry=files.get(image,{}) if image else {}
                if not (entry.get('authentic') and not entry.get('optInOnlyUnclearRights')):
                    continue
                # Same-ISIN artwork verifies one security's mark, not a company-name
                # identity across different share classes. Only reuse prior Simple
                # Icons artwork, explicit issuer-ID marks, or direct issuer artwork.
                directly_bound=bool(asset.get('issuerId')) or (
                    asset.get('artworkAssociation')!='same-ISIN' and (
                        entry.get('simpleIconsSources') or asset.get('logoRole')=='issuer-artwork'
                    )
                )
                if directly_bound:
                    existing_by_identity[key].add(image)
        hash_to_file = {entry.get('sha256'): filename for filename, entry in files.items() if entry.get('sha256')}
        bindings = {}
        errors = []
        added_files = set()
        ambiguous_identities = 0
        skipped_licensed_icons = collections.Counter()

        def attach_source_icon(entry, icon):
            source_icons = entry.setdefault('simpleIconsSources', [])
            if any(source.get('slug') == icon['slug'] for source in source_icons): return
            lic_type, rights = _icon_rights(icon)
            source_icons.append({
                'title': icon.get('title'), 'slug': icon.get('slug'),
                'sourceUrl': icon.get('source'), 'guidelinesUrl': icon.get('guidelines'),
                'licenseType': lic_type, 'licenseUrl': (icon.get('license') or {}).get('url'),
                'rights': rights,
            })
            notes = entry.setdefault('rightsBySource', [])
            previous_rights = entry.get('rights')
            if previous_rights and not any(note.get('rights') == previous_rights for note in notes):
                notes.append({'source': 'previous-artwork-record', 'rights': previous_rights})
            notes.append({'source': 'simple-icons', 'slug': icon.get('slug'), 'rights': rights})
            entry['rights'] = 'Per-source details in simpleIconsSources and rightsBySource. Simple Icons package-level CC0 is not a blanket licence for icon marks; trademark rights remain with their owners.'

        def icon_file(icon):
            lic_type = (icon.get('license') or {}).get('type')
            if lic_type and ('NC' in lic_type.upper() or 'ND' in lic_type.upper() or lic_type.casefold() == 'custom'):
                skipped_licensed_icons[lic_type] += 1
                return None
            slug = icon['slug']
            member = members.get('package/icons/' + slug + '.svg')
            if not member or member.size > 256_000: raise ValueError('Missing or oversized SVG for ' + slug)
            raw = archive.extractfile(member).read()
            safe = sanitize_svg(raw)
            safe_hash = hashlib.sha256(safe).hexdigest()
            filename = hash_to_file.get(safe_hash)
            if filename is None:
                filename = 'simple-icons-' + safe_hash[:24] + '.svg'
                path = pathlib.Path(bundle) / 'logos' / filename
                if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() != safe_hash:
                    filename = 'simple-icons-' + safe_hash + '.svg'
                    path = pathlib.Path(bundle) / 'logos' / filename
                path.write_bytes(safe)
                license_type, rights = _icon_rights(icon)
                files[filename] = {
                    'sourceUrl': icon.get('source'), 'retrievedAt': fetch_meta.get('retrievedAt'),
                    'sourceSha256': hashlib.sha256(raw).hexdigest(), 'sha256': safe_hash,
                    'bytes': len(safe), 'mediaType': 'image/svg+xml', 'role': 'issuer-artwork',
                    'authentic': True, 'attribution': 'Simple Icons contributors; ' + str(icon.get('title') or slug) + ' brand owner',
                    'rights': rights, 'sanitizedAt': STAMP(),
                    'upstreamPackage': f'simple-icons@{PACKAGE_VERSION}',
                    'packageUrl': PACKAGE_URL, 'packageSha512': 'sha512-' + PACKAGE_SHA512,
                    'packageSha256': hashlib.sha256(source_bytes).hexdigest(),
                    'licenseType': license_type,
                }
                hash_to_file[safe_hash] = filename
                added_files.add(filename)
            attach_source_icon(files[filename], icon)
            return filename

        for key, group in entries.items():
            existing = existing_by_identity.get(key, set())
            if len(existing) > 1:
                ambiguous_identities += 1
                errors.append({'issuerIdentity': key, 'error': 'Conflicting authentic artwork files already bound to this issuer identity; no reuse performed'})
                continue
            filename = next(iter(existing), None)
            method = 'explicit-issuer-identity-reuse' if filename else None
            icon_slugs = set()
            for asset in group:
                name_key = normalize_company_name(asset.get('name'))
                icon_slugs.update(name_index.get(name_key, set()))
            if not filename:
                if len(icon_slugs) != 1:
                    if len(icon_slugs) > 1:
                        ambiguous_identities += 1
                        errors.append({'issuerIdentity': key, 'error': 'Issuer name maps to multiple Simple Icons; skipped'})
                    continue
                slug = next(iter(icon_slugs))
                icon = icon_by_slug.get(slug)
                if not icon: continue
                try: filename = icon_file(icon)
                except Exception as exc:
                    errors.append({'issuerIdentity': key, 'simpleIcon': slug, 'error': str(exc)})
                    continue
                if not filename: continue
                method = 'unique-normalized-issuer-name'
            for asset in group:
                if asset.get('logoFile'): continue
                icon = icon_by_slug.get(next(iter(icon_slugs))) if method == 'unique-normalized-issuer-name' and icon_slugs else None
                bindings[asset['assetId']] = {
                    'file': filename, 'issuerIdentity': key, 'method': method,
                    'matchedCompanyName': asset.get('name'), 'simpleIcon': icon.get('slug') if icon else None,
                    'label': ((icon.get('title') or icon.get('slug') or 'Issuer') + ' company logo') if icon else 'Issuer company logo',
                }

    existing_icon_assets = [a for a in assets if a.get('instrumentType') == 'Equity' and a.get('logoFile') and files.get(a['logoFile'], {}).get('simpleIconsSources')]
    all_bound_assets = existing_icon_assets + [a for a in assets if a.get('assetId') in bindings]
    source_icon_files = {name for name,entry in files.items() if entry.get('simpleIconsSources')}
    source_metadata = {
        'package': f'simple-icons@{PACKAGE_VERSION}', 'packageUrl': PACKAGE_URL,
        'repositoryUrl': REPOSITORY_URL, 'retrievedAt': fetch_meta.get('retrievedAt'),
        'packageBytes': len(source_bytes), 'packageSha256': hashlib.sha256(source_bytes).hexdigest(),
        'packageSha512': 'sha512-' + PACKAGE_SHA512, 'packageLicense': 'CC0-1.0 for the repository/package; not a blanket licence for every icon',
        'packageLicenseUrl': PACKAGE_LICENSE_URL, 'disclaimerUrl': DISCLAIMER_URL,
        'iconRecords': len(icon_records), 'uniqueIssuerArtworkFiles': len(source_icon_files),
        'newUniqueIssuerArtworkFilesAdded': len(added_files),
        'filesReusedFromExistingArtwork': len(set(b['file'] for b in bindings.values()) - added_files),
        'issuerListingBindings': len(all_bound_assets), 'newIssuerListingBindings': len(bindings),
        'previouslyBundledIssuerListingBindings': len(existing_icon_assets),
        'issuerIdentityGroups': len({identity_key(a) for a in all_bound_assets if identity_key(a)}),
        'ambiguousIssuerGroupsSkipped': ambiguous_identities,
        'knownNonRedistributableOrCustomLicenseIconsSkipped': dict(skipped_licensed_icons),
        'resolverRule': 'Equity listings only. Exact unique normalized issuer-name/title or upstream aka/localized alias match; legal-form and share-class suffixes are normalized. Related rows share art only by an existing explicit issuerId or exact normalized issuer name plus listing country. No ticker, domain, substring, derivative, fund-product, or runtime network matching.',
    }
    return bindings, source_metadata, errors


def fund_sponsor_bindings(assets, files, overrides):
    """Reuse the explicit iShares sponsor wordmark for ETF sponsor labels only."""
    rules = (
        {'issuerIdentity': 'sponsor:ishares', 'brand': 'iShares', 'file': 'iwm.svg', 'pattern': r'^\s*ishares\b', 'seed': 'EQUITY:IWM',
         'rightsNote': 'Source mark is the pre-existing TradingView iShares wordmark linked to IWM. No redistribution grant or trademark licence was supplied.'},
    )
    bindings = {}
    for asset in assets:
        if asset.get('instrumentType') != 'ETF' or asset['assetId'] in overrides: continue
        name = asset.get('name') or ''
        for rule in rules:
            entry = files.get(rule['file'])
            if not (entry and entry.get('authentic') and re.search(rule['pattern'], name, re.I)): continue
            if asset.get('logoFile') and asset['logoFile'] != rule['file']: continue
            bindings[asset['assetId']] = {
                'file': rule['file'], 'issuerIdentity': rule['issuerIdentity'],
                'brand': rule['brand'], 'sourceAssetId': rule['seed'],
                'method': 'explicit-fund-sponsor-name-prefix',
                'matchedFundName': name, 'label': rule['brand'] + ' fund sponsor logo',
                'sourceUrl': entry.get('sourceUrl'), 'rights': rule['rightsNote'],
            }
            break
    return bindings, [dict(rule) for rule in rules]
