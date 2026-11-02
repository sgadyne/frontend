
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='.review/shell';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1512,height:1000}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const nav=name=>page.getByRole('navigation',{name:'Workspace apps',exact:true}).getByRole('button',{name,exact:true}).click();
try{
await page.goto('http://127.0.0.1:5186');await page.getByRole('heading',{name:'Analysis, connected.'}).waitFor();
for(const name of ['Library','Workspaces','Activity','Settings'])assert.equal(await page.getByRole('navigation',{name:'Environment',exact:true}).getByRole('button',{name:new RegExp('^'+name)}).count(),1);
for(const [preset,glass] of [['studio-porcelain',false],['industrial-slate',false],['glass-aurora',true]]){
 await page.getByLabel('Theme preset',{exact:true}).selectOption(preset);
 await page.getByRole('button',{name:'Search environment',exact:true}).focus();
 await page.keyboard.press('Control+k');const dialog=page.getByRole('dialog',{name:'Search your environment'});await dialog.waitFor();
 if(glass)await dialog.locator('[data-optical-ready=true]').waitFor();
 const decorated=await dialog.evaluate(el=>getComputedStyle(el).backdropFilter!=='none'||!!el.querySelector('[data-optical-ready=true]'));assert.equal(decorated,glass);
 assert.equal(await page.getByRole('combobox',{name:'Search apps and workspace'}).evaluate(el=>document.activeElement===el),true);
 await dialog.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
 await page.screenshot({path:out+'/'+preset+'-search.png'});
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await page.getByRole('button',{name:'Search environment',exact:true}).evaluate(el=>document.activeElement===el),true);
}
checks.push('Keyboard search, focus restore, matte/satin opaque and glass frosted');
await page.keyboard.press('Control+k');await page.getByRole('combobox',{name:'Search apps and workspace'}).fill('VFO');await page.keyboard.press('Enter');
await page.getByRole('button',{name:/DEMO-US/}).first().click();
const sheet=page.getByTestId('ticker-tearsheet');await sheet.waitFor();await page.locator('[data-testid="surface-3d"][data-ready="true"]').waitFor({timeout:30000});
const bounds=await sheet.boundingBox();assert.ok(bounds.width>=580&&bounds.width<=850);
assert.equal(await sheet.getByRole('tab',{name:'Surface',exact:true}).getAttribute('aria-selected'),'true');
assert.equal(await sheet.getByRole('tabpanel').count(),1);
await sheet.getByRole('tab',{name:'Analytics',exact:true}).click();assert.equal(await sheet.getByRole('tabpanel').count(),1);assert.equal(await sheet.locator('#ticker-analytics').isVisible(),true);
await page.keyboard.press('ArrowRight');assert.equal(await sheet.getByRole('tab',{name:'Custom VFO',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await sheet.locator('#ticker-custom').isVisible(),true);
await page.keyboard.press('Home');assert.equal(await sheet.getByRole('tab',{name:'Surface',exact:true}).getAttribute('aria-selected'),'true');
await page.screenshot({path:out+'/vfo-sheet.png'});
await sheet.getByRole('button',{name:'Prepare backfill',exact:false}).click();await sheet.waitFor({state:'hidden'});await page.getByRole('button',{name:'Coverage & backfills',exact:true}).waitFor();
checks.push('One right-half sheet, three accessible full views, keyboard cycling, backfill navigation');
await page.getByRole('navigation',{name:'Environment',exact:true}).getByRole('button',{name:'Workspaces',exact:true}).click();await page.getByRole('heading',{name:'Daily review'}).waitFor();
await page.getByRole('navigation',{name:'Environment',exact:true}).getByRole('button',{name:'Activity',exact:true}).click();await page.getByRole('heading',{name:'Activity',exact:true}).waitFor();
assert.deepEqual(errors,[]);await writeFile(out+'/receipt.json',JSON.stringify({checks,errors},null,2));console.log({checks,errors});
}finally{await browser.close()}
