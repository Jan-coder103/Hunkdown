import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../src/engine/seeded-random';

describe('createSeededRandom', () => {
  it('repeats the same sequence for a seed and stays within [0, 1)', () => {
    const first = createSeededRandom(12345);
    const replay = createSeededRandom(12345);
    const sequence = Array.from({ length: 8 }, () => first());

    expect(sequence).toEqual(Array.from({ length: 8 }, () => replay()));
    expect(sequence.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('uses the same 32-bit seed for numerically equivalent seeds', () => {
    const first = createSeededRandom(7);
    const wrapped = createSeededRandom(7 + 2 ** 32);
    expect(first()).toBe(wrapped());
  });
});
