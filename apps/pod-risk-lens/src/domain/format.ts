import {formatNumericValue} from '../ui/format';

function millions(value: number | null | undefined, digits: number, signed: boolean) {
  const small = value != null && Number.isFinite(value) && value !== 0 && Math.abs(value) < 10 ** -digits;
  return formatNumericValue(value, {
    ...(small ? {maximumSignificantDigits: 6} : {minimumFractionDigits: digits, maximumFractionDigits: digits}),
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).text;
}

export const formatMillions = (value: number | null | undefined, digits = 2) => millions(value, digits, false);
export const formatSignedMillions = (value: number | null | undefined, digits = 2) => millions(value, digits, true);

function parsedDate(date: string | undefined) {
  if (!date) return null;
  const normalized = date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const value = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== normalized ? null : value;
}
const dates = new Intl.DateTimeFormat('en-GB', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'});
export const formatDate = (date: string | undefined) => {
  const value = parsedDate(date);
  return value ? dates.format(value) : '—';
};
export const formatDateRange = (start: string | undefined, end: string | undefined) => {
  const first = parsedDate(start), last = parsedDate(end);
  return first && last && first <= last ? dates.formatRange(first, last) : 'Unavailable';
};
