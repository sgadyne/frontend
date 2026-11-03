export type JsonValue=null|boolean|number|string|JsonValue[]|{[key:string]:JsonValue};
export type SessionServices={signal:AbortSignal};
export type ViewStateBridge={viewState?:JsonValue;onViewStateChange?:(value:JsonValue)=>void};
export type Fact={state:string;reason:string;asof?:string;observed_at?:string;revision?:string;origin?:string;last_completed_context?:string;last_completed_at?:string;last_known_block?:string;last_known_error?:string};
export type Asset={asset_id:string;ticker:string;source:string;input_timezone:string;groups:string[];session:Fact;input:Fact;latest_attempt:Fact;accepted_output:Fact;publication:Fact};
export type Page={items:Asset[];configured_total:number;total:number;next_offset:number|null;observed_at:string;evaluation_at:string;time_basis:string;config_revision:string;sources:string[];available_groups:string[];partial:boolean;limitations:string[]};
export type Point={ns:number;strike:number|null;iv:number|null};
export type CutSelection={kind:'KF'|'NS'|'K';value:number};
export type NativeCut=CutSelection&{strike:number|null;ns:number|null;iv:number|null;pdf:number|null;method:string};
export type DensityPoint={ns:number;strike:number|null;pdf:number|null};
export type SampleRow={cut?:NativeCut|null;density_points?:DensityPoint[];sampled_density_mass?:number|null;expiry:string;listed_index:number;forward:number|null;params:(number|null)[];points:Point[];grid:{strike:number;iv:number|null}[]};
export type Evaluation={density?:{method:string;unit:string;normalization:string};state:string;reason?:string;rows:SampleRow[];point_count:number;method?:string;runtime_image?:string;preview_note?:string;statistics?:{sample_min_iv:number|null;sample_max_iv:number|null;sample_mean_iv:number|null;missing_cells:number}};
export type Expiry={expiry:string;expiry_ns:string;listed_index:number;forward:number|null;forward_error:number|null;underlier_price:number|null;params:(number|null)[]|null;parameter_errors:(number|null)[]|null;curve_type:string|null};
export type Surface={asset_id:string;ticker:string;source:string;revision:string;source_asof:string;native_asof:string;native_asof_ns:string;observed_at:string;cache_observed_at:string;origin:string;config_revision:string|null;context_revision:string|null;source_role:string;publication:string;fit_provenance:string;spot:number|null;spot_error:number|null;native_library:Record<string,JsonValue>;expiries:Expiry[];evaluation:Evaluation;curves:Record<string,JsonValue>;dividends:JsonValue;input_coverage?:{returned_max_entries:number;dividends:Record<string,number>;curves:Record<string,Record<string,number>>};capabilities:{native_preview:boolean;listed_expiry_only:boolean;new_expiry_mapping:boolean;production_publish:boolean};limitations:string[]};
export type Slice={expiry:string;okey?:string;symbol?:string;forward_mode:string;forward?:number|null;vol0?:number|null;skew?:number|null;curvature?:number|null;pvol?:number|null};
export type Intent={base_revision:string;slices:Slice[];strikes:number[];reason:string};
export type Preview={state:string;evaluation:Evaluation;base_revision:string;draft_revision:number;intent_digest:string;at:string;validation:string};
export type Draft=Intent&{id:string;revision:number;preview:Preview|null;updated_at:string};
export type Receipt={id:string;draft_id:string;draft_revision:number;asset_id:string;base_revision:string;state:string;destination:string;at:string;preview_state:string;production_publish:false;message:string};
export type Filters={q:string;source:string;group:string;sort:string;direction:string;offset:number;limit:number};
export type HistoryItem={request_id:string;declaration:{source:string;start_date:string;end_date:string};progress:{state:string}};
export type HistoryPage={schema:string;items:HistoryItem[];next_cursor:string|null;complete:boolean;data_complete?:boolean;unavailable_requests?:{request_id:string;reason:string}[]};
export type HistoryDay={schema:string;asset:string;business_date:string;source:string;observation?:string;reason?:string;provenance:{classification:string};surface:{state:string;reason?:string;timestamp?:string;spot?:number|null;fit_quality?:number|null;evaluation:Evaluation};quotes:{state:string;reason?:string;unit:string;items:{expiry:string;timestamp:string;right:string;strike:number;bid:number|null;ask:number|null}[];truncated:boolean;next_cursor?:number|null;frame_sha256?:string;expiry_dates?:string[];snapshot_timestamp?:string};delivery:JsonValue;quality:JsonValue};
export type EnvironmentProfile={id:string;label:string;available:boolean;reason?:string|null;customWrites:boolean};
export type ProviderRoot={forEnvironment:(environment:string)=>Provider;profiles:(signal:AbortSignal)=>Promise<{defaultEnvironment:string;profiles:EnvironmentProfile[]}>};
export type Provider={
 observationCoverage?(asset:string,start:string,end:string,signal:AbortSignal):Promise<ObservationCoverage>;
 observations?(asset:string,source:string,date:string,signal:AbortSignal):Promise<SourceObservation[]>;
 observationSurface?(asset:string,source:string,date:string,timestamp:string,signal:AbortSignal,cut?:CutSelection):Promise<Surface>;
 site?(signal:AbortSignal):Promise<import('./market/contracts').WorkspaceSite>;
 market?(assets:string[],signal:AbortSignal):Promise<import('./market/contracts').MarketFrame>;
 analyticsResult?(asset:string,workId:string,index:number,signal:AbortSignal):Promise<{work_id:string;asset_id:string;product:string;book:string|null;payload:JsonValue}>;
 analytics?(asset:string,signal:AbortSignal):Promise<import('./ticker/AnalyticsPanel').AnalyticsView>;
 evaluatedSurface?(asset:string,source:string,revision:string,signal:AbortSignal,cut?:CutSelection):Promise<Surface>;
 forEnvironment?(environment:string):Provider;
 profiles?(signal:AbortSignal):Promise<{defaultEnvironment:string;profiles:EnvironmentProfile[]}>;
 volaInputs(asset:string,revision:string,expiryIndex:number,cursor:number,signal:AbortSignal,strike?:number,cut?:CutSelection):Promise<import('./vola-inputs').NativeInputs>;
 history(asset:string,cursor:string,signal:AbortSignal):Promise<HistoryPage>;historyDay(requestId:string,date:string,asset:string,signal:AbortSignal):Promise<HistoryDay>;
 list(args:Filters,signal:AbortSignal):Promise<Page>;detail(asset:string,signal:AbortSignal):Promise<Page>;
 surface(asset:string,source:string,revision:string|null,signal:AbortSignal):Promise<Surface>;
 draft(asset:string,scope:string,signal:AbortSignal):Promise<{draft:Draft|null}>;
 receipts(asset:string,scope:string,signal:AbortSignal):Promise<{items:Receipt[]}>;
 sandbox(asset:string,action:string,body:unknown,signal:AbortSignal):Promise<{draft:Draft}|Receipt>;
};
export const SELECTION_SCHEMA='vfo.selection/v1';
export const num=(v:number|null|undefined,d=3)=>v==null?'—':v.toLocaleString('en-US',{maximumFractionDigits:d});
export const percent=(v:number|null|undefined)=>v==null?'—':`${num(v*100,3)}%`;
export const short=(v:string|null|undefined)=>v?`${v.slice(0,12)}…`:'Unavailable';
export const fact=(v?:Fact)=>v?`${v.state.replaceAll('_',' ')} · ${v.reason.replaceAll('_',' ')}`:'Unknown';

// Preserve exact expiry IDs for matching; format only at the presentation edge.
export const expiryLabel=(value:string|null|undefined):string=>{
 if(!value||value==='0')return 'Unknown expiry';
 const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const dateLabel=(y:number,m:number,d:number)=>{const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?`${d} ${month[m-1]} ${y}`:null;};
 const native=/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(?:\.\d+)?-(.+)$/.exec(value);
 if(native){const date=dateLabel(+native[1],+native[2],+native[3]);return date&&+native[4]<24&&+native[5]<60&&+native[6]<60?`${date} · ${native[4]}:${native[5]} ${native[7]}`:'Unknown expiry';}
 const day=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(day)return dateLabel(+day[1],+day[2],+day[3])??'Unknown expiry';
 if(/^\d{16,20}$/.test(value)){try{const ms=Number(BigInt(value)/1000000n);return ms>0?expiryLabel(new Date(ms).toISOString()):'Unknown expiry';}catch{return 'Unknown expiry';}}
 if(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value)){if(!dateLabel(+value.slice(0,4),+value.slice(5,7),+value.slice(8,10)))return 'Unknown expiry';const date=new Date(value);if(!Number.isFinite(date.getTime()))return 'Unknown expiry';return `${dateLabel(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate())} · ${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')} UTC`;}
 if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value))return value+' (timezone unspecified)';
 return value;
};
export type SourceObservation={source:string;timestamp:string;revision:string;expiry_count:number;fit_quality:number|null};
export type ObservationCoverage={asset_id:string;start_date:string;end_date:string;sources:{source:string;label:string;days:{date:string;snapshots:number;last_timestamp:string;last_fit_quality:number|null}[]}[]};
