// Minimal ambient types for 'bun:test' so `astro check` type-checks tests/*.ts without
// adding a dependency (no bun-types package allowed in this repo). Bun executes these
// tests natively at runtime; only the API surface used by tests/api.test.ts,
// tests/global.test.ts, tests/leaderboard.test.ts, and tests/achievements.test.ts is declared.
declare module 'bun:test' {
  export interface Expect {
    toHaveLength(length: number): void;
    toBeGreaterThan(expected: number): void;
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeCloseTo(expected: number, numDigits?: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toContain(expected: unknown): void;
  }
  export function expect(actual: unknown): Expect;
  export function test(name: string, fn: () => void | Promise<void>): void;
}
