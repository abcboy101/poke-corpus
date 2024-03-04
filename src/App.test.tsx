import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { bytesToUnits } from './utils/utils';

test('renders', () => {
  render(<App />);
  const linkElement = screen.getByText(/Poké Corpus/i);
  expect(linkElement).toBeInTheDocument();
});

test('bytesToUnits, 0 bytes', () => {
  const n = 0;
  const {amount, formatParams} = bytesToUnits(n);
  const format = Intl.NumberFormat('en-US', formatParams.amount).format(amount);
  expect(format).toEqual('0 bytes');
});

test('bytesToUnits, 1 byte', () => {
  const n = 1;
  const {amount, formatParams} = bytesToUnits(n);
  const format = Intl.NumberFormat('en-US', formatParams.amount).format(amount);
  expect(format).toEqual('1 byte');
});

test('bytesToUnits, 10 bytes', () => {
  const n = 10;
  const {amount, formatParams} = bytesToUnits(n);
  const format = Intl.NumberFormat('en-US', formatParams.amount).format(amount);
  expect(format).toEqual('10 bytes');
});

test('bytesToUnits, 999 bytes', () => {
  const n = 999;
  const {amount, formatParams} = bytesToUnits(n);
  const format = Intl.NumberFormat('en-US', formatParams.amount).format(amount);
  expect(format).toEqual('999 bytes');
});

test('bytesToUnits, 1.0 kB', () => {
  const n = 1000;
  const {amount, formatParams} = bytesToUnits(n);
  const format = Intl.NumberFormat('en-US', formatParams.amount).format(amount);
  expect(format).toEqual('1.0 kB');
});

test('bytesToUnits, 10.0 kB', () => {
  const n = 10_000;
  const {amount, formatParams} = bytesToUnits(n);
  const format = Intl.NumberFormat('en-US', formatParams.amount).format(amount);
  expect(format).toEqual('10.0 kB');
});

test('bytesToUnits, 100 MB', () => {
  const n = 100_000_000;
  const {amount, formatParams} = bytesToUnits(n);
  const format = Intl.NumberFormat('en-US', formatParams.amount).format(amount);
  expect(format).toEqual('100 MB');
});
