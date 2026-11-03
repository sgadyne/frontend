#!/usr/bin/env python3
"""Resumable, bounded local artwork authoring; no per-row network at runtime."""
import argparse, collections, concurrent.futures, hashlib, json, pathlib, re, sys, urllib.parse, xml.etree.ElementTree as ET
from refresh import BUNDLE, ROOT, Fetcher, STAMP, write_json, digest
SVG='http://www.w3.org/2000/svg'
ALLOWED={'svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','linearGradient','radialGradient','stop','clipPath','mask','title','desc','text','tspan','use','symbol','marker'}
def sanitize_svg(data):
    if len(data)>256_000 or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():raise ValueError('Oversized SVG or XML entity/doctype')
    root=ET.fromstring(data)
    if root.tag!='{'+SVG+'}svg':raise ValueError('Not SVG (HTML/error response rejected)')
    view=root.get('viewBox','').split()
    if len(view)==4:
        width,height=float(view[2]),float(view[3])
    else:
        width,height=[float(re.sub(r'(px|pt)$','',root.get(k,'0'))) for k in ['width','height']]
    if not (0<width<=8192 and 0<height<=8192):raise ValueError('Unbounded SVG dimensions')
    for node in root.iter():
        tag=node.tag.split('}')[-1]
        if tag not in ALLOWED:raise ValueError('Unsafe SVG element '+tag)
        for key,value in list(node.attrib.items()):
            local=key.split('}')[-1].lower()
            if local.startswith('on') or local in ['src','base']:raise ValueError('Unsafe SVG attribute')
            if local=='href' and not re.fullmatch(r'#[A-Za-z_][\w.:-]*',value):raise ValueError('External SVG reference')
            if re.search(r'(?:https?:|data:|javascript:|@import|expression\s*\()',value,re.I):raise ValueError('External or executable SVG value')
            for reference in re.findall(r'url\((.*?)\)',value,re.I):
                if not reference.strip(' \"\'').startswith('#'):raise ValueError('External SVG paint reference')
    ET.register_namespace('',SVG)
    return ET.tostring(root,encoding='utf-8',xml_declaration=False)+b'\n'
COUNTRY_FUNDS={'EWA':('AU','Australia'),'EWC':('CA','Canada'),'EWD':('SE','Sweden'),'EWG':('DE','Germany'),'EWH':('HK','Hong Kong'),'EWI':('IT','Italy'),'EWJ':('JP','Japan'),'EWK':('BE','Belgium'),'EWL':('CH','Switzerland'),'EWN':('NL','Netherlands'),'EWP':('ES','Spain'),'EWQ':('FR','France'),'EWT':('TW','Taiwan'),'EWU':('GB','United Kingdom'),'EWW':('MX','Mexico'),'EWY':('KR','South Korea'),'EWZ':('BR','Brazil'),'EZA':('ZA','South Africa'),'INDA':('IN','India')}
FUTURES={x:'CME:'+x[1:]+'1!' for x in ['@6A','@6B','@6C','@6E','@6M','@6S','@6Z','@HE','@LE','@SDA','@SR3']}
FUTURES.update({x:'NYMEX:'+x[1:]+'1!' for x in ['@CL','@HO','@NG','@RB','@PA','@PL']})
FUTURES.update({x:'COMEX:'+x[1:]+'1!' for x in ['@GC','@HG','@SI']})
FUTURES.update({x:'CBOT:'+x[1:]+'1!' for x in ['@TN','@KE','@UB','@ZB','@ZC','@ZF','@ZL','@ZM','@ZN','@ZS','@ZT','@ZW']})
FUTURES.update({'@ES':'CME_MINI:ES1!','@NQ':'CME_MINI:NQ1!','@RTY':'CME_MINI:RTY1!','@YM':'CBOT_MINI:YM1!'})
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--cache',required=True);ap.add_argument('--offline',action='store_true');ap.add_argument('--refresh',action='store_true');args=ap.parse_args();fetch=Fetcher(args.cache,args.offline,args.refresh)
    catalog=json.loads((BUNDLE/'catalog.json').read_text());assets=catalog['assets'];byId={a['assetId']:a for a in assets};files={};overrides={};errors=[];associations={}
    previous=json.loads((BUNDLE/'artwork.json').read_text()) if (BUNDLE/'artwork.json').exists() else {}
    # Preserve genuine old provenance, without inventing an original fetch date.
    for a in assets:
        file=a.get('logoFile')
        if not file or file in files:continue
        path=BUNDLE/'logos'/file
        if not path.is_file():errors.append({'file':file,'error':'Referenced file missing'});continue
        old=previous.get('files',{}).get(file)
        try:
            before=path.read_bytes();safe=sanitize_svg(before);path.write_bytes(safe)
            files[file]=old or {'sourceUrl':a.get('brandSource'),'retrievedAt':None,'originalBundleAsOf':'2026-10-31','originalBundleSha256':digest(before),'rights':'Source bundle supplied no licence or redistribution grant. Source URL is provenance only.','attribution':'Original issuer/fund/underlying trademark owners; source TradingView','role':'fund-artwork' if a['assetId'] in ['EQUITY:SPY','EQUITY:QQQ'] else 'instrument-artwork','authentic':True}
            files[file].update(sha256=digest(safe),bytes=len(safe),mediaType='image/svg+xml',sanitizedAt=STAMP())
        except Exception as e:errors.append({'file':file,'error':str(e)});a.pop('logoFile',None)
    def downloaded(url,filename,role,attribution,rights,authentic=False):
        data,meta=fetch.get(url);safe=sanitize_svg(data);path=BUNDLE/'logos'/filename;path.write_bytes(safe)
        files[filename]={'sourceUrl':url,'retrievedAt':meta['retrievedAt'],'sourceSha256':meta['sha256'],'sha256':digest(safe),'bytes':len(safe),'mediaType':'image/svg+xml','role':role,'attribution':attribution,'rights':rights,'authentic':authentic,'sanitizedAt':STAMP()};return filename
    def flag(code):
        file='flag-'+code.lower()+'.svg'
        if file not in files:
            downloaded('https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/'+code.lower()+'.svg',file,'country-exposure','flag-icons contributors, https://github.com/lipis/flag-icons','MIT; licence retained in flag-icons-LICENSE.txt',False)
        return file
    # Explicit country exposure is independent of the US venue/country of listing.
    for ticker,(code,label) in COUNTRY_FUNDS.items():
        a=byId.get('EQUITY:'+ticker)
        if not a:continue
        try:
            file=flag(code);overrides[a['assetId']]={'file':file,'role':'country-exposure','label':label+' exposure flag','exposureCountry':code,'sourceUrl':'https://www.ishares.com/us/products/239657/ishares-msci-hong-kong-etf' if ticker=='EWH' else 'https://www.ishares.com/us/products/etf-investments'}
        except Exception as e:errors.append({'assetId':a['assetId'],'error':str(e)})
    try:
        license,_=fetch.get('https://raw.githubusercontent.com/lipis/flag-icons/main/LICENSE');(BUNDLE/'flag-icons-LICENSE.txt').write_bytes(license)
    except Exception as e:errors.append({'file':'flag-icons-LICENSE.txt','error':str(e)})
    # User requested the blue ticker tile. This is an explicitly labelled presentation
    # fallback: current SSGA publishes a magenta XLK tile, not a downloadable blue mark.
    tile=b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="12" fill="#1766c5"/><text x="48" y="57" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700">XLK</text></svg>\n'
    (BUNDLE/'logos/xlk-ticker-tile.svg').write_bytes(sanitize_svg(tile));safe=(BUNDLE/'logos/xlk-ticker-tile.svg').read_bytes()
    files['xlk-ticker-tile.svg']={'sourceUrl':None,'referenceUrl':'https://www.ssga.com/us/en/individual/capabilities/equities/sector-investing/select-sector-etfs','retrievedAt':STAMP(),'sha256':digest(safe),'bytes':len(safe),'mediaType':'image/svg+xml','role':'ticker-tile','authentic':False,'attribution':'Sampo public/default presentation','rights':'Original generated SVG; ticker text is factual. Does not assert official artwork.','limitation':'A usable official blue tile was not found. Current official page styles XLK #FF28C8; this requested blue fallback is not an authentic fund logo.'}
    overrides['EQUITY:XLK']={'file':'xlk-ticker-tile.svg','role':'ticker-tile','label':'XLK blue ticker tile (curated fallback)'}
    def source_symbol(a):
        url=a.get('metadataSource','');query=urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        if query.get('symbol'):return query['symbol'][0]
        match=re.search('/symbols/([^/]+)-([^/]+)/',url)
        return match[1]+':'+match[2] if match else None
    candidates=[a for a in assets if a.get('logoFile') and source_symbol(a)]
    def association(a):
        symbol=source_symbol(a);url='https://scanner.tradingview.com/symbol?'+urllib.parse.urlencode({'symbol':symbol,'fields':'isin,logoid,type,description'})
        try:
            data,meta=fetch.get(url);j=json.loads(data)
            if j.get('isin') and j.get('logoid') and j['logoid'] in a.get('brandSource',''):
                return a['assetId'],{'isin':j['isin'],'file':a['logoFile'],'sourceUrl':url,'retrievedAt':meta['retrievedAt']}
        except Exception as e:return a['assetId'],{'error':str(e)}
        return a['assetId'],None
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for aid,result in pool.map(association,candidates):
            if result and result.get('isin'):associations[aid]=result
    # Product roots retain their original identities; 1! is an artwork reference only.
    def future(item):
        ticker,symbol=item;url='https://scanner.tradingview.com/symbol?'+urllib.parse.urlencode({'symbol':symbol,'fields':'description,logoid,exchange,type'})
        try:
            data,meta=fetch.get(url);j=json.loads(data)
            if j.get('type')!='futures':raise ValueError('No verified futures product reference')
            return ticker,(url,meta,j),None
        except Exception as e:return ticker,None,str(e)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for ticker,result,error in pool.map(future,FUTURES.items()):
            a=next((a for a in assets if a['ticker']==ticker and a.get('instrumentType')=='Future'),None)
            if not a:continue
            a['seriesKind']='product-root'
            if error:errors.append({'assetId':a['assetId'],'error':error});continue
            url,meta,j=result
            a.setdefault('legacyMetadata',{k:a[k] for k in ['name','exchange','currency','source','asof'] if k in a})
            a.update(name=j['description'],metadataSourceId='tradingview-product-reference',metadataSource=url,metadataRetrievedAt=meta['retrievedAt'])
            # Correct source-verified product exchange metadata, retaining the legacy ID.
            a['exchange']={'CME_MINI':'CME','CBOT_MINI':'CBOT'}.get(j['exchange'],j['exchange']);logoid=j.get('logoid')
            try:
                if logoid and logoid.startswith('country/'):file=flag(logoid.split('/')[1]);role='underlying-country'
                elif logoid:
                    file='product-'+logoid.replace('/','-')+'.svg';role='underlying-product'
                    if file not in files:downloaded('https://s3-symbol-logo.tradingview.com/'+logoid+'--big.svg',file,role,'TradingView; underlying product/benchmark rights owners','Public product artwork retrieved for these specifically verified futures roots. No open redistribution licence or trademark grant located; provenance is not a licence grant.',False)
                else:
                    errors.append({'assetId':a['assetId'],'error':'Verified product has no artwork; generic futures category icon used'});continue
                overrides[a['assetId']]={'file':file,'role':role,'label':j['description']+' underlying icon','sourceUrl':url,'referenceSeries':FUTURES[ticker]}
            except Exception as e:errors.append({'assetId':a['assetId'],'error':str(e)})
    category=b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#e7edf5"/><path d="M18 16h22v26H18zM25 22h22v26H25" fill="none" stroke="#48617f" stroke-width="3"/><path d="M31 30h10M31 36h7" stroke="#48617f" stroke-width="3"/></svg>'
    category=sanitize_svg(category);(BUNDLE/'logos/futures-category.svg').write_bytes(category)
    files['futures-category.svg']={'sourceUrl':None,'retrievedAt':None,'sha256':digest(category),'bytes':len(category),'mediaType':'image/svg+xml','role':'category','authentic':False,'attribution':'Sampo public/default presentation','rights':'Original generated category SVG; no issuer or exchange mark.'}
    for a in assets:
        if a.get('instrumentType')=='Future' and a['assetId'] not in overrides:
            overrides[a['assetId']]={'file':'futures-category.svg','role':'category','label':'Futures product category icon'}
            a.setdefault('seriesKind','unverified-legacy-reference')
    byIsin=collections.defaultdict(set)
    for a in assets:
        if a.get('isin') and a.get('logoFile') and files.get(a['logoFile'],{}).get('authentic'):byIsin[a['isin']].add(a['logoFile'])
    for assoc in associations.values():byIsin[assoc['isin']].add(assoc['file'])
    for a in assets:
        override=overrides.get(a['assetId'])
        if override:a.update(logoFile=override['file'],logoRole=override['role'],logoLabel=override['label']);continue
        matches=byIsin.get(a.get('isin'),set())
        if not a.get('logoFile') and len(matches)==1:a['logoFile']=next(iter(matches));a['artworkAssociation']='same-ISIN'
        if a.get('logoFile'):
            f=files[a['logoFile']];a['logoRole']=f['role'];a['logoLabel']='Issuer / instrument artwork' if f.get('authentic') else 'Underlying product icon'
    counts=collections.Counter(a.get('logoRole','monogram') for a in assets);genuine=sum(1 for a in assets if files.get(a.get('logoFile'),{}).get('authentic'))
    manifest={'schemaVersion':1,'generatedAt':STAMP(),'files':files,'overrides':overrides,'securityAssociations':associations,'summary':{'catalogueRecords':len(assets),'locallyBundledFiles':len(files),'bytes':sum(f['bytes'] for f in files.values()),'authenticArtworkRecords':genuine,'roles':dict(counts),'generatedMonogramRecords':counts['monogram'],'missingBadgeRecords':0},'errors':errors,'lookupOrder':['explicit curated override','official issuer/fund artwork','verified instrument artwork','labelled exposure/underlying icon','generated monogram'],'futuresScope':'Existing configured product roots only. Continuous 1! series are provenance references for product artwork, not registrations of continuous data or expiring contracts. @CO and VIX references without a verified mapping keep a generic futures category icon; their underlying identity is not inferred.'}
    write_json(BUNDLE/'catalog.json',catalog);write_json(BUNDLE/'artwork.json',manifest);print(json.dumps(manifest['summary']));print('artwork issues',len(errors))
if __name__=='__main__':main()
