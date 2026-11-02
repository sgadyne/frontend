import type {Point} from './model';
export const finite=(v:number|null|undefined):v is number=>typeof v==='number'&&Number.isFinite(v);
// Select only returned native samples; do not interpolate or infer an IV.
export function nearestStrike(points:Point[],strike:number):Point|undefined {
 if(!finite(strike))return undefined;
 return points.filter(p=>finite(p.strike)&&finite(p.iv)).reduce<Point|undefined>((best,p)=>!best||Math.abs(p.strike!-strike)<Math.abs(best.strike!-strike)?p:best,undefined);
}
