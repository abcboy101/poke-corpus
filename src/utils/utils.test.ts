import { formatBytes } from './utils';

test('bytesToUnits, 0 bytes', () => {
  const n = 0;
  const [value, options] = formatBytes(n);
  const format = Intl.NumberFormat('en-US', options).format(value);
  expect(format).toEqual('0 bytes');
});

test('bytesToUnits, 1 byte', () => {
  const n = 1;
  const [value, options] = formatBytes(n);
  const format = Intl.NumberFormat('en-US', options).format(value);
  expect(format).toEqual('1 byte');
});

test('bytesToUnits, 10 bytes', () => {
  const n = 10;
  const [value, options] = formatBytes(n);
  const format = Intl.NumberFormat('en-US', options).format(value);
  expect(format).toEqual('10 bytes');
});

test('bytesToUnits, 999 bytes', () => {
  const n = 999;
  const [value, options] = formatBytes(n);
  const format = Intl.NumberFormat('en-US', options).format(value);
  expect(format).toEqual('999 bytes');
});

test('bytesToUnits, 1.0 kB', () => {
  const n = 1000;
  const [value, options] = formatBytes(n);
  const format = Intl.NumberFormat('en-US', options).format(value);
  expect(format).toEqual('1.0 kB');
});

test('bytesToUnits, 10.0 kB', () => {
  const n = 10_000;
  const [value, options] = formatBytes(n);
  const format = Intl.NumberFormat('en-US', options).format(value);
  expect(format).toEqual('10.0 kB');
});

test('bytesToUnits, 100 MB', () => {
  const n = 100_000_000;
  const [value, options] = formatBytes(n);
  const format = Intl.NumberFormat('en-US', options).format(value);
  expect(format).toEqual('100 MB');
});