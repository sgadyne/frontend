import {useEffect,useRef,useState} from 'react';
import {Icon} from './icons';
export interface SearchItem {id:string;title:string;description:string;icon?:string}
export function SearchBubble({open,onClose,items,onSelect}:{open:boolean;onClose:()=>void;items:SearchItem[];onSelect:(id:string)=>void}) {
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState(''),[selected,setSelected]=useState(0);
 const matches=items.filter(item=>(item.title+' '+item.description).toLowerCase().includes(query.trim().toLowerCase()));
 useEffect(()=>{if(!open){dialog.current?.close();return;}setQuery('');setSelected(0);dialog.current?.showModal();input.current?.focus();},[open]);
 useEffect(()=>{dialog.current?.querySelector('#search-result-'+matches[selected]?.id)?.scrollIntoView({block:'nearest'});},[selected,query]);
 const choose=(id:string)=>{dialog.current?.close();onClose();onSelect(id)};
 return <dialog ref={dialog} className="demo-search-bubble" aria-label="Search your environment" onCancel={event=>{event.preventDefault();onClose()}} onClose={()=>{if(!dialog.current?.open)onClose()}} onClick={event=>{if(event.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose()}}}>
  <div className="sampo-material-plate demo-optical-plate" data-sampo-optical-surface aria-hidden="true"/>
  <div className="demo-search-input"><Icon name="search"/><input ref={input} type="search" aria-label="Search apps and workspace" role="combobox" aria-expanded={open} aria-controls="environment-results" aria-autocomplete="list" aria-activedescendant={matches[selected]?'search-result-'+matches[selected].id:undefined} placeholder="Search apps, workspaces, settings…" value={query} onChange={event=>{setQuery(event.target.value);setSelected(0)}} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setSelected(i=>matches.length?(i+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length:0)}else if(event.key==='Enter'&&matches[selected]){event.preventDefault();choose(matches[selected].id)}}}/><button aria-label="Close search" onClick={onClose}><kbd>esc</kbd></button></div>
  <div className="demo-search-results" id="environment-results" role="listbox" aria-label="Results">{matches.map((item,index)=><div role="option" aria-selected={index===selected} id={'search-result-'+item.id} key={item.id} onMouseMove={()=>setSelected(index)} onClick={()=>choose(item.id)}><Icon name={item.icon??'workspaces'}/><span><strong>{item.title}</strong><small>{item.description}</small></span><Icon name="arrow"/></div>)}{!matches.length&&<p className="demo-search-empty" role="status">No matching destinations.</p>}</div>
  <footer><span>↑ ↓ navigate</span><span>↵ open</span><span>⌘ / Ctrl K</span></footer>
 </dialog>;
}
