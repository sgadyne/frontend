import React,{createContext,useContext,useMemo,type ReactNode} from 'react';
import {PlatformProvider,type HostServices} from '@sampo/sdk-react';
import {SampoAppearanceProvider} from '../../packages/presentation/src/index';
export const PreviewServices=createContext<HostServices|null>(null);
/** Synthetic data services augment, never shadow, the host's presentation/navigation services. */
export function PreviewBoundary({services,children,counters}:{services:unknown;children:ReactNode;counters:()=>unknown}) {
 const host=useContext(PreviewServices)!;
 const merged=useMemo(()=>({...services as HostServices,appearance:host.appearance,linkedNavigation:host.linkedNavigation,getPortalContainer:host.getPortalContainer}),[services,host]);
 return <PlatformProvider services={merged}><SampoAppearanceProvider>{children}</SampoAppearanceProvider></PlatformProvider>;
}
