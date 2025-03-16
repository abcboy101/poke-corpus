export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/* Wrappers for localStorage access, in case localStorage is blocked. */
export function localStorageGetItem(key: string) {
  try {
    return localStorage.getItem(key);
  }
  catch {
    return null;
  }
}

export function localStorageSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  }
  catch {
    return;
  }
}

export const modes = ['system', 'light', 'dark'] as const;
export type Mode = (typeof modes)[number];
export const isMode = (s: string): s is Mode => (modes as readonly string[]).includes(s);
const asValidMode = (s: unknown) => (typeof s === 'string' && isMode(s)) ? s : 'system';
export const getMode = (): Mode => asValidMode(localStorageGetItem('mode'));

export const defaultLimit = 500;
export const isValidLimit = (n: unknown) => (typeof n === 'number' && !Number.isNaN(n) && Number.isInteger(n) && n > 0);
export const getLimit = () => {
  const value = +(localStorageGetItem('corpus-limit') ?? defaultLimit);
  return Number.isNaN(value) ? defaultLimit : value;
};
export const getRichText = () => localStorageGetItem('corpus-richText') !== 'false';

/* Generate appropriate i18n number format options for n bytes */
const byteUnits = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'] as const;
export function formatBytes(n: number) {
  const index = Math.min(Math.floor((n.toString().length - 1) / 3), byteUnits.length - 1);
  const format: Intl.NumberFormatOptions = {
    style: 'unit',
    unit: byteUnits[index],
    unitDisplay: index === 0 ? 'long' : 'short', // use "byte"/"bytes", but "kB", "MB", etc.
    minimumFractionDigits: index === 0 ? 0 : 1, // don't display fractions of a byte
    maximumFractionDigits: 1,
    maximumSignificantDigits: 3,
    roundingPriority: 'lessPrecision',
  };
  return [n / Math.pow(1000, index), format] as const;
}

export function formatBytesParams(size: number) {
  const [amount, format] = formatBytes(size);
  return {amount: amount, formatParams: {amount: format}};
}

export function formatPercent(n: number, fractionDigits = 1) {
  const format: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  };
  return [n, format] as const;
}

export function formatPercentParams(size: number, fractionDigits = 1) {
  const [amount, format] = formatPercent(size, fractionDigits);
  return {amount: amount, formatParams: {amount: format}};
}

/** Checks if a regex is valid. */
export function isValidRegex(pattern: string) {
  try {
    new RegExp(pattern, 'u');
  }
  catch (err) {
    console.error(err);
    return false;
  }
  return true;
}
