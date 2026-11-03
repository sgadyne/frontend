import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {decodeMarketCatalogue} from '../../packages/vfo-workspace-core/src/market/market-catalogue.ts';
const base=new URL('../../assets/market-universe/',import.meta.url),read=async name=>JSON.parse(await readFile(new URL(name,base),'utf8'));
const [catalog,groups,nav,packed,artwork,report]=await Promise.all(['catalog.json','groups.json','navigation.json','catalog.compact.json','artwork.json','coverage-report.json'].map(read));
const assets=catalog.assets,ids=new Set(assets.map(a=>a.assetId)),listingIds=new Set(assets.map(a=>a.listingId).filter(Boolean));
assert.equal(ids.size,assets.length);assert.equal(listingIds.size,assets.filter(a=>a.listingId).length);assert.ok(assets.length>50000);
const byId=new Map(assets.map(a=>[a.assetId,a]));
for(const group of groups.groups){for(const id of [...group.assetIds,...(group.pinnedFundIds??[])])assert.ok(ids.has(id),`${group.id}: ${id}`);if(group.category==='region')assert.equal(group.assetIds.length,assets.filter(a=>a.region===group.id.split(':')[1]).length);}
for(const r of nav.regions){for(const id of [...r.featuredAssetIds,...r.etfs.map(e=>e.assetId)])assert.ok(ids.has(id),id);}
for(const c of nav.collections)for(const id of [...c.assetIds,...c.etfIds])assert.ok(ids.has(id),id);
for(const industry of catalog.industries)for(const fund of industry.funds)for(const holding of fund.holdings)if(holding.assetId)assert.ok(ids.has(holding.assetId),holding.assetId);
for(const a of assets){if(a.assetId.startsWith('LISTING:')){assert.ok(a.mic&&a.localSymbol);assert.equal(a.listingId,a.assetId);}if(a.logoFile)assert.ok(artwork.files[a.logoFile],a.logoFile);}
for(const [file,entry] of Object.entries(artwork.files)){assert.equal((await stat(new URL('logos/'+file,base))).size,entry.bytes);assert.ok(entry.sha256);assert.equal(entry.mediaType,'image/svg+xml');}
assert.equal(artwork.overrides['EQUITY:EWH'].role,'country-exposure');assert.equal(byId.get('EQUITY:EWH').listingCountry,'US');
assert.equal(byId.get('EQUITY:EWH').exchange,'ARCX');assert.equal(byId.get('EQUITY:SPY').logoFile,'spy.svg');assert.equal(byId.get('EQUITY:XLK').logoRole,'ticker-tile');assert.equal(artwork.files[byId.get('EQUITY:XLK').logoFile].authentic,false);
assert.equal(byId.get('FUTURES:@GC').logoRole,'underlying-product');assert.equal(byId.get('FUTURES:@GC').seriesKind,'product-root');
const decoded=decodeMarketCatalogue(packed);assert.equal(decoded.length,assets.length);
for(let i=0;i<assets.length;i++){for(const key of ['assetId','ticker','name','region','mic','localSymbol','currency','instrumentType','listingId','isin'])assert.deepEqual(decoded[i][key],assets[i][key],`${assets[i].assetId} ${key}`);}
for(const s of report.sources)if(s.rowsOffered!==undefined&&s.status!=='unavailable'){assert.equal(s.rowsFetched,s.rowsOffered,s.id);assert.equal(s.rowsAccepted+s.rowsRejected+s.duplicates,s.rowsOffered,s.id);assert.ok(s.pages>0,s.id);assert.ok(s.completenessEvidence,s.id);}
console.log(JSON.stringify({records:assets.length,canonicalListings:listingIds.size,groups:groups.groups.length,localArtwork:artwork.summary,sourceStatuses:Object.fromEntries(report.sources.map(s=>[s.id,s.status]))},null,2));
