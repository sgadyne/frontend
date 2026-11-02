import {createContext, useContext, useMemo, type CSSProperties, type HTMLAttributes, type ReactNode} from 'react';
import type {AppearanceSnapshot} from '@sampo/contracts';
import './styles.css';

/** Renderer inputs, independent of Plotly/AG Grid and of any data provider. */
export interface ChartAppearance {background:string; foreground:string; muted:string; border:string; accent:string; mode:'light'|'dark'; revision:number}
const Context = createContext<ChartAppearance | null>(null);
const aliases:Record<string,string> = {'canvas':'color.background','panel':'color.surface','ink':'color.text','muted':'color.text.muted','line':'color.border','accent':'color.primary','accent-soft':'color.primary.soft','focus':'color.focus','success':'color.success','warning':'color.warning','danger':'color.danger','surface-raised':'color.surface.raised','surface-sunken':'color.surface.sunken','font-family':'typography.family','control-radius':'shape.control.radius','surface-radius':'shape.surface.radius','overlay-radius':'shape.overlay.radius','motion-feedback':'motion.feedback','motion-transition':'motion.transition'};
export function appearanceVariables(appearance:AppearanceSnapshot):CSSProperties {
  const values:Record<string,string>={colorScheme:appearance.mode};
  const primary=appearance.tokens['color.primary'];
  const rgb=/^#[0-9a-f]{6}$/i.test(primary??'')?[1,3,5].map(i=>parseInt(primary.slice(i,i+2),16)/255):null;
  const luminance=rgb?rgb.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0):appearance.mode==='dark'?1:0;
  values['--sampo-on-accent']=luminance>.179?'#101820':'#ffffff';
  for(const [alias,key] of Object.entries(aliases)) if(appearance.tokens[key]) values['--sampo-'+alias]=appearance.tokens[key];
  for(const [role,surface] of Object.entries(appearance.surfaces)) values['--sampo-surface-'+role]=surface.fill;
  values['--sampo-theme-chrome']=appearance.surfaces.chrome.fill;
  values['--sampo-theme-content']=appearance.surfaces.content.fill;
  values['--sampo-series-2']=appearance.mode==='dark'?'#a5b6e3':'#5877ad';
  values['--sampo-series-3']=appearance.mode==='dark'?'#d9ac7d':'#9b6d38';
  return values as CSSProperties;
}
/** Standalone consumers may supply a resolved appearance without a Sampo host. */
export function AppearanceProvider({appearance,children,className='',...rest}:HTMLAttributes<HTMLDivElement>&{appearance:AppearanceSnapshot;children:ReactNode}) {
  const chart=useMemo(()=>({background:appearance.surfaces.content.fill,foreground:appearance.surfaces.content.foreground,muted:appearance.surfaces.content.mutedForeground,border:appearance.surfaces.content.edge,accent:appearance.tokens['color.primary'],mode:appearance.mode,revision:appearance.revision}),[appearance]);
  return <Context.Provider value={chart}><div {...rest} className={'frontend-presentation '+className} data-material={appearance.themeId} data-color-mode={appearance.mode} data-effects={appearance.effects} data-reduced-motion={appearance.motion==='reduced'} data-reduced-transparency={appearance.transparency==='reduced'} style={{...appearanceVariables(appearance),...rest.style}}>{children}</div></Context.Provider>;
}
export const useChartAppearance=()=>useContext(Context);
export function ContextBar({children,label='Analysis context'}:{children:ReactNode;label?:string}) {return <section className="frontend-context-bar" aria-label={label}>{children}</section>;}
