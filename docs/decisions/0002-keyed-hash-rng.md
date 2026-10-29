# 0002: Keyed-hash randomness

- **Status:** accepted (confirmed by the user, 2026-10-26)
- **Date:** 2026-10-26
- **Spec:** §5 "master seed with per-purpose streams hash(seed, tree_id, purpose)"; §8 ablations

## Context

Spec §5 asks for per-purpose RNG streams, so that enabling one principle never reshuffles another's numbers. Within one purpose, a sequential stream still shifts, though. For example, switching shedding off lets a few buds survive, and every later bud's direction noise then changes. Ablations (§8) compare runs that differ in exactly one principle, so they are cleanest when every surviving entity gets the same random numbers in both runs.

## Decision

Every draw is a pure function of its identity:

`hashKey(seed, purpose, tree, entity, season, k)`

- **Key components:**
  - `entity` is a stable id (a metamer's or bud's `birthId`, or an axis id), never an array index;
  - `k` numbers multiple draws for one entity in one season.
- **Purposes** are registered in `src/core/rng.ts`. Their numbers are part of the reproducibility contract: never renumber or reuse one.
- **Mixing:** 32-bit integer mixing with `Math.imul` (the lowbias32 finaliser, applied after each key component).
- **Exactness:**
  - `uniform` and `sign` are bit-exact in every JavaScript engine.
  - `normal` uses Box–Muller (`Math.log`, `Math.cos`), so it is exact on V8 only. That covers Node and Chrome, which is enough for headless runs to match the page in Chrome. Safari and Firefox may drift slowly over many seasons, and the user accepted this.
  - **Corrected 2026-10-29** ([G2 note](../experiments/2026-10-29-g2-rust-sweep.md) §3): **Node and Chrome do not agree.**
    - Chrome builds V8 with glibc's sin and cos where Node uses fdlibm's, and its `exp` differs too. `Math.pow` is the platform C library's in both.
    - In headless Chromium 153, 20 of the 27 goldens differ from Node's.
    - So headless runs do not match the page, even in Chrome. This is not this ADR's hashing, which stays exact; it is every other transcendental call in the core.
    - The deterministic maths module that the last consequence anticipates is ADR 0024's Rust core, from I1.
- **No `Math.random`** anywhere in `src/core`.

## Consequences

- Runs are reproducible from (params, events). Ablations differ only where the switched principle acts.
- No RNG state needs storing or transferring.
- A hash costs slightly more than a stream step, which is negligible here.
- Known-answer vectors in `src/core/rng.test.ts` freeze the function. Changing it breaks every saved run, so that needs a new ADR.
- **To get cross-browser exactness later,** route `Math.log`, `Math.cos` and the other transcendental functions the core uses through a small deterministic maths module. Adding one is a new ADR.
