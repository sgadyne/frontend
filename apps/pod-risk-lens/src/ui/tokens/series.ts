const palette = [
  ['--risk-series-1','#126f67'],
  ['--risk-series-2','#496ab7'],
  ['--risk-series-3','#9b5d15'],
  ['--risk-series-4','#8a4f86'],
  ['--risk-series-5','#4b7650'],
  ['--risk-series-6','#b34d36'],
] as const;

/** Stable role-token color for an app-supplied ID; order/filter changes do not remap it. */
export function seriesColorForId(id: string): string {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  const [token, fallback] = palette[(hash >>> 0) % palette.length];
  return `var(${token},${fallback})`;
}
