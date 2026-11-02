import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const url=process.env.APPEARANCE_DEMO_URL??'http://127.0.0.1:5186';
const out=process.env.APPEARANCE_EVIDENCE_DIR??'.review/appearance';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1512,height:1050}}),errors=[],checks=[];let requests=0;
page.on('pageerror',e=>errors.push(e.message));page.on('request',()=>requests++);
await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
const nav=name=>page.getByRole('navigation',{name:'Workspace apps',exact:true}).getByRole('button',{name,exact:true}).click();
const preset=async id=>{await page.getByRole('navigation',{name:'Environment',exact:true}).getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Theme preset',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Close appearance settings',exact:true}).click();};
try{
 await page.goto(url);await page.getByRole('heading',{name:'Analysis, connected.'}).waitFor();
 await nav('Risk Lens');await page.getByRole('heading',{name:'Exposure rows',exact:true}).waitFor();
 await page.getByRole('row').filter({hasText:'SPX Index'}).first().click();await page.getByRole('heading',{name:'Exposure inspector',exact:true}).waitFor();
 await page.waitForTimeout(700);const beforeRisk=requests;
 await preset('glass-aurora');await page.waitForTimeout(700);assert.equal(requests,beforeRisk,'Appearance must not refetch Risk data');await page.getByRole('heading',{name:'Exposure inspector',exact:true}).waitFor();
 checks.push('Risk inspector retained; no requests on appearance change');
 await nav('Cluster');await page.getByRole('button',{name:'Run analysis',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.clusterAnalyses),0);
 await page.getByRole('button',{name:'Run analysis',exact:true}).click();await page.getByRole('heading',{name:'Cumulative performance',exact:true}).waitFor();
 for(const id of ['industrial-slate','industrial-graphite','studio-porcelain','studio-dusk','glass-mist','glass-aurora']){await preset(id);assert.equal(await page.evaluate(()=>window.clusterAnalyses),1);}
 checks.push('Cluster performs one explicit job; six theme changes submit none');
 await nav('Replication');await page.getByRole('heading',{name:'Detailed results',exact:true}).waitFor();await page.waitForTimeout(500);const reads=await page.evaluate(()=>window.fixtureReads);
 await preset('studio-porcelain');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.fixtureReads),reads);await page.getByRole('button',{name:'Collapse report catalogue',exact:true}).click();await page.getByRole('button',{name:'Expand report catalogue',exact:true}).waitFor();
 checks.push('Reports preserve result without rereading; catalogue collapses accessibly');
 await nav('VFO');await page.getByRole('button',{name:/DEMO-US/}).first().click();await page.locator('[data-testid="surface-3d"][data-ready="true"]').waitFor({timeout:30000});
 const plot=page.locator('[data-testid="surface-3d"]');await plot.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(500);
 const camera=await plot.evaluate(el=>JSON.stringify(el._fullLayout.scene.camera));const calls=await page.evaluate(()=>window.vfoDemoCalls);
 await preset('glass-aurora');await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>window.vfoDemoCalls),calls,'Appearance must not call VFO providers');assert.equal(await plot.evaluate(el=>JSON.stringify(el._fullLayout.scene.camera)),camera,'Camera must survive appearance change');
 checks.push('VFO camera retained; appearance update calls no provider methods');
 for(const [name,id] of [['Risk Lens','risk'],['VFO','vfo'],['Cluster','cluster'],['Replication','reports']]){
  await nav(name);for(const theme of ['industrial-slate','industrial-graphite','studio-porcelain','studio-dusk','glass-mist','glass-aurora']){
   await preset(theme);await page.waitForTimeout(150);assert.equal(await page.getByText('Destination unavailable',{exact:true}).count(),0);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);checks.push({app:id,theme,overflow});
   await page.screenshot({path:`${out}/${id}-${theme}.png`});
  }
 }
 await nav('Cluster');await nav('Replication');await page.goBack();await page.waitForTimeout(200);assert.equal(await page.locator('.workspace-view:not([hidden])').getAttribute('aria-label'),'Cluster');checks.push('Qualified link and browser back restore the prior app');
 await page.getByRole('navigation',{name:'Environment',exact:true}).getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Density',{exact:true}).selectOption('compact');await page.getByText('Effects & accessibility',{exact:true}).click();await page.getByLabel('Transparency',{exact:true}).selectOption('reduced');await page.getByLabel('Motion',{exact:true}).selectOption('reduced');await page.keyboard.press('Escape');assert.equal(await page.locator('.demo-settings').isVisible(),false);
 await page.setViewportSize({width:800,height:1000});for(const name of ['Risk Lens','VFO','Cluster','Replication']){await nav(name);await page.waitForTimeout(150);checks.push({app:name,width:800,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});await page.screenshot({path:`${out}/narrow-${name.replaceAll(' ','-')}.png`});}
 assert.deepEqual(errors,[]);await writeFile(out+'/receipt.json',JSON.stringify({errors,checks},null,2));console.log(JSON.stringify({errors,checks},null,2));
}finally{await browser.close()}
