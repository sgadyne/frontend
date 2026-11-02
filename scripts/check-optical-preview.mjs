
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='.review/optics';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1512,height:1050}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:5186');
await page.getByRole('navigation',{name:'Environment',exact:true}).getByRole('button',{name:'Settings',exact:true}).click();
await page.getByLabel('Theme preset',{exact:true}).selectOption('glass-mist');
const settings=page.locator('.demo-settings');
await settings.locator('[data-optical-ready=true]').waitFor({timeout:20000});
await page.waitForTimeout(600);
assert.equal(await settings.locator('.sampo-native-lens').count(),1);
await page.screenshot({path:out+'/settings-liquid.png'});
await settings.getByText('Effects & accessibility',{exact:true}).click();
await page.getByLabel('Transparency',{exact:true}).selectOption('reduced');
await settings.locator('.sampo-native-lens').waitFor({state:'detached'});
assert.equal(await settings.evaluate(el=>getComputedStyle(el).backdropFilter),'none');
await page.getByLabel('Transparency',{exact:true}).selectOption('standard');await settings.locator('[data-optical-ready=true]').waitFor();
await page.keyboard.press('Escape');await settings.waitFor({state:'hidden'});
await page.keyboard.press('Control+k');const search=page.locator('.demo-search-bubble');await search.locator('[data-optical-ready=true]').waitFor();await page.waitForTimeout(250);await page.screenshot({path:out+'/search-liquid.png'});
assert.equal(await page.locator('.sampo-native-lens').count(),1);
await page.keyboard.press('Escape');await search.waitFor({state:'hidden'});await page.locator('.sampo-native-lens').waitFor({state:'detached'});
await page.getByRole('navigation',{name:'Workspace apps',exact:true}).getByRole('button',{name:'VFO',exact:true}).click();
await page.getByRole('button',{name:/DEMO-US/}).first().click();await page.locator('[data-testid="surface-3d"][data-ready="true"]').waitFor();
await page.getByTestId('ticker-tearsheet').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
const lab=page.getByTestId('volatility-lab');assert.equal(await lab.evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');assert.equal(await lab.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
const scene=await page.locator('.vol-lab-scene').boundingBox(),bounds=await lab.boundingBox();assert.ok(Math.abs(scene.y-bounds.y)<1);assert.ok(Math.abs(scene.width-bounds.width)<1);
await page.screenshot({path:out+'/vfo-edge-to-edge.png'});
await page.getByRole('button',{name:'Slice explorer',exact:false}).click();await page.getByTestId('floating-slice-card').waitFor();await page.screenshot({path:out+'/vfo-slice.png'});
await page.setViewportSize({width:800,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
assert.deepEqual(errors,[]);await writeFile(out+'/receipt.json',JSON.stringify({errors,checks:['Actual Sampo backdrop lens attached','Reduced transparency releases renderer','Only active modal owns lens; closed modal releases it','VFO chart background transparent and edge-to-edge','Slice controls still accessible','800px no horizontal overflow']},null,2));console.log('Optics and VFO surface checks passed');
}finally{await browser.close()}
