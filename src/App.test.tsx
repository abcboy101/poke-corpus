import fs from 'node:fs/promises';
import path from "node:path";
import { render, screen } from '@testing-library/react';

import App from './App';

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
});
