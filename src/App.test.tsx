import fs from 'node:fs/promises';
import path from "node:path";
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import '@vitest/web-worker';

import App from './App';
import { localStorageRemoveItem, localStorageSetItem } from './utils/utils';

/* Mock console.error so we can introspect any calls. */
const spy = vi.spyOn(console, 'error');
beforeEach(() => { spy.mockReset(); });
afterAll(() => { spy.mockRestore(); });

/* Mock CSS.supports and fetch for all render tests. */
beforeAll(() => {
  global.CSS.supports = () => false;
  global.fetch = async (input: RequestInfo | URL) => {
    if (typeof input !== 'string')
      throw Error('not implemented');

    if (input.startsWith(import.meta.env.BASE_URL))
      input = input.substring(import.meta.env.BASE_URL.length);
    const body = await fs.readFile(path.join(__dirname, '..', 'public', input));
    return new Response(new Uint8Array(body));
  };
  global.HTMLDialogElement.prototype.showModal = vi.fn();
});

test('renders', async () => {
  render(<App />);
  expect(await screen.findByText(/Poké Corpus/i)).toBeInTheDocument();
  expect(screen.queryByText(/error/i)).toBeNull();
  expect(console.error).not.toHaveBeenCalled();
});

describe.skip('results', () => {
  const spyLog = vi.spyOn(console, 'log');
  const spyDebug = vi.spyOn(console, 'debug');

  beforeEach(() => {
    spyLog.mockImplementation(vi.fn());
    spyDebug.mockImplementation(vi.fn());
    localStorageSetItem('corpus-warn', 'false');
  });

  afterAll(() => {
    localStorageRemoveItem('corpus-warn');
    window.location.hash = '';
  });

  test('search', async () => {
    window.location.hash = '#query=raichu&common=false&script=true&collections=ScarletViolet&languages=en';
    render(<App />);
    expect(await screen.findByText(/Poké Corpus/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByText(/Search/i, {selector: 'input'}));

    await waitFor(async () => { await screen.findByText(/Charge, Raichu! Let the lightning fall!/i); }, {timeout: 5000});
    expect(console.error).not.toHaveBeenCalled();
  });

  test('speaker', async () => {
    window.location.hash = '#query=danger+high+voltage&common=false&script=true&collections=ScarletViolet&languages=en';
    render(<App />);
    expect(await screen.findByText(/Poké Corpus/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByText(/Search/i, {selector: 'input'}));

    await waitFor(async () => { await screen.findByText(/Iono:/i); }, {timeout: 5000});
    expect(console.error).not.toHaveBeenCalled();
  });
});

/* Mock when CacheStorage/IndexedDB are not present/blocked. */
describe('CacheStorage/IndexedDB', () => {
  const caches = global.caches;
  const indexedDB = global.indexedDB;
  const localStorage = global.localStorage;

  afterEach(() => {
    global.caches = caches;
    global.indexedDB = indexedDB;
    global.localStorage = localStorage;
  });

  test('not present', async () => {
    // @ts-expect-error-line Remove from global scope
    delete global.caches; delete global.indexedDB; delete global.localStorage;

    render(<App />);
    const linkElement = await screen.findByText(/Poké Corpus/i);
    expect(linkElement).toBeInTheDocument();
    const errorText = screen.queryByText(/error/i);
    expect(errorText).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  test('blocked', async () => {
    const mockError = Error('mock error');
    mockError.name = 'MockError';
    global.caches = {
      delete: () => Promise.reject(mockError),
      has: () => Promise.reject(mockError),
      keys: () => Promise.reject(mockError),
      match: () => Promise.reject(mockError),
      open: () => Promise.reject(mockError),
    };
    global.indexedDB = {
      cmp: () => { throw mockError; },
      databases: () => { throw mockError; },
      deleteDatabase: () => { throw mockError; },
      open: () => { throw mockError; },
    };
    global.localStorage = {
      length: 0,
      clear: () => { throw mockError; },
      getItem: () => { throw mockError; },
      key: () => { throw mockError; },
      removeItem: () => { throw mockError; },
      setItem: () => { throw mockError; },
    };

    // Prevent errors from being written to console, since we expect them
    spy.mockImplementation(vi.fn());

    render(<App />);
    const linkElement = await screen.findByText(/Poké Corpus/i);
    expect(linkElement).toBeInTheDocument();
    const errorText = screen.queryByText(/error/i);
    expect(errorText).toBeNull();
    for (let i = 1; i <= spy.mock.calls.length; i++)
      expect(console.error).toHaveBeenNthCalledWith(i, mockError);
  });
});
