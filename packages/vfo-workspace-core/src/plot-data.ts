import type {Evaluation,SampleRow,Surface} from './model';
export const isFiniteNumber=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
export function nativeDays(expiryNs:string|undefined,asofNs:string):number|null{
 if(!expiryNs||!/^\d+$/.test(expiryNs)||!/^\d+$/.test(asofNs))return null;
 const days=Number(BigInt(expiryNs)-BigInt(asofNs))/86_400_000_000_000;
 return Number.isFinite(days)?days:null;
}
export function nativeSamples(surface:Pick<Surface,'expiries'|'native_asof_ns'>,evaluation:Evaluation,coordinate:string,measure:'iv'|'pdf'='iv'){
 const expiryMap=new Map(surface.expiries.map(e=>[e.listed_index,e]));
 return evaluation.rows.flatMap(row=>{const days=nativeDays(expiryMap.get(row.listed_index)?.expiry_ns,surface.native_asof_ns);
  return days===null?[]:(measure==='pdf'?(row.density_points??[]):row.points).flatMap((p,index)=>{const value=measure==='pdf'?('pdf'in p?p.pdf:null):('iv'in p?p.iv:null);return isFiniteNumber(value)&&isFiniteNumber(p.strike)&&isFiniteNumber(p.ns)?[{x:coordinate==='K'?p.strike:p.ns,y:days,z:value*(measure==='iv'?100:1),strike:p.strike,ns:p.ns,expiry:row.expiry,listedIndex:row.listed_index,pointIndex:index}]:[]});
 });
}
export function nativeGrid(surface:Pick<Surface,'expiries'|'native_asof_ns'>,evaluation:Evaluation,coordinate:string,measure:'iv'|'pdf'='iv'){
 const samples=nativeSamples(surface,evaluation,coordinate,measure),nodes=[...new Set(samples.map(p=>p.ns))].sort((a,b)=>a-b);
 const rows=evaluation.rows.map(row=>({row,points:samples.filter(p=>p.listedIndex===row.listed_index)})).filter(r=>r.points.length).sort((a,b)=>a.points[0].y-b.points[0].y);
 return {x:rows.map(r=>nodes.map(ns=>r.points.find(p=>p.ns===ns)?.x??null)),y:rows.map(r=>nodes.map(()=>r.points[0].y)),z:rows.map(r=>nodes.map(ns=>r.points.find(p=>p.ns===ns)?.z??null)),custom:rows.map(r=>nodes.map(ns=>{const p=r.points.find(p=>p.ns===ns);return p?[p.expiry,p.strike,p.ns,p.listedIndex,p.pointIndex]:null}))};
}
export function highlightedSamples<T extends {listedIndex:number;strike:number}>(samples:T[],expiry:number|undefined,strike:number|undefined){
 const tenor=samples.filter(p=>p.listedIndex===expiry),term:T[]=[];
 if(isFiniteNumber(strike))for(const index of new Set(samples.map(p=>p.listedIndex))){const nearest=samples.filter(p=>p.listedIndex===index).reduce<T|undefined>((a,b)=>!a||Math.abs(b.strike-strike)<Math.abs(a.strike-strike)?b:a,undefined);if(nearest)term.push(nearest);}
 return {tenor,term};
}
// Keep the requested absolute strike across sparse expiry rows; snapping never
// changes the target, so returning to the original expiry restores the cut.
export function nearestStrikeIndex<T extends {strike:number|null}>(points:T[],target:number|null|undefined,fallback:number):number{
 if(!points.length)return 0;
 const safeFallback=Number.isFinite(fallback)?Math.min(Math.max(0,Math.trunc(fallback)),points.length-1):0;
 if(!isFiniteNumber(target))return safeFallback;
 let best=-1,delta=Infinity;
 points.forEach((point,index)=>{if(isFiniteNumber(point.strike)){const d=Math.abs(point.strike-target);if(d<delta){best=index;delta=d;}}});
 return best<0?safeFallback:best;
}
export function nearestNative(points:SampleRow['points'],strike:number){return points.filter(p=>isFiniteNumber(p.strike)&&isFiniteNumber(p.iv)).reduce<SampleRow['points'][number]|undefined>((a,b)=>!a||Math.abs(b.strike!-strike)<Math.abs(a.strike!-strike)?b:a,undefined);}
export type PriceQuote={expiry:string;timestamp:string;right:string;strike:number;bid:number|null;ask:number|null};
// Bounds are source prices. Never call these volatility, and never infer a spread.
export function priceIntervals(quotes:PriceQuote[],expiry:string,right:string){return quotes.filter(q=>q.expiry===expiry&&q.right===right&&isFiniteNumber(q.strike)&&isFiniteNumber(q.bid)&&isFiniteNumber(q.ask)&&q.bid>=0&&q.ask>=q.bid).sort((a,b)=>a.strike-b.strike);}
export function nearestInputPerExpiry<T extends {listed_index:number;expiry:string;expiry_ns:string;strike:number;iv:number;error:number;lower:number;upper:number}>(items:T[],expiries:{listed_index:number;expiry:string;expiry_ns:string}[],strike:number):T[]{
 if(!isFiniteNumber(strike))return [];
 const expected=new Map(expiries.map(e=>[e.listed_index,e])),nearest=new Map<number,T>();
 for(const point of items){const expiry=expected.get(point.listed_index);if(!expiry||point.expiry!==expiry.expiry||point.expiry_ns!==expiry.expiry_ns||![point.strike,point.iv,point.error,point.lower,point.upper].every(isFiniteNumber))continue;const previous=nearest.get(point.listed_index);if(!previous||Math.abs(point.strike-strike)<Math.abs(previous.strike-strike))nearest.set(point.listed_index,point);}
 return [...nearest.values()].sort((a,b)=>BigInt(a.expiry_ns)<BigInt(b.expiry_ns)?-1:BigInt(a.expiry_ns)>BigInt(b.expiry_ns)?1:0);
}

/** View-control domain shared by every returned expiry, not a numerical execution cap. */
export function nativeCutDomain(rows:SampleRow[],kind:'KF'|'NS'|'K'):{min:number;max:number}|null{
 const ranges=rows.map(row=>{const values=row.points.flatMap(point=>{
  const value=kind==='NS'?point.ns:kind==='K'?point.strike:isFiniteNumber(point.strike)&&isFiniteNumber(row.forward)&&row.forward>0?point.strike/row.forward:null;
  return isFiniteNumber(value)?[value]:[];
 });return values.length?{min:Math.min(...values),max:Math.max(...values)}:null;});
 if(!ranges.length||ranges.some(value=>value===null))return null;
 const min=Math.max(...ranges.map(value=>value!.min)),max=Math.min(...ranges.map(value=>value!.max));
 return min<max?{min,max}:null;
}
