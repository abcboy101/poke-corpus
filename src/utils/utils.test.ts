import { formatBytes, formatPercent } from './utils';

const bytesToUnitsTestCases: [number, string][] = [
  [0, '0 bytes'],
  [1, '1 byte'],
  [10, '10 bytes'],
  [999, '999 bytes'],
  [1000, '1.0 kB'],
  [10_000, '10.0 kB'],
  [100_000_000, '100 MB'],
];

describe("bytesToUnits", () => {
  test.each(bytesToUnitsTestCases)(
    "%c%s", (n, s) => {
      const { amount: value, formatParams: {amount: options} } = formatBytes(n);
      const format = Intl.NumberFormat('en-US', options).format(value);
      expect(format).toEqual(s);
    }
  );
});

const formatPercentTestCases: [number, string][] = [
  [0.01, '1.0%'],
  [0.50049, '50.0%'], // round down
  [0.50051, '50.1%'], // round up
  [1, '100.0%'],
];

describe("formatPercent", () => {
  test.each(formatPercentTestCases)(
    "%c%s", (n, s) => {
      const { amount: value, formatParams: {amount: options} } = formatPercent(n);
      const format = Intl.NumberFormat('en-US', options).format(value);
      expect(format).toEqual(s);
    }
  );
});
