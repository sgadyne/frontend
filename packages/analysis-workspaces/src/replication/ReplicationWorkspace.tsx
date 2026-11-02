import {useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {useHost, type HostServices, type WidgetProps} from '@sampo/sdk-react';
import {formatDataValue, type HostEnvironmentSnapshot, type JsonValue, type PublicationReference} from '@sampo/contracts';
import {object} from '../contracts.ts';
import {readPrepared} from '../prepared.ts';
import {MetricStrip} from '../visuals.tsx';
import {Icon} from '../Icon.tsx';
import {emptySelection, jsonState, parseCatalogue, parseResult, parseSelection, restoreState, type ReportCatalogue, type ReportResult, type ReportSelection, type WorkspaceState} from './contracts.ts';
import {reportRegistry, type ReportDefinition} from './reports.ts';
import {ChartWidget, Empty, HierarchyPicker, ResultGrid} from './widgets.tsx';
import './replication.css';

const absent: HostEnvironmentSnapshot = {scope: null, generation: 0};
const emptySubscribe = () => () => {}, emptySnapshot = () => absent;
const message = (error: unknown) => error instanceof Error ? error.message : 'The selected report could not be read.';

export function ReplicationWorkspace(props: WidgetProps & {reports:readonly ReportDefinition[]}) {
  const host = useHost(), environment = useSyncExternalStore(host.environment?.subscribe ?? emptySubscribe, host.environment?.getSnapshot ?? emptySnapshot, emptySnapshot);
  const config = object(props.config) ? props.config : {};
  if(!props.reports?.length)return <Empty title="No report definitions configured" detail="Supply the report catalogue from the application composition." />;
  if (typeof config.bindingId !== 'string' || !config.bindingId || /[\s/\\]/.test(config.bindingId)) return <Empty title="A Replication read binding is required" detail="Select the installed application binding in the workspace configuration." />;
  if (!host.environment || !host.data || !environment.scope) return <Empty title="Select an authorized Sampo environment" detail="This workspace uses the host's account and prepared-data services." />;
  const scopeKey = JSON.stringify([host.workspaceId, config.bindingId, environment.scope]);
  return <Workbench key={`${scopeKey}:${environment.generation}`} {...props} host={host} bindingId={config.bindingId} scopeKey={scopeKey} />;
}

function Workbench({host, bindingId, scopeKey, viewState, onViewStateChange,reports}: WidgetProps & {host: HostServices; bindingId: string; scopeKey: string;reports:readonly ReportDefinition[]}) {
  const reportById=useMemo(()=>reportRegistry(reports),[reports]);
  const sections=useMemo(()=>[...new Set(reports.map(r=>r.section))],[reports]);
  const savedViewId = useId(), persisted = useRef('');
  const [state, setState] = useState<WorkspaceState>(() => restoreState(object(viewState) && viewState.scopeKey === scopeKey ? viewState.state : null,reports));
  const [catalogue, setCatalogue] = useState<ReportCatalogue | null>(null), [catalogueError, setCatalogueError] = useState('');
  const [result, setResult] = useState<{value: ReportResult; reference: PublicationReference; partial: boolean} | null>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState<ReportSelection>(emptySelection()), [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(''), [paletteOpen, setPaletteOpen] = useState(false), [notice, setNotice] = useState('');
  const [saveOpen, setSaveOpen] = useState(false), [saveName, setSaveName] = useState('');
  const [inspector, setInspector] = useState<{title: string; row: Record<string, JsonValue>} | null>(null);
  const report = reportById.get(state.reportId)!, view = report.views.find(v => v.id === state.viewId) ?? report.views[0];
  const selection = state.selections[report.id], encoded = selection ? JSON.stringify(selection) : '';
  const entry = catalogue?.reports.find(r => r.id === report.id);
  const snapshots = [...entry?.snapshots ?? []].sort((a, b) => b.date.localeCompare(a.date));
  const snapshot = snapshots.find(s => s.id === selection?.snapshotId);
  const available = !!snapshot?.views.includes(view.id);
  const dirty = JSON.stringify(draft) !== encoded;
  const current = result?.value;
  const chartGroup = (chart: ReportResult['charts'][number]) => chart.kind === 'timeline' ? chart.series[0]?.unit ?? '' : chart.unit;
  const chartGroups = [...new Set(current?.charts.map(chartGroup) ?? [])];
  const groupKey = `${report.id}:${view.id}`;
  const chosenGroup = chartGroups.includes(state.chartGroups[groupKey]) ? state.chartGroups[groupKey] : chartGroups[0];
  const displayedCharts = current?.charts.filter(chart => chartGroup(chart) === chosenGroup) ?? [];
  const commit = (update: WorkspaceState | ((old: WorkspaceState) => WorkspaceState)) => setState(old => typeof update === 'function' ? update(old) : update);

  useEffect(() => {const encoded = JSON.stringify([scopeKey, state]); if (persisted.current !== encoded) {persisted.current = encoded; onViewStateChange?.({scopeKey, state: jsonState(state)});}}, [state, scopeKey, onViewStateChange]);
  useEffect(() => {
    const controller = new AbortController(); setCatalogueError('');
    readPrepared(host.data!, bindingId, {operation: 'replication-catalogue'}, controller.signal).then(read => {
      if (!controller.signal.aborted) {if (!read) setCatalogueError('No Replication report catalogue is available.'); else setCatalogue(parseCatalogue(read.value,reports));}
    }).catch(reason => {if (!controller.signal.aborted) setCatalogueError(message(reason));});
    return () => controller.abort();
  }, [host.data, bindingId, refresh]);
  useEffect(() => {
    if (!catalogue || selection) return;
    const latest = catalogue.reports.find(r => r.id === report.id)?.snapshots.filter(s => s.views.includes(view.id)).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest) commit(old => ({...old, selections: {...old.selections, [report.id]: emptySelection(latest.id)}}));
  }, [catalogue, report.id, view.id, selection]);
  useEffect(() => {setDraft(selection ? structuredClone(selection) : emptySelection());}, [encoded, report.id]);
  useEffect(() => {
    setResult(null); setError(''); setInspector(null); setPending(false);
    if (!selection || !available) return;
    const controller = new AbortController(); setPending(true);
    const expected = {reportId: report.id, viewId: view.id, snapshotId: selection.snapshotId};
    readPrepared(host.data!, bindingId, {operation: 'replication-report', report: report.id, view: view.id, selection: encoded}, controller.signal).then(read => {
      if (controller.signal.aborted) return;
      if (!read) {setError('This published report is no longer available. Refresh the report catalogue to select a retained snapshot.'); return;}
      setResult({value: parseResult(read.value, expected), reference: read.reference, partial: read.partial});
    }).catch(reason => {if (!controller.signal.aborted) setError(message(reason));}).finally(() => {if (!controller.signal.aborted) setPending(false);});
    return () => controller.abort();
  }, [host.data, bindingId, report.id, view.id, encoded, available, refresh]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {e.preventDefault(); setPaletteOpen(x => !x);}};
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);

  function select(value: ReportSelection) {const validated = parseSelection(value); if (!validated) {setNotice('Choose a valid historical date range.'); return;} commit(old => ({...old, selections: {...old.selections, [report.id]: validated}}));}
  function changeView(id: string) {
    const allowed = entry?.viewFilters?.[id];
    if (selection && allowed) {
      const next = {...selection, filters: Object.fromEntries(Object.entries(selection.filters).filter(([key]) => allowed.includes(key)))};
      if (Object.entries(selection.filters).some(([key, values]) => values.length && !allowed.includes(key))) setNotice('Filters not supported by this view were cleared.');
      setDraft(structuredClone(next));
      commit(old => ({...old, viewId: id, selections: {...old.selections, [report.id]: next}}));
    } else {if (selection) setDraft(structuredClone(selection)); commit(old => ({...old, viewId: id}));}
  }
  function navigate(id: string, linked = false) {
    const target = reportById.get(id); if (!target) return;
    setNotice(''); setFiltersOpen(false); setPaletteOpen(false); setSearch('');
    const matching = linked && snapshot ? catalogue?.reports.find(r => r.id === id)?.snapshots.find(s => s.date === snapshot.date) : null;
    if (linked && snapshot) setNotice(matching ? `Snapshot ${snapshot.date} carried to this report. Book and asset filters are reset; each report has its own supported scope.` : `No snapshot matching ${snapshot.date} is published here. Choose a snapshot explicitly.`);
    commit(old => {
      const next = {...old, reportId: id, viewId: target.views[0].id};
      if (linked && snapshot) {
        next.selections = {...next.selections, [id]: {...emptySelection(matching?.id), start: selection?.start ?? '', end: selection?.end ?? ''}};
      }
      return next;
    });
  }
  function filter(values: Record<string, string[]>) {setDraft(old => ({...old, filters: {...old.filters, ...values}})); setFiltersOpen(true); setNotice('Drilldown selected. Apply filters to update the report.');}
  function saveView() {
    if (!selection || !saveName.trim()) return;
    commit(old => ({...old, savedViews: [...old.savedViews, {id: crypto.randomUUID(), name: saveName.trim(), reportId: report.id, viewId: view.id, selection: structuredClone(selection)}]}));
    setSaveName(''); setSaveOpen(false); setNotice('View saved in your personal Sampo workspace.');
  }
  const filteredReports = useMemo(() => reports.filter(r => `${r.title} ${r.description} ${r.section}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [search,reports]);
  const gridColumns = (id: string) => state.columns[`${report.id}:${view.id}:${id}`];
  const notes = [...(result?.partial ? ['This report has partial coverage.'] : []), ...current?.warnings ?? []];

  return <div className="analysis-workspace replication-workbench">
    <aside className="rep-sidebar"><div className="rep-brand"><span><Icon name="layers" size={24} /></span><div><strong>Replication</strong><small>Trading workbench</small></div></div>
      <button className="rep-report-search" onClick={() => setPaletteOpen(true)}><Icon name="search" size={15} /><span>Find a report</span><kbd>⌘K</kbd></button>
      <nav aria-label="Replication reports">
        {!!state.pinned.length && <section><h2>Pinned</h2>{state.pinned.map(id => {const r = reportById.get(id)!; return <button key={id} aria-current={report.id === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon name={r.icon} size={15} /><span>{r.title}</span></button>;})}</section>}
        {sections.map(section => <details key={section} open={section === report.section || undefined}><summary>{section}<Icon name="chevron" size={12} /></summary>{reports.filter(r => r.section === section).map(r => <button key={r.id} aria-current={report.id === r.id ? 'page' : undefined} onClick={() => navigate(r.id)}><Icon name={r.icon} size={15} /><span>{r.title}</span></button>)}</details>)}
      </nav><div className="rep-sidebar-foot"><span />Read-only data · Sampo identity</div>
    </aside>
    <div className="rep-content">
      <header className="rep-header"><div><p>{report.section}<Icon name="chevron" size={11} /><span>{report.title}</span></p><div className="rep-title"><h1>{report.title}</h1><button className="rep-pin" aria-pressed={state.pinned.includes(report.id)} aria-label={`${state.pinned.includes(report.id) ? 'Unpin' : 'Pin'} ${report.title}`} onClick={() => commit(old => ({...old, pinned: old.pinned.includes(report.id) ? old.pinned.filter(id => id !== report.id) : [...old.pinned, report.id]}))}><Icon name="pin" size={16} /></button></div><p className="rep-description">{report.description}</p></div>
        <div className="rep-header-actions"><label className="analysis-sr-only" htmlFor={savedViewId}>Saved view</label><select id={savedViewId} value="" onChange={e => {const saved = state.savedViews.find(s => s.id === e.target.value); if (saved) {commit(old => ({...old, reportId: saved.reportId, viewId: saved.viewId, selections: {...old.selections, [saved.reportId]: structuredClone(saved.selection)}})); setNotice(`Opened saved view “${saved.name}”.`);}}}><option value="">Saved views</option>{state.savedViews.map(s => <option key={s.id} value={s.id}>{s.name} · {reportById.get(s.reportId)?.title}</option>)}</select>
          <button disabled={!selection || pending} onClick={() => setSaveOpen(true)}><Icon name="bookmark" size={15} />Save view</button><button aria-label="Refresh report catalogue" onClick={() => setRefresh(x => x + 1)}><Icon name="refresh" size={16} /></button></div>
      </header>
      <nav className="rep-view-tabs" aria-label={`${report.title} views`}>{report.views.map(v => <button key={v.id} aria-current={view.id === v.id ? 'page' : undefined} onClick={() => changeView(v.id)}>{v.label}</button>)}</nav>
      <section className="rep-context" aria-label="Report context"><label>As-of snapshot<select value={draft.snapshotId} disabled={!catalogue || pending} onChange={e => {select({...emptySelection(e.target.value), start: draft.start, end: draft.end}); setNotice('Snapshot changed; scope filters reset.');}}><option value="">Select snapshot</option>{snapshots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label>History from<input aria-label="History from" type="date" value={draft.start} max={draft.end || current?.historicalRange?.end} min={current?.historicalRange?.start} onChange={e => setDraft(old => ({...old, start: e.target.value}))} disabled={!selection || pending || !current?.historicalRange} /></label>
        <label>History to<input aria-label="History to" type="date" value={draft.end} min={draft.start || current?.historicalRange?.start} max={current?.historicalRange?.end} onChange={e => setDraft(old => ({...old, end: e.target.value}))} disabled={!selection || pending || !current?.historicalRange} /></label>
        <div className="rep-context-actions"><button aria-expanded={filtersOpen} onClick={() => setFiltersOpen(x => !x)}><Icon name="sliders" size={15} />Filters{Object.values(draft.filters).some(v => v.length) && <b>{Object.values(draft.filters).reduce((n, v) => n + v.length, 0)}</b>}</button><button className="analysis-primary" disabled={!draft.snapshotId || pending || !dirty || !parseSelection(draft)} onClick={() => select(draft)}><Icon name="check" size={15} />Apply</button></div>
      </section>
      {!!Object.entries(draft.filters).some(([, values]) => values.length) && <div className="rep-filter-chips">{Object.entries(draft.filters).flatMap(([key, values]) => values.map(value => <button key={`${key}:${value}`} onClick={() => setDraft(old => ({...old, filters: {...old.filters, [key]: old.filters[key].filter(v => v !== value)}}))}>{current?.filters.find(f => f.key === key)?.label ?? key}: {current?.filters.find(f => f.key === key)?.options.find(o => o.id === value)?.label ?? value}<Icon name="close" size={11} /></button>))}</div>}
      {notice && <div className="rep-notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}><Icon name="close" size={13} /></button></div>}
      {dirty && selection && !pending && <div className="rep-draft">Unapplied changes · charts show the last applied selection.<button onClick={() => setDraft(structuredClone(selection))}>Discard</button></div>}
      <div className={`rep-body${filtersOpen ? ' with-filters' : ''}`}>
        {filtersOpen && <aside className="rep-filter-panel"><header><h2>Report filters</h2><button aria-label="Close filters" onClick={() => setFiltersOpen(false)}><Icon name="close" size={14} /></button></header>{current?.filters.length ? current.filters.map(f => <HierarchyPicker key={f.key} filter={f} selected={draft.filters[f.key] ?? []} onChange={values => setDraft(old => ({...old, filters: {...old.filters, [f.key]: values}}))} />) : <p>No additional filters are published for this view.</p>}<button className="analysis-primary" disabled={!draft.snapshotId || pending || !dirty || !parseSelection(draft)} onClick={() => select(draft)}>Apply filters<Icon name="arrow" size={14} /></button></aside>}
        <main className={`rep-report rep-layout-${view.layout}`} aria-busy={pending}>
          {catalogueError && <Empty title="Report catalogue unavailable" detail={catalogueError}><button onClick={() => setRefresh(x => x + 1)}>Retry</button></Empty>}
          {pending && <div className="rep-loading" role="status"><span className="analysis-spinner" />Reading {report.title}…<div className="analysis-skeleton-metrics">{[0, 1, 2, 3].map(i => <i key={i} />)}</div><div className="analysis-skeleton-chart" /></div>}
          {error && <div className="analysis-error" role="alert"><strong>Could not read this report</strong><p>{error}</p><button onClick={() => setRefresh(x => x + 1)}>Refresh and retry</button></div>}
          {!pending && !catalogueError && !error && catalogue && !available && <Empty title={snapshots.length ? 'Select a published snapshot and view' : 'No published snapshot for this report'} detail={entry?.reason ?? 'This view requires its own completed cached report. Opening it does not run a refresh or contact upstream services.'} />}
          {!!notes.length && <details className="analysis-notes"><summary>{notes.length} data {notes.length === 1 ? 'note' : 'notes'}{result?.partial && ' · partial coverage'}</summary>{notes.map((n, i) => <p key={i}>{n}</p>)}</details>}
          {current && <><div className="rep-basis"><span>{current.basis}</span><span>As of {current.asOf}</span></div>{!!current.metrics.length && <MetricStrip items={current.metrics} />}
            {chartGroups.length > 1 && <div className="rep-chart-group"><label>Chart group<select value={chosenGroup} onChange={e => {const value = e.target.value; commit(old => ({...old, chartGroups: {...old.chartGroups, [groupKey]: value}}));}}>{chartGroups.map(group => <option key={group} value={group}>{group}</option>)}</select></label><span>1 of {chartGroups.length} groups · presentation only; tables retain all selected rows</span></div>}
            <div className="rep-chart-stack">{displayedCharts.map(chart => <ChartWidget key={`${report.id}:${view.id}:${chart.id}`} chart={chart} onFilter={filter} onInspect={(title, row) => setInspector({title, row})} />)}</div>
            {current.tables.map(table => <ResultGrid key={`${report.id}:${view.id}:${selection?.snapshotId}:${table.id}`} table={table} columns={gridColumns(table.id)} onColumns={columns => commit(old => ({...old, columns: {...old.columns, [`${report.id}:${view.id}:${table.id}`]: columns}}))} onInspect={(title, row) => setInspector({title, row})} />)}
            {!current.tables.length && !current.charts.length && <Empty title="No observations match this selection" detail="The report completed without matching rows. Clear filters or choose another retained snapshot." />}
          </>}
          {!!report.related.length && <footer className="rep-related"><span>RELATED VIEWS</span>{report.related.map(id => <button key={id} onClick={() => navigate(id, true)}>{reportById.get(id)!.title}<Icon name="arrow" size={13} /></button>)}</footer>}
          {result && <details className="rep-provenance"><summary>Data details</summary><pre>{JSON.stringify(result.reference, null, 2)}</pre></details>}
        </main>
      </div>
    </div>
    {paletteOpen && <Modal title="Find a report" onClose={() => {setPaletteOpen(false); setSearch('');}}><label className="analysis-search"><Icon name="search" /><input aria-label="Find a report" autoFocus type="search" placeholder="Search reports, books, rates…" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="rep-command-results">{filteredReports.map(r => <button key={r.id} onClick={() => navigate(r.id)}><Icon name={r.icon} /><span><strong>{r.title}</strong><small>{r.section} · {r.description}</small></span><Icon name="arrow" size={14} /></button>)}{!filteredReports.length && <p>No matching reports.</p>}</div></Modal>}
    {saveOpen && <Modal title="Save this view" onClose={() => setSaveOpen(false)}><p>Save the applied report, snapshot, date range and scope filters in your personal Sampo workspace. No calculation or schedule is created.</p><label>View name<input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Morning review" /></label><button className="analysis-primary" disabled={!saveName.trim()} onClick={saveView}>Save view</button></Modal>}
    {inspector && <Modal title={inspector.title} drawer onClose={() => setInspector(null)}><p className="rep-inspector-context">{report.title} · {current?.asOf}</p><dl className="rep-inspector-values">{Object.entries(inspector.row).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{formatDataValue(value)}</dd></div>)}</dl><h3>Continue analysis</h3>{report.related.map(id => <button className="rep-inspector-link" key={id} onClick={() => {setInspector(null); navigate(id, true);}}>{reportById.get(id)!.title}<Icon name="arrow" size={14} /></button>)}</Modal>}
  </div>;
}
function Modal({title, onClose, children, drawer = false}: {title: string; onClose: () => void; children: ReactNode; drawer?: boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {const dialog = ref.current!; dialog.showModal(); return () => {dialog.close();};}, []);
  return <dialog ref={ref} className={`rep-dialog${drawer ? ' rep-drawer' : ''}`} aria-label={title} onCancel={onClose}><header><h2>{title}</h2><button aria-label={`Close ${title}`} onClick={onClose}><Icon name="close" size={18} /></button></header>{children}</dialog>;
}
