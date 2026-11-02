// Qualify the independently installed apps in the real Sampo host. Uses a private copy of browser auth.
// This changes only the review browser's personal draft; it never Saves or submits a backend job.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {encodeLinkedAddress,validateLinkedResolution} from '@sampo/contracts';
import {createAppDescriptor} from '../examples/sampo-installed-apps/linked-descriptors.mjs';
const base=process.env.SAMPO_URL,storageState=process.env.SAMPO_STORAGE_STATE,workspace=process.env.SAMPO_WORKSPACE;
const release=process.env.SAMPO_VFO_RELEASE,instrumentId=process.env.SAMPO_INSTRUMENT_ID;
if(!base||!storageState||!workspace||!/^sha256:[a-f0-9]{64}$/.test(release??'')||!instrumentId)
 throw Error('Set SAMPO_URL, SAMPO_STORAGE_STATE, SAMPO_WORKSPACE, SAMPO_VFO_RELEASE (exact digest) and SAMPO_INSTRUMENT_ID (canonical catalogue ID).');
const output=resolve(process.env.REVIEW_DIR??'.review/app-links');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const context=await browser.newContext({storageState,viewport:{width:1500,height:1100}}),page=await context.newPage();
page.setDefaultTimeout(15000);
const checks=[],errors=[],requests=[],limitations=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{const url=new URL(request.url());if(url.origin===new URL(base).origin)requests.push({path:url.pathname,method:request.method()});});
const descriptor=createAppDescriptor('vfo'),entry={publisherId:descriptor.publisherId,applicationId:descriptor.applicationId,entryId:'vfo'};
const instrumentRoute=descriptor.routes.find(route=>route.id==='vfo.instrument');
const address={kind:'app-route',entry,routeId:instrumentRoute.id,selection:{instrumentId,view:'universe'},version:{kind:'exact',release,contributionId:instrumentRoute.contributionId}};
const hostUrl=(address,route=instrumentRoute)=>base+'/workspaces/'+encodeURIComponent(workspace)+'?section=library'+encodeLinkedAddress(address,route);
const apiPath=path=>base+path+(path.includes('?')?'&':'?')+'workspaceId='+encodeURIComponent(workspace);
let csrfToken;
async function request(path,body,ctx=context){
 const response=await ctx.request.post(apiPath(path),{headers:{Origin:new URL(base).origin,'X-Sampo-CSRF':csrfToken??''},data:body});
 assert.equal(response.status(),200,'Linked API request must succeed');return response.json();
}
const assertResolved=value=>{validateLinkedResolution(value);assert.equal(value.status,'resolved');assert.equal(value.exactAddress.version.release,release);return value;};
const screenshot=async name=>page.screenshot({animations:'disabled',path:output+'/'+name+'.png'});
try{
 const authResponse=await context.request.get(base+'/api/auth/session');assert.equal(authResponse.status(),200,'Review session must be authenticated');
 const auth=await authResponse.json();csrfToken=auth.csrfToken;
 for(const [routeId,selection] of [['vfo',{}],['vfo.universe',{view:'universe'}],['vfo.live',{view:'live'}],['vfo.history',{view:'history'}],['vfo.instrument',address.selection]])
  assertResolved(await request('/api/linked-workspace/resolve',{address:{...address,routeId,selection}}));
 checks.push('all five routes resolve to the explicitly requested exact VFO release');
 const missing={...address,version:{...address.version,release:'sha256:'+'0'.repeat(64)}};
 assert.deepEqual(await request('/api/linked-workspace/resolve',{address:missing}),{status:'unavailable'});
 checks.push('missing exact release returns non-disclosing unavailable and never selects a newer release');
 const related=await request('/api/linked-workspace/related',{address,limit:100});
 assert.ok(related.items.some(item=>item.reference.id==='related-risk'));
 assert.ok(related.items.every(item=>item.provenance.kind==='declaration'));
 const cluster={kind:'published-entry',entry:{publisherId:'sampo.synthetic',applicationId:'example.cluster',entryId:'cluster'}};
 const linkless=await request('/api/linked-workspace/related',{address:cluster,limit:100});assert.deepEqual(linkless.items,[]);
 checks.push('authorized declared cross-app references are present; Cluster has no outgoing links');
 await page.goto(hostUrl(address));
 if(await page.getByRole('button',{name:'Use saved workspace',exact:true}).count())await page.getByRole('button',{name:'Use saved workspace',exact:true}).click();
 const current=page.locator('[data-linked-current]'),app=current.getByTestId('market-universe-workbench');await app.waitFor();
 await app.locator('.mu-inspector').waitFor();
 const search=app.getByRole('searchbox',{name:'Search market catalogue'});
 await search.fill('ASML');await search.focus();
 const scroll=await app.locator('.mu-main').evaluate(element=>{element.scrollTop=140;return element.scrollTop;});
 await screenshot('01-exact-instrument');
 // A declared metadata relation is meaningful without manufacturing a catalogue-to-portfolio join.
 const start=requests.length;
 await app.getByRole('button',{name:'Related analysis overview',exact:true}).click();
 await current.locator('.linked-entry-detail').waitFor();
 assert.match(await current.innerText(),/Risk Lens/);
 assert.equal(requests.slice(start).filter(request=>/\/assets\/.*\.(m?js)$/.test(request.path)).length,0,'Metadata navigation imports no app code');
 await screenshot('02-related-overview');
 await page.getByRole('button',{name:'← Back',exact:true}).first().click();
 await app.waitFor();assert.equal(await search.inputValue(),'ASML');await app.locator('.mu-inspector').waitFor();
 assert.equal(await app.locator('.mu-main').evaluate(element=>element.scrollTop),scroll);
 assert.equal(new URL(page.url()).hash,encodeLinkedAddress(address,instrumentRoute));
 checks.push('real VFO instrument -> declared Risk overview -> Back retains exact address, query, inspector and scroll');
 // Reload checks the browser history envelope retained by the actual host.
 await page.reload();await app.waitFor();assert.equal(await search.inputValue(),'ASML');await app.locator('.mu-inspector').waitFor();
 checks.push('reload restores the bounded widget state at the same exact instrument route');
 const peekButton=current.getByRole('button',{name:/^Peek .*vfo[. ]live$/i}).first();
 if(await peekButton.count()){
  await peekButton.click();const peek=page.getByRole('dialog').filter({has:page.locator('[data-linked-close]')});await peek.waitFor();
  await peek.getByTestId('market-universe-workbench').waitFor();assert.equal(await search.inputValue(),'ASML');
  await peek.getByRole('button',{name:'Add to draft',exact:true}).click();await peek.getByRole('status').filter({hasText:/Added exact contribution/}).waitFor();
  checks.push('Peek mounts the declared VFO route; Add creates only a personal draft placement');
  await peek.getByRole('button',{name:'Close peek',exact:true}).click();assert.equal(await search.inputValue(),'ASML');
  await peekButton.click();await peek.waitFor();await peek.getByRole('button',{name:'Open',exact:true}).click();await peek.waitFor({state:'hidden'});
  checks.push('closing sibling Peek preserves main state; Peek Open promotes the exact route');
 }else limitations.push('No host Peek action for a non-entry route was available; real Peek/Add/Open are not qualified by this run.');
 if(process.env.SAMPO_RESTRICTED_STORAGE_STATE){
  const restricted=await browser.newContext({storageState:process.env.SAMPO_RESTRICTED_STORAGE_STATE});
  const session=await restricted.request.get(base+'/api/auth/session');assert.equal(session.status(),200);const snapshot=await session.json();
  const response=await restricted.request.post(apiPath('/api/linked-workspace/resolve'),{headers:{Origin:new URL(base).origin,'X-Sampo-CSRF':snapshot.csrfToken},data:{address}});
  assert.equal(response.status(),200);assert.deepEqual(await response.json(),{status:'unavailable'});
  const names=await restricted.request.get(apiPath('/api/linked-workspace/library'));assert.equal(names.status(),200);
  assert.equal((await names.json()).items.some(item=>item.entry.entry.applicationId===entry.applicationId),false);
  checks.push('second review account cannot resolve or discover the protected exact app');await restricted.close();
 }else limitations.push('Second-account and live revocation acceptance requires caller-supplied restricted auth; not qualified by this run.');
 assert.deepEqual(errors,[]);await screenshot('03-journey');
 const sourceSha=execFileSync('git',['-C',resolve(import.meta.dirname,'..'),'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 await writeFile(output+'/receipt.json',JSON.stringify({passed:true,sourceSha,release,checks,limitations,screenshots:['01-exact-instrument.png','02-related-overview.png','03-journey.png']},null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length,limitations,evidence:output}));
}catch(error){
 await screenshot('failure').catch(()=>{});
 await writeFile(output+'/failure.json',JSON.stringify({passed:false,error:String(error),checks,errors,limitations},null,2)+'\n');throw error;
}finally{await browser.close();}
