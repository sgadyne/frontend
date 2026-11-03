import {build} from 'vite';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url)),output=resolve(process.env.REVIEW_DIR??'.review/market-scale'),dist=resolve(output,'mounted-build');
await mkdir(output,{recursive:true});
const catalog=JSON.parse(await readFile(resolve(root,'assets/market-universe/catalog.json'),'utf8'));
const payload=JSON.parse(await readFile(resolve(root,'assets/market-universe/payload-report.json'),'utf8'));
assert.ok(catalog.assets.length>50000);
await build({configFile:false,root,base:'./',esbuild:{jsx:'automatic'},build:{outDir:dist,emptyOutDir:true,target:'es2022',rollupOptions:{input:[resolve(root,'packages/vfo-workspace-core/tests/synthetic-universe-workbench.html'),resolve(root,'packages/vfo-workspace-core/tests/synthetic-instrument-badges.html')]}}});
const prefix='/oci/reference-release/mounted-package/';
const types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html','.json':'application/json'};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(!pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}const path=resolve(dist,decodeURIComponent(pathname.slice(prefix.length)));if(!path.startsWith(dist+'/'))throw Error('Invalid path');const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
let browser;const errors=[],badResponses=[],imageRequests=new Set(),external=[],searchTimings=[],checks=[];
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1500,height:1050}});page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('missing-synthetic'))badResponses.push({url:r.url(),status:r.status()});});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin){external.push(url.href);return route.abort();}if(route.request().resourceType()==='image')imageRequests.add(url.pathname);return route.continue();});
 const url=origin+prefix+'packages/vfo-workspace-core/tests/synthetic-universe-workbench.html';
 const start=Date.now();await page.goto(url);const app=page.getByTestId('market-universe-workbench');await app.waitFor();const initialRenderMs=Date.now()-start;
 const heading=app.locator('.mu-results-heading'),search=app.getByRole('searchbox');assert.match(await heading.innerText(),new RegExp(catalog.assets.length.toLocaleString('en-US')));assert.equal(await app.locator('tbody tr').count(),30);assert.ok(imageRequests.size<=80);
 await page.getByLabel('Fixture evidence').selectOption('none');assert.match(await heading.innerText(),new RegExp(catalog.assets.length.toLocaleString('en-US')));assert.match(await app.locator('tbody').innerText(),/Not connected/);checks.push('entire real static inventory renders disconnected, 30-row bound');
 for(const mic of ['XNAS','XPAR','XHKG','XTKS','XSHG','XSHE','XNSE','XBOM','XSES','XSWX','XMAD','XTAI','ROCO','XASX']){
  const target=catalog.assets.findLast(a=>a.mic===mic&&a.localSymbol?.length>=4&&a.assetId.startsWith('LISTING:'));assert.ok(target,mic);
  const started=Date.now();await search.fill(target.assetId);await app.locator('.mu-instrument').filter({hasText:target.ticker}).first().waitFor();
  const elapsed=Date.now()-started;searchTimings.push({mic,assetId:target.assetId,ms:elapsed});assert.ok(elapsed<5000,mic+' lookup');assert.ok(await app.locator('tbody tr').count()<=30);
 }
 checks.push('new records searchable across all 14 checked regional venues without data');
 for(const [id,expected]of [['EQUITY:EWH','flag-hk.svg'],['EQUITY:SPY','spy.svg'],['EQUITY:XLK','xlk-ticker-tile.svg'],['FUTURES:@GC','product-metal-gold.svg']]){
  await search.fill(id);const row=app.locator('.mu-instrument').filter({hasText:catalog.assets.find(a=>a.assetId===id).ticker}).first();await row.waitFor();const img=row.locator('img');await img.waitFor();await img.evaluate(i=>i.complete?Promise.resolve():new Promise(done=>{i.onload=done;i.onerror=done;}));assert.ok(await img.evaluate(i=>i.naturalWidth>0));assert.ok((await img.getAttribute('src')).includes(expected.replace('.svg','')));
 }
 await page.screenshot({path:resolve(output,'gold-product-icon.png'),animations:'disabled'});checks.push('EWH exposure, SPY mark, labelled XLK tile and verified futures product image load below nested package mount');
 await search.fill('');await app.getByRole('button',{name:'History & backfills',exact:true}).click();assert.equal(await app.locator('tbody tr').count(),18);assert.ok(await app.locator('tbody .mu-cell').count()<=18*52);checks.push('history uses 18 visible rows and bounded window cells');
 await page.goto(origin+prefix+'packages/vfo-workspace-core/tests/synthetic-instrument-badges.html');const badge=page.locator('.market-asset-badge');await badge.locator('img').waitFor();await page.getByRole('button',{name:'Fail image',exact:true}).click();await badge.locator('span').waitFor();assert.equal(await badge.innerText(),'TE');await page.getByRole('button',{name:'Recover image',exact:true}).click();await badge.locator('img').waitFor();assert.ok(await badge.locator('img').evaluate(i=>i.complete?i.naturalWidth>0:new Promise(done=>{i.onload=()=>done(i.naturalWidth>0);})));await page.getByRole('button',{name:'Unsafe external image',exact:true}).click();assert.equal(await badge.innerText(),'1');assert.equal(await badge.locator('img').count(),0);checks.push('failed image falls back, resets after source change, external URL is excluded and numeric monogram retains useful digits');
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(external,[]);assert.ok(initialRenderMs<15000);
 const receipt={status:'passed',sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),records:catalog.assets.length,payload,initialRenderMs,searchTimings,maxSearchMs:Math.max(...searchTimings.map(s=>s.ms)),localImageRequests:imageRequests.size,mountPrefix:prefix,checks,errors,badResponses,external,environment:'Headless Chromium on devbox; production Vite fixture below nested OCI-like path. Not a live-pilot qualification.'};await writeFile(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
