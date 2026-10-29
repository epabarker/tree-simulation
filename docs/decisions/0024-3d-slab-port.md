# 0024: A 3D slab with a Rust core, through gates

- **Status:** proposed (awaits the user: first G0.5, then the z boundary, then G1)
- **Date:** 2026-10-29 (amended the same day)
- **Spec:** §2 (reverses Option P), §5, §6, §C2.4, §C2.8, §10. It also reverses the M12 review's decision 3 and ADR 0008 (pseudo-depth). For the garden, it ends the AGENTS invariant "No SharedArrayBuffer". It meets ADR 0001's Rust/WASM trigger. Numbered after M26–M27's ADRs 0019–0023.

## Context
- **The user's goal:** 3D for the garden's view, a line of trees seen from the front, one crown deep (2026-10-29). A full volume and a free camera are out of scope. The port exists only if true depth looks better than ADR 0008's pseudo-depth, which the user judges by eye (G0.5, [note](../experiments/2026-10-29-g05-slab-preview.md)).
- **Hosting:** edbarker.dev is on Cloudflare and can send COOP/COEP (ADR 0014). Locally the whole site runs cross-origin isolated with nothing blocked; the deployed check is owed.
- **The measurement** ([note](../experiments/2026-10-29-3d-light-cost.md)):
  - Canopy crowns are 20–30 cells wide, so D = 32.
  - The row-marched sweep extends to the slab at 24–28 ns per cell–direction update in TypeScript, linear in D·K. At D = 32 and K = 16 that is 250–290 ms for `forest` and about 700 ms for `panorama`, about 100× the 2D light.
  - The same kernel in Rust costs 2.0× less as scalar WASM and 5.2× less with Float32 SIMD. 4 lanes save a further 2.6–3.2× (22 ms for `forest` in a desktop browser).
  - Float64 WASM is bit-identical to the TypeScript kernel.
  - **The 3D shadow pyramid on equal terms** (the note's addendum): with Rust and a precomputed cone it costs 33–35 ms single-threaded, against the sweep's 63–153, and about the same threaded. Cost does not separate the two.
- **The projection** ([review](../reviews/2026-10-29-3d-port-review.md) §2): only Rust with SIMD and threads keeps the garden's 4-seasons-a-second intro, at ≈ 190 ms a season for `forest` on the user's phone. The tree passes are half of that and are estimated, not measured.
- **The model changes:** the three-slot topology, scalar directions and scalar moments all go. About 8 calibration milestones follow (review §4).

## Decision
If the user agrees after G0.5: port to a slab W × H × D, D = 32 (24 if the phone needs it), periodic in x, seen from the front.

**The z boundary is not decided here.** The user chooses after G0.5, between:
- **open z** (a hedgerow): every tree an edge tree; crowns stop flat at the faces unless D grows to 48–64 or growth may leave the slab in z; far from today's woodland calibrations; about 8–16% cheaper light in TypeScript;
- **periodic z** (the front row of a wood): close to today's calibrations, but every tree's depth neighbour is its own clone, so a felled tree fells its clones and every gap repeats behind itself.

The review's Qz sets them out side by side.

**The light** is the row-marched Beer–Lambert sweep at K = 16 with rotation, in Float32. It is chosen over the pyramid for behaviour, not cost: the sky (side light through open faces, the light-weighted V) and the M6–M27 calibrations. The pyramid with a precomputed cone stays the fallback if G3 fails.

**The whole core moves to Rust:**
- it builds to WASM (SIMD; threads only where cross-origin isolation is served) and natively for the CLI;
- the TypeScript core stays only until the Rust 2D core reproduces every golden bit for bit, 5–8 sessions from G2 to I1;
- during G2–G3 only the sky sweep is frozen, and during I1 (3–5 sessions) all 2D behaviour.

**The bundle:** ADR 0014's 60 kB stays the first-paint JS budget. The WASM loads after first paint, which is drawn from a JS frame or checkpoint. Once I1 measures the WASM it gets its own gate, at that size plus 25%. 3D first-paint data gets its own budget at I3.

**The gates, each of which can stop the work:**
- **G0.5:** a frontal preview against today's view, on the user's phone. Stop if it is not a clear improvement; the Rust question then reopens as a 2D-only port.
- **G1,** from the same deploy: the measured kernel on the user's phone. Stop if 4-lane SIMD light exceeds 150 ms a season at `forest` size.
- **G2:** the Rust 2D sweep behind `LightModel`, goldens bit-identical.
- **G3:** 3D light accuracy against an exact trace, for the chosen z boundary. Stop, or fall back to the pyramid or an exact segment integral, if the error is above twice M18's.
- **I2:** a grown 3D stand on the phone. Fall back to D = 24 or coarser cells if a season exceeds 250 ms. No calibration milestone is scheduled before the user has looked at it.

## Consequences
- **Easier:**
  - Exact reproducibility on every engine, with Float32 and a vendored polynomial exp checked native against WASM.
  - Faster sweeps natively.
  - §10's 3D allometries (self-thinning −3/2, crowding) become directly comparable.
  - Rust's types can guard the ordering invariants.
- **Worth having even if 3D stops after I1:** a bit-identical Rust 2D core, about 2× faster, deterministic across browsers, with PyO3 a feature flag away. It does not make the 2D garden visibly better.
- **Harder:**
  - A second toolchain in CI.
  - WASM after first paint, and a first frame the JS renderer draws without the core.
  - COOP/COEP on the site.
  - Checkpoints 4–20× over M21's budget, unless the intro grows the forest.
  - A GPU-side tween and wind.
  - Every golden, evidence test and species calibration redone.
  - A 2D freeze of 3–5 sessions.
  - About 14 milestones in all.
- **Revisit** if G0.5, G1 or G3 fails, or if the user wants trees seen from an angle (a full volume, out of this decision's scope).
