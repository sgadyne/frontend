import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AssetBadge} from '../src/market/AssetBadge';
import flag from '../../../assets/market-universe/logos/flag-hk.svg?url&no-inline';
function Fixture(){
 const [logo,setLogo]=useState(flag),[ticker,setTicker]=useState('TEST');
 return <><p>Synthetic local image recovery fixture</p><AssetBadge ticker={ticker} entry={{assetId:'synthetic:'+ticker,name:'Synthetic badge',source:'synthetic',logo}}/>
 <button onClick={()=>setLogo('/missing-synthetic-artwork.svg')}>Fail image</button><button onClick={()=>setLogo(flag)}>Recover image</button><button onClick={()=>{setLogo('https://example.invalid/tracking.svg');setTicker('00001');}}>Unsafe external image</button></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
