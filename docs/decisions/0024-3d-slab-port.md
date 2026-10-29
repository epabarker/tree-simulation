# 0024: Trees that grow in 3D, drawn as today, with a Rust core, through gates

- **Status:** accepted in principle (user, 2026-10-29), with **D and the faces open** until the user has looked at the face-transmission stands. D = 64 and a 3-cell fade were filled in from the prototype the same day, then held open again (user: "Hold ADR 0024 at accepted-in-principle with D and τ open until I have looked").
- **Date:** 2026-10-29 (amended four times the same day)
- **Spec:** §2 (reverses Option P), §5, §6, §C2.4, §C2.8, §10. It also reverses the M12 review's decision 3 and ADR 0008's pseudo-depth squeeze (the geometry carries real depth). For the garden, it ends the AGENTS invariant "No SharedArrayBuffer". It meets ADR 0001's Rust/WASM trigger. Numbered after M26–M27's ADRs 0019–0023.

## Context
- **The goal** (user, 2026-10-29):
  - Today's trees look like fans because they grew in a plane. The port exists so that they grow in three dimensions: branches toward and away from the viewer, crowns that are volumes, buds competing in three dimensions.
  - The picture stays the garden's flat, frontal, orthographic illustration. Depth shows only through silhouette and overlap.
- **G0.5** ([note](../experiments/2026-10-29-g05-slab-preview.md)) is the hosting record: the site runs cross-origin isolated with nothing blocked. It is not a visual gate.
- **G1** ([open-slab note](../experiments/2026-10-29-open-slab-cost.md), addendum) passed with room:
  - 4-lane WASM SIMD light at D = 32 takes 32 ms on the user's Pixel 8a (rule: 150 ms) and 13 ms on their laptop; D = 64 takes 43 and 32.
  - Single-threaded the phone is within 15% of the laptop; its lane scaling is 1.5–2.0×.
- **The 3D prototype** ([note](../experiments/2026-10-29-proto3d.md)): throwaway, C1–C6 and R1 (and R6 as a second set), with the core's dimension-free passes imported.
  - **Tree size:** 3D crowns are about 0.8 × height deep, 70–85 cells for the full model's mature trees.
  - **The faces:** with R6, clipping stacks foliage at them. At D = 32 a 3-cell fade does not cure it; at D = 48 it does; at D = 64 crowns taper of their own accord.
  - **Cost:** m is 13–26 while stands grow (about 8 at a plateau). A 3D metamer's passes cost 1.1–1.8× a 2D one.
- **The faces' transmission τ** ([note](../experiments/2026-10-29-face-transmission.md)):
  - τ attenuates the sky beyond each z face, per face. It costs no time in the sweep.
  - The prototype's stands read as hedges, leafy to the ground, because open faces light the lower crown: at τ = 1 each tree keeps 12–16% of its leaves below half height and covers 26–33% of the picture's lower half. At τ ≤ 0.2 that falls to 0–2%.
  - Today's garden keeps a similar share (13–15%) but covers only 1–3%. The rest of the hedge look is the stands' density (10–20× the leaves on the same picture), which calibration, not τ, must address.
- **The projection** ([review](../reviews/2026-10-29-3d-port-review.md) §2): `forest` at season 40 costs ≈ 61–75 ms a season on the phone at D = 32–64 under Rust, SIMD and 4 lanes, against the intro's 250 ms. Single-threaded SIMD fits too.
  - Light is measured; the tree passes rest on measured-in-prototype multipliers.
  - Rust's speed-up and the effect of R2–R5 in 3D are still estimated.
- **The model changes:** the three-slot topology, scalar directions and scalar moments all go. About 8 calibration milestones follow (review §4).

## Decision
Trees grow in a slab W × H × D:
- **The world:** periodic in x (the ring) and **open in z**. Each tree is a free 3D tree. Buds beyond a face get Q = 0 and growth stops there (the closed-box rule); light passes.
- **Open: what lies beyond each face.** The sky there is seen through a transmission τ per face, [front, back]:
  - 1 is open country, 0 a dark wood;
  - τ is a world parameter (plain JSON, read each season), which the garden can expose, not a one-time choice;
  - the review's §2d proposes 1, 1 for a hedgerow, 1, 0.2 for a wood edge and 0.2, 0.2 for a wood interior.
- **Open: D.** 64 is recommended: D is fixed per world, so it must hold the most demanding look (hedgerow and edge want 64). 48 suffices for a wood interior alone.
- **Open: the fade** (Q falling to 0 over the last 3 cells before each face). It matters only at τ = 1, and I2 grows D = 64 with and without it.
- **The view:** the garden's orthographic frontal illustration, (x, y) drawn in z order. No perspective, foreshortening cue, depth darkening or second rank is in scope.
- **The light:** the row-marched Beer–Lambert sweep at K = 16 with rotation, in Float32. It is chosen over the pyramid for the open faces' side light and the M6–M27 calibrations. The pyramid with a precomputed cone is the fallback if G3 fails.
- **The whole core moves to Rust:**
  - it builds to WASM (SIMD; lanes for the garden on edbarker.dev, where cross-origin isolation is served; the lab single-threaded) and natively for the CLI;
  - the TypeScript core stays only until the Rust 2D core reproduces every golden bit for bit;
  - during G2–G3 only the sky sweep is frozen, and during I1 (3–5 sessions) all 2D behaviour.
- **The bundle:** ADR 0014's 60 kB stays the first-paint JS budget. The WASM loads after first paint, and gets its own gate (its measured size plus 25%) once I1 measures it. 3D first-paint data gets its own budget at I3.

**The sequence:**
- **G1:** passed.
- **The prototype:** done.
- **The face-transmission runs:** done.
- **G2,** after the user has looked and settled D and τ: the Rust 2D sweep behind `LightModel`, goldens bit-identical.
- **G3:** 3D light accuracy against an exact trace that stops at the faces. Fall back to the exact segment integral or the pyramid, or stop, if the error is above twice M18's.
- **I1:** the Rust 2D core, every golden bit-identical; the TS core deleted.
- **I2:** a stand grown in 3D with every principle, at the settled D (64 recommended) and τ, with and without the fade. Fall back to D = 48 with the fade if a season exceeds 250 ms on the phone with lanes.
- **V, the visual check:** I2's stand drawn orthographically with the existing renderer, beside today's pseudo-depth, on the user's phone. The user decides by eye; if it is not worth it, 3D stops and I1 stands as the end state.
- **Calibration** (C1–C8) only after V.

Nothing in `src/`, the goldens or the default light model changes before G2 starts.

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
  - A GPU-side tween and wind for 40–90k metamers.
  - Depth-ordered drawing in place of ADR 0008's layers.
  - About 145 MB of memory on the phone at D = 64 with four lanes.
  - Every golden, evidence test and species calibration redone.
  - **Open z makes every tree an edge tree in z,** unless τ darkens the faces. Each look the garden offers must be calibrated at its τ, or checked against the one calibrated.
  - The prototype's stands are 10–20× as dense on the picture as today's garden; calibration (C1, C5, R4, R5) must address that at every τ.
  - A 2D freeze of 3–5 sessions.
  - About 14 milestones in all.
- **Revisit** if G3 or I2 fails, if V does not show a clear gain, or if the user wants trees seen from an angle (a full volume, out of this decision's scope).
