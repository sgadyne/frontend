import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {reports} from './fixtures/reports.ts';

const root = path.dirname(fileURLToPath(import.meta.url)), output = await mkdtemp(path.join(tmpdir(), 'replication-ui-'));
await build({entryPoints: [path.join(root, 'browser/replication.tsx')], bundle: true, format: 'esm', jsx: 'automatic', outdir: output});
const server = createServer(async (req,res) => {
  if (req.url === '/') {res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/replication.css"></head><body><div id="root"></div><script type="module" src="/replication.js"></script></body></html>'); return;}
  const name = req.url?.split('?')[0].slice(1);
  if (!['replication.js','replication.css'].includes(name)) {res.writeHead(404).end(); return;}
  res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(path.join(output,name)));
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({headless:true}), errors = [], external = [];
try {
  const page = await browser.newPage({viewport:{width:1600,height:1100}});
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*',route => {const url = new URL(route.request().url()); if (url.hostname !== '127.0.0.1') {external.push(url.origin);return route.abort();} return route.continue();});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('heading',{name:'Detailed results',exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'replication-comparison.png')});
  const before = await page.evaluate(() => window.fixtureReads);
  await page.getByRole('searchbox',{name:'Search Detailed results'}).fill('Strategy 229');
  assert.equal(await page.locator('.rep-grid tbody tr').count(),1);
  assert.ok((await page.locator('.rep-grid tbody').innerText()).includes('9007199254740993'));
  await page.getByRole('button',{name:'Inspect row 1',exact:true}).click();
  await page.getByRole('dialog',{name:'Detailed results',exact:true}).waitFor();
  await page.getByRole('button',{name:'Close Detailed results',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search Detailed results'}).fill('');
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  assert.equal(await page.locator('.rep-grid tbody tr').count(),30);
  assert.equal(await page.evaluate(() => window.fixtureReads),before,'Presentation actions must not reload source data');
  await page.getByRole('button',{name:'Save view',exact:true}).click();
  await page.getByLabel('View name',{exact:true}).fill('Morning review');
  await page.getByRole('dialog',{name:'Save this view'}).getByRole('button',{name:'Save view',exact:true}).click();
  assert.equal(await page.getByRole('option',{name:'Morning review \u00b7 '+reports[0].title,exact:true}).count(),1);
  for (const report of reports) {
    await page.getByRole('button',{name:'Find a report',exact:false}).click();
    await page.getByRole('searchbox',{name:'Find a report',exact:true}).fill(report.title);
    const modal = page.getByRole('dialog',{name:'Find a report',exact:true});
    await modal.getByRole('button').filter({has:page.getByText(report.title,{exact:true})}).click();
    await page.locator('.rep-basis').waitFor();
    assert.equal(await page.locator('.rep-title h1').innerText(),report.title);
    for (const view of report.views.slice(1)) {
      await page.getByRole('navigation',{name:report.title+' views',exact:true}).getByRole('button',{name:view.label,exact:true}).click();
      await page.locator('.rep-basis').waitFor();
    }
  }
  await page.getByRole('button',{name:'Find a report',exact:false}).click();
  await page.getByRole('searchbox',{name:'Find a report',exact:true}).fill(reports[15].title);
  await page.getByRole('dialog',{name:'Find a report'}).getByRole('button').filter({has:page.getByText(reports[15].title,{exact:true})}).click();
  await page.getByRole('button',{name:'Vega',exact:true}).click();
  await page.getByRole('heading',{name:'Rates vega',exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'replication-rates.png')});
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await page.locator('.rep-hierarchy summary').click();
  await page.getByRole('searchbox',{name:'Search Books / strategies'}).fill('FX');
  await page.getByRole('checkbox',{name:'FX',exact:true}).check();
  const unchanged = await page.evaluate(() => window.fixtureReads);
  await page.getByRole('button',{name:'Apply filters',exact:false}).click();
  await page.locator('.rep-basis').waitFor();
  assert.equal(await page.evaluate(() => window.fixtureReads),unchanged+1);
  await page.getByRole('button',{name:'Close filters',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,'replication-mobile.png')});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),true,'No mobile horizontal overflow');
  await page.evaluate(() => window.switchFixtureEnvironment());
  await page.locator('.rep-basis').waitFor();
  assert.equal(await page.getByRole('option',{name:'Morning review \u00b7 '+reports[0].title,exact:true}).count(),0,'Saved selections must not cross account scope');
  assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
  console.log(JSON.stringify({reportRoutes:reports.length,desktop:'passed',mobile:'passed',savedViews:'passed',scopeIsolation:'passed',tableInspectionSearchPagination:'passed',explicitApply:'passed',externalRequests:external.length,screenshots:output,browserErrors:errors}));
} finally {await browser.close();await new Promise(resolve => server.close(resolve));}
