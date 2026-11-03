import {useEffect, useState} from 'react';
import type {AssetDirectoryEntry} from './contracts';
import {instrumentMonogram, instrumentBadgeTone, localArtworkUrl} from './instrument-badges';
export function AssetBadge({ticker,entry,size='normal'}:{ticker:string;entry?:AssetDirectoryEntry;size?:'small'|'normal'|'large'}) {
  const [failed,setFailed]=useState(false);
  const logo=localArtworkUrl(entry?.logo);
  useEffect(()=>setFailed(false),[entry?.assetId,ticker,logo]);
  return <span className={'market-asset-badge '+size+' tone-'+instrumentBadgeTone(entry?.assetId??ticker)} aria-hidden="true">
    {logo&&!failed?<img src={logo} onError={()=>setFailed(true)} loading="lazy" decoding="async" alt=""/>:<span>{instrumentMonogram(ticker)}</span>}
  </span>;
}
