import React,{useEffect,useMemo,useRef,useState,useId} from 'react';
import {AnimatePresence,MotionConfig,motion,useDragControls,useMotionValue} from 'motion/react';
import {Surface3D,Smile,StrikeTerm} from '../charts';
import {expiryLabel,num,percent,type Surface,type SampleRow,type CutSelection} from '../model';
import type {NativeInputs} from '../vola-inputs';
import {nearestStrikeIndex,nativeDays,nativeCutDomain} from '../plot-data';
import './volatility.css';

type Measure='iv'|'pdf';
type Camera={eye:{x:number;y:number;z:number};center?:{x:number;y:number;z:number};up?:{x:number;y:number;z:number}};
type Props={surface:Surface;inputs:NativeInputs|null;loadingInputs?:boolean;expiryIndex:number;onExpiry:(index:number)=>void;
  onStrike:(strike:number|null,term:boolean)=>void;onCut?:(cut:CutSelection,term:boolean)=>void;history?:boolean};
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const pretty=(v:number|null|undefined)=>finite(v)?v.toLocaleString(undefined,{maximumSignificantDigits:5}):'—';
function densityPoints(row:SampleRow){return (row.density_points??[]).filter(p=>finite(p.strike)&&finite(p.pdf));}
function DensitySlice({rows,index,strike,term,cut}:{rows:SampleRow[];index:number;strike:number|null;term:boolean;cut?:CutSelection}){
 const row=rows.find(r=>r.listed_index===index)??rows[0];
 const points=term?rows.flatMap(r=>{const p=r.cut;return p&&cut&&p.kind===cut.kind&&p.value===cut.value&&finite(p.strike)&&finite(p.pdf)?[{x:r.listed_index,y:p.pdf,label:expiryLabel(r.expiry),strike:p.strike}]:[]}):densityPoints(row).map(p=>({x:p.strike!,y:p.pdf!,label:pretty(p.strike),strike:p.strike!}));
 if(!points.length)return <p className="vol-lab-notice">Native density samples are unavailable for this selection.</p>;
 const xmin=Math.min(...points.map(p=>p.x)),xmax=Math.max(...points.map(p=>p.x)),ymin=Math.min(0,...points.map(p=>p.y)),ymax=Math.max(...points.map(p=>p.y));
 const X=(v:number)=>48+(v-xmin)/(xmax-xmin||1)*596,Y=(v:number)=>194-(v-ymin)/(ymax-ymin||1)*154;
 const path=points.map((p,i)=>(i?'L':'M')+X(p.x)+','+Y(p.y)).join(' ');
 return <svg viewBox="0 0 680 236" className="vol-lab-density" role="img" aria-label={term?'Native PDF at the exact selected coordinate across listed expiries':'Native implied terminal-price density at selected expiry'} data-testid="native-density-slice">
  {[0,.5,1].map(t=><g key={t}><line x1="48" x2="644" y1={Y(ymin+t*(ymax-ymin))} y2={Y(ymin+t*(ymax-ymin))} stroke="currentColor" opacity=".1"/><text x="40" y={Y(ymin+t*(ymax-ymin))+4} textAnchor="end">{pretty(ymin+t*(ymax-ymin))}</text></g>)}
  <path d={path+` L${X(points.at(-1)!.x)},${Y(0)} L${X(points[0].x)},${Y(0)} Z`} fill="rgba(32,138,156,.1)"/><path d={path} fill="none" stroke="#22899d" strokeWidth="2.2"/>
  {points.map((p,i)=><circle key={i} cx={X(p.x)} cy={Y(p.y)} r="2" fill="#22899d"><title>{p.label} · strike {pretty(p.strike)} · native PDF {pretty(p.y)} / price unit</title></circle>)}
  {[0,.5,1].map(t=><text key={t} x={X(xmin+t*(xmax-xmin))} y="215" textAnchor="middle">{term?points[Math.round(t*(points.length-1))].label.split(' · ')[0]:pretty(xmin+t*(xmax-xmin))}</text>)}
  <text x="346" y="233" textAnchor="middle">{term?'Listed expiry · exact native selected coordinate':'Absolute strike · underlying price units'}</text><text x="12" y="120" transform="rotate(-90 12 120)" textAnchor="middle">PDF / price unit</text>
 </svg>;
}
export function VolatilityTearsheet({surface,inputs,loadingInputs=false,expiryIndex,onExpiry,onStrike,onCut,history=false}:Props){
 const [measure,setMeasure]=useState<Measure>('iv'),[rendering,setRendering]=useState<'scatter'|'surface'>('scatter'),[view,setView]=useState<'3d'|'grid'>('3d'),[coordinate,setCoordinate]=useState<'K'|'NS'>('NS'),[axes,setAxes]=useState<'quiet'|'off'>('off');
 const [slice,setSlice]=useState<'expiry'|'strike'>('expiry'),[cut,setCut]=useState<CutSelection>({kind:'KF',value:1}),[open,setOpen]=useState(false),[expanded,setExpanded]=useState(false),[camera,setCamera]=useState<Camera|undefined>(),[reset,setReset]=useState(0);
 const dockId=useId();
 const stage=useRef<HTMLDivElement>(null),drag=useDragControls(),cardX=useMotionValue(0),cardY=useMotionValue(0);
 const rows=surface.evaluation.rows,row=rows.find(r=>r.listed_index===expiryIndex)??rows[0];
 const points=row?(measure==='pdf'?densityPoints(row):row.points.filter(p=>finite(p.strike)&&finite(p.iv))):[];
 const chosenIndex=nearestStrikeIndex<{strike:number|null}>(points,cut.kind==='K'?cut.value:cut.kind==='KF'?cut.value*(row?.forward??1):undefined,Math.floor(points.length/2)),chosen=points[chosenIndex];
 const exact=row?.cut&&row.cut.kind===cut.kind&&row.cut.value===cut.value?row.cut:null;
 const selectedStrike=exact?.strike??(cut.kind==='K'?cut.value:cut.kind==='KF'&&finite(row?.forward)?cut.value*row.forward:chosen?.strike??null);
 const cutDomain=useMemo(()=>nativeCutDomain(rows,cut.kind),[rows,cut.kind]);
 const cutNs=exact?.ns;
 const outsideGrid=finite(cutNs)&&points.length>0&&(cutNs<Math.min(...points.map(p=>p.ns))||cutNs>Math.max(...points.map(p=>p.ns)));
 const selectedValue=exact?(measure==='pdf'?exact.pdf:exact.iv):null;
 const expiry=surface.expiries.find(e=>e.listed_index===row?.listed_index);
 const days=expiry?nativeDays(expiry.expiry_ns,surface.native_asof_ns):null;
 const pdfAvailable=rows.some(r=>(r.density_points?.length??0)>0);
 useEffect(()=>{setCut({kind:'KF',value:1});cardX.set(0);cardY.set(0)},[surface.asset_id]);
 useEffect(()=>{if(open)onCut?.(cut,slice==='strike');onStrike(slice==='strike'?selectedStrike:null,slice==='strike')},[cut.kind,cut.value,slice,open]);
 function selectExpiry(i:number){onExpiry(i)}
 function selectPoint(i:number,j:number){const r=rows.find(r=>r.listed_index===i),p=measure==='pdf'?r?.density_points?.[j]:r?.points[j];if(p&&finite(p.strike))setCut({kind:cut.kind,value:cut.kind==='K'?p.strike:cut.kind==='NS'?p.ns:p.strike/(r?.forward??1)});selectExpiry(i)}
 function resetView(){setCamera(undefined);setReset(x=>x+1);cardX.set(0);cardY.set(0)}
 const metricLabel=measure==='iv'?'Implied volatility':'Implied terminal density';
 const gridNodes=useMemo(()=>[...new Set(rows.flatMap(r=>(measure==='iv'?r.points:r.density_points??[]).map(p=>p.ns)))].sort((a,b)=>a-b),[rows,measure]);
 if(!row||surface.evaluation.state!=='sampled')return <div className="vol-lab-unavailable"><h3>Native model unavailable</h3><p>{surface.evaluation.reason??'Load a saved surface to explore.'}</p></div>;
 return <MotionConfig reducedMotion="user"><section className="vol-lab" ref={stage} data-testid="volatility-lab" data-measure={measure} data-cut-kind={cut.kind} data-cut-value={cut.value} data-selected-strike={selectedStrike??''} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}>
  <div className="vol-lab-scene" aria-label="Volatility scene">
   {view==='3d'?<Surface3D key={surface.revision+reset} surface={surface} evaluation={surface.evaluation} coordinate={measure==='pdf'?'K':coordinate} mode={rendering} measure={measure} immersive axes={axes} selectedExpiry={row.listed_index} selectedStrike={selectedStrike??undefined} cut={cut} onSelect={selectPoint} camera={camera} onCameraChange={setCamera}/>:<div className="vol-lab-grid"><table><caption>{metricLabel} · {measure==='iv'?'annualized %':'per underlying price unit'} · listed expiry × native NS</caption><thead><tr><th>Expiry</th>{gridNodes.map(ns=><th key={ns}>{ns}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.listed_index}><th><button onClick={()=>selectExpiry(r.listed_index)}>{expiryLabel(r.expiry)}</button></th>{gridNodes.map(ns=>{const p=(measure==='iv'?r.points:r.density_points??[]).find(p=>p.ns===ns),value=p?(measure==='iv'?('iv'in p&&finite(p.iv)?p.iv*100:null):('pdf'in p?p.pdf:null)):null;return <td key={ns}>{pretty(value)}</td>})}</tr>)}</tbody></table></div>}
  </div>
  <header className="vol-lab-header"><div className="vol-lab-identity"><span className="vol-lab-eyebrow">VOLATILITY EXPLORER</span><h2>{surface.ticker}<span>{history?'Historical snapshot':'Pinned market snapshot'}</span></h2><p>{expiryLabel(surface.native_asof)}</p></div><div className="vol-lab-tools" onPointerDown={e=>e.stopPropagation()}>
   <div className="vol-lab-switch" aria-label="Model measure"><button aria-pressed={measure==='iv'} onClick={()=>setMeasure('iv')}>IV</button><button aria-pressed={measure==='pdf'} disabled={!pdfAvailable} title={pdfAvailable?'Native Vola pdfsAtT':'Native density API is unavailable on this data service'} onClick={()=>setMeasure('pdf')}>Density</button></div>
   <div className="vol-lab-switch" aria-label="Scene rendering"><button aria-pressed={rendering==='scatter'} onClick={()=>{setRendering('scatter');setView('3d')}}>Scatter</button><button aria-pressed={rendering==='surface'} onClick={()=>{setRendering('surface');setView('3d')}}>Surface</button></div>
   <div className="vol-lab-switch" aria-label="Explorer mode"><button aria-pressed={view==='3d'} onClick={()=>setView('3d')}>3D explorer</button><button aria-pressed={view==='grid'} onClick={()=>setView('grid')}>Vol grid</button></div>
   <button className="vol-lab-icon" aria-pressed={axes==='quiet'} onClick={()=>setAxes(a=>a==='quiet'?'off':'quiet')} title="Toggle axes and grid">Axes</button><button className="vol-lab-icon" onClick={resetView}>Reset</button>
  </div></header>
  <div className={'vol-lab-slice-dock'+(expanded?' is-expanded':'')}><button className="vol-lab-slice-toggle" aria-expanded={open} aria-controls={dockId} onClick={()=>setOpen(value=>!value)}><span>⌁</span> Slice explorer <small>{open?'Collapse ▾':'Expand ▴'}</small></button>
  <AnimatePresence initial={false}>{open&&<motion.aside key="selected-slice" id={dockId} className={'vol-lab-card'+(expanded?' is-expanded':'')} drag dragControls={drag} dragListener={false} dragConstraints={stage} dragMomentum={false} dragElastic={.04} style={{x:cardX,y:cardY}} initial={{opacity:0,translateY:12}} animate={{opacity:1,translateY:0}} exit={{opacity:0,translateY:8}} transition={{duration:.18}} aria-label="Selected slice tear sheet" data-testid="floating-slice-card" onPointerDown={e=>e.stopPropagation()}>
   <header className="vol-lab-card-handle"><div onPointerDown={e=>drag.start(e)} style={{touchAction:'none'}}><span className="vol-lab-grip">⠿</span><div><small>SELECTED {slice==='expiry'?'EXPIRY':'STRIKE'} · {measure==='iv'?'IMPLIED VOL':'NATIVE PDF'}</small><h3>{slice==='expiry'?expiryLabel(row.expiry):(cut.kind==='KF'?'K/F '+pretty(cut.value*100)+'%':cut.kind+' '+pretty(cut.value))}</h3></div></div><nav><button aria-label={expanded?'Collapse slice card':'Expand slice card'} onClick={()=>setExpanded(e=>!e)}>{expanded?'↙':'↗'}</button><button aria-label="Close slice card" onClick={()=>setOpen(false)}>×</button></nav></header>
   <div className="vol-lab-workbench">  <aside className="vol-lab-rails" onPointerDown={e=>e.stopPropagation()} aria-label="Slice selection"><div className="vol-lab-rail-title">Explore a slice<span>Native listed expiries</span></div>
   <label>Expiry <strong>{expiryLabel(row.expiry)}</strong><input aria-label="Explorer expiry slider" type="range" min="0" max={rows.length-1} step="1" value={rows.indexOf(row)} onChange={e=>selectExpiry(rows[Number(e.target.value)].listed_index)}/></label>
   <label>Term cut<select aria-label="Term cut coordinate" value={cut.kind} onChange={e=>{const kind=e.target.value as CutSelection['kind'];setCut({kind,value:kind==='KF'?1:kind==='NS'?0:selectedStrike??1})}}><option value="KF">Forward moneyness · K/F</option><option value="NS">Normalized strike · NS</option><option value="K">Absolute strike · K</option></select></label>
   <label>{cut.kind==='KF'?'Forward moneyness':cut.kind==='NS'?'Normalized strike':'Absolute strike'}<strong>{cut.kind==='KF'?pretty(cut.value*100)+'%':pretty(cut.value)}{selectedStrike!==null?' · K '+pretty(selectedStrike):''}</strong><input aria-label="Explorer strike slider" type="range" min={cutDomain?Math.min(cutDomain.min,cut.value):cut.value} max={cutDomain?Math.max(cutDomain.max,cut.value):cut.value} step={cutDomain?(cutDomain.max-cutDomain.min)/200:1} disabled={!cutDomain} value={cut.value} onChange={e=>{setCut({...cut,value:Number(e.target.value)});setOpen(true)}}/><small className="vol-lab-domain-note">{cutDomain?'Slider follows the shared native sample range.':'No shared sample range; enter an exact coordinate.'}</small><input aria-label="Exact term cut value" type="number" step="any" value={cut.value} onChange={e=>{const value=Number(e.target.value);if(Number.isFinite(value)&&(cut.kind==='NS'||value>0))setCut({...cut,value})}}/></label>
   {measure==='iv'&&<label className="vol-lab-inline">Coordinates<select aria-label="Explorer coordinates" value={coordinate} onChange={e=>setCoordinate(e.target.value as 'K'|'NS')}><option value="NS">Normal strike</option><option value="K">Absolute strike</option></select></label>}
  </aside>
   <div className="vol-lab-card-body"><aside className="vol-lab-facts"><strong>{measure==='iv'?percent(selectedValue):pretty(selectedValue)}<small>{measure==='iv'?'annualized IV':'PDF / price unit'}</small></strong><dl><dt>Strike</dt><dd>{pretty(selectedStrike)}</dd><dt>Forward</dt><dd>{pretty(row.forward)}</dd><dt>Spot</dt><dd>{pretty(surface.spot)}</dd><dt>Tenor</dt><dd>{days===null?'—':days<1?pretty(days*24)+' h':pretty(days)+' d'}</dd>{measure==='pdf'?<><dt>Grid mass</dt><dd>{pretty(row.sampled_density_mass)}</dd></>:<><dt>Native inputs</dt><dd>{loadingInputs?'Loading…':inputs?.state==='available'?inputs.total:'Unavailable'}</dd></>}</dl></aside>
    <div className="vol-lab-cut"><div className="vol-lab-cut-tabs"><button aria-pressed={slice==='expiry'} onClick={()=>setSlice('expiry')}>Expiry slice</button><button aria-pressed={slice==='strike'} onClick={()=>setSlice('strike')}>Strike term</button></div>
     {measure==='pdf'?<DensitySlice rows={rows} index={row.listed_index} strike={selectedStrike} term={slice==='strike'} cut={cut}/>:slice==='expiry'?<Smile base={row} coordinate="K" inputs={inputs} selectedStrike={selectedStrike??undefined} defaultShowAll/>:selectedStrike!==null?<StrikeTerm surface={surface} rows={rows} strike={selectedStrike} cut={cut} inputs={inputs?.selection?.view==='strike'?inputs:null}/>:null}
    </div></div></div>
   <footer>{outsideGrid&&<span className="vol-lab-extrapolation">Selected coordinate is outside the displayed native grid at this expiry. The slice retains the exact model value. </span>}{measure==='pdf'?'Native Vola pdfsAtT · inverse price units · finite strike window; values are not renormalized.':slice==='strike'?'Exact native evaluation at the selected coordinate across expiries. Green inputs retain their actual observed strikes.':'Native fitted curve · green bands are input IV ± native quote error.'}</footer>
  </motion.aside>}</AnimatePresence></div>
  <div className="vol-lab-scene-note"><i/> Exact saved model <span>Drag to orbit · scroll to zoom · click a point to inspect</span></div>
 </section></MotionConfig>;
}
