import {type HTMLAttributes,type ReactNode} from 'react';
import {useAppearance,DestinationLink} from '@sampo/sdk-react';
import {AppearanceProvider} from './core';
export * from './core';
/** Use at hosted app boundaries, never inside a standalone provider implementation. */
export function SampoAppearanceProvider({children,...rest}:HTMLAttributes<HTMLDivElement>&{children:ReactNode}) {return <AppearanceProvider {...rest} appearance={useAppearance()}>{children}</AppearanceProvider>;}
export function RelatedViews({items}:{items:readonly {label:string;address:Parameters<typeof DestinationLink>[0]['address'];description?:string}[]}) {return <nav className="frontend-related" aria-label="Related views">{items.map((item,i)=><div key={i}><DestinationLink address={item.address}>{item.label}</DestinationLink>{item.description&&<small>{item.description}</small>}</div>)}</nav>;}
