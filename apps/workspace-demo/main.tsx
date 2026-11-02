import {createRoot} from 'react-dom/client';
import {useSyncExternalStore} from 'react';
import {VolatilityWorkspace,VfoSession} from '../../packages/vfo-workspace-core/src/index';
import {VolatilityLive} from '../../packages/vfo-workspace-core/src/volatility/VolatilityLive';
import {fixtures} from './fixture';
const lifetime=new AbortController(),session=new VfoSession({signal:lifetime.signal},{deployment:'demo'},fixtures());session.bindScope('personal:demo','demo:1');
function App(){const state=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);return <div style={{height:'100vh',display:'flex',flexDirection:'column'}}><header style={{padding:'12px 20px',background:'#183c50',color:'white',fontFamily:'system-ui',fontSize:13}}>SYNTHETIC UI DEMO · No source connections, native calibration or delivery</header><div style={{flex:1,minHeight:0}}><VolatilityWorkspace session={session} state={state} renderLive={()=> <VolatilityLive session={session} state={state}/>} renderInspector={()=> <pre>{JSON.stringify({source:'synthetic UI fixture',parameters:state.surface?.expiries.map(x=>({expiry:x.expiry,params:x.params}))},null,2)}</pre>} renderCustom={()=> <p>This standalone demo has no native what-if or publication backend. The reusable custom editor is available through the provider contract.</p>}/></div></div>}
createRoot(document.getElementById('root')!).render(<App/>);
