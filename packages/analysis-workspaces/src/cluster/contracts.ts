import type {JsonValue} from '@sampo/contracts';
import {object, parseProjection, type Projection, type NodeOption} from '../contracts.ts';

export const views = [
  {id:'performance',label:'Performance',icon:'chart'}, {id:'risk',label:'Risk',icon:'layers'},
  {id:'factors',label:'Factors',icon:'branches'}, {id:'relationships',label:'Relationships',icon:'pulse'},
  {id:'events',label:'Events & tails',icon:'calendar'}, {id:'pca',label:'PCA',icon:'grid'},
  {id:'positions',label:'Positions',icon:'table'}, {id:'construction',label:'Construction',icon:'sliders'},
] as const;
export type View = typeof views[number]['id'];
export interface AnalyticsOptions {
  risk_horizon:number; risk_window:number; rolling_window:number; sharpe_window:number;
  factor_horizon:number; factor_sampling:'overlapping'|'non-overlapping'; factor_track:'as-published'|'levels'|'returns'; factor_window:number;
  relationship_x:string; relationship_y:string; relationship_window:number; relationship_rolling:number;
  pca_mode:'covariance'|'correlation'; pca_window:number; pca_components:number;
  event_ids:string[]; event_window:number; tail_window:number; tail_count:number; tail_overlaps:boolean; custom_events:[string,string,string][];
}
export const defaultAnalytics = ():AnalyticsOptions => ({risk_horizon:1,risk_window:252,rolling_window:21,sharpe_window:42,
  factor_horizon:1,factor_sampling:'overlapping',factor_track:'as-published',factor_window:252,
  relationship_x:'',relationship_y:'_total',relationship_window:252,relationship_rolling:21,
  pca_mode:'covariance',pca_window:252,pca_components:3,event_ids:[],event_window:0,tail_window:10,tail_count:5,tail_overlaps:false,custom_events:[]});
export interface AnalysisSpec {
  snapshotId:string; hierarchy:string; nodeIds:string[]; lookbackDays:number; normalization:string;
  factorIds:string[]; multipliers:{nodeId:string;value:number}[]; assetHedges:{assetId:string;quantity:number;quantityUnit:string}[];
  startDate:string; endDate:string; groupDepth:number; analytics:AnalyticsOptions;viewId:View;
}
export interface Snapshot {id:string;label:string;date:string;portfolioId:string;currency:string;pnlKind:string;hierarchies:string[];}
export interface Catalogue {schemaVersion:2;portfolios:{id:string;label:string}[];snapshots:Snapshot[];}
export interface SnapshotDetail {
  schemaVersion:2;snapshotId:string;hierarchy:string;nodes:NodeOption[];
  factors:{id:string;label:string;tracks:string[]}[];events:{id:string;label:string}[];
  hedges:{id:string;label:string;quantityUnit:string}[];capabilities:{aum:boolean;positions:boolean;events:boolean;factors:boolean;hedges:boolean};
}
export interface ClusterResult extends Projection {snapshotId:string;selection:AnalysisSpec;analysisOptions:AnalyticsOptions;}
export interface SavedAnalysis {id:string;name:string;spec:AnalysisSpec;}
const text = (v:unknown):v is string => typeof v === 'string';
const strings = (v:unknown):v is string[] => Array.isArray(v)&&v.every(text)&&new Set(v).size===v.length;
const integer = (v:unknown,min=1):v is number => typeof v==='number'&&Number.isSafeInteger(v)&&v>=min;
const date = (v:unknown):v is string => text(v)&&(v===''||/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export function parseAnalytics(value:unknown):AnalyticsOptions {
  if(!object(value)) throw Error('Invalid analytical settings.');
  const defaults=defaultAnalytics();
  if(Object.keys(value).some(k=>!(k in defaults))) throw Error('Unknown analytical setting.');
  const out={...defaults,...value};
  for(const [key,v] of Object.entries(out)) if(typeof defaults[key as keyof AnalyticsOptions]==='number'&&!integer(v,key==='event_window'?0:1)) throw Error('Invalid '+key.replaceAll('_',' ')+'.');
  if(!['overlapping','non-overlapping'].includes(out.factor_sampling)||!['as-published','levels','returns'].includes(out.factor_track)||!['covariance','correlation'].includes(out.pca_mode)
    ||!text(out.relationship_x)||!text(out.relationship_y)||!strings(out.event_ids)||typeof out.tail_overlaps!=='boolean'
    ||!Array.isArray(out.custom_events)||!out.custom_events.every(v=>Array.isArray(v)&&v.length===3&&text(v[0])&&v[0].trim()&&date(v[1])&&v[1]&&date(v[2])&&v[2]&&v[1]<=v[2])) throw Error('Invalid analytical settings.');
  return structuredClone(out) as AnalyticsOptions;
}
export function parseSpec(value:unknown):AnalysisSpec {
  if(!object(value)||Object.keys(value).some(k=>!['snapshotId','hierarchy','nodeIds','lookbackDays','normalization','factorIds','multipliers','assetHedges','startDate','endDate','groupDepth','analytics','viewId'].includes(k))||!views.some(v=>v.id===value.viewId)||!text(value.snapshotId)||!value.snapshotId||!text(value.hierarchy)||!value.hierarchy||!strings(value.nodeIds)||!strings(value.factorIds)
    ||!integer(value.lookbackDays,2)||!['native','thousands','millions','bps','AUM'].includes(String(value.normalization))
    ||!date(value.startDate)||!date(value.endDate)||value.startDate&&value.endDate&&value.startDate>value.endDate||!integer(value.groupDepth,0)
    ||!Array.isArray(value.multipliers)||!value.multipliers.every(v=>object(v)&&text(v.nodeId)&&typeof v.value==='number'&&Number.isFinite(v.value))
    ||new Set(value.multipliers.map(v=>(v as {nodeId:string}).nodeId)).size!==value.multipliers.length
    ||!Array.isArray(value.assetHedges)||!value.assetHedges.every(v=>object(v)&&text(v.assetId)&&text(v.quantityUnit)&&typeof v.quantity==='number'&&Number.isFinite(v.quantity))
    ||new Set(value.assetHedges.map(v=>(v as {assetId:string}).assetId)).size!==value.assetHedges.length) throw Error('Invalid analysis specification.');
  const {snapshotId,hierarchy,nodeIds,factorIds,lookbackDays,normalization,startDate,endDate,groupDepth,multipliers,assetHedges,viewId}=value;
  return structuredClone({snapshotId,hierarchy,nodeIds,factorIds,lookbackDays,normalization,startDate,endDate,groupDepth,multipliers,assetHedges,viewId,analytics:parseAnalytics(value.analytics)}) as AnalysisSpec;
}
export function initialSpec(snapshot:Snapshot):AnalysisSpec {return {snapshotId:snapshot.id,hierarchy:snapshot.hierarchies[0],nodeIds:[],factorIds:[],lookbackDays:252,normalization:'native',startDate:'',endDate:'',groupDepth:0,multipliers:[],assetHedges:[],viewId:'performance',analytics:defaultAnalytics()};}
export function parseCatalogue(v:unknown):Catalogue {
  if(!object(v)||v.schemaVersion!==2||!Array.isArray(v.portfolios)||!v.portfolios.every(p=>object(p)&&text(p.id)&&text(p.label))||new Set(v.portfolios.map(p=>(p as {id:string}).id)).size!==v.portfolios.length
    ||!Array.isArray(v.snapshots)||!v.snapshots.every(s=>object(s)&&text(s.id)&&text(s.label)&&date(s.date)&&s.date&&text(s.currency)&&/^[A-Z]{3}$/.test(s.currency)&&['live','realized','backtested'].includes(String(s.pnlKind))
      &&(v.portfolios as {id:string}[]).some(p=>p.id===s.portfolioId)&&strings(s.hierarchies)&&s.hierarchies.length)
    ||new Set(v.snapshots.map(s=>(s as {id:string}).id)).size!==v.snapshots.length) throw Error('Invalid Cluster catalogue.');
  return v as unknown as Catalogue;
}
export function parseDetail(v:unknown,spec:AnalysisSpec):SnapshotDetail {
  if(!object(v)||v.schemaVersion!==2||v.snapshotId!==spec.snapshotId||v.hierarchy!==spec.hierarchy||!Array.isArray(v.nodes)||!v.nodes.every(n=>object(n)&&text(n.id)&&text(n.label)&&(n.parentId===null||text(n.parentId)))
    ||new Set(v.nodes.map(n=>(n as {id:string}).id)).size!==v.nodes.length||!Array.isArray(v.factors)||!v.factors.every(f=>object(f)&&text(f.id)&&text(f.label)&&strings(f.tracks))
    ||!Array.isArray(v.events)||!v.events.every(e=>object(e)&&text(e.id)&&text(e.label))||!Array.isArray(v.hedges)||!v.hedges.every(h=>object(h)&&text(h.id)&&text(h.label)&&text(h.quantityUnit))
    ||!object(v.capabilities)||!['aum','positions','events','factors','hedges'].every(k=>typeof (v.capabilities as Record<string,unknown>)[k]==='boolean')) throw Error('Invalid snapshot configuration.');
  const parents=new Map(v.nodes.map(n=>[(n as NodeOption).id,(n as NodeOption).parentId]));
  for(const [id,parent] of parents){const seen=new Set([id]);let p=parent;while(p){if(!parents.has(p)||seen.has(p))throw Error('Invalid hierarchy tree.');seen.add(p);p=parents.get(p);}}
  return v as unknown as SnapshotDetail;
}
export function parseResult(v:unknown,spec:AnalysisSpec):ClusterResult {const result=parseProjection(v);if(!object(v)||v.snapshotId!==spec.snapshotId||!object(v.selection)||canonical(parseSpec(v.selection))!==canonical(parseSpec(spec)))throw Error('Result does not match the requested analysis.');return result as ClusterResult;}
export const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v)=>object(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function restore(value:JsonValue|undefined,scopeKey:string){
  const state=object(value)&&value.scopeKey===scopeKey?value:{};
  let spec:AnalysisSpec|null=null;try{spec=parseSpec(state.spec);}catch{}
  const saved:SavedAnalysis[]=[];if(Array.isArray(state.saved))for(const item of state.saved)try{if(object(item)&&text(item.id)&&text(item.name))saved.push({id:item.id,name:item.name,spec:parseSpec(item.spec)});}catch{}
  return {spec,saved,view:views.some(v=>v.id===state.view)?state.view as View:'performance' as View};
}
export function chooseNode(nodes:NodeOption[],selected:string[],id:string,checked:boolean){
  if(!checked)return selected.filter(v=>v!==id);
  const parents=new Map(nodes.map(n=>[n.id,n.parentId]));
  const isAncestor=(a:string,b:string)=>{let p=parents.get(b);while(p){if(p===a)return true;p=parents.get(p);}return false;};
  return [...selected.filter(v=>!isAncestor(v,id)&&!isAncestor(id,v)),id];
}
