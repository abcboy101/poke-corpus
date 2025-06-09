import fs from 'node:fs/promises';
import path from "node:path";
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import App from './App';

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
    return new Response(body);
  };
});

test('renders', async () => {
  render(<App />);
  const linkElement = await screen.findByText(/Poké Corpus/i);
  expect(linkElement).toBeInTheDocument();
  expect(console.error).not.toHaveBeenCalled();
});

/* Mock when CacheStorage/IndexedDB are not present/blocked. */
describe('CacheStorage/IndexedDB', () => {
  const caches = global.caches;
  const indexedDB = global.indexedDB;

  afterEach(() => {
    global.caches = caches;
    global.indexedDB = indexedDB;
  });

  test('not present', async () => {
    // @ts-expect-error-line Remove CacheStorage from global scope
    delete global.caches;
    // @ts-expect-error Remove IndexedDB from global scope
    delete global.indexedDB;

    render(<App />);
    const linkElement = await screen.findByText(/Poké Corpus/i);
    expect(linkElement).toBeInTheDocument();
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

    // Prevent errors from being written to console, since we expect them
    spy.mockImplementation(vi.fn());

    render(<App />);
    const linkElement = await screen.findByText(/Poké Corpus/i);
    expect(linkElement).toBeInTheDocument();
    for (let i = 1; i <= spy.mock.calls.length; i++)
      expect(console.error).toHaveBeenNthCalledWith(i, mockError);
  });
});
