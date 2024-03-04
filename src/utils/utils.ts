export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Wrappers for localStorage access, in case localStorage is blocked. */
export function localStorageGetItem(key: string) {
  try {
    return localStorage.getItem(key);
  }
  catch {
    return null;
  }
};

export function localStorageSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  }
  catch {}
};

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
    // @ts-expect-error: TS doesn't recognize roundingPriority as a valid option yet
    roundingPriority: 'lessPrecision'
  };
  return [n / Math.pow(1000, index), format] as const;
}
