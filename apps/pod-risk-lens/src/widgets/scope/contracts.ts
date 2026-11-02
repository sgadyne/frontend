/** A scope dimension value uses null for all values and [] for an explicit empty scope. */
export type ScopeValue = readonly string[] | null;

export interface ScopeOption {
  id: string;
  label: string;
}

/** One app-owned filter dimension, such as books or tags. */
export interface ScopeDimension {
  id: string;
  label: string;
  options: readonly ScopeOption[];
  value: ScopeValue;
  /** Explicitly computed by the app; shown without opening the dimension menu. */
  excluded: readonly ScopeOption[];
}

/** Preset labels and identifiers are supplied by the owning application. */
export interface ScopePreset {
  id: string;
  label: string;
}

export interface ScopeContextValue {
  label: string;
  value: string;
}

export interface ScopeBarProps {
  /** Concise current context, for example Positions, Live, 1D and Net delta. */
  context?: readonly ScopeContextValue[];
  /** Equivalent named context props for integrations that prefer explicit fields. */
  modeLabel?: string;
  endpointLabel?: string;
  horizonLabel?: string;
  dateLabel?: string;
  metricLabel?: string;
  presets: readonly ScopePreset[];
  /** Null means the current selection is a custom combination. */
  activePresetId: string | null;
  /** App-owned reset destination, usually specific to the current mode. */
  defaultPresetId: string;
  dimensions: readonly ScopeDimension[];
  onPresetChange: (presetId: string) => void;
  onDimensionChange: (dimensionId: string, value: ScopeValue) => void;
  onReset: () => void;
}
