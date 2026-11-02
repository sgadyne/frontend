import {useState} from 'react';
import type {AssetDirectoryEntry} from './contracts';
export function AssetBadge({ticker,entry,size='normal'}:{ticker:string;entry?:AssetDirectoryEntry;size?:'small'|'normal'|'large'}){const [failed,setFailed]=useState(false);const logo=entry?.logo?.startsWith('/')&&!entry.logo.startsWith('//')?entry.logo:null;return <span className={'market-asset-badge '+size} aria-hidden="true">{logo&&!failed?<img src={logo} onError={()=>setFailed(true)} loading="lazy" alt=""/>:<span>{ticker.replace(/[^A-Z0-9]/g,'').slice(0,2)}</span>}</span>;}
