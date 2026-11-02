/** Preview-only structural boundary for the source-resolved host theme package. */
declare module '@preview/themes' {
 import type {AppearanceSnapshot} from '@sampo/contracts';
 export const appearancePresets:readonly {id:string;title:string;systemTheme:string;colorMode:'light'|'dark';palette:string}[];
 export function resolveAppearancePreset(id:string,options?:Record<string,unknown>):Omit<AppearanceSnapshot,'revision'|'support'|'themeId'>&{id:string;profileTitle:string;variables:Record<string,string>;reasons:string[]};
}

declare module '@preview/optics' {
 import type {RefObject} from 'react';
 export function useOpticalScene(root:RefObject<HTMLElement|null>,source:RefObject<HTMLElement|null>,options:{theme:string;effects:string;reducedTransparency:boolean;optics:'frosted'|'regular'|'clear';renderer:'scene'|'backdrop';mode:'light'|'dark'}):string;
}
