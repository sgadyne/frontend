export function Icon({name}:{name:string}) {
 const paths:Record<string,string>={user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',search:'m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',library:'M4 4v16M9 4v16M14 4v16M18 4l4 16',workspaces:'M3 4h18v16H3z M3 9h18 M9 9v11',activity:'M2 12h5l3-8 4 16 3-8h5',settings:'M4 6h16M4 12h16M4 18h16 M8 3v6 M16 9v6 M10 15v6',arrow:'M5 12h14m-5-5 5 5-5 5',close:'m6 6 12 12M6 18 18 6'};
 return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]??paths.workspaces}/></svg>;
}
