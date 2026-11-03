import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const catalog=JSON.parse(await readFile(new URL('../../../assets/market-universe/catalog.json',import.meta.url),'utf8'));
const groups=JSON.parse(await readFile(new URL('../../../assets/market-universe/groups.json',import.meta.url),'utf8'));
const total=new RegExp(catalog.assets.length.toLocaleString('en-US'));
const europe=new RegExp(groups.groups.find(g=>g.id==='region:Europe').assetIds.length.toLocaleString('en-US'));
const output=resolve(process.env.REVIEW_DIR??'.review/universe-workbench');await mkdir(output,{recursive:true});
const server=await createServer({configFile:false,esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0},appType:'mpa'});await server.listen();
let browser;const errors=[],checks=[];
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1500,height:1050},acceptDownloads:true});page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(server.resolvedUrls.local[0]+'packages/vfo-workspace-core/tests/synthetic-universe-workbench.html');
 const app=page.getByTestId('market-universe-workbench'),search=app.getByRole('searchbox');await app.waitFor();
 const reset=()=>page.getByRole('button',{name:'Reset fixture',exact:true}).click();
 const restore=()=>page.getByRole('button',{name:'Restore instrument',exact:true}).click();
 const nav=app.getByRole('complementary',{name:'Market navigation'});
 assert.match(await app.locator('.mu-results-heading').innerText(),total);
 await nav.getByRole('button',{name:/^Europe /}).click();assert.match(await app.locator('.mu-results-heading').innerText(),europe);
 await search.fill('ASML');await app.locator('.mu-instrument').filter({hasText:'ASML-NA'}).click();
 await app.getByRole('button',{name:'Surface',exact:true}).click();await app.getByRole('heading',{name:'No surface bound'}).waitFor();
 assert.match(await app.locator('.mu-related').innerText(),/EQUITY:ASML-NA/);await page.keyboard.press('Escape');assert.equal(await app.locator('.mu-inspector').count(),0);
 assert.match(await page.locator(':focus').innerText(),/ASML/);checks.push('catalogue lookup, real renderer unavailable state, related slot and Escape focus');
 await reset();await page.getByLabel('Fixture evidence').selectOption('none');assert.match(await app.locator('.mu-results-heading').innerText(),total);
 assert.match(await app.locator('tbody').innerText(),/Not connected/);checks.push('all static identities survive absent data');
 await page.getByLabel('Fixture evidence').selectOption('multi');await restore();
 await app.locator('.mu-inspector').waitFor();assert.match(await app.locator('.mu-interval-list').innerText(),/volatility-surfaces/);
 await page.keyboard.press('Escape');assert.equal(await app.locator('tbody button.mu-cell.gap').count(),1);
 await app.getByLabel('Coverage data product').selectOption('quotes');assert.equal(await app.locator('tbody button.mu-cell.failed').count(),13);
 assert.equal(await app.locator('tbody button.mu-cell.gap').count(),0);
 await app.getByLabel('Coverage source',{exact:true}).selectOption('demo-other');assert.equal(await app.locator('tbody button.mu-cell.gap').count(),13);
 await app.getByRole('button',{name:/^Prepare backfill/}).click();const dialog=page.getByRole('dialog',{name:'Prepare backfill draft'});await dialog.waitFor();
 await dialog.getByRole('radio',{name:/Confirmed gaps only/}).check();await dialog.getByRole('button',{name:'Review draft →',exact:true}).click();
 assert.match(await dialog.getByRole('region',{name:'Reviewed draft'}).innerText(),/1 ranges prepared/);
 const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Export JSON ↓',exact:true}).click();
 const file=await download,draft=JSON.parse(await readFile(await file.path(),'utf8'));
 assert.equal(draft.source,'demo-other');assert.equal(draft.dataset,'quotes');assert.equal(draft.execution,'not-submitted');assert.equal(draft.evidenceAsOf,'2026-11-02T14:00:00Z');
 await dialog.getByLabel('Draft source',{exact:true}).fill('demo-archive');await dialog.getByRole('button',{name:'Review draft →',exact:true}).click();
 assert.match(await dialog.getByRole('region',{name:'Reviewed draft'}).innerText(),/0 ranges prepared/);assert.equal(await dialog.getByRole('button',{name:'Export JSON ↓',exact:true}).isDisabled(),true);
 await page.screenshot({path:output+'/product-specific-draft.png',animations:'disabled'});await page.keyboard.press('Escape');checks.push('source/product-specific matrix, confirmed-gap exclusion and review-only provenance JSON');
 await page.getByLabel('Fixture evidence').selectOption('malformed');await restore();await page.keyboard.press('Escape');await app.getByText(/evidence validation issues/).waitFor();
 assert.equal(await app.locator('tbody button.mu-cell.gap').count(),0);await app.getByRole('button',{name:'Live coverage',exact:true}).click();assert.match(await app.locator('tbody').innerText(),/Unknown/);checks.push('malformed intervals/status/timestamps render honest unknown without page errors');
 await page.getByLabel('Fixture evidence').selectOption('demo');await reset();await app.getByRole('checkbox',{name:'Select visible instruments'}).check();
 await nav.getByRole('button',{name:/^Europe /}).click();assert.match(await app.locator('.mu-results-heading').innerText(),/30 selected/);await app.getByRole('button',{name:'Clear',exact:true}).click();
 assert.equal((JSON.parse(await page.getByTestId('fixture-state').textContent())).selected.length,0);await app.getByRole('button',{name:'Reset filters',exact:true}).click();
 assert.match(await app.locator('.mu-results-heading').innerText(),total);checks.push('selection survives filters, clear and full reset');
 await restore();await page.keyboard.press('Escape');await app.getByLabel('Coverage end').fill('2026-08-03');await app.getByRole('alert').waitFor();
 await app.getByLabel('Coverage end').fill('2026-11-02');await app.getByLabel('Coverage start').fill('2020-01-01');
 const labels=await app.locator('tbody button.mu-cell').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));assert.match(labels.at(-1),/to 2026-11-02/);checks.push('full-window buckets and invalid range feedback');
 await restore();
 for(const mode of ['light','dark'])for(const material of ['matte','satin','glass']){
  await page.getByLabel('Fixture mode').selectOption(mode);await page.getByLabel('Fixture material').selectOption(material);
  assert.equal(await app.locator('.mu-inspector').evaluate(e=>getComputedStyle(e).backdropFilter==='none'),material!=='glass');
  await page.screenshot({path:output+'/'+mode+'-'+material+'.png',animations:'disabled'});
 }
 await page.getByLabel('Fixture reduced effects').check();assert.equal(await app.locator('.mu-inspector').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
 assert.equal(await app.locator('.mu-inspector').evaluate(e=>getComputedStyle(e).animationName),'none');checks.push('light/dark materials, host reduced motion and reduced transparency');
 await page.getByLabel('Fixture reduced effects').uncheck();await page.emulateMedia({reducedMotion:'reduce'});
 await page.keyboard.press('Escape');await app.locator('.mu-instrument').first().click();assert.equal(await app.locator('.mu-inspector').evaluate(e=>getComputedStyle(e).animationName),'none');
 for(const width of [900,600,390]){
  await page.setViewportSize({width,height:900});await page.screenshot({path:output+'/width-'+width+'.png',animations:'disabled'});
  assert.equal(await app.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'No outer overflow at '+width);
  assert.equal(await app.locator('.mu-inspector').evaluate(e=>e.getBoundingClientRect().left>=0&&e.getBoundingClientRect().right<=innerWidth),true);
  await page.keyboard.press('Escape');assert.equal(await app.getByLabel('Market group').isVisible(),true);await app.locator('.mu-instrument').first().click();
 }
 checks.push('900/600/390px layout, compact group navigation and OS reduced motion');
 const scopePage=await browser.newPage({viewport:{width:900,height:800}});
 await scopePage.setContent('<div id="host" class="frontend-presentation analysis-workspace"><button class="mu-primary ui-button">Host</button><aside class="mu-inspector">Host inspector</aside></div><div id="fixture" class="frontend-presentation" data-material="glass" style="--sampo-panel:#fff;--sampo-ink:#123;--sampo-canvas:#eee;--sampo-line:#aaa;--sampo-muted:#456;--sampo-accent:#267"><div class="sampo-analysis-fixture"><main class="mu-workbench"><aside class="mu-inspector"><div class="mu-inspector-body">Fixture</div></aside></main></div></div>');
 const sentinel=()=>scopePage.locator('#host,#host button,#host aside').evaluateAll(nodes=>nodes.map(e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor,s.position,s.display,s.height,s.padding,s.borderWidth,s.fontSize,s.backdropFilter,s.animationName];}));
 const before=await sentinel();
 for(const appName of ['risk','vfo','cluster','replication']){
  const css=await readFile(new URL('../../../examples/sampo-installed-apps/dist-'+appName+'/assets/style.css',import.meta.url),'utf8');
  await scopePage.addStyleTag({content:css});
  assert.deepEqual(await sentinel(),before,appName+' CSS must not alter host controls or presentation root');
 }
 assert.notEqual(await scopePage.locator('#fixture .mu-inspector').evaluate(e=>getComputedStyle(e).backdropFilter),'none','Scoped CSS preserves material ancestors outside the app root');
 assert.equal(await scopePage.locator('#fixture').evaluate(e=>getComputedStyle(e).color),'rgb(17, 34, 51)','Scoped CSS applies to the outer appearance provider');
 await scopePage.locator('#fixture').evaluate(e=>e.dataset.reducedTransparency='true');
 assert.equal(await scopePage.locator('#fixture .mu-inspector').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
 await scopePage.close();checks.push('all four built CSS artifacts preserve host controls, outer provider and reduced/material ancestry');
 assert.deepEqual(errors,[]);await writeFile(output+'/receipt.json',JSON.stringify({status:'passed',checks,errors,draft},null,2));console.log(JSON.stringify({status:'passed',checks,errors}));
}catch(error){throw error;}finally{await browser?.close();await server.close();}
