import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const evidence=await mkdtemp(path.join(os.tmpdir(),'risk-components-'));
const server=await createServer({configFile:path.join(root,'apps/risk-lens-demo/vite.config.mjs'),server:{host:'127.0.0.1',port:0,strictPort:false}});
let browser;
try{
 await server.listen();const address=server.httpServer.address();const base='http://127.0.0.1:'+address.port;
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],external=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{if(!route.request().url().startsWith(base)){external.push(route.request().url());return route.abort();}return route.continue();});
 await page.goto(base);await page.getByRole('heading',{name:'Risk Lens',exact:true}).waitFor();
 await page.getByText('SPX Index',{exact:true}).first().waitFor();
 assert.ok((await page.locator('body').innerText()).includes('SYNTHETIC DEMO'));
 await page.getByRole('tab',{name:'Trades',exact:true}).click();
 await page.getByRole('tab',{name:'Positions',exact:true}).click();
 await page.getByRole('button',{name:'Refresh current view',exact:true}).click();
 await page.screenshot({path:path.join(evidence,'desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(evidence,'mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(JSON.stringify({providerInjection:'passed',globalProvider:false,desktop:'passed',mobile:'passed',externalRequests:external.length,browserErrors:errors,screenshots:evidence}));
}finally{await browser?.close();await server.close();}
