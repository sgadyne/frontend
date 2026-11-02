/** Preview-only structural boundary for the source-resolved host theme package. */
declare module '@preview/themes' {
 import type {AppearanceSnapshot} from '@sampo/contracts';
 export const appearancePresets:readonly {id:string;title:string;systemTheme:string;colorMode:'light'|'dark';palette:string}[];
 export function resolveAppearancePreset(id:string,options?:Record<string,unknown>):Omit<AppearanceSnapshot,'revision'|'support'|'themeId'>&{id:string;profileTitle:string;variables:Record<string,string>;reasons:string[]};
}
