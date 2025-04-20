import { assertType } from 'vitest';

import { ReadonlyExhaustiveArray } from "./utils";

test('ReadonlyExhaustiveArray, exhaustive', () => {
  type T = 'foo' | 'bar';
  const arr = ['foo', 'bar'] as const;
  assertType<ReadonlyExhaustiveArray<typeof arr, T>>(arr);
});

test('ReadonlyExhaustiveArray, missing', () => {
  type T = 'foo' | 'bar' | 'baz';
  const arr = ['foo', 'bar'] as const;
  // @ts-expect-error The value 'baz' is not in the array, but in the desired type
  assertType<ReadonlyExhaustiveArray<typeof arr, T>>(arr);
});

test('ReadonlyExhaustiveArray, extra', () => {
  type T = 'foo' | 'bar';
  const arr = ['foo', 'bar', 'baz'] as const;
  // @ts-expect-error The value 'baz' is in the array, but not in the desired type
  assertType<ReadonlyExhaustiveArray<typeof arr, T>>(arr);
});

test('ReadonlyExhaustiveArray, narrow', () => {
  type T = string;
  const arr = ['foo', 'bar'] as const;
  // @ts-expect-error Array type is narrower than the desired type
  assertType<ReadonlyExhaustiveArray<typeof arr, T>>(arr);
});

test('ReadonlyExhaustiveArray, wide', () => {
  type T = 'foo' | 'bar';
  const arr = ['foo', 'bar'];
  // @ts-expect-error Array type is wider than the desired type
  assertType<ReadonlyExhaustiveArray<typeof arr, T>>(arr);
});
