const paths: Record<string, string> = {
  expand: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',
  pin: 'm8 3 8 0-1 6 4 4H5l4-4-1-6ZM12 13v8',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  chart: 'M3 3v18h18M6 15l4-5 4 3 6-8',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  branches: 'M5 3v12a4 4 0 0 0 4 4h8M5 7h12M17 4v6M17 16v6',
  pulse: 'M2 12h5l3-8 4 16 3-8h5',
  sliders: 'M4 4v16M12 4v16M20 4v16M1 8h6M9 16h6M17 9h6',
  table: 'M3 4h18v16H3zM3 9h18M9 9v11M15 9v11',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M18 18a8 8 0 0 1-13-2',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  download: 'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  chevron: 'm9 5 7 7-7 7',
};

export function Icon({name, size = 18}: {name: string; size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.chart} /></svg>;
}
