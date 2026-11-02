import {useEffect, useId, useRef} from 'react';
import type {ScopeBarProps, ScopeDimension, ScopeOption, ScopeValue} from './contracts';
import './ScopeBar.css';

const CUSTOM_PRESET_VALUE = '__scope_custom__';

function valueSummary(dimension: ScopeDimension): string {
  if (dimension.value?.length === 0) {
    const empty = `No ${dimension.label.toLocaleLowerCase()} selected`;
    return dimension.excluded.length ? `${empty} · Exclude ${dimension.excluded.map(option => option.label).join(', ')}` : empty;
  }
  if (dimension.value === null) {
    const all = `All ${dimension.label.toLocaleLowerCase()}`;
    return dimension.excluded.length ? `${all} · Exclude ${dimension.excluded.map(option => option.label).join(', ')}` : all;
  }
  const labels = new Map(dimension.options.map(option => [option.id, option.label]));
  const selected = dimension.value.map(id => labels.get(id) ?? id);
  const excludedIds = new Set(dimension.excluded.map(option => option.id));
  const expectedSelected = dimension.options.filter(option => !excludedIds.has(option.id)).map(option => option.id);
  const selectedIds = [...dimension.value];
  const exactlyRepresentsExclusions = dimension.excluded.length > 0
    && expectedSelected.length === selectedIds.length
    && expectedSelected.every(id => selectedIds.includes(id));
  if (exactlyRepresentsExclusions) return `Exclude ${dimension.excluded.map(option => option.label).join(', ')}`;
  if (dimension.options.length > 0 && selectedIds.length === dimension.options.length
    && dimension.options.every(option => selectedIds.includes(option.id))) {
    return dimension.excluded.length
      ? `All ${dimension.label.toLocaleLowerCase()} · Exclude ${dimension.excluded.map(option => option.label).join(', ')}`
      : `All ${dimension.label.toLocaleLowerCase()}`;
  }
  const included = selected.length ? `Include ${selected.join(', ')}` : `No ${dimension.label.toLocaleLowerCase()} selected`;
  return dimension.excluded.length ? `${included} · Exclude ${dimension.excluded.map(option => option.label).join(', ')}` : included;
}

function toggleValue(dimension: ScopeDimension, option: ScopeOption, checked: boolean): ScopeValue {
  const values = new Set(dimension.value === null ? dimension.options.map(item => item.id) : dimension.value);
  if (checked) values.add(option.id);
  else values.delete(option.id);
  if (dimension.options.length > 0 && values.size === dimension.options.length
    && dimension.options.every(item => values.has(item.id))) return null;
  return [...values];
}

function DimensionMenu({dimension, index, uid, onChange}: {
  dimension: ScopeDimension;
  index: number;
  uid: string;
  onChange: (dimensionId: string, value: ScopeValue) => void;
}) {
  const groupId = `${uid}-dimension-${index}`;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const checked = (option: ScopeOption) => dimension.value === null || dimension.value.includes(option.id);
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (detailsRef.current?.open && event.target instanceof Node && !detailsRef.current.contains(event.target)) {
        detailsRef.current.open = false;
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);
  return <details ref={detailsRef} className="scope-bar__dimension" onKeyDown={event => {
    if (event.key === 'Escape' && detailsRef.current?.open) {
      event.preventDefault(); event.stopPropagation(); detailsRef.current.open = false; summaryRef.current?.focus();
    }
  }}>
    <summary ref={summaryRef} aria-label={`${dimension.label}: ${valueSummary(dimension)}. Edit ${dimension.label.toLocaleLowerCase()} scope`}>
      <span>{dimension.label}</span><span className="scope-bar__edit">Edit</span>
    </summary>
    <div className="scope-bar__menu" role="group" aria-labelledby={`${groupId}-label`}>
      <div className="scope-bar__menu-heading">
        <strong id={`${groupId}-label`}>{dimension.label}</strong>
        <div className="scope-bar__menu-actions">
          <button type="button" onClick={() => onChange(dimension.id, null)}>All</button>
          <button type="button" onClick={() => onChange(dimension.id, [])}>None</button>
        </div>
      </div>
      {dimension.options.length ? <div className="scope-bar__options">
        {dimension.options.map((option, optionIndex) => <label className="scope-bar__option" key={option.id}>
          <input id={`${groupId}-option-${optionIndex}`} type="checkbox" checked={checked(option)}
            onChange={event => onChange(dimension.id, toggleValue(dimension, option, event.currentTarget.checked))} />
          <span>{option.label}</span>
        </label>)}
      </div> : <p className="scope-bar__empty-options">No {dimension.label.toLocaleLowerCase()} values are available.</p>}
      {dimension.value?.length === 0 && <p className="scope-bar__empty-scope" role="status">This scope is explicitly empty.</p>}
    </div>
  </details>;
}

export function ScopeBar({context, modeLabel, endpointLabel, horizonLabel, dateLabel, metricLabel,
  presets, activePresetId, defaultPresetId, dimensions,
  onPresetChange, onDimensionChange, onReset}: ScopeBarProps) {
  const uid = useId();
  const activeExists = activePresetId !== null && presets.some(preset => preset.id === activePresetId);
  const defaultLabel = presets.find(preset => preset.id === defaultPresetId)?.label ?? 'default scope';
  const shownContext = context ?? [
    {label:'View',value:modeLabel ?? ''},
    {label:'Endpoint',value:endpointLabel ?? ''},
    {label:'Horizon',value:horizonLabel ?? ''},
    {label:'Dates',value:dateLabel ?? ''},
    {label:'Measure',value:metricLabel ?? ''},
  ];
  return <section className="scope-bar" aria-label="Current analysis scope">
    <div className="scope-bar__topline">
      <div className="scope-bar__context" aria-label="Analysis context">
        {shownContext.filter(item => item.value).map((item, index) => <span className="scope-bar__context-item" key={`${item.label}-${index}`}>
          <span className="scope-bar__context-label">{item.label}</span><strong>{item.value}</strong>
        </span>)}
      </div>
      <div className="scope-bar__controls">
        <label className="scope-bar__preset-label" htmlFor={`${uid}-preset`}>Scope preset</label>
        <select id={`${uid}-preset`} className="scope-bar__preset" value={activeExists ? activePresetId! : CUSTOM_PRESET_VALUE}
          onChange={event => {
            if (event.currentTarget.value !== CUSTOM_PRESET_VALUE) onPresetChange(event.currentTarget.value);
          }}>
          {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          {!activeExists && <option value={CUSTOM_PRESET_VALUE}>Custom</option>}
        </select>
        <button type="button" className="scope-bar__reset" onClick={onReset} aria-label={`Reset to ${defaultLabel}`}>
          Reset
        </button>
      </div>
    </div>
    <div className="scope-bar__summary" aria-label="Active scope details">
      {dimensions.map((dimension, index) => <div className={`scope-bar__summary-item${dimension.value?.length === 0 ? ' is-empty' : ''}`}
        key={dimension.id}>
        <span className="scope-bar__summary-label">{dimension.label}</span>
        <span className="scope-bar__summary-value">{valueSummary(dimension)}</span>
        <DimensionMenu dimension={dimension} index={index} uid={uid} onChange={onDimensionChange} />
      </div>)}
    </div>
  </section>;
}

export default ScopeBar;
