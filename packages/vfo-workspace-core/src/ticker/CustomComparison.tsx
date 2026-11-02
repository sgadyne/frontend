import type {Preview,Surface} from '../model';
import {expiryLabel,num,percent} from '../model';
import './custom-comparison.css';
/** Display the exact pinned parameters and native preview, without recalculation. */
export function CustomComparison({base,preview}:{base:Surface;preview:Preview|null}){
 const rows=base.expiries.filter(e=>BigInt(e.expiry_ns)>BigInt(base.native_asof_ns));
 return <section className="vc-compare"><p>Listed-expiry parameters from the pinned surface alongside the saved native preview. A dash means the value was not returned. This does not show the separate current market inputs or an EOD comparison.</p><div className="vc-scroll"><table><thead><tr><th rowSpan={2}>Expiry</th><th colSpan={2}>Forward</th><th colSpan={2}>Vol0</th><th colSpan={2}>Skew</th><th colSpan={2}>Curvature</th></tr><tr>{['Forward','Vol0','Skew','Curvature'].map(n=><FragmentHeaders key={n}/>)}</tr></thead><tbody>{rows.map(row=>{const next=preview?.state==='sampled'?preview.evaluation.rows.find(r=>r.expiry===row.expiry):undefined;return <tr key={row.expiry}><th>{expiryLabel(row.expiry)}</th><td>{num(row.forward,4)}</td><td>{num(next?.forward,4)}</td><td>{percent(row.params?.[0])}</td><td>{percent(next?.params?.[0])}</td><td>{num(row.params?.[1],6)}</td><td>{num(next?.params?.[1],6)}</td><td>{num(row.params?.[2],6)}</td><td>{num(next?.params?.[2],6)}</td></tr>})}</tbody></table></div>{!preview&&<p>Save and preview a draft to populate the proposed columns.</p>}{preview&&preview.state!=='sampled'&&<p>Preview held: {preview.evaluation.reason??preview.state}</p>}</section>;
}
function FragmentHeaders(){return <><th>Base</th><th>Preview</th></>}
