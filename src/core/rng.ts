/**
 * Keyed-hash randomness (ADR 0002, refines spec §5).
 *
 * Every random number is a pure function of what it is for:
 *   hash(seed, purpose, tree, entity, season, k)
 * There is no sequential stream, so switching a principle on or off cannot shift the draws
 * of any other entity, even within the same purpose. Integer maths only (Math.imul), so the
 * raw hashes are bit-identical in every JavaScript engine; `normal` uses Math.log/cos and is
 * exact on V8 (Node and Chrome) only, which ADR 0002 accepts.
 *
 * Never use Math.random in src/core.
 */

/**
 * Registry of randomness purposes (spec §5 "Randomness entry points").
 * IDs are part of the reproducibility contract: never renumber or reuse one.
 */
export const Purpose = {
  sideSequence: 1, // C1: s0 of each axis's side sequence
  directionNoise: 2, // C4: angular noise of each new metamer
  shedding: 3, // C5: optional stochastic shedding
  sympodialTermination: 4, // R2
  budBreak: 5, // R4: optional stochastic break
  abrasion: 6, // O2
  wind: 7, // O2
  seeds: 8, // O4
  dispersal: 9, // O4
  establishment: 10, // O4
  mortality: 11, // O4
  initialPositions: 12,
} as const;
export type Purpose = (typeof Purpose)[keyof typeof Purpose];

const TWO_POW_32 = 4294967296;

/** lowbias32 integer finaliser (C. Wellons): good avalanche, two multiplies. */
function mix32(x: number): number {
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

/** 32-bit unsigned hash of the full key. All arguments are truncated to 32-bit integers. */
export function hashKey(
  seed: number,
  purpose: Purpose,
  tree: number,
  entity: number,
  season: number,
  k = 0,
): number {
  let h = mix32(seed ^ 0x9e3779b9);
  h = mix32(h ^ purpose);
  h = mix32(h ^ tree);
  h = mix32(h ^ entity);
  h = mix32(h ^ season);
  h = mix32(h ^ k);
  return h;
}

/** Uniform in [0, 1) with 32-bit resolution. Bit-exact in every engine. */
export function uniform(
  seed: number,
  purpose: Purpose,
  tree: number,
  entity: number,
  season: number,
  k = 0,
): number {
  return hashKey(seed, purpose, tree, entity, season, k) / TWO_POW_32;
}

/** Fair coin: -1 or +1. Bit-exact in every engine. */
export function sign(
  seed: number,
  purpose: Purpose,
  tree: number,
  entity: number,
  season: number,
  k = 0,
): -1 | 1 {
  return hashKey(seed, purpose, tree, entity, season, k) & 1 ? 1 : -1;
}

/**
 * Standard normal via Box–Muller, using draws k*2 and k*2+1 of the key.
 * Exact on V8 only (Math.log and Math.cos are implementation-approximated).
 */
export function normal(
  seed: number,
  purpose: Purpose,
  tree: number,
  entity: number,
  season: number,
  k = 0,
): number {
  const u1 = (hashKey(seed, purpose, tree, entity, season, 2 * k) + 0.5) / TWO_POW_32;
  const u2 = hashKey(seed, purpose, tree, entity, season, 2 * k + 1) / TWO_POW_32;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
