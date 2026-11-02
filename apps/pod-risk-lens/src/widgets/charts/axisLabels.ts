function normalizeZero(value: number) {
  return Object.is(value, -0) ? 0 : value;
}

function formatAtPrecision(value: number, precision: number, locale: string) {
  const normalized = normalizeZero(value);
  if (normalized === 0) return '0';
  return new Intl.NumberFormat(locale, {maximumSignificantDigits:precision, useGrouping:true}).format(normalized);
}

/** Compact axis labels, increasing precision only when rounding would collide. */
export function formatAxisLabels(values: readonly number[], locale = 'en-US'): string[] {
  for (let precision = 4; precision <= 17; precision += 1) {
    const labels = values.map(value => formatAtPrecision(value, precision, locale));
    const seen = new Map<string, number>();
    const collision = labels.some((label, index) => {
      const normalized = normalizeZero(values[index]);
      const prior = seen.get(label);
      if (prior !== undefined && normalizeZero(values[prior]) !== normalized) return true;
      seen.set(label, index);
      return false;
    });
    if (!collision) return labels;
  }

  // A round-trip string is the final fallback for adjacent IEEE-754 values.
  return values.map(value => normalizeZero(value) === 0 ? '0' : normalizeZero(value).toString());
}
