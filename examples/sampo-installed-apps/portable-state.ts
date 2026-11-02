import {validatePortableSelection,type JsonValue,type PortableSelectionSchema} from '@sampo/contracts';
import {emptyMarketFilters} from '../../packages/vfo-workspace-core/src/market/universe-model.ts';
import type {MarketUniverseState} from '../../packages/vfo-workspace-core/src/market/UniverseWorkbench';
import {vfoSelectionSchema,vfoStateSchema,riskSelectionSchema,riskStateSchema,clusterSelectionSchema,clusterStateSchema,replicationSelectionSchema,replicationStateSchema} from './linked-schemas.mjs';

export const record = (v:unknown):v is Record<string,unknown> => !!v&&typeof v==='object'&&!Array.isArray(v);
function checked<T>(value:unknown,schema:PortableSelectionSchema):T {
  return structuredClone(validatePortableSelection(value ?? {},schema)) as T;
}
export function restoreVfoState(value:unknown,selection:unknown,ids:ReadonlySet<string>):MarketUniverseState {
  const state=checked<Partial<MarketUniverseState>&{focused?:string}>(value,vfoStateSchema);
  const route=checked<{view?:MarketUniverseState['view'];instrumentId?:string}>(selection,vfoSelectionSchema);
  if(Object.hasOwn(route,'instrumentId')&&!ids.has(route.instrumentId!))throw Error('Destination unavailable');
  return {...state,version:1,view:state.view??route.view??'universe',filters:{...emptyMarketFilters,...state.filters},
    watchlist:[...new Set(state.watchlist??[])].filter(id=>ids.has(id)),selected:[...new Set(state.selected??[])].filter(id=>ids.has(id)),
    ...((state.focused!==undefined||route.instrumentId)?{focused:state.focused!==undefined?(ids.has(state.focused)?state.focused:''):route.instrumentId??''}:{})};
}
export function portableVfoState(value:MarketUniverseState):JsonValue {return validatePortableSelection(value,vfoStateSchema);}

type RiskState={version?:1;controls?:Record<string,JsonValue>;scopes?:Array<{mode:string;presetId?:string;books?:string[];tags?:string[];excludedTags:string[]}>};
export function restoreRiskState(value:unknown,selection:unknown):unknown {
  const state=checked<RiskState>(value,riskStateSchema),route=checked<Record<string,JsonValue>>(selection,riskSelectionSchema);
  return {...route,...state.controls,...(state.scopes?{scopeByMode:Object.fromEntries(state.scopes.map(scope=>[scope.mode,{...scope,presetId:scope.presetId??null,books:scope.books??null,tags:scope.tags??null}]))}:{})};
}
export function portableRiskState(value:unknown):JsonValue {
  if(!record(value))throw Error('Invalid Risk view');
  const controls=Object.fromEntries(['mode','metric','horizon','endpoint','startDate','endDate','eodEndDate','liveEndDate','query','assetClass','cutoffText','selectedKey','inspectorOpen','range'].flatMap(key=>value[key]==null?[]:[[key,value[key]]]));
  const scopes=record(value.scopeByMode)?Object.values(value.scopeByMode).filter(record).map(s=>({mode:s.mode,...(s.presetId==null?{}:{presetId:s.presetId}),...(s.books==null?{}:{books:s.books}),...(s.tags==null?{}:{tags:s.tags}),excludedTags:s.excludedTags})):[];
  return validatePortableSelection({version:1,controls,scopes},riskStateSchema);
}
export function restoreClusterView(value:unknown,selection:unknown):string {
  const state=checked<{view?:string}>(value,clusterStateSchema),route=checked<{view?:string}>(selection,clusterSelectionSchema);
  return state.view??route.view??'performance';
}
export function portableClusterView(value:unknown):JsonValue {
  if(!record(value))throw Error('Invalid Cluster view');
  return validatePortableSelection({version:1,view:value.view},clusterStateSchema);
}

type Definition={id:string;views:{id:string}[]};
export function restoreReplicationState(value:unknown,selection:unknown,definitions:readonly Definition[]):Record<string,unknown> {
  const state=checked<Record<string,unknown>>(value,replicationStateSchema),route=checked<{reportId?:string;viewId?:string}>(selection,replicationSelectionSchema);
  const reportId=typeof state.reportId==='string'?state.reportId:route.reportId??definitions[0].id;
  const report=definitions.find(r=>r.id===reportId);if(!report)throw Error('Destination unavailable');
  const viewId=typeof state.viewId==='string'?state.viewId:route.viewId??report.views[0].id;
  if(!report.views.some(v=>v.id===viewId))throw Error('Destination unavailable');
  const rows=Array.isArray(state.selections)?state.selections:[];
  const filters=Array.isArray(state.filters)?state.filters.filter(record):[];
  const inflate=(raw:unknown,owner:string)=>{if(!record(raw))throw Error('Invalid report selection');return {...raw,filters:Object.fromEntries(filters.filter(f=>f.owner===owner).map(f=>[f.key,f.values]))};};
  for(const row of rows)if(record(row)&&((row.start as string)>(row.end as string)&&row.end))throw Error('Invalid report dates');
  return {reportId,viewId,selections:Object.fromEntries(rows.filter(record).filter(r=>definitions.some(d=>d.id===r.reportId)).map(r=>[r.reportId,inflate(r,'report:'+r.reportId)])),
    savedViews:Array.isArray(state.savedViews)?state.savedViews.filter(record).map(v=>({...v,selection:inflate(v,'saved:'+v.id)})):[],pinned:state.pinned??[],
    columns:Object.fromEntries((Array.isArray(state.columns)?state.columns:[]).filter(record).map(r=>[r.key,r.values])),
    chartGroups:Object.fromEntries((Array.isArray(state.chartGroups)?state.chartGroups:[]).filter(record).map(r=>[r.key,r.value]))};
}
export function portableReplicationState(value:unknown):JsonValue {
  if(!record(value)||!record(value.state))throw Error('Invalid report view');const s=value.state;
  const filters:Array<{owner:string;key:string;values:unknown}>=[];
  const flatten=(reportId:string,selection:unknown,owner:string)=>{if(!record(selection)||!record(selection.filters))throw Error('Invalid report selection');
    filters.push(...Object.entries(selection.filters).map(([key,values])=>({owner,key,values})));
    return {reportId,snapshotId:selection.snapshotId,start:selection.start,end:selection.end,compareSnapshotId:selection.compareSnapshotId};};
  const selections=Object.entries(record(s.selections)?s.selections:{}).map(([id,v])=>flatten(id,v,'report:'+id));
  const savedViews=Array.isArray(s.savedViews)?s.savedViews.filter(record).map(v=>({...flatten(String(v.reportId),v.selection,'saved:'+v.id),id:v.id,name:v.name,viewId:v.viewId})):[];
  return validatePortableSelection({version:1,reportId:s.reportId,viewId:s.viewId,selections,filters,pinned:s.pinned,savedViews,
    columns:Object.entries(record(s.columns)?s.columns:{}).map(([key,values])=>({key,values})),chartGroups:Object.entries(record(s.chartGroups)?s.chartGroups:{}).map(([key,value])=>({key,value}))},replicationStateSchema);
}
