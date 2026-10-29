# 0024: Trees that grow in 3D, drawn as today, with a Rust core, through gates

- **Status:** accepted (user, 2026-10-29). D = 64; the faces' transmission τ a world parameter with the wood interior as the default look. The interior's exact τ and the face fade are settled at I2/C1. G1 and G2 have passed.
- **Date:** 2026-10-29
- **Spec:** §2 (reverses Option P), §5, §6, §C2.4, §C2.8, §10. It also reverses the M12 review's decision 3 and ADR 0008's pseudo-depth squeeze (the geometry carries real depth). For the garden, it ends the AGENTS invariant "No SharedArrayBuffer". It meets ADR 0001's Rust/WASM trigger.
- **Review:** [3D port review](../reviews/2026-10-29-3d-port-review.md), which carries the conclusions of every note below.

## Context
- **The goal** (user): today's trees look like fans because they grew in a plane. The port exists so that they grow in three dimensions: branches toward and away from the viewer, crowns that are volumes, buds competing in three dimensions. The picture stays the garden's flat, frontal, orthographic illustration, and depth shows only through silhouette and overlap.
- **The light** ([light-cost](../experiments/2026-10-29-3d-light-cost.md), [open-slab](../experiments/2026-10-29-open-slab-cost.md) notes):
  - the row-marched sweep at depth D costs about D × the 2D light in TypeScript;
  - Rust with Float32 SIMD and lanes takes it back. **G1** on the user's Pixel 8a: 32 ms at D = 32 and 43 at D = 64, against the 150 ms rule.
- **The prototype** ([note](../experiments/2026-10-29-proto3d.md)), throwaway:
  - 3D stands carry 13–26× the 2D metamers while growing (8× at a plateau);
  - a 3D metamer's passes cost 1.1–1.8× a 2D one;
  - free crowns are about 0.8 × height deep.
- **The faces** ([τ note](../experiments/2026-10-29-face-transmission.md)):
  - open faces light the lower crown, which the tree keeps, so open-z stands read as hedges;
  - a transmission τ on the sky beyond each face moves that lower crown: τ = 1 keeps 12–16% of each tree's leaves below half height, τ ≤ 0.2 none;
  - at every τ the stands also put 10–20× today's leaves on the same picture.
- **The projection** (review §2): `forest` at season 40 costs ≈ 61–75 ms a season on the phone under Rust, SIMD and 4 lanes at D = 32–64, against the intro's 250 ms. Single-threaded SIMD fits too.
- **G2** ([note](../experiments/2026-10-29-g2-rust-sweep.md)):
  - the 2D sky sweep in Rust reproduces all 27 goldens, and every field, bit for bit;
  - this needed V8's `Math` ported: fdlibm sin, cos and exp, glibc's pow (V8's `Math.pow` calls the C library), and V8's hypot;
  - the module is 24 kB gzip;
  - bit-identical, the light is 1.35× slower in WASM than in V8, because exp is;
  - the TypeScript core reproduces only 7 of the 27 goldens in Chromium.

## Decision
**The world:** trees grow in a slab W × H × D.
- **Periodic in x** (the ring) and **open in z**. Buds beyond a face get Q = 0 and growth stops there (the closed-box rule).
- **D = 64,** fixed per world. It holds every look's crowns without piling foliage at the faces.
- **The faces' transmission τ:**
  - the sky beyond each z face is seen through τ, set for the front (viewer's) and back faces separately;
  - τ is a world parameter (plain JSON, read each season), exposed as a host option for the garden and a control in the lab;
  - **the default look is the wood interior, τ ≈ 0.2 on both faces.** Presets: the **wood edge** (1 in front, 0.2 behind) and the **hedgerow** (1, 1);
  - the interior's exact τ is settled at C1, with the full model grown in 3D.
- **The fade** (Q falling to 0 over the last cells before each face) is settled at I2, which grows D = 64 with and without it. It matters only where a face is open.

**The view:** the garden's orthographic frontal illustration, (x, y) drawn in z order. No perspective, foreshortening cue, depth darkening or second rank is in scope.

**The light:** the row-marched Beer–Lambert sweep at K = 16 with rotation, in Float32, with τ at the faces. It is chosen over the pyramid for its sky, which is what gives the faces' light, and for the M6–M27 calibrations. The pyramid with a precomputed cone is the fallback if G3 fails.

**Foliage density** is a calibration and renderer target, not a modelling one. It is measured by picture coverage: the share of the picture's cells holding a leaf in the lower and upper halves of the canopy, and the leaves per covered cell (τ note §3). It has two halves, and neither milestone fixes the other's:
- **I3 (the renderer) decides how thick the crowns draw:** leaf size, opacity, level of detail. Some coverage is inherent to projecting a volume orthographically, and that is I3's.
- **C1 (calibration) decides how much foliage the model carries:** m, and R2–R5, which were off in the prototype.
- **So neither covers for the other:** I3 does not thin the drawing to hide a model that carries too much, and C1 does not under-grow foliage to suit a renderer. C1 reports coverage with today's leaf drawing; I3 tunes against C1's stands.

**The whole core moves to Rust:**
- **Builds:** WASM (SIMD; threads for the garden on edbarker.dev, where cross-origin isolation is served; the lab single-threaded) and natively for the CLI.
- **The crates:** `rust/core` is dependency-free, with nothing wasm-only and threads behind a feature; `rust/wasm` is the thin wasm-bindgen wrapper.
- **One implementation:** the TypeScript core stays only until the Rust 2D core reproduces every golden bit for bit (I1), then is deleted.
- **The freeze:**
  - during G2–G3 only the sky sweep (`src/core/light/sky-sweep.ts`) is frozen. A change to it lands in both cores and passes the parity test;
  - the full 2D freeze covers I1 (3–5 sessions).
- **Math:** the Rust core never calls a platform `Math`. It carries V8's routines bit for bit, so its results are the goldens' on every engine.

**The bundle:** ADR 0014's 60 kB stays the first-paint JS budget. The WASM loads after first paint, and gets its own gate (its measured size plus 25%) at I1. 3D first-paint data gets its own budget at I3.

**The sequence:**
- **G1:** passed.
- **The prototype and τ runs:** done.
- **G2:** passed. The page keeps the TypeScript sweep until I1 switches the whole core, since a Rust sweep alone would give browser visitors Node's light and Chrome's everything else.
- **G3:** 3D light accuracy against an exact trace that stops at the faces and applies τ. Fall back to the exact segment integral or the pyramid, or stop, if the error is above twice M18's.
- **I1:** the Rust 2D core with every golden bit-identical and the rest of `Math` vendored (atan2, log, log1p, cbrt, tanh, asin, acos, atan, expm1); the TS core deleted.
- **I2:** a stand grown in 3D with every principle at D = 64 and the interior's τ, with and without the fade. Fall back to D = 48 for the interior only if a season exceeds 250 ms on the phone with lanes.
- **V, the visual check:** I2's stand drawn orthographically with the existing renderer, beside today's view, on the user's phone. The user decides by eye; if it is not worth it, 3D stops and I1 stands as the end state.
- **I3:** the 3D renderer, including the drawing half of foliage density.
- **Calibration** (C1–C8) only after V.

## Consequences
- **Easier:**
  - **Exact reproducibility on every engine** once I1 lands. Today's TypeScript core is exact only on one engine build: Chromium reproduces 7 of the 27 goldens.
  - Faster native sweeps for experiments.
  - §10's 3D allometries (self-thinning −3/2, crowding) become directly comparable.
  - Rust's types can guard the ordering invariants.
  - τ gives the garden three looks from one model.
- **Worth having even if 3D stops at V:** I1, a bit-identical Rust 2D core, deterministic across browsers and native, with PyO3 a feature flag away. It is not faster in the browser under bit-identity (G2), and it does not make the 2D garden visibly better.
- **Harder:**
  - A second toolchain in CI and in `npm run check` (Rust 1.97, the wasm32 target, wasm-bindgen-cli pinned to the crate's version).
  - **The goldens' bits are tied to Node on x86-64 Linux with glibc's FMA pow,** which the Rust core reproduces and pins. A CI runner with another glibc would break the TypeScript goldens first.
  - The WASM after first paint, and a first frame the JS renderer draws without the core.
  - COOP/COEP on the site.
  - Checkpoints MB-sized, unless the intro grows the forest.
  - A GPU-side tween and wind for 40–90k metamers.
  - Depth-ordered drawing in place of ADR 0008's layers.
  - About 145 MB of memory on the phone at D = 64 with four lanes.
  - Every golden, evidence test and species calibration redone, at the default τ with the presets checked.
  - **Foliage density is a target in two milestones,** C1 (what the model carries) and I3 (how it draws), each measured by picture coverage.
  - A 2D freeze of 3–5 sessions (I1).
  - About 14 milestones in all.
- **Revisit** if G3 or I2 fails, if V does not show a clear gain, or if the user wants trees seen from an angle (a full volume, out of this decision's scope).
