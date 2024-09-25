export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export function formatPercent(n: number, fractionDigits: number = 1) {
  const format: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  };
  return [n, format] as const;
}

export function formatPercentParams(size: number, fractionDigits: number = 1) {
  const [amount, format] = formatPercent(size, fractionDigits);
  return {amount: amount, formatParams: {amount: format}};
}

/* https://developer.chrome.com/blog/introducing-scheduler-yield-origin-trial */
// A function for shimming scheduler.yield and setTimeout:
export function yieldToMain() {
  // Use scheduler.yield if it exists:
  // @ts-expect-error scheduler
  if ('scheduler' in window && 'yield' in scheduler) {
    // @ts-expect-error scheduler
    return scheduler.yield();
  }

  // Fall back to setTimeout:
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
