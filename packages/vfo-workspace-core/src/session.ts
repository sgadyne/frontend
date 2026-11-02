import type {SessionServices as ApplicationServices,JsonValue} from './model';
import {CommandApi} from './command-client';
import type {NativeInputs} from './vola-inputs';
import type {Asset,Draft,Filters,Intent,Page,Receipt,Surface,EnvironmentProfile,Provider,ProviderRoot,CutSelection} from './model';
type Snapshot={deployment:string;profiles:EnvironmentProfile[];scope:string;filters:Filters;asset:string|null;revision:string|null;expiryIndex?:number;page:Page|null;detail:Asset|null;surface:Surface|null;comparison:Surface|null;comparisonSource:string;draft:Draft|null;receipts:Receipt[];loading:Record<string,boolean>;errors:Record<string,string>;epoch:number;};
const defaultFilters:Filters={q:'',source:'',group:'',sort:'ticker',direction:'asc',offset:0,limit:25};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export class VfoSession {
 private state:Snapshot;private listeners=new Set<()=>void>();private controllers=new Map<string,AbortController>();private disposed=false;private scopeToken='';
 constructor(private services:ApplicationServices,initial:JsonValue,private readonly source:ProviderRoot){
  const saved=object(initial),filters=object(saved.filters);
  const restored={...defaultFilters};for(const key of ['q','source','group'] as const)if(typeof filters[key]==='string')restored[key]=(filters[key] as string).slice(0,key==='group'?128:64);
  if(['ticker','asset','source'].includes(String(filters.sort)))restored.sort=String(filters.sort);if(filters.direction==='desc')restored.direction='desc';
  this.state={deployment:typeof saved.deployment==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(saved.deployment)?saved.deployment:'',scope:'',profiles:[],filters:restored,asset:typeof saved.asset==='string'&&/^(EQUITY|FUTURES):[A-Z0-9@_.-]{1,32}$/.test(saved.asset)?saved.asset:null,revision:typeof saved.revision==='string'&&/^[0-9a-f]{64}$/.test(saved.revision)?saved.revision:null,page:null,detail:null,surface:null,comparison:null,comparisonSource:'eod',draft:null,receipts:[],loading:{},errors:{},epoch:0};
  const profileProvider=this.source;
  if(profileProvider?.profiles)void profileProvider.profiles(services.signal).then(value=>{this.change({profiles:value.profiles,deployment:value.profiles.some(p=>p.id===this.state.deployment)?this.state.deployment:value.defaultEnvironment});if(this.state.scope&&this.available()){void this.loadList();if(this.state.asset)void this.loadSelected();}}).catch(e=>{if(!services.signal.aborted)this.change({profiles:[],errors:{profiles:e instanceof Error?e.message:'Environment profiles unavailable'}})});
  services.signal.addEventListener('abort',()=>this.dispose(),{once:true});
  this.state.expiryIndex=typeof saved.expiryIndex==='number'&&Number.isInteger(saved.expiryIndex)&&saved.expiryIndex>=0&&saved.expiryIndex<128?saved.expiryIndex:0;
 }
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>this.listeners.delete(fn)};
 getSnapshot=()=>this.state;
 private change(p:Partial<Snapshot>){if(this.disposed)return;this.state={...this.state,...p};for(const fn of this.listeners)fn();}
 serialize():JsonValue{return {deployment:this.state.deployment,asset:this.state.asset,revision:this.state.revision,expiryIndex:this.state.expiryIndex??0,filters:{...this.state.filters},schema:1};}
 setExpiry(expiryIndex:number){this.change({expiryIndex});}
 dispose(){this.disposed=true;for(const c of this.controllers.values())c.abort();this.controllers.clear();this.listeners.clear();}
 bindScope(scope:string,token:string){if(this.scopeToken===token)return;const hadScope=Boolean(this.scopeToken);this.scopeToken=token;this.cancel();this.change({scope,...(hadScope?{asset:null,revision:null}:{}),page:null,detail:null,surface:null,comparison:null,draft:null,receipts:[],errors:{},loading:{},epoch:this.state.epoch+1});if(this.available()){void this.loadList();if(this.state.asset)void this.loadSelected();}}
 private cancel(){for(const c of this.controllers.values())c.abort();this.controllers.clear();}
 setDeployment(deployment:string){if(deployment===this.state.deployment)return;this.cancel();this.change({deployment,asset:null,revision:null,page:null,detail:null,surface:null,comparison:null,draft:null,receipts:[],errors:{},loading:{},epoch:this.state.epoch+1});if(this.available())void this.loadList();}
 async run<T>(channel:string,call:(signal:AbortSignal)=>Promise<T>,accept:(value:T)=>void){
  if(this.disposed||!this.available()||!this.state.scope)return;
  this.controllers.get(channel)?.abort();const controller=new AbortController();this.controllers.set(channel,controller);const epoch=this.state.epoch;
  this.change({loading:{...this.state.loading,[channel]:true},errors:{...this.state.errors,[channel]:''}});
  try{const value=await call(controller.signal);if(!controller.signal.aborted&&epoch===this.state.epoch)accept(value);}
  catch(e){if(!controller.signal.aborted&&epoch===this.state.epoch)this.change({errors:{...this.state.errors,[channel]:e instanceof Error?e.message:'Unavailable'}});}
  finally{if(this.controllers.get(channel)===controller&&epoch===this.state.epoch){this.controllers.delete(channel);this.change({loading:{...this.state.loading,[channel]:false}});}}
 }
 commands=new CommandApi(<T>(path:string,signal:AbortSignal,body?:unknown,key?:string)=>(this.provider() as unknown as {command:<T>(path:string,signal:AbortSignal,body?:unknown,key?:string)=>Promise<T>}).command<T>(path,signal,body,key),(args,signal)=>this.provider().list(args,signal));
 readVolaInputs(asset:string,revision:string,expiryIndex:number,cursor:number,signal:AbortSignal,strike?:number,cut?:CutSelection):Promise<NativeInputs>{return this.provider().volaInputs(asset,revision,expiryIndex,cursor,signal,strike,cut);}
 private available(){return this.state.profiles.some(p=>p.id===this.state.deployment&&p.available)}
 getProvider():Provider{return this.source.forEnvironment(this.state.deployment);}
 private provider(){return this.getProvider();}
 filter(patch:Partial<Filters>){this.change({filters:{...this.state.filters,...patch,offset:patch.offset??0},page:null});void this.loadList();}
 loadList(){return this.run('list',s=>this.provider().list(this.state.filters,s),page=>this.change({page}));}
 select(asset:string|null,revision:string|null=null){if(asset===this.state.asset&&revision===this.state.revision)return;for(const k of ['surface','detail','draft','compare','receipts','custom'])this.controllers.get(k)?.abort();this.change({asset,revision,surface:null,detail:null,comparison:null,draft:null,receipts:[],errors:{...this.state.errors,surface:'',detail:'',draft:'',compare:'',custom:''}});if(asset)void this.loadSelected();}
 private loadSelected(){const a=this.state.asset;if(!a)return;void this.run('detail',s=>this.provider().detail(a,s),v=>this.change({detail:v.items[0]??null}));void this.loadSurface();void this.reloadDraft();}
 loadSurface(latest=false){const a=this.state.asset;if(!a)return;const revision=latest?null:this.state.revision;this.change({comparison:null});return this.run('surface',s=>this.provider().surface(a,'live',revision,s),surface=>this.change({surface,revision:surface.revision,expiryIndex:surface.expiries.some(e=>e.listed_index===this.state.expiryIndex)?this.state.expiryIndex:(surface.evaluation.rows[0]?.listed_index??surface.expiries[0]?.listed_index??0)}));}
 compare(source:string){this.change({comparisonSource:source,comparison:null});const a=this.state.asset;if(!a)return;return this.run('compare',s=>this.provider().surface(a,source,null,s),comparison=>this.change({comparison}));}
 reloadDraft(){const a=this.state.asset;if(!a)return;void this.run('draft',s=>this.provider().draft(a,this.state.scope,s),v=>this.change({draft:v.draft}));void this.run('receipts',s=>this.provider().receipts(a,this.state.scope,s),v=>this.change({receipts:v.items}));}
 async custom(action:'save'|'preview'|'push',intent?:Intent,key?:string){const a=this.state.asset;if(!a)return;const body={scope:this.state.scope,expected_revision:this.state.draft?.revision??0,...(intent?{value:intent}:{}),...(key?{idempotency_key:key}:{})};return this.run('custom',s=>this.provider().sandbox(a,action,body,s),v=>{if('draft'in v)this.change({draft:v.draft});else this.change({receipts:[v,...this.state.receipts.filter(r=>r.id!==v.id)]});});}
}
export const createApplication=(provider:ProviderRoot)=>({createSession(services:ApplicationServices,initial:JsonValue){return new VfoSession(services,initial,provider)}});
