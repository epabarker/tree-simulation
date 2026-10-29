# Brief: planning a 3D port of tree-simulation

Written 2026-10-29 from a read of `epabarker/tree-simulation` at HEAD (M25). It is an outside view, meant to inform a plan, not to be one. Section 7 lists the questions the plan should answer explicitly. All performance figures marked *measured* come from the repo's own experiment notes; everything else is an estimate and is labelled as such.

## 1. What the current system is

- **Model:** a planar (slab) self-organizing tree model after Palubicki et al. (2009). Spec §2 chooses "Option P": a thin slab with round stems. The planarity is a modelling decision, not only a cost saving (see §6).
- **Code shape:** TypeScript throughout. Each tree is a set of flat typed arrays (structure-of-arrays, `src/core/soa.ts`, `src/core/tree.ts`) in parent-before-child order. Every pass is a plain loop over typed arrays with no allocation in the hot path. The simulation runs in a Web Worker (`src/worker/sim.worker.ts`); Node runs the same core headless (`cli/run.ts`, `cli/bench.ts`).
- **Light:** `src/core/light/sky-sweep.ts`, a Beer–Lambert sky sweep over K = 7 directions on a W×H grid, row-marched since M18. An older shadow-triangle model (`shadow-triangle.ts`) is still selectable. Light is a shared field; trees compete through it.
- **Determinism:** keyed-hash RNG (ADR 0002); goldens (`tests/golden.json`) hash every Float64 column. Reproducibility is "exact on V8 only".
- **Rendering:** WebGL2 via twgl.js (instanced SDF capsules and leaves), Canvas 2D fallback. First paint ~60 kB gzipped against a 100 kB budget (ADR 0001 update).
- **Hosting:** static files on GitHub Pages, plus `garden.html` embedded on edbarker.dev. GitHub Pages cannot send COOP/COEP headers, so SharedArrayBuffer is unavailable there (ADR 0001).
- **Stated triggers for Rust/WASM** (ADR 0001): a season > ~50 ms in the worker at target stand size; sweeps outgrow an overnight run; in-process import from Python/R wanted.

## 2. Measured baseline (desktop, i7-1260P, Node 24)

From `docs/experiments/2026-10-27-m13-perf.md` and `2026-10-28-m18-light.md`:

| Case | Grid | Metamers (s100) | Season ms | Light ms |
|---|---|---|---|---|
| skyTree | 120×100 | 1105 | ~1.4 | — |
| skyStand | 230×110 | 2446 | ~3.0 | 1.6 |
| coniferStand | 230×160 | 10680 | ~5.0 | ~3.0 |
| forest (ring) | 210×130 | 1575 | ~2.5 | 1.4 |
| wideForest (ring) | 420×130 | 3256 | ~5–7 | 2.9 |
| panorama (ring, 55 trees) | 520×140 | — | 7.6 (p95 9.8) | — |

Where a season goes (M13 profile, post-optimisation): the sweep inner loop ~30% of samples, the exp pass ~19%, nothing else above 5%. Light is roughly 60–70% of a season on rings. Tree passes (allocate, grow, shed, girth, mechanics) are ~1 ms for a few thousand metamers. A lean snapshot costs 0.1–0.3 ms.

Light-model accuracy (M18): row march has mean |ΔQ|/C ≈ 0.035–0.049 against an exact ray trace. This matters for §4: the model already tolerates ~4% error, so a faster approximate exp is well inside it.

Optimisations already taken that a port must not undo: sweep bounded to the leafy rows; periodic laps stop at the fixed point; wrap without modulo; Newton for junction exponents; padded row copies so the inner loop only indexes.

## 3. How the computation scales from 2D to 3D

All factors below are estimates unless marked.

### 3.1 Light

**Sky sweep.** Cost goes from K·W·H to K·W·H·D. Two multipliers compound:

- D, the depth of the world in cells. A thin slab (D ≈ 4–16) is what the roadmap's "about 50×" refers to. A cube-ish world (D ≈ H) is 100× from D alone.
- K. Seven directions cover a half-plane; covering a hemisphere at similar angular resolution needs roughly K² ≈ 30–60. Even a coarse hemisphere wants 16–24.

Net: **~50× for a thin slab, 300–1000× for a cube-ish world.** At 300×120×120 and K = 40 that is ~170M cell-direction updates per season, about 0.5 s in JavaScript at the current per-update cost, before any tree work.

The row march does generalise: climb one z-plane at a time, replace the per-row prefix sums with a per-plane 2D summed-area table, keep O(1) per cell per direction. It stays correct on a ring (periodic x, or periodic x and z).

**Shadow pyramid** (Palubicki's actual 3D method; `shadow-triangle.ts` is its 2D form). Cost is buds·(q+1)³ instead of buds·(q+1)². At q = 6 that is 343 updates per bud: 30k buds → ~10M updates, independent of world volume. It loses the directional Beer–Lambert sky and the "light from beyond the sides" behaviour that gives edge trees their lean, so it is a behavioural change as well as a cost one.

**Recommendation to evaluate, not adopt:** the sweep was chosen in 2D *because* 2D made it affordable (stack brief §2). In 3D the pyramid, or a hybrid (pyramid for shade, a cheap K ≈ 8 directional term for V), is likely the right default, with the full sweep as a desktop-only or offline option.

### 3.2 Metamer count and the tree passes

- A 2D node has three slots (continuation, left, right) and the crown is a plane. In 3D with spiral phyllotaxis the crown fills a volume. For the same height and stand size expect **5–20× more metamers**. Palubicki's figures run to 10⁴–10⁵ per tree.
- Per-metamer cost rises too: direction becomes a unit 3-vector or quaternion instead of one angle; R3 mechanics needs vector moments and a rotation per metamer instead of a scalar turn; C4 tropism and R5 shade avoidance operate on 3-vectors; O2 shyness needs a spatial hash for neighbour queries instead of a planar check. Estimate **2–4× per metamer** on top of the count.
- Net for the tree passes: ~1 ms today → **~10–80 ms** for the same stand in JavaScript.

### 3.3 Memory

Today: six Float64 columns over 73k cells (~3.5 MB). A 300×120×120 grid with lad, q, three V components and depth at **Float32** is ~100 MB; at Float64, 200 MB. This is the phone constraint and it bites before compute does. Consequences the plan must take:

- Float32 for the field (changes goldens; the model's own ~4% error makes this safe for accuracy).
- A bounding box around the foliage, or a sparse/bricked grid, not a dense world volume.
- Snapshot transfer stays cheap only if the field is not snapshotted every season.

### 3.4 Rendering and snapshot

Not in scope of the core port but it sets the frame-time budget on phones: tapered cones with lighting, 10⁴–10⁵ leaves with depth ordering or a z-buffer, overdraw. The 2D view had moved past the renderer being the constraint (M13 conclusion); 3D brings it back. Budget it from the start.

### 3.5 Putting it together

A `forest`-sized stand in 3D, JavaScript, is plausibly **50–500 ms per season** depending on the light model and grid policy, against the current 2.5 ms and the ADR 0001 trigger of 50 ms. The 3D move fires the trigger on its own; the question is not whether to leave pure JavaScript but how.

## 4. What Rust/WASM can and cannot buy

### 4.1 Scalar port of the existing code

The current code is already the shape that V8 compiles well: typed arrays, monomorphic loops, no allocation, no modulo. Most published 10× WASM wins come from replacing allocation-heavy or polymorphic JavaScript. Against this code, expect **1.2–2.5×** from a scalar Rust port. `Math.exp` and libm `exp` are the same class of scalar routine.

### 4.2 Gains that need deliberate opt-in

1. **SIMD (wasm128).** The depth accumulation and the exp pass vectorise well. f64x2 ≈ 2×, f32x4 ≈ 4× on those loops. A polynomial exp in SIMD lanes can make the exp pass 5–10× faster at ~1e-6 relative error, far inside the model's tolerance, but not bit-identical: goldens re-hash.
2. **Threads.** Sky directions are independent and the pyramid is independent per bud, so the light phase parallelises almost perfectly: **3–4× on a phone's cores**. This is the largest single lever for 3D. It needs SharedArrayBuffer, hence COOP/COEP headers. GitHub Pages cannot set them. Options:
   - Serve the garden from a host that can (Cloudflare Pages, Netlify, own server) and set the headers there. Check what edbarker.dev runs on before planning around this.
   - `coi-serviceworker`-style header injection via a service worker: works, fragile, first-load reload.
   - No shared memory: N plain Workers each with its own WASM instance, LAD grid copied in per season. At 4M Float32 cells that is 16 MB per worker per season, tolerable at a few seasons per second, not free.
3. **Non-speed benefits that match ADR 0001's own triggers.**
   - WASM f64 arithmetic is deterministic across engines; only `exp` is implementation-defined, and a vendored exp removes that. "Exact on V8 only" becomes exact everywhere, which also makes the goldens meaningful in CI across browsers.
   - PyO3 lets `analysis/` import the core directly instead of running the CLI and reading CSV.
   - The slot/parent-index and compaction invariants (architecture.md "Ordering invariants") are currently guarded by convention; Rust's type system can guard them.

### 4.3 Costs

- A second toolchain (cargo, wasm-bindgen or similar, wasm-opt) in CI and in `npm run check`.
- `.wasm` size: ~40–100 kB gzipped for a core this size, against a 100 kB first-paint budget currently at 60 kB. The 3D renderer will also grow. The budget needs re-deciding, not just measuring.
- The one-implementation rule (stack brief §5) is kept only if the TypeScript core is retired, not kept alongside. Running both doubles every golden and every ablation.
- Snapshot transfer across the WASM boundary: copy out of linear memory into transferables each season. Cheap in lean mode; design the snapshot layout so it is one memcpy, not per-field.

### 4.4 Rough multiplier chain for the 3D light phase

Scalar Rust ~1.5× → Float32 SIMD ~3× more → 4 threads ~3.5× more ≈ **15× over the JavaScript sweep**. Without threads ≈ 4–5×. Fifteen× makes a thin-slab sweep comfortable and a cube-ish sweep marginal; 4–5× does not rescue a cube-ish sweep but makes pyramid-plus-sparse-grid comfortable.

## 5. A pre-port measurement that would replace most of these estimates

Doable in the existing TypeScript in an afternoon, and it anchors every figure in §3:

1. Extend `SkySweep` (or a copy) to a slab of depth D: row march with a per-plane summed-area table.
2. Run `npm run bench` over D ∈ {1, 4, 16, 64} × K ∈ {7, 16, 32} on `forest` and `wideForest`, Float64 and Float32.
3. Report ms against D·K. The slope is the real per-update constant for this code on this machine; the intercept is the fixed per-season cost.
4. Separately time the shadow-triangle model with the pyramid extended to (q+1)³ on the same cases, as the alternative.

If step 3 lands near the §3 figures, the plan's light-model and threading decisions follow from hosting constraints more than from language. If it lands far off, update §3 before planning further.

## 6. The model changes, not only the cost

The plan should not describe this as a port of the same model. The planar assumption is load-bearing in several calibrated results:

- R3 mechanics uses scalar moments and an E tuned down because "a 2D limb carries less foliage than its 3D counterpart" (ROADMAP, `r3.E`). 3D moments and a physical E need recalibrating (M9-style experiment).
- Self-thinning slopes measured at −2.8 to −3.1 (devlog) were interpreted against §10's hypothesis for 3D cylinder mass; in 3D the comparison changes meaning.
- Shade, edge lean, ground light and crown ratio were all calibrated under half-plane light (M6e, M18). Hemisphere light will shift every one of them.
- Phyllotaxis: three slots per node cover every 2D case (architecture.md); 3D needs a real divergence angle, which changes `c1-buds.ts`, `growShoot`, and the slot-based bud-bank logic in R4.
- Species presets (M19–M20, ADR 0016) were calibrated per principle under 2D; expect an M4-style calibration pass per species.

Budget for a calibration milestone sequence, not just an implementation one. Keep the 2D core and its goldens as the reference until the 3D one has its own evidence tests.

## 7. Questions the plan should answer explicitly

1. **World shape:** thin slab (D ≤ 16, "thick 2D") or volume? This single choice moves the light cost by an order of magnitude and decides whether the sweep survives.
2. **Light model:** sweep, pyramid, or hybrid? With what K? What is lost behaviourally with each (edge light, directional V, Beer–Lambert canopy)?
3. **Grid policy:** dense bounding box, bricked sparse grid, or per-tree local grids with a shared coarse grid? Float32 everywhere?
4. **Hosting:** can cross-origin isolation be served? This decides whether threads are a plan item or a wish.
5. **Language boundary:** whole core in Rust, or light phase only behind the existing `LightModel` interface? The latter is the smaller first step and tests the toolchain and goldens cheaply, but leaves the tree passes, which also grow 10–80×, in JavaScript.
6. **Goldens and determinism:** which existing goldens are kept as the 2D reference, and what is the new golden policy once Float32 and approximate exp are in?
7. **Renderer budget on a mid-range phone:** target frame time, instance counts, leaf strategy, and whether the light field is still uploaded as a texture.
8. **Analysis path:** CLI + CSV as now, or PyO3 import? If PyO3, the Rust core must build natively as well as to WASM, which constrains dependencies.
9. **Milestone order:** a suggested shape is (a) the §5 measurement in TypeScript; (b) Rust light phase behind `LightModel`, 2D, goldens unchanged, to prove the toolchain; (c) 3D light phase and grid policy; (d) 3D tree passes and phyllotaxis; (e) calibration milestones; (f) renderer. Steps (b) and (c) are where the plan can fail cheaply.

## 8. Files worth reading first

- `docs/decisions/0001-stack.md` (triggers, rejected options, cost estimates that this brief updates)
- `docs/background/stack-brief.md` §2 (why 2D was chosen)
- `docs/experiments/2026-10-27-m13-perf.md`, `2026-10-28-m18-light.md` (the only measured performance data)
- `src/core/light/sky-sweep.ts`, `shadow-triangle.ts`, `light-model.ts` (the interface a Rust light phase would implement)
- `src/core/tree.ts`, `soa.ts`, `season.ts` (data layout and the phase order a port must preserve)
- `docs/architecture.md` "Ordering invariants" and the phase table
- `docs/ROADMAP.md` line on "Depth beyond ADR 0008" (the project's own prior estimate of ~50× for a slab)
- `cli/bench.ts` (how to add the §5 cases)
