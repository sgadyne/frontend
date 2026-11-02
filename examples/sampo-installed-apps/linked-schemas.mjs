// Portable rendering state only. These declarations contain no data or execution authority.
export const object = (properties, required = []) => ({type:'object', properties, required, additionalProperties:false});
export const string = (maxLength = 180, values) => ({type:'string',maxLength,...(values ? {enum:values} : {})});
export const list = (items = string(), maxItems = 100) => ({type:'array',items,maxItems});
const boolean = {type:'boolean'}, version = {type:'integer',enum:[1]};
export const marketViews = ['universe','live','history'];
export const vfoSelectionSchema = object({view:string(16,marketViews),instrumentId:string()});
export const instrumentSelectionSchema = {...vfoSelectionSchema,required:['instrumentId']};
export const vfoStateSchema = object({
  version,view:string(16,marketViews),
  filters:object({query:string(160),region:string(),group:string(),type:string(64),coverage:string(32),watchlistOnly:boolean}),
  watchlist:list(),selected:list(),focused:string(),inspectTab:string(16,['identity','coverage','surface']),
  page:{type:'integer',minimum:0,maximum:10000},sort:string(16,['featured','az']),showDemo:boolean,
  source:string(),dataset:string(),historyStart:string(10),historyEnd:string(10),
});
const modes = ['positions','trades','overlap'];
export const riskSelectionSchema = object({mode:string(16,modes),metric:string(8,['delta','risk'])});
const riskControls = object({
  mode:string(16,modes),metric:string(8,['delta','risk']),horizon:string(32),endpoint:string(8,['EOD','Live']),
  startDate:string(10),endDate:string(10),eodEndDate:string(10),liveEndDate:string(10),query:string(160),
  assetClass:string(64),cutoffText:string(24),selectedKey:string(512),inspectorOpen:boolean,range:string(32),
});
export const riskStateSchema = object({version,controls:riskControls,scopes:list(object({
  mode:string(16,modes),presetId:string(32,['all',...modes.map(m=>m+'-default')]),books:list(string(120),32),tags:list(string(120),32),excludedTags:list(string(120),32),
},['mode','excludedTags']),3)});
export const clusterViews = ['performance','risk','factors','relationships','events','pca','positions','construction'];
export const clusterSelectionSchema = object({view:string(24,clusterViews)});
// Calculation settings, saved proposals and job inputs intentionally are not portable.
export const clusterStateSchema = object({version,view:string(24,clusterViews)});
export const replicationSelectionSchema = object({reportId:string(),viewId:string()});
const reportFields = {reportId:string(),snapshotId:string(),start:string(10),end:string(10),compareSnapshotId:string()};
const reportSelection = object(reportFields,['reportId','snapshotId','start','end','compareSnapshotId']);
export const replicationStateSchema = object({
  version,reportId:string(),viewId:string(),selections:list(reportSelection,24),pinned:list(string(),24),
  filters:list(object({owner:string(200),key:string(64),values:list(string(120),32)},['owner','key','values']),64),
  savedViews:list(object({...reportFields,id:string(),name:string(120),viewId:string()},['id','name','reportId','viewId','snapshotId','start','end','compareSnapshotId']),8),
  columns:list(object({key:string(),values:list(string(120),32)},['key','values']),24),
  chartGroups:list(object({key:string(),value:string()},['key','value']),24),
});
