export function createHttpProvider(base='/workspace/v1'){
if(!base.startsWith('/')||base.startsWith('//'))throw Error('Use an application-owned relative API route');
async function request(path,signal,body,key){const r=await fetch(base+path,{credentials:'same-origin',signal,...(body?{method:'POST',headers:{'Content-Type':'application/json','X-Vfo-Local-Intent':'1',...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body)}:{})});let value;try{value=await r.json()}catch{throw new Error('VFO observation unavailable')}if(!r.ok)throw new Error(typeof value.detail==='string'?value.detail:value?.error?.code??value.error??'VFO observation unavailable');return value;}
function forEnvironment(environment){
 if(!/^[a-z][a-z0-9_-]{0,63}$/.test(environment))throw Error('Unknown VFO environment');
 const scoped=(path,signal,body,key)=>request('/'+environment+path,signal,body,key);
 return {
 site(signal){return scoped('/site',signal);},
 market(assets,signal){return scoped('/command/market-summary?'+new URLSearchParams({assets:assets.join(',')}),signal);},
 evaluatedSurface(asset,source,revision,signal,cut){return scoped('/assets/'+encodeURIComponent(asset)+'/native-surface?'+new URLSearchParams({source,...(revision?{revision}:{}),...(cut?{cut_kind:cut.kind,cut_value:String(cut.value)}:{})}),signal);},
 analytics(asset,signal){return scoped('/command/analytics/'+encodeURIComponent(asset),signal);},
 analyticsResult(asset,workId,index,signal){return scoped('/command/analytics/'+encodeURIComponent(asset)+'/results/'+workId+'?'+new URLSearchParams({output:String(index)}),signal);},
 command(path,signal,body,key){return scoped('/command'+path,signal,body,key);},
 volaInputs(asset,revision,expiryIndex,cursor,signal,strike,cut){return scoped('/assets/'+encodeURIComponent(asset)+'/vola-inputs?'+new URLSearchParams({revision,expiry_index:String(expiryIndex),cursor:String(cursor),limit:'256',...(strike==null?{}:{strike:String(strike)}),...(cut?{cut_kind:cut.kind,cut_value:String(cut.value)}:{})}),signal);},
 history(asset,cursor,signal){return scoped('/history?'+new URLSearchParams({asset,...(cursor?{cursor}:{})}),signal);},
 historyDay(id,date,asset,signal){return scoped('/history/'+encodeURIComponent(id)+'/days/'+encodeURIComponent(date)+'?'+new URLSearchParams({asset}),signal);},
 list(args,signal){return scoped('/assets?'+new URLSearchParams(Object.entries(args).map(([k,v])=>[k,String(v)])),signal);},
 detail(asset,signal){return scoped('/assets/'+encodeURIComponent(asset),signal);},
 surface(asset,source,revision,signal){return scoped('/assets/'+encodeURIComponent(asset)+'/surface?'+new URLSearchParams({source,...(revision?{revision}:{})}),signal);},
 draft(asset,scope,signal){return scoped('/sandbox/'+encodeURIComponent(asset)+'?'+new URLSearchParams({scope}),signal);},
 receipts(asset,scope,signal){return scoped('/sandbox/'+encodeURIComponent(asset)+'/receipts?'+new URLSearchParams({scope}),signal);},
 sandbox(asset,action,body,signal){return scoped('/sandbox/'+encodeURIComponent(asset)+'/'+action,signal,body);}
};
}
return {forEnvironment,profiles(signal){return request('/profiles',signal)}};
}
