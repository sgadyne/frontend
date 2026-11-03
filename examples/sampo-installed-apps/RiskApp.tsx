import {useEffect,useState} from 'react';
import type {WidgetProps} from '@sampo/sdk-react';
import {RiskLensSession} from '../../apps/pod-risk-lens/src/features/risk-lens/session';
import {RiskLensSessionProvider} from '../../apps/pod-risk-lens/src/features/risk-lens/sessionProvider';
import {RiskLensAppView} from '../../apps/pod-risk-lens/src/App';
import '../../apps/pod-risk-lens/src/styles.css';
import {riskProvider} from './risk-fixture';
import {Frame,RelatedOverview,Unavailable,useFixtureContext,usePortableWriter} from './fixture-frame';
import {portableRiskState,restoreRiskState} from './portable-state';
function RiskView(props:WidgetProps){
  const {host}=useFixtureContext();
  const [session]=useState(()=>new RiskLensSession(restoreRiskState(props.viewState,props.config),riskProvider));
  const [write,problem]=usePortableWriter(portableRiskState,props.onViewStateChange);
  useEffect(()=>{
    const publish=()=>write(session.serialize());
    const unsubscribe=session.subscribe(publish);session.start();publish();
    return ()=>{unsubscribe();session.dispose();};
  },[session,write]);
  return <>{problem?<p role="status">{problem}</p>:null}<RelatedOverview target="vfo"/><RiskLensSessionProvider session={session}><RiskLensAppView portalContainer={host.getPortalContainer?.()}/></RiskLensSessionProvider></>;
}
export function Risk(props:WidgetProps){
  const context=useFixtureContext();let valid=true;try{restoreRiskState(props.viewState,props.config);}catch{valid=false;}
  return <Frame>{valid?<RiskView key={context.key} {...props}/>:<Unavailable/>}</Frame>;
}
export {Risk as RiskApp};
