import {useState,type ReactNode} from 'react';
export function TickerPanel({id,title,description,initialOpen=false,children}:{id:string;title:string;description?:string;initialOpen?:boolean;children:ReactNode}){
 const [open,setOpen]=useState(initialOpen),[visited,setVisited]=useState(initialOpen);
 return <section className={'ops-ticker-panel'+(open?' is-open':'')} id={id}><button className="ops-panel-heading" aria-expanded={open} aria-controls={id+'-body'} onClick={()=>{setOpen(!open);setVisited(true)}}><span className="ops-panel-chevron">{open?'−':'+'}</span><span><b>{title}</b>{description&&<small>{description}</small>}</span></button><div id={id+'-body'} hidden={!open}>{visited&&children}</div></section>;
}
