/** Application-provided UI defaults; unrelated to execution/scheduling policy. */
type Mode='positions'|'trades'|'overlap';
export interface RiskLensPresentation {referenceBook:string;defaultExclusions:Record<Mode,string[]>;defaultLabels:Record<Mode,string>;excludedBooks:string[];excludedTags:string[];currencyAliases:Record<string,string>;equityGroup:{label:string;tickers:string[];pattern:string;listedPattern:string};defaultOverlapCutoff:number;tagColors:Record<string,string>;}
export const riskLensPresentation:RiskLensPresentation={referenceBook:'REFERENCE',defaultExclusions:{positions:[],trades:[],overlap:[]},defaultLabels:{positions:'Default scope',trades:'Default scope',overlap:'Default scope'},excludedBooks:[],excludedTags:[],currencyAliases:{},equityGroup:{label:'Configured group',tickers:[],pattern:'(?!)',listedPattern:'(?!)'},defaultOverlapCutoff:0,tagColors:{}};
/** Install trusted application settings before creating the app's sessions. */
export function configureRiskLensPresentation(value:Partial<RiskLensPresentation>){Object.assign(riskLensPresentation,structuredClone(value));}
