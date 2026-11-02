export type NumericValue = number | null | undefined;

export interface NumericFormatOptions {
  locale?: string;
  /** Defaults to ten significant digits unless fraction-digit options are supplied. */
  maximumSignificantDigits?: number;
  minimumSignificantDigits?: number;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  signDisplay?: Intl.NumberFormatOptions['signDisplay'];
  useGrouping?: boolean;
  /** Visible text for null and non-finite values. Screen readers hear "Unavailable". */
  unavailableText?: string;
}

export interface NumericPresentation {
  /** Original input is retained, including null and negative zero. */
  rawValue: NumericValue;
  /** Compact visual representation; unavailable values default to an em dash. */
  text: string;
  /** Spoken representation that names missing values explicitly. */
  accessibleText: string;
  available: boolean;
}

export interface NumericMeasurePresentation extends NumericPresentation {
  /** The unit is passed through unchanged and never converted or inferred. */
  unit: string;
}

const DEFAULT_UNAVAILABLE_TEXT = '\u2014';
const FORMATTER_CACHE_LIMIT = 64;
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const optionEntries = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  const cacheKey = JSON.stringify([locale, optionEntries]);
  const cached = formatterCache.get(cacheKey);
  if (cached) {
    formatterCache.delete(cacheKey);
    formatterCache.set(cacheKey, cached);
    return cached;
  }
  const formatter = new Intl.NumberFormat(locale, options);
  formatterCache.set(cacheKey, formatter);
  if (formatterCache.size > FORMATTER_CACHE_LIMIT) {
    const oldestKey = formatterCache.keys().next().value;
    if (oldestKey !== undefined) formatterCache.delete(oldestKey);
  }
  return formatter;
}

export function formatNumericValue(value: NumericValue, options: NumericFormatOptions = {}): NumericPresentation {
  const {locale = 'en-US', unavailableText = DEFAULT_UNAVAILABLE_TEXT, ...formatOptions} = options;
  if (value == null || !Number.isFinite(value)) {
    return {rawValue: value, text: unavailableText, accessibleText: 'Unavailable', available: false};
  }

  const hasFractionRules = formatOptions.maximumFractionDigits !== undefined
    || formatOptions.minimumFractionDigits !== undefined;
  const numberOptions: Intl.NumberFormatOptions = {
    signDisplay: 'exceptZero',
    useGrouping: true,
    ...(hasFractionRules && formatOptions.maximumSignificantDigits === undefined
      ? {}
      : {maximumSignificantDigits: 10}),
    ...formatOptions,
  };
  const normalized = Object.is(value, -0) ? 0 : value;
  const text = getFormatter(locale, numberOptions).format(normalized);
  return {rawValue: value, text, accessibleText: text, available: true};
}

export function formatNumericMeasure(value: NumericValue, unit: string, options: NumericFormatOptions = {}): NumericMeasurePresentation {
  const formatted = formatNumericValue(value, options);
  const accessibleText = formatted.available
    ? [formatted.text, unit].filter(Boolean).join(' ')
    : ['Unavailable', unit].filter(Boolean).join(' ');
  return {...formatted, unit, accessibleText};
}
