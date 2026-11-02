import type {MarketGroup} from './contracts';
export const groupCategory=(category:string)=>({region:'Regions',country:'Countries',sector:'Sectors',industry:'Industries',classification:'Classifications','fund-holdings':'ETF holdings',curated:'Curated lists'}[category]??category);
export function groupTitle(group:MarketGroup){return group.title.replace(/\s*·\s*classification$/i,'').replace(/\s*·\s*([^·]+?)\s*·\s*\1 holdings$/i,' · $1').replace(/\s+holdings$/i,'');}
export const configuredCount=(group:MarketGroup,ids:Set<string>)=>new Set(group.assetIds.filter(id=>ids.has(id))).size;
