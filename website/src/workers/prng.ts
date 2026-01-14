/**
 * Seeded Pseudo-Random Number Generator
 *
 * Implements xorshift128+ for fast, reproducible random numbers.
 * This allows Monte Carlo simulations to be reproducible with the same seed.
 */

export class SeededRNG {
  private state: [bigint, bigint];

  /**
   * Create a new seeded RNG
   * @param seed - Integer seed value (default: current timestamp)
   */
  constructor(seed?: number) {
    // Initialize state from seed using SplitMix64
    const seedValue = BigInt(seed ?? Date.now());
    this.state = [
      this.splitmix64(seedValue),
      this.splitmix64(seedValue + 1n),
    ];
  }

  /**
   * SplitMix64 for seed initialization
   */
  private splitmix64(x: bigint): bigint {
    x = (x + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    x = ((x ^ (x >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    x = ((x ^ (x >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    return (x ^ (x >> 31n)) & 0xffffffffffffffffn;
  }

  /**
   * xorshift128+ core algorithm
   * Returns a 64-bit unsigned integer
   */
  private next(): bigint {
    const s0 = this.state[0];
    let s1 = this.state[1];
    const result = (s0 + s1) & 0xffffffffffffffffn;

    s1 ^= s0;
    this.state[0] = ((s0 << 24n) | (s0 >> 40n)) ^ s1 ^ (s1 << 16n);
    this.state[0] &= 0xffffffffffffffffn;
    this.state[1] = (s1 << 37n) | (s1 >> 27n);
    this.state[1] &= 0xffffffffffffffffn;

    return result;
  }

  /**
   * Get a random number in [0, 1)
   */
  random(): number {
    const raw = this.next();
    // Convert to double in [0, 1)
    return Number(raw >> 11n) / 9007199254740992; // 2^53
  }

  /**
   * Get a random integer in [min, max]
   */
  randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a normally distributed random number (Box-Muller transform)
   */
  randomNormal(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Generate a Student's t-distributed random number
   * Uses the ratio of uniforms method
   */
  randomStudentT(degreesOfFreedom: number): number {
    // Use normal approximation for high df
    if (degreesOfFreedom > 30) {
      return this.randomNormal();
    }

    // Ratio of uniforms method for Student's t
    const v = degreesOfFreedom;
    let x: number;
    let y: number;
    let u1: number;
    let u2: number;

    do {
      u1 = this.random();
      u2 = this.random() * 2 - 1;
      x = u2 / Math.sqrt(u1);
      y = x * x / v;
    } while (u1 < Math.pow(1 + y, -(v + 1) / 2));

    return x;
  }

  /**
   * Sample from an array with replacement
   */
  sampleWithReplacement<T>(array: T[], n: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < n; i++) {
      result.push(array[this.randInt(0, array.length - 1)]);
    }
    return result;
  }
}

export default SeededRNG;
