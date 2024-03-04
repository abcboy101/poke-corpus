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
