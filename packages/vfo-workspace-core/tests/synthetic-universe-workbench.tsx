import {useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createSemanticTokens} from '@sampo/design-tokens';
import type {AppearanceSnapshot} from '@sampo/contracts';
import {AppearanceProvider} from '../../presentation/src/core';
import {MarketUniverseWorkbench,type MarketUniverseState} from '../src/market/UniverseWorkbench';
import {normalizeMarketState} from '../src/market/universe-state';
import {marketAssets as assets,marketGroups as groups,navigation,catalogueRevision,catalogueAsOf,demoCoverage,historyWindow} from '../../../examples/sampo-installed-apps/market-universe-data';
// Fixed synthetic evidence only. This test page never falls back to real readers or job APIs.
function Fixture(){
 const [material,setMaterial]=useState('matte'),[mode,setMode]=useState<'light'|'dark'>('light'),[reduced,setReduced]=useState(false),[evidence,setEvidence]=useState('demo');
 const [state,setState]=useState(()=>normalizeMarketState({}, {assets,groups,navigation,historyWindow}));
 const coverage=useMemo(()=>{
  if(evidence==='none')return undefined;
  if(evidence==='malformed')return {...demoCoverage,rows:[{...demoCoverage.rows[0],asOf:'invalid',surfaces:'bad',intervals:[...demoCoverage.rows[0].intervals,{start:'2026-02-30'}]}]} as any;
  if(evidence==='multi')return {...demoCoverage,rows:demoCoverage.rows.map((r,i)=>i? r : {...r,intervals:[...r.intervals,
   {start:historyWindow.start,end:historyWindow.end,status:'failed' as const,source:'demo-archive',dataset:'quotes',detail:'Synthetic failed quote product'},
   {start:historyWindow.start,end:historyWindow.end,status:'gap' as const,source:'demo-other',dataset:'quotes',detail:'Synthetic gap in a distinct source'}]})};
  return demoCoverage;
 },[evidence]);
 const appearance=useMemo(()=>{
  const tokens=createSemanticTokens({}, {mode});const surface={fill:tokens['color.surface'],foreground:tokens['color.text'],mutedForeground:tokens['color.text.muted'],edge:tokens['color.border']};
  return {revision:1,support:'fallback',profileRef:'synthetic-test',themeId:material,mode,effects:reduced?'efficient':'full',motion:reduced?'reduced':'standard',transparency:reduced?'reduced':'standard',tokens,
   surfaces:Object.fromEntries(['canvas','content','inset','chrome','raised','floating'].map(key=>[key,surface]))} as AppearanceSnapshot;
 },[material,mode,reduced]);
 const restore=()=>setState(normalizeMarketState({view:'history',focused:'EQUITY:AAPL',inspectTab:'coverage',selected:['EQUITY:AAPL'],watchlist:['EQUITY:AAPL'],source:'demo-archive',dataset:'volatility-surfaces',historyStart:historyWindow.start,historyEnd:historyWindow.end,filters:{query:'AAPL'}}, {assets,groups,navigation,historyWindow}));
 return <><div id="fixture-controls" aria-label="Synthetic test controls">
  <span>Synthetic test only</span><label>Material <select aria-label="Fixture material" value={material} onChange={e=>setMaterial(e.target.value)}>{['matte','satin','glass'].map(v=><option key={v}>{v}</option>)}</select></label>
  <label>Mode <select aria-label="Fixture mode" value={mode} onChange={e=>setMode(e.target.value as 'light'|'dark')}><option>light</option><option>dark</option></select></label>
  <label><input aria-label="Fixture reduced effects" type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>Reduced effects</label>
  <label>Evidence <select aria-label="Fixture evidence" value={evidence} onChange={e=>setEvidence(e.target.value)}>{['demo','none','multi','malformed'].map(v=><option key={v}>{v}</option>)}</select></label>
  <button onClick={restore}>Restore instrument</button><button onClick={()=>setState(normalizeMarketState({}, {assets,groups,navigation,historyWindow}))}>Reset fixture</button>
  <output data-testid="fixture-state">{JSON.stringify(state)}</output>
 </div><div style={{flex:1,minHeight:0}}><AppearanceProvider appearance={appearance} style={{height:'100%',minHeight:0}}>
  <MarketUniverseWorkbench assets={assets} groups={groups} navigation={navigation} catalogueRevision={catalogueRevision} catalogueAsOf={catalogueAsOf} coverage={coverage} historyWindow={historyWindow} state={state} onStateChange={value=>setState(value as Required<MarketUniverseState>)}
    renderRelated={instrument=><p>Caller supplied related content for {instrument.assetId}</p>}/>
 </AppearanceProvider></div></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
