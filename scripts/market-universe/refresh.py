#!/usr/bin/env python3
"""Offline authoring only: public listing directories, never prices or coverage jobs."""
import argparse, collections, concurrent.futures, csv, datetime as dt, hashlib, io, json, os, pathlib, re, time, urllib.parse
import requests
from bs4 import BeautifulSoup
import openpyxl
ROOT = pathlib.Path(__file__).resolve().parents[2]
BUNDLE = ROOT / 'assets/market-universe'
VENUES = json.loads((BUNDLE/'venues.json').read_text())['venues'] if (BUNDLE/'venues.json').exists() else {}
STAMP = lambda: dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix+'.tmp'); tmp.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n'); tmp.replace(path)
def text(v):
    return str(int(v)) if isinstance(v,float) and v.is_integer() else str(v or '').strip()
def digest(b): return hashlib.sha256(b).hexdigest()
class Fetcher:
    def __init__(self, cache, offline=False, refresh=False):
        self.cache=pathlib.Path(cache);self.cache.mkdir(parents=True,exist_ok=True);self.offline=offline;self.refresh=refresh
    def get(self,url,body=None,form=None):
        key=digest((url+json.dumps(body if form is None else {'form':form},sort_keys=True)).encode());p=self.cache/(key+'.raw');m=self.cache/(key+'.json')
        old=json.loads(m.read_text()) if m.exists() else {}
        if p.exists() and (self.offline or not self.refresh):return p.read_bytes(),old
        if self.offline:raise ValueError('Uncached request: '+url)
        headers={'User-Agent':'SampoPublicDirectory/1.0 (offline reference metadata authoring)','Accept':'*/*'}
        if body is None:
            if old.get('etag'):headers['If-None-Match']=old['etag']
            if old.get('lastModified'):headers['If-Modified-Since']=old['lastModified']
        for attempt in range(3):
            try:
                r=requests.request('POST' if body or form else 'GET',url,json=body,data=form,headers=headers,timeout=(12,40),stream=True)
                if r.status_code==304 and p.exists():r.close();return p.read_bytes(),old
                if r.status_code in [429,500,502,503,504] and attempt<2:time.sleep(min(4,2**attempt));continue
                r.raise_for_status()
                chunks=[];size=0
                for chunk in r.iter_content(chunk_size=1_048_576):
                    size+=len(chunk)
                    if size>100_000_000:r.close();raise ValueError('Response exceeds 100 MB bound')
                    chunks.append(chunk)
                data=b''.join(chunks);r.close()
                meta={'url':url,'retrievedAt':STAMP(),'sha256':digest(data),'bytes':len(data),'mediaType':r.headers.get('Content-Type',''),'etag':r.headers.get('ETag'),'lastModified':r.headers.get('Last-Modified')}
                tmp=p.with_suffix('.part');tmp.write_bytes(data);tmp.replace(p);write_json(m,meta);return data,meta
            except (requests.Timeout,requests.ConnectionError):
                if attempt==2:raise
                time.sleep(2**attempt)
        raise ValueError('Retries exhausted')
def xlsx_rows(data):
    w=openpyxl.load_workbook(io.BytesIO(data),read_only=True,data_only=True)
    s=w.active;s.reset_dimensions() # HKEX contains a stale 8-row worksheet dimension.
    return [[text(v) for v in row] for row in s.values]
def us_instrument_type(name, etf):
    if etf=='Y':return 'ETF'
    for pattern,kind in [(r'\bwarrants?\b','Warrant'),(r'\brights?\b','Right'),(r'\bunits?\b','Unit'),(r'\b(preferred|preference)\b','Preferred share'),(r'\b(depositary|depository)\b','ADR'),(r'\b(notes? due|debentures?)\b','Bond')]:
        if re.search(pattern,name,re.I):return kind
    return 'Equity' if re.search(r'common|ordinary|shares|stock',name,re.I) else 'Security'
def listing(s,symbol,name,**extra):
    if not text(symbol) or not text(name):raise ValueError('Missing symbol/name')
    original=text(symbol)
    symbol=original.zfill(5) if s['mic']=='XHKG' and original.isdigit() else original
    return {'mic':s['mic'],'localSymbol':text(symbol),'ticker':text(symbol),'name':text(name),'region':s['region'],'listingCountry':s['country'],**({'sourceSymbols':{'provider':original}} if original!=symbol else {}),**{k:v for k,v in extra.items() if v}}
def csv_rows(data,skip=0,delimiter=','):
    return list(csv.DictReader(io.StringIO('\n'.join(data.decode('utf-8-sig').splitlines()[skip:])),delimiter=delimiter,skipinitialspace=True))
def parse(s,data):
    a=s['adapter'];rows=[];rejected=collections.Counter();offered=0;asof=None;evidence='';extra={};venueStats=collections.defaultdict(lambda:{'offered':0,'accepted':0,'rejected':0})
    def add(symbol,name,**kw):
        nonlocal offered
        offered+=1
        try:rows.append(listing(s,symbol,name,**kw))
        except ValueError:rejected['missing-identity']+=1
    if a=='nasdaq':
        raw=data.decode('utf-8-sig');lines=raw.splitlines();footer=[l for l in lines if l.startswith('File Creation Time:')]
        if len(footer)!=1 or lines[-1]!=footer[0]:raise ValueError('Missing directory terminal creation-time footer')
        m=re.search(r'(\d{2})(\d{2})(\d{4})',footer[0]);asof=f'{m[3]}-{m[1]}-{m[2]}' if m else None
        for r in csv_rows(data,delimiter='|'):
            if r.get('Symbol','').startswith('File Creation') or r.get('ACT Symbol','').startswith('File Creation'):continue
            offered+=1
            mic={'N':'XNYS','A':'XASE','P':'ARCX','Z':'BATS','V':'IEXG','F':'TXSE','M':'XCHI'}.get(r.get('Exchange'),'XNAS' if 'Symbol' in r else '')
            venueStats[mic or 'unmapped']['offered']+=1
            if r.get('Test Issue')!='N':rejected['test-issue']+=1;venueStats[mic or 'unmapped']['rejected']+=1;continue
            if not mic:raise ValueError('Unmapped active US listing venue code: '+r.get('Exchange','missing'))
            venueStats[mic]['accepted']+=1
            symbol=r.get('ACT Symbol',r.get('Symbol',''));name=r.get('Security Name','')
            rows.append({**listing({**s,'mic':mic},symbol,name,instrumentType=us_instrument_type(name,r.get('ETF'))),'sourceSymbols':{k:r[k] for k in ['CQS Symbol','NASDAQ Symbol'] if r.get(k)}})
        extra['venueAccounting']=dict(venueStats)
        evidence='Terminal File Creation Time footer present; every non-test directory row consumed. Exchange codes from Nasdaq Symbol Directory Definitions.'
    elif a=='hkex':
        allrows=xlsx_rows(data);asof=dt.datetime.strptime(allrows[1][0].split('at ')[1],'%d/%m/%Y').date().isoformat()
        if allrows[2][:3]!=['Stock Code','Name of Securities','Category']:raise ValueError('HKEX header changed')
        for r in allrows[3:]:
            if not r[0] and not r[1]:continue
            category=r[2];typ={'Equity':'Equity','Exchange Traded Products':'ETP','Real Estate Investment Trusts':'REIT','Derivative Warrants':'Warrant','Debt Securities':'Bond','Callable Bull/Bear Contracts':'CBBC'}.get(category,'Warrant' if 'Warrant' in category else 'Security')
            add(r[0],r[1],instrumentType=typ,currency=r[16],isin=r[5],subtype=r[3],expiryDate=r[6])
        evidence='Full List of Securities workbook; worksheet dimensions reset and all XML rows consumed, including GEM, funds, debt and structured securities.'
    elif a=='jpx':
        rr=xlsx_rows(data)
        if rr[0][0] not in ['Effective Date','Date','日付']:raise ValueError('JPX header changed')
        for r in rr[1:]:
            date=r[0];asof=f'{date[:4]}-{date[4:6]}-{date[6:8]}'
            subtype=r[3];typ='ETP' if 'ETF' in subtype or 'ETN' in subtype else 'REIT' if 'REIT' in subtype else 'Fund' if 'Fund' in subtype else 'Equity'
            add(r[1],r[2],instrumentType=typ,subtype=subtype,industry=r[5] if r[5]!='-' else None)
        evidence='Every issue in the official month-end TSE workbook consumed; other Japanese exchanges and Tokyo PRO not asserted.'
    elif a=='deutsche':
        lines=data.decode('utf-8-sig').splitlines();asof=dt.datetime.strptime(lines[1].split(';')[1],'%d.%m.%Y').date().isoformat()
        raw=csv_rows(data,skip=2,delimiter=';')
        for r in raw:
            offered+=1
            if not r.get('Mnemonic'):rejected['no-local-symbol']+=1;continue
            if r['Product Status']!='Active' or r['Instrument Status']!='Active':rejected['inactive']+=1;continue
            typ={'CS':'Equity','FUN':'Fund','BOND':'Bond','WAR':'Warrant'}.get(r['Instrument Type'],r['Instrument Type'])
            rows.append(listing(s,r['Mnemonic'],r['Instrument'],instrumentType=typ,currency=r.get('Currency'),isin=r.get('ISIN'),wkn=r.get('WKN'),primaryMic=r.get('Primary Market MIC Code')))
        evidence='All rows of official allTradableInstruments CSV consumed. Securities without a local mnemonic are explicitly excluded; trading admission is distinct from primary listing.'
        extra['sourceTypeCounts']=dict(collections.Counter(r['Instrument Type'] for r in raw))
    elif a=='lse':
        w=openpyxl.load_workbook(io.BytesIO(data),read_only=True,data_only=True)
        for title in ['1.0 All Equity','2.0 All Non-Equity']:
            sheet=w[title];sheet.reset_dimensions();rr=[[text(v) for v in r] for r in sheet.values]
            d=next(r[0][6:] for r in rr if r and r[0].startswith('As at '));asof=dt.datetime.strptime(d,'%d %B %Y').date().isoformat()
            declared=int(next(r[0].split(': ')[1].replace(',','') for r in rr if r and r[0].startswith('Number of Instruments:')))
            head=next(i for i,r in enumerate(rr) if r and r[0]=='TIDM');header=rr[head];raw=[dict(zip(header,r)) for r in rr[head+1:] if r and r[0]]
            if len(raw)!=declared:raise ValueError('LSE row count does not equal declared '+str(declared))
            for r in raw:
                typ={'SHRS':'Equity','DPRS':'ADR','ETFS':'ETF','BOND':'Bond','ETCS':'ETC','ETNS':'ETN'}.get(r['MiFIR Identifier Code'],r['MiFIR Indentifier Name'])
                add(r['TIDM'],r['Issuer Name']+' — '+r['Instrument Name'],instrumentType=typ,currency=r['Trading Currency'],isin=r['ISIN'],marketSegment=r.get('Market Segment Code'),industry=r.get('ICB Industry'))
        evidence='Both official All Equity and All Non-Equity aggregate sheets consumed exactly once; accepted row counts checked against declared Number of Instruments. Includes AIM, main market, international securities and funds; operating MIC XLON used with sourced segment.'
    elif a=='nse':
        raw=csv_rows(data)
        for r in raw:
            add(r.get('SYMBOL',r.get('Symbol')),r.get('NAME OF COMPANY',r.get('SecurityName')),instrumentType='ETF' if s['id']=='nse-etf' else 'Equity',isin=r.get('ISIN NUMBER',r.get('ISINNumber')),subtype=r.get('SERIES'))
        evidence='Entire official CSV consumed; listed scope is '+s['scope']+'. No source-wide as-of date supplied; retrieval time is separate.'
    elif a=='asx':
        raw=data.decode('utf-8-sig');date=raw.splitlines()[0].split('as at ')[1];asof=dt.datetime.strptime(re.sub(r' (?:AEDT|AEST) ',' ',date),'%a %b %d %H:%M:%S %Y').date().isoformat()
        for r in csv_rows(data,skip=2):add(r['ASX code'],r['Company name'],industry=r['GICS industry group'] if r['GICS industry group'] not in ['Not Applic','Class Pend'] else None)
        evidence='Entire official company CSV consumed. Company inventory excludes ETP issuers, wholesale debt issuers and duplicate entities in stapled securities; not a complete security inventory.'
    elif a=='krx':
        soup=BeautifulSoup(data.decode('euc-kr'),'html.parser');table=soup.find('table');rr=table.find_all('tr')
        for tr in rr[1:]:
            v=[c.get_text(' ',strip=True) for c in tr.find_all('td')]
            if v:add(v[2],v[0],industry=v[3],subtype=v[1])
        evidence='Entire KRX KIND listed-company export consumed; company inventory does not include all preferred share classes, ETFs or other securities. Venue segment not supplied; MIC XKRX is operating market.'
    elif a=='taiwan-isin':
        soup=BeautifulSoup(data,'html.parser');tables=soup.find_all('table');table=tables[-1]
        match=re.search(r'最近更新日期:(\d{4})/(\d{2})/(\d{2})',soup.get_text(' ',strip=True))
        if not match:raise ValueError('Taiwan ISIN update date missing')
        asof='-'.join(match.groups());category='';categoryCounts=collections.Counter()
        for tr in table.find_all('tr')[1:]:
            cells=tr.find_all('td');v=[c.get_text(' ',strip=True) for c in cells]
            if len(v)==1:category=v[0];continue
            if not v:continue
            offered+=1
            if len(v)<7 or not re.fullmatch('[A-Z0-9]{12}',v[1]):rejected['malformed-isin-row']+=1;continue
            pair=re.split(r'\s+',v[0],maxsplit=1)
            if len(pair)!=2:rejected['missing-local-symbol-or-name']+=1;continue
            symbol,name=pair;typ={'股票':'Equity','特別股':'Preferred share','創新板':'Equity','ETF':'ETF','ETN':'ETN','臺灣存託憑證(TDR)':'ADR','受益證券-不動產投資信託':'REIT','受益證券-資產基礎證券':'Asset-backed security'}.get(category,'Warrant' if '權證' in category else 'Security')
            categoryCounts[category]+=1
            rows.append(listing(s,symbol,name,isin=v[1],instrumentType=typ,subtype=category,industry=v[4],cfi=v[5]))
        evidence='Official domestic listed/OTC ISIN directory, entire single HTML security table consumed. Numeric/local codes preserved including ETFs, preferred shares, warrants and other published categories; source says formal listing notices prevail. No currency inferred.'
        extra['sourceTypeCounts']=dict(categoryCounts)
    elif a=='taiwan':
        rr=json.loads(data)
        for r in rr:
            code=r.get('公司代號',r.get('SecuritiesCompanyCode'));name=r.get('公司簡稱',r.get('CompanyAbbreviation',r.get('CompanyName')))
            d=r.get('出表日期',r.get('Date',''));asof=f'{int(d[:3])+1911}-{d[3:5]}-{d[5:7]}' if len(d)==7 else None
            add(code,name,instrumentType='Equity',englishName=r.get('英文簡稱',r.get('EnglishAbbreviation')))
        evidence='Entire open-data company inventory consumed; no claim to preferred shares, ETFs, warrants or other classes.'
    else:raise ValueError('Unknown adapter '+a)
    return rows,{'rowsOffered':offered,'rowsRejected':sum(rejected.values()),'rejections':dict(rejected),'asof':asof,'completenessEvidence':evidence,**extra}
def tradingview(s,fetch):
    out=[];expected=None;pages=[];alltypes=collections.Counter()
    for start in range(0,200_000,1000):
        q={'filter':[{'left':'exchange','operation':'equal','right':s['exchange']}], 'columns':['name','description','exchange','currency','type','subtype','isin'],'sort':{'sortBy':'name','sortOrder':'asc'},'range':[start,start+1000]}
        data,meta=fetch.get('https://scanner.tradingview.com/global/scan',q);body=json.loads(data)
        total=body.get('totalCount');rr=body.get('data')
        if not isinstance(total,int) or not isinstance(rr,list):raise ValueError('Malformed provider page')
        if expected is not None and total!=expected:raise ValueError('Provider total changed during pagination; retry from cache refresh')
        expected=total;pages.append(meta)
        if len(rr)!=min(1000,max(0,total-start)):raise ValueError('Truncated provider page')
        for row in rr:
            v=row['d'];alltypes[v[4]]+=1
            if v[2]!=s['exchange']:raise ValueError('Provider venue filter leaked')
            if v[4] not in ['stock','fund','dr']:continue
            typ='ETF' if v[4]=='fund' and v[5]=='etf' else 'Fund' if v[4]=='fund' else 'ADR' if v[4]=='dr' else 'Equity'
            out.append(listing(s,v[0],v[1],currency=v[3],instrumentType=typ,subtype=v[5],isin=v[6]))
        if start+len(rr)>=total:break
    if expected is None or sum(alltypes.values())!=expected:raise ValueError('Provider pagination did not reach total')
    return out,{'rowsOffered':expected,'rowsRejected':expected-len(out),'rejections':{'outside-stock-fund-dr-scope':expected-len(out)},'sourceTypeCounts':dict(alltypes),'pages':len(pages),'requests':pages,'asof':None,'completenessEvidence':'Every provider page consumed; stable totalCount and exact page lengths validated. Complete only for this provider snapshot, not certified exchange-wide. Index, futures, cash FX, CFDs and crypto excluded.'}
def euronext(s,fetch):
    data,meta=fetch.get(s['url']);soup=BeautifulSoup(data,'html.parser')
    settings=json.loads(soup.find('script',attrs={'data-drupal-selector':'drupal-settings-json'}).text)
    url='https://live.euronext.com'+settings['jsongateway'];out=[];pages=[meta];expected=None;rejected=collections.Counter();fetched=0
    for start in range(0,100_000,1000):
        q={'iDisplayStart':start,'iDisplayLength':1000,'start':start,'length':1000,'sSortDir_0':'asc','sSortField':'shortName','args[display_datapoints]':','.join(settings['datapoints'])}
        raw,m=fetch.get(url,form=q);body=json.loads(raw);total=body['iTotalDisplayRecords'];rr=body['aaData'];pages.append(m)
        if expected is not None and total!=expected:raise ValueError('Euronext total changed during pagination')
        expected=total
        if len(rr)!=min(1000,max(0,total-start)):raise ValueError('Truncated Euronext page')
        for r in rr:
            fetched+=1;first=next((i for i,c in enumerate(r) if '<a ' in c),None)
            if first is None:rejected['missing-product-link']+=1;continue
            node=BeautifulSoup(r[first],'html.parser').find('a');link=node.get('href','');match=re.search(r'/([A-Z0-9]{12})-([A-Z0-9]{4})(?:$|/)',link)
            if not match:rejected['unparsed-listing-identity']+=1;continue
            isin,mic=match.groups();country=VENUES.get(mic,{}).get('country')
            if not country:rejected['unknown-mic-country']+=1;continue
            symbol=BeautifulSoup(r[first+settings['datapoints'].index('symbol')],'html.parser').get_text(' ',strip=True)
            currencyMatch=re.match(r'([A-Z]{3})\b',BeautifulSoup(r[first+settings['datapoints'].index('lastPrice')],'html.parser').get_text(' ',strip=True)) if 'lastPrice' in settings['datapoints'] else None
            try:out.append(listing({**s,'mic':mic,'country':country},symbol,node.get_text(' ',strip=True),isin=isin,currency=currencyMatch[1] if currencyMatch else None,instrumentType=s.get('instrumentType','Equity')))
            except ValueError:rejected['missing-identity']+=1
        if start+len(rr)>=total:break
    if fetched!=expected:raise ValueError('Euronext total not reached')
    return out,{'rowsOffered':expected,'rowsRejected':sum(rejected.values()),'rejections':dict(rejected),'pages':len(pages)-1,'requests':pages,'asof':None,'completenessEvidence':'Official public directory gateway read from its page configuration, no index constituent lists. Stable total and exact page lengths validated through final page. Directory quote cells discarded; identifiers/name/currency only. No source snapshot as-of supplied.'}
def run_source(s,fetch):
    dest=BUNDLE/'snapshots'/(s['id']+'.json');old=json.loads(dest.read_text()) if dest.exists() else None
    try:
        if s['adapter']=='tradingview':rows,report=tradingview(s,fetch)
        elif s['adapter']=='euronext':rows,report=euronext(s,fetch)
        else:
            data,meta=fetch.get(s['url']);rows,report=parse(s,data);report.update(pages=1,requests=[meta])
        if len(rows)<s.get('minRows',1):raise ValueError('Below minimum row guard')
        keys=[(r['mic'],r['localSymbol']) for r in rows];counts=collections.Counter(keys);duplicates=sum(v-1 for v in counts.values())
        # Never silently collapse different issues into a bare-ticker identity.
        bykey={}
        for r in rows:
            key=(r['mic'],r['localSymbol'])
            if key in bykey and r!=bykey[key]:raise ValueError('Conflicting listing identity '+str(key))
            bykey[key]=r
        rows=list(bykey.values())
        if old and len(rows)<len(old['rows'])*.8:raise ValueError('More than 20% shrink; retain last good snapshot and inspect source')
        report.update(rowsFetched=report['rowsOffered'],id=s['id'],status=s.get('completeness','partial'),rowsAccepted=len(rows),duplicates=duplicates,scope=s['scope'],sourceUrl=s['url'],retrievedAt=max(r['retrievedAt'] for r in report['requests']),limitations=s.get('limitations',[]),license=s['license'])
        snapshot={'sourceId':s['id'],'report':report,'rows':sorted(rows,key=lambda r:(r['mic'],r['localSymbol']))};write_json(dest,snapshot)
        return report
    except Exception as e:
        return {'id':s['id'],'status':'error-retained' if old else 'unavailable','error':str(e),'sourceUrl':s['url'],'scope':s['scope'],'rowsAccepted':len(old['rows']) if old else 0,'lastGoodRetrievedAt':old['report']['retrievedAt'] if old else None,'license':s['license'],'limitations':s.get('limitations',[])}
def canonical(r):return 'LISTING:'+r['mic']+':'+urllib.parse.quote(r['localSymbol'],safe='.-_')
SUFFIX={'HK':('XHKG',5),'JT':('XTKS',0),'GY':('XETR',0),'FP':('XPAR',0),'NA':('XAMS',0),'BB':('XBRU',0),'LN':('XLON',0),'SW':('XSWX',0),'SQ':('XMAD',0),'IM':('XMIL',0),'DC':('XCSE',0),'FH':('XHEL',0),'SS':('XSTO',0),'AU':('XASX',0)}
def compile_catalogue(reports):
    catalog=json.loads((BUNDLE/'catalog.json').read_text());assets=catalog['assets'];legacy={};existing={a['assetId']:a for a in assets}
    for a in assets:
        if a.get('listingId'):legacy[a['listingId']]=a;continue
        t=a['ticker'];m=re.match(r'(.+)-([A-Z]{2})$',t)
        if m and m[2] in SUFFIX:
            mic,width=SUFFIX[m[2]];symbol=m[1].zfill(width);legacy[canonical({'mic':mic,'localSymbol':symbol})]=a
        elif a.get('region')=='Americas' and a.get('instrumentType') in ['Equity','ETF'] and not t.startswith('@'):
            legacy['US:'+t]=a
    # A provider may spell an official local symbol differently. Link only a unique
    # venue+ISIN+trading-currency match, retaining that source's spelling as an alias.
    registry=json.loads((BUNDLE/'sources.json').read_text())['sources'];snapshots={}
    securityKeys=collections.defaultdict(set);aliasMap={}
    for src in registry:
        path=BUNDLE/'snapshots'/(src['id']+'.json')
        if path.exists():snapshots[src['id']]=json.loads(path.read_text())
        if src['adapter']=='tradingview' or src['id'] not in snapshots:continue
        for r in snapshots[src['id']]['rows']:
            if r.get('isin') and r.get('currency'):securityKeys[(VENUES.get(r['mic'],{}).get('operatingMic',r['mic']),r['isin'],r['currency'])].add(canonical(r))
    for src in registry:
        if src['adapter']!='tradingview' or src['id'] not in snapshots:continue
        for r in snapshots[src['id']]['rows']:
            matches=securityKeys.get((VENUES.get(r['mic'],{}).get('operatingMic',r['mic']),r.get('isin'),r.get('currency')),set())
            if len(matches)==1:aliasMap[canonical(r)]=next(iter(matches))
    for alias,lid in aliasMap.items():
        if alias in legacy and lid not in legacy:legacy[lid]=legacy[alias]
    added=0;updated=0;seen=set();byListing={};conflicts=[]

    # Registry order gives official directories precedence over provider supplements.
    for s in json.loads((BUNDLE/'sources.json').read_text())['sources']:
        p=BUNDLE/'snapshots'/(s['id']+'.json')
        if not p.exists():continue
        snap=json.loads(p.read_text())
        for r in snap['rows']:
            rawId=canonical(r);lid=aliasMap.get(rawId,rawId)
            if lid in seen:
                a=byListing[lid]
                if a.get('isin') and r.get('isin') and a['isin']!=r['isin']:
                    conflicts.append({'listingId':lid,'preferredSource':a.get('metadataSourceId'),'alternateSource':s['id'],'preferredIsin':a['isin'],'alternateIsin':r['isin']});continue
                supplements=a.setdefault('metadataFieldSources',{})
                for field in ['currency','isin','englishName','instrumentType']:
                    if not a.get(field) and r.get(field):a[field]=r[field];supplements[field]=s['id']
                if r['name']!=a['name']:
                    a['alternateNames']=sorted(set(a.get('alternateNames',[])+[r['name']]))
                    supplements['alternateNames']=s['id']
                if not supplements:a.pop('metadataFieldSources',None)
                if rawId!=lid and lid in byListing:
                    a=byListing[lid];a['aliases']=sorted(set(a.get('aliases',[])+[rawId]))
                    a.setdefault('sourceSymbols',{})[s['id']]=r['localSymbol']
                continue
            seen.add(lid);old=legacy.get(lid) or (legacy.get('US:'+r['localSymbol']) if r['mic'] in ['XNAS','XNYS','ARCX','XASE','BATS','IEXG','TXSE','XCHI'] else None)
            if old is None:old=existing.get(lid)
            a=old if old is not None else {'assetId':lid}
            if old is not None:
                if not a.get('legacyMetadata') and not a['assetId'].startswith('LISTING:'):
                    a['legacyMetadata']={k:a[k] for k in ['name','exchange','currency','source','asof'] if k in a}
                updated+=1
            else:assets.append(a);existing[lid]=a;added+=1
            # Preserve legacy display tickers and legacy asof/source provenance, supplement with verified listing metadata.
            a.update({k:v for k,v in r.items() if k not in ['ticker','mic','localSymbol']})
            if old is None:a['ticker']=r['ticker'];a['source']=s['id']
            byListing[lid]=a
            if not a['assetId'].startswith('LISTING:'):a['aliases']=sorted(set(a.get('aliases',[])+[lid]))
            a.update(listingId=lid,mic=r['mic'],localSymbol=r['localSymbol'],exchange=r['mic'],metadataSourceId=s['id'],listingStatus='listed-in-source')
            if snap['report'].get('asof'):a['listingAsOf']=snap['report']['asof']
            else:a.pop('listingAsOf',None)
    catalog['revision']='public-listings-'+dt.datetime.now(dt.timezone.utc).date().isoformat();catalog['directorySources']='sources.json';catalog['coverageReport']='coverage-report.json'
    # Stable legacy IDs and every existing group/holding reference survive refresh failures or delistings.
    for a in assets:
        if a.get('listingId') and a['listingId'] not in seen:a['listingStatus']='retained-not-in-latest-source'
    write_json(BUNDLE/'catalog.json',catalog)
    groups=json.loads((BUNDLE/'groups.json').read_text())
    for g in groups['groups']:
        if g['category']=='region':
            region=g['id'].split(':',1)[1];g['assetIds']=sorted(a['assetId'] for a in assets if a.get('region')==region);g['revision']=digest('\n'.join(g['assetIds']).encode())
    for mic in sorted({a['mic'] for a in assets if a.get('mic')}):
        gid='venue:'+mic;g=next((g for g in groups['groups'] if g['id']==gid),None)
        if g is None:g={'id':gid,'title':mic+' · '+VENUES.get(mic,{}).get('title',mic).title(),'category':'exchange','assetIds':[]};groups['groups'].append(g)
        g['assetIds']=sorted(a['assetId'] for a in assets if a.get('mic')==mic)
    groups['revision']=catalog['revision'];write_json(BUNDLE/'groups.json',groups)
    report={'schemaVersion':1,'generatedAt':STAMP(),'catalogueCount':len(assets),'addedThisRun':added,'updatedThisRun':updated,'sources':reports,'metadataConflicts':conflicts,'venueCounts':dict(sorted(collections.Counter(a.get('mic','legacy-unverified') for a in assets).items())),'policy':'Coverage is optional and never admits or excludes listings. Retain old identities and dated holdings; absence from a source is not evidence of delisting.'};write_json(BUNDLE/'coverage-report.json',report)
    print(json.dumps({'catalogueCount':len(assets),'added':added,'updated':updated}),flush=True)
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--cache',default=os.environ.get('MARKET_UNIVERSE_CACHE',str(pathlib.Path.home()/'.cache/sampo-market-universe')));ap.add_argument('--offline',action='store_true');ap.add_argument('--refresh',action='store_true');ap.add_argument('--source',action='append');ap.add_argument('--compile-only',action='store_true');ap.add_argument('--workers',type=int,default=3);args=ap.parse_args()
    registry=json.loads((BUNDLE/'sources.json').read_text());sources=[s for s in registry['sources'] if not args.source or s['id'] in args.source];fetch=Fetcher(args.cache,args.offline,args.refresh)
    oldreport=json.loads((BUNDLE/'coverage-report.json').read_text()) if (BUNDLE/'coverage-report.json').exists() else {'sources':[]};reports={r['id']:r for r in oldreport['sources']}
    failures=[]
    if not args.compile_only:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(4,max(1,args.workers))) as pool:
            for report in pool.map(lambda s:run_source(s,fetch),sources):
                if report['status'] in ['unavailable','error-retained']:failures.append(report['id'])
                reports[report['id']]=report;print(json.dumps({k:v for k,v in report.items() if k not in ['requests','completenessEvidence']}),flush=True)
    for s in registry['sources']:
        if s['id'] not in reports:
            p=BUNDLE/'snapshots'/(s['id']+'.json');reports[s['id']]=json.loads(p.read_text())['report'] if p.exists() else {'id':s['id'],'status':'not-retrieved','sourceUrl':s['url'],'scope':s['scope'],'license':s['license']}
    compile_catalogue([reports[s['id']] for s in registry['sources']])
    if failures:raise SystemExit('Sources failed (last good retained): '+', '.join(failures))
if __name__=='__main__':main()
