# 0019: A 3D slab with a Rust core, through gates

- **Status:** proposed (awaits the user)
- **Date:** 2026-10-29
- **Spec:** §2 (reverses Option P), §5, §6, §C2.4, §C2.8, §10. It also reverses the M12 review's decision 3 and ADR 0008 (pseudo-depth). For the garden, it ends the AGENTS invariant "No SharedArrayBuffer". It meets ADR 0001's Rust/WASM trigger.

## Context
- **The user's goal:** 3D for the garden's view, a line of trees seen from the front, one crown deep (2026-10-29). A full volume and a free camera are out of scope.
- **Hosting:** edbarker.dev is on Cloudflare and can send COOP/COEP (ADR 0014).
- **The measurement** ([note](../experiments/2026-10-29-3d-light-cost.md)):
  - Canopy crowns are 20–30 cells wide, so D = 32.
  - The row-marched sweep extends to the slab at 24–28 ns per cell–direction update in TypeScript, linear in D·K. At D = 32 and K = 16 that is 250–290 ms for `forest` and about 700 ms for `panorama`, about 100× the 2D light.
  - The same kernel in Rust costs 2.0× less as scalar WASM, 5.2× less with Float32 SIMD, and a further 2.6–3.0× less on 4 threads.
  - Float64 WASM is bit-identical to the TypeScript kernel.
  - The 3D shadow pyramid's V search (21 µs a sample) makes it dearer than the sweep.
- **The projection** ([review](../reviews/2026-10-29-3d-port-review.md) §2): only Rust with SIMD and threads keeps the garden's 4-seasons-a-second intro, at ≈ 190 ms a season for `forest` on the user's phone. The tree passes are half of that and are estimated, not measured.
- **The model changes:** the three-slot topology, scalar directions and scalar moments all go. About 8 calibration milestones follow (review §4).

## Decision
If the user agrees: port to a slab W × H × D, D = 32 (24 if the phone needs it), periodic in x and z, seen from the front. The light is the row-marched Beer–Lambert sweep at K = 16 with rotation, in Float32. The whole core moves to Rust:
- it builds to WASM (SIMD; threads only where cross-origin isolation is served) and natively for the CLI;
- the TypeScript core stays only until the Rust 2D core reproduces every golden bit for bit, and 2D behaviour is frozen meanwhile.

The work goes through gates, each of which can stop it:
- **G1:** the measured kernel on the user's phone. Stop if 4-lane SIMD light exceeds 150 ms a season at `forest` size.
- **G2:** the Rust 2D sweep behind `LightModel`, goldens bit-identical.
- **G3:** 3D light accuracy against an exact trace. Stop or rethink if the error is above twice M18's.
- **I2:** a grown 3D stand on the phone. Fall back to D = 24 or coarser cells if a season exceeds 250 ms.

## Consequences
- **Easier:**
  - Exact reproducibility on every engine, with Float32 and a vendored polynomial exp checked native against WASM.
  - Faster sweeps natively.
  - §10's 3D allometries (self-thinning −3/2, crowding) become directly comparable.
  - Rust's types can guard the ordering invariants.
- **Harder:**
  - A second toolchain in CI.
  - A WASM bundle gate (proposed 120 kB gzipped, beside the garden's 60 kB).
  - COOP/COEP on the site, and checking its subresources.
  - Checkpoints 4–20× over M21's budget, unless the intro grows the forest.
  - A GPU-side tween and wind.
  - Every golden, evidence test and species calibration redone.
  - About 14 milestones in all.
- **Revisit** if G1 or G3 fails, if a frontal 3D stand does not look better than ADR 0008's pseudo-depth, or if the user wants trees seen from an angle (a full volume, out of this decision's scope).
