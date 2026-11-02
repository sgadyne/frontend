/** Exact row value for TSV/clipboard; visible table formatting remains compact. */
export function exactNumericCopy(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Unavailable';
  return value === 0 || Object.is(value, -0) ? '0' : value.toString();
}
