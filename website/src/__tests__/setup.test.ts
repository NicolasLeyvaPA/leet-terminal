/**
 * Basic test setup to ensure CI passes
 * Add proper tests as the codebase matures
 */

import { describe, it, expect } from 'vitest';

describe('Setup', () => {
  it('should pass basic sanity check', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have correct environment', () => {
    expect(typeof window).toBe('undefined'); // Node environment in tests
  });
});

describe('SeededRNG', () => {
  it('should be importable', async () => {
    // Dynamic import to test module resolution
    const { SeededRNG } = await import('../workers/prng');
    expect(SeededRNG).toBeDefined();
  });

  it('should generate reproducible random numbers with same seed', async () => {
    const { SeededRNG } = await import('../workers/prng');

    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    const values1 = [rng1.random(), rng1.random(), rng1.random()];
    const values2 = [rng2.random(), rng2.random(), rng2.random()];

    expect(values1).toEqual(values2);
  });

  it('should generate different numbers with different seeds', async () => {
    const { SeededRNG } = await import('../workers/prng');

    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);

    expect(rng1.random()).not.toBe(rng2.random());
  });

  it('should generate numbers in [0, 1) range', async () => {
    const { SeededRNG } = await import('../workers/prng');

    const rng = new SeededRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
