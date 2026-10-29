# 0024: Trees that grow in 3D, drawn as today, with a Rust core, through gates

- **Status:** proposed (awaits the user: G1 now; the ADR after it)
- **Date:** 2026-10-29 (amended twice the same day)
- **Spec:** §2 (reverses Option P), §5, §6, §C2.4, §C2.8, §10. It also reverses the M12 review's decision 3 and ADR 0008's pseudo-depth squeeze (the geometry carries real depth). For the garden, it ends the AGENTS invariant "No SharedArrayBuffer". It meets ADR 0001's Rust/WASM trigger. Numbered after M26–M27's ADRs 0019–0023.

## Context
- **The goal** (user, 2026-10-29, third session):
  - Today's trees look like fans because they grew in a plane. The port exists so that they grow in three dimensions: branches toward and away from the viewer, crowns that are volumes, buds competing in three dimensions.
  - The picture does not change in kind. It stays the garden's flat, frontal, orthographic illustration. Depth shows only through silhouette and overlap: a branch pointing at the viewer draws short, leaves pile up where the crown is deep, the trunk sits inside the crown.
- **G0.5** ([note](../experiments/2026-10-29-g05-slab-preview.md)) spread 2D-grown limbs through z and drew them in perspective. That was not the intended view, so it is not a visual gate. It stands as the hosting check: locally the whole site runs cross-origin isolated with nothing blocked.
- **The measurement:**
  - **The light** ([first note](../experiments/2026-10-29-3d-light-cost.md), [open slab](../experiments/2026-10-29-open-slab-cost.md)): with open z it is linear in D. `forest` costs 241 / 362 / 472 ms at D = 32 / 48 / 64 in TypeScript, 54–111 ms in one WASM SIMD lane, and 23 / 28 / 43 ms in 4 lanes in a desktop browser.
  - **Determinism:** Float64 WASM is bit-identical to the TypeScript kernel.
  - **The pyramid on equal terms** costs about what the sweep does.
- **Free crowns want more depth than any D costed:** the canopy species grown alone are 80–150 cells wide, and the understorey 40–60. The faces clip them.
- **The projection** ([review](../reviews/2026-10-29-3d-port-review.md) §2): under Rust, SIMD and 4 lanes, the phone's `forest` intro (250 ms a season) holds at D = 32 (≈ 197 ms), not at 48 (≈ 273) or 64 (≈ 358).
  - The tree passes are the larger share at D ≥ 48, and estimated.
  - The open-z metamer multiplier is 22–46 at D = 32, 29–69 at 48 and 35–92 at 64, because a tree no longer fills a periodic column: it is closed in x, free in z, and side-lit through the faces.
- **The model changes:** the three-slot topology, scalar directions and scalar moments all go. About 8 calibration milestones follow (review §4).

## Decision
If the user agrees: trees grow in a slab W × H × D.

- **The world:** periodic in x (the ring) and **open in z**. Each tree is a free 3D tree, with open sky in front and behind. Buds beyond a face get Q = 0 and growth stops there (the closed-box rule); light passes freely.
- **D** is deferred to I2, from the review's cost table. D = 32 is recommended for the phone's intro, and the grown stand is seen at two values of D, since face clipping shapes crowns.
- **The view:** the garden's orthographic frontal illustration, (x, y) drawn in z order. No perspective, foreshortening cue, depth darkening or second rank is in scope.
- **The light:** the row-marched Beer–Lambert sweep at K = 16 with rotation, in Float32. It is chosen over the pyramid for the open faces' side light and the M6–M27 calibrations. The pyramid with a precomputed cone is the fallback if G3 fails.
- **The whole core moves to Rust:**
  - it builds to WASM (SIMD; lanes only where cross-origin isolation is served) and natively for the CLI;
  - the TypeScript core stays only until the Rust 2D core reproduces every golden bit for bit;
  - during G2–G3 only the sky sweep is frozen, and during I1 (3–5 sessions) all 2D behaviour.
- **The bundle:** ADR 0014's 60 kB stays the first-paint JS budget. The WASM loads after first paint, and gets its own gate (its measured size plus 25%) once I1 measures it. 3D first-paint data gets its own budget at I3.

**The sequence and its gates:**
- **G1,** now, on the existing preview deploy: the measured kernel on the user's phone at D = 32, 48 and 64. Stop if 4-lane SIMD light at D = 32 exceeds 150 ms a season.
- **G2:** the Rust 2D sweep behind `LightModel`, goldens bit-identical.
- **G3:** 3D light accuracy against an exact trace that stops at the faces. Fall back to the exact segment integral or the pyramid, or stop, if the error is above twice M18's.
- **I1:** the Rust 2D core, every golden bit-identical; the TS core deleted.
- **I2:** a stand grown in 3D, at two values of D. Fall back to coarser light cells if a season exceeds 250 ms on the phone at D = 32.
- **V, the visual check:** I2's stand drawn orthographically with the existing renderer, beside today's pseudo-depth, on the user's phone. The user decides by eye; if it is not worth it, 3D stops and I1 stands as the end state.
- **Calibration** (C1–C8) only after V.

Nothing in `src/`, the goldens or the default light model changes before G2 is agreed.

## Consequences
- **Easier:**
  - Exact reproducibility on every engine, with Float32 and a vendored polynomial exp checked native against WASM.
  - Faster sweeps natively.
  - §10's 3D allometries (self-thinning −3/2, crowding) become directly comparable.
  - Rust's types can guard the ordering invariants.
- **Worth having even if 3D stops at V:** I1, a bit-identical Rust 2D core, about 2× faster, deterministic across browsers, with PyO3 a feature flag away. It does not make the 2D garden visibly better.
- **Harder:**
  - A second toolchain in CI.
  - The WASM after first paint, and a first frame the JS renderer draws without the core.
  - COOP/COEP on the site.
  - Checkpoints MB-sized, unless the intro grows the forest.
  - A GPU-side tween and wind.
  - Depth-ordered drawing in place of ADR 0008's layers.
  - Every golden, evidence test and species calibration redone; open z makes every tree an edge tree in z, so the woodland's floor light, shade order and succession move furthest.
  - Face clipping piles foliage at the faces and shifts allocation, which the D choice and the calibration must face.
  - A 2D freeze of 3–5 sessions.
  - About 14 milestones in all.
- **Revisit** if G1 or G3 fails, if V does not show a clear gain, or if the user wants trees seen from an angle (a full volume, out of this decision's scope).
