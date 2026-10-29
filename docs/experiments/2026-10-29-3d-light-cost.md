# 3D port: what the light costs in a slab of depth D

## Question
What would the light phase cost if the world became a slab W × H × D, the shape the user chose for a 3D port (a line of trees seen from the front, one crown deep)? The [3D-port brief](../background/3d-port-brief.md) §3 estimates this without running anything. This note runs the measurement in its §5:
- the M18 row march extended to depth D, with a per-plane summed-area table;
- `forest` and `wideForest` at D ∈ {1, 4, 16, 32, 64} × K ∈ {7, 16, 32}, in Float64 and Float32;
- the shadow triangle extended to a pyramid on the same cases.

It reports ms against D·K and the fitted constant per cell–direction update. The [review](../reviews/2026-10-29-3d-port-review.md) uses these numbers.

Three things the brief left to multipliers were cheap to measure as well, so they are measured:
- the same kernel compiled from Rust to WebAssembly, scalar and SIMD;
- the kernel threaded;
- crown widths, to set D.

Nothing in `src/` changed. The default light model, the goldens and every bench hash are unchanged.

## Setup
**Scratch code:**
- `cli/slab-light.ts` holds the 3D light models: `SlabSweep` (row march), `SlabSweep` with `fused` (the same march with the loops swapped) and `SlabPyramid`.
- `Shadowed` wraps the real 2D light model. The run grows exactly as before. On the timed seasons, the same deposits and samples are replayed into the slab model and timed.
- Each 2D deposit gets a depth z = D·frac(½ + iφ), so the foliage fills the slab as a crown as deep as it is wide would.

**The bench:** `cli/bench.ts --slab model:D:K:precision[:periodic]` times seasons 60, 64, …, 96 of a 100-season run. Each configuration runs in its own process, so V8 never sees both array types. Medians are over the 10 timed seasons.

```bash
npm run bench -- --case forest --repeat 1 --snapshot lean --slab fused:32:16:f32:periodic
SLAB_DIR=runs/slab bash docs/experiments/code/2026-10-29-3d-port/grid.sh   # the 144-run grid below
SLAB_DIR=runs/slab bash docs/experiments/code/2026-10-29-3d-port/extra.sh  # panorama, 2D baseline, Rust, WASM
python3 docs/experiments/code/2026-10-29-3d-port/agg.py                    # tables and fits
```

`extra.sh` expects the deposit dumps (`--dumpDeposits`) and the two `.wasm` builds in `$SLAB_DIR`. The code folder's `rust/` crate builds them:
- `cargo build --release --target wasm32-unknown-unknown`;
- the same with `RUSTFLAGS="-C target-feature=+simd128"`;
- `cargo build --release` for the native threaded runs.

**The 3D march:**
- A ray (dx, dy, dz) moves (sx, sz) = (dx, dz)/dy per row, the same for every cell, so as in 2D the offsets are split once per row and the inner loops only index.
- G on the line above is read bilinearly in (x, z).
- The leaf area crossed in a row is the mean of ℓ over the box the segment spans. It comes from prefix sums along x, then along z of the x-means: a summed-area table with the x shift folded in.
- The box mean is an approximation the 2D march does not make; its accuracy is not measured here.
- **Directions:** K points of a spherical Fibonacci set above `minElevation` (15°), with weights ∝ sin(elevation).
- **Sides:** x is periodic, as on the ring; z is open unless marked periodic.

**The fused variant** marches every direction down together, one row at a time:
- each direction keeps its own G line;
- a row's ℓ is padded and prefix-summed once for all directions;
- the row's light is accumulated while its plane is in cache;
- there is no depth volume and no second pass per direction.

**The pyramid** is Palubicki et al. (2009) §4.1 in 3D:
- **Deposit:** a·b^(−q) into the (2q + 1)² cells of each layer q = 0 … 6 (455 cells per bud, before clipping at the ground);
- **V:** the least-shaded cell in the perception cone, r = 4 (about 650 cells per sample).

**Correctness:**
- Given the 2D directions (dz = 0) and the same ℓ on every z line, the slab march reproduces `SkySweep`'s row march exactly (max |ΔQ| = 0; fused 6·10⁻¹⁷).
- The fused march agrees with the plain one to 2·10⁻¹⁶ (Float64) and 6·10⁻⁸ (Float32).
- Every timed run left the stand's hash as the plain bench's: `forest` 3cfd7ec9, `wideForest` b026ba36, `panorama` a105d517.

**Machine:** an Intel Xeon cloud VM at 2.1 GHz with 4 cores (1 thread per core), Node 24.22.2, rustc 1.97.0, at `dfdc6e5`.
- On it the 2D bench gives `forest` 4.4 ms a season (lean), `wideForest` 8.6 and `panorama` 15.1, close to the M13/M18 desktop.
- Presets have grown since M18: `forest` now carries 1905 metamers at season 100 (M13: 1575).

## Result

### 1. Crown widths, to set D
`treeMetrics.crownWidth` of canopy trees (height ≥ 0.7 × the tallest), 5 seeds (scratch `crowns.ts`):

| Stand | Season 60 | Season 100 | Season 150 |
|---|---|---|---|
| `forest` (210 ring) | p50 21, p90 27 | p50 20, p90 26 | p50 21, p90 26 |
| home wood, 210 ring (`forestParams(210)`) | p50 18, p90 48 | p50 20, p90 73 | p50 33, p90 74 |
| home wood, 520 ring | p50 22, p90 33 | p50 27, p90 40 | p50 30, p90 46 |
| `skyTree`, `oakOpen` (open-grown) | 76, 115 | 74, 144 | 73, 145 |

- Canopy crowns in a closed stand are 20–30 cells wide, about the 21-cell spacing.
- In the thinned home wood the survivors spread to 40–75 cells by season 150.
- **D = 32** holds the median canopy crown with room to spare, so the projections use it. With periodic z, a wider crown wraps rather than meeting a wall.

### 2. The 3D sweep in TypeScript (ms per season, light compute only)
"Row march" is the plain extension (a depth volume, then an exp pass per direction); "fused" swaps the loops.

**forest** (210 × 130 ring; light-model compute, ms; median of 10 timed seasons)

| D | K | D·K | M updates | row march f64 | row march f32 | fused f64 | fused f32 | ns/update (fused f64) |
|---|---|---|---|---|---|---|---|---|
| 1 | 7 | 7 | 0.13 | 8 | 9 | 9 | 11 | 72.0 |
| 1 | 16 | 16 | 0.30 | 32 | 22 | 20 | 23 | 68.5 |
| 1 | 32 | 32 | 0.59 | 39 | 49 | 52 | 66 | 88.3 |
| 4 | 7 | 28 | 0.52 | 25 | 30 | 21 | 30 | 40.9 |
| 4 | 16 | 64 | 1.18 | 49 | 46 | 48 | 44 | 40.3 |
| 4 | 32 | 128 | 2.37 | 87 | 102 | 126 | 105 | 53.4 |
| 16 | 7 | 112 | 2.07 | 64 | 72 | 63 | 58 | 30.6 |
| 16 | 16 | 256 | 4.73 | 143 | 132 | 115 | 139 | 24.2 |
| 16 | 32 | 512 | 9.46 | 289 | 314 | 273 | 304 | 28.8 |
| 32 | 7 | 224 | 4.14 | 175 | 139 | 101 | 114 | 24.3 |
| 32 | 16 | 512 | 9.46 | 251 | 274 | 267 | 249 | 28.2 |
| 32 | 32 | 1024 | 18.92 | 589 | 591 | 544 | 493 | 28.7 |
| 64 | 7 | 448 | 8.28 | 229 | 241 | 192 | 231 | 23.2 |
| 64 | 16 | 1024 | 18.92 | 609 | 583 | 466 | 512 | 24.6 |
| 64 | 32 | 2048 | 37.85 | 1013 | 1057 | 942 | 980 | 24.9 |

**wideForest** (420 × 130 ring)

| D | K | D·K | M updates | row march f64 | row march f32 | fused f64 | fused f32 | ns/update (fused f64) |
|---|---|---|---|---|---|---|---|---|
| 1 | 7 | 7 | 0.25 | 17 | 22 | 22 | 19 | 88.7 |
| 1 | 16 | 16 | 0.58 | 39 | 41 | 39 | 59 | 66.8 |
| 1 | 32 | 32 | 1.16 | 92 | 86 | 89 | 116 | 77.2 |
| 4 | 7 | 28 | 1.01 | 57 | 44 | 40 | 48 | 39.2 |
| 4 | 16 | 64 | 2.31 | 86 | 84 | 70 | 109 | 30.4 |
| 4 | 32 | 128 | 4.62 | 177 | 182 | 171 | 183 | 37.1 |
| 16 | 7 | 112 | 4.05 | 120 | 128 | 110 | 145 | 27.2 |
| 16 | 16 | 256 | 9.25 | 268 | 280 | 223 | 258 | 24.1 |
| 16 | 32 | 512 | 18.49 | 533 | 550 | 476 | 533 | 25.7 |
| 32 | 7 | 224 | 8.09 | 220 | 243 | 192 | 254 | 23.7 |
| 32 | 16 | 512 | 18.49 | 508 | 520 | 435 | 535 | 23.5 |
| 32 | 32 | 1024 | 36.99 | 1244 | 1009 | 952 | 1015 | 25.7 |
| 64 | 7 | 448 | 16.18 | 501 | 443 | 389 | 437 | 24.0 |
| 64 | 16 | 1024 | 36.99 | 999 | 1111 | 978 | 955 | 26.4 |
| 64 | 32 | 2048 | 73.97 | 1958 | 2104 | 1799 | 2038 | 24.3 |

"Updates" = K × W × (leafy rows) × D, the cell–direction updates of a season. The leafy rows are about 88 at seasons 60–96.

**Linear fits** over all 15 (D, K) points (ms = intercept + slope · D·K):

| Kernel | forest f64 | forest f32 | wideForest f64 | wideForest f32 |
|---|---|---|---|---|
| row march | 22.6 + 0.507·DK (R² 0.989) | 20.4 + 0.521·DK (0.996) | 35.6 + 0.977·DK (0.987) | 21.9 + 1.013·DK (0.998) |
| fused | 19.7 + 0.458·DK (0.990) | 22.4 + 0.470·DK (0.996) | 21.5 + 0.880·DK (0.997) | 34.8 + 0.961·DK (0.997) |
| slope per update | 24.8–27.4 ns | 25.4–28.2 ns | 24.4–27.0 ns | 26.6–28.0 ns |

**The per-update constant** is **24–28 ns**, and flat from D = 16 up.
- **Small D costs more per update.** The z padding works on D + 2·pad_z lines per row, with pad_z up to 6 at 15° elevation (13 lines for one at D = 1), and it does not shrink with D. That, not a fixed per-season cost, is the 20–35 ms "intercept". At D = 32 the pads are 27% of the lines.
- **The 2D row march** on the same deposits (scratch `k2d.ts`, K = 16–32): **22–24 ns** per update. From the bench's light phase it is ≈ 18 ns (2.4–2.6 ms for 143k updates). A 3D update costs 1.1–1.5× a 2D one.
- **Float32 is not faster in TypeScript:** V8 computes in double either way.
- **Fusing saves 0–20%:** the plain march is already streaming-bound, not exp-bound.
- **Periodic z** costs +8–16% (wrapped pads are copies; open pads are zeros): `forest` 290 against 250 ms, `wideForest` 579 against 535 ms (f32, D = 32, K = 16).
- **`panorama`** (520 × 140 ring, 53 trees), fused, periodic z, K = 16:

  | D | f32 | f64 |
  |---|---|---|
  | 16 | 376 ms | 362 ms |
  | 32 | 676 ms | 710 ms |

  That is 25.8 M updates at D = 32, and 26–28 ns per update.

**Against the 2D light phase** (`forest` 2.4 ms, `panorama` 8.0 ms here):

| D, K | `forest` | `panorama` |
|---|---|---|
| D = 16, K = 16 | 48–58× | — |
| D = 32, K = 16 | 104–120× | 85–89× |
| D = 32, K = 32 | ≈ 210× | — |

### 3. The shadow pyramid (ms per season; the 2D stand's 930 or 1821 buds)

| case | D | buds | deposit cell adds (M) | deposit f32 | deposit f64 | samples | cells searched (M) | V search f32 | V search f64 |
|---|---|---|---|---|---|---|---|---|---|
| forest | 1 | 930 | 0.04 | 0.3 | 0.4 | 3426 | 0.27 | 12 | 14 |
| forest | 4 | 930 | 0.17 | 0.8 | 0.7 | 3426 | 1.07 | 36 | 35 |
| forest | 16 | 930 | 0.35 | 1.7 | 2.0 | 3426 | 2.07 | 66 | 69 |
| forest | 32 | 930 | 0.38 | 2.1 | 2.8 | 3426 | 2.24 | 73 | 70 |
| forest | 64 | 930 | 0.39 | 3.3 | 4.8 | 3426 | 2.33 | 84 | 84 |
| wideForest | 1 | 1821 | 0.09 | 0.8 | 0.7 | 6696 | 0.52 | 22 | 18 |
| wideForest | 4 | 1821 | 0.33 | 1.6 | 1.5 | 6696 | 2.10 | 79 | 73 |
| wideForest | 16 | 1821 | 0.68 | 3.3 | 4.1 | 6696 | 4.06 | 135 | 136 |
| wideForest | 32 | 1821 | 0.74 | 4.8 | 5.7 | 6696 | 4.39 | 164 | 139 |
| wideForest | 64 | 1821 | 0.78 | 6.2 | 9.0 | 6696 | 4.55 | 158 | 170 |

`panorama` at D = 32 (f32, periodic z): deposit 7.6 ms for 2638 buds, V search 196 ms for 7842 samples.

**Deposit:** 400–420 cell adds per bud at 5–8 ns, about **2.5 µs a bud**, as cheap as the brief says.

**V search:** about 650 cells per sample at 31–37 ns, about **21 µs a sample**, 8× the deposit. The brief leaves it out.
- Samples are not only buds. R5 samples every metamer's tip, and O4 samples the ground, so `forest` takes 3426 samples a season for 930 buds.
- Only buds need V, so a 3D pyramid could search the cone for buds alone and read Q at nodes.
- **At 3D counts** (§5 below: ≈ 25–30k buds, ≈ 90k samples in a D = 32 `forest`), the pyramid costs 65–80 ms to deposit and 0.6–1.9 s to find V in TypeScript. The K = 16 sweep costs 250–290 ms.

The pyramid is cheaper than the sweep only if V is found some other way, for example from a 6-neighbour gradient of the shadow field. That is a different model again.

### 4. The same kernel in Rust: WebAssembly in Node 24 and native threads
The fused march is ported line for line to Rust (`code/2026-10-29-3d-port/rust/`). There are three variants:
- **Scalar** WebAssembly;
- **Autovectorised** WebAssembly with `+simd128`;
- **Explicit `f32x4`** loops, with a lane-wise polynomial exp (Taylor to r⁶, relative error ≈ 1.2·10⁻⁷).

It is timed against the TypeScript fused march on the same deposit field (`forest` and `wideForest` at season 96), median of 5 after one warm-up (scratch `kernels.ts`).

| case, D, K | TS f64 | TS f32 | WASM scalar f64 | WASM scalar f32 | WASM SIMD f64 (best) | WASM SIMD f32 (best) |
|---|---|---|---|---|---|---|
| forest 16, 16 | 150 | 160 | 65 | 80 | 48 | 32 |
| forest 32, 16 | 219 | 397 | 128 | 153 | 120 | 63 |
| forest 32, 32 | 446 | 579 | 249 | 249 | 203 | 101 |
| forest 64, 16 | 486 | 525 | 281 | 234 | 232 | 104 |
| wideForest 16, 16 | 313 | 278 | 135 | 147 | 117 | 53 |
| wideForest 32, 16 | 455 | 551 | 271 | 276 | 200 | 111 |
| wideForest 32, 32 | 1087 | 999 | 511 | 510 | 403 | 207 |
| wideForest 64, 16 | 883 | 1141 | 583 | 521 | 435 | 208 |

All 48 configurations (D ∈ {4, 16, 32, 64} × K ∈ {7, 16, 32} × both cases × both precisions) are in `kernels.jsonl` (regenerated by `extra.sh`). Over them:

| | TS → WASM scalar | TS → WASM SIMD f64 | TS → WASM SIMD f32 |
|---|---|---|---|
| Range | 1.2–3.3× | 1.8–3.6× | 3.7–6.3× |
| Median | 2.0× | 2.3× | 5.2× |

- **Scalar Float64 WebAssembly is bit-identical to the TypeScript kernel:** max |ΔQ| = 0 over every cell in every Float64 configuration. Rust's `f64::exp` on wasm32 and V8's `Math.exp` gave the same bits on about 10⁷ cells. Neither is guaranteed to, but it did.
- **Float32 against Float64:** max |ΔQ| = 2–8·10⁻⁷ (C = 1). The model's own sweep error is 0.035–0.049 (M18), five orders of magnitude larger.
- **The polynomial exp:** max |ΔQ| = 4·10⁻⁸ against libm. In scalar code it is slower than libm, which skips cells at zero depth; it pays only in SIMD lanes, 1.1–1.4× on the whole kernel.
- **SIMD f64 gains little over scalar** (median 1.3×, 0.9–1.7×): f64x2 has two lanes, and the libm exp stays scalar. **SIMD f32 is 2.5× scalar** (1.8–3.9×).
- **Explicit `f32x4`** gives the same as the autovectorised loop with the polynomial exp, within noise.
- **Size:** the SIMD build of the light kernel (both precisions, no wasm-bindgen) is 65 kB, **24 kB gzipped**.

**Threads** (native Rust, `forest` and `wideForest`, D = 32, K = 16; 4 physical cores):

| Scheme | f32 | f64 |
|---|---|---|
| directions split across threads; each thread keeps its own partial field, and a sample sums the T partials at one cell | 2.6–3.0× at 4 threads (`forest` 60 → 22 ms; `wideForest` 109 → 39 ms) | 2.6–3.0× (108 → 41; 201 → 68) |
| the same, reducing the T fields into one after the march | 1.5–1.6× | 1.6–1.8× |
| per row: threads split directions, then a barrier and a slice-wise reduction | 1.6–2.1× | — |

- Four single-threaded processes run side by side at 1.0–1.3× their solo time, so the cores scale. The losses in the slower schemes are their own reductions and barriers.
- **Native scalar Rust** (f32, autovectorised for x86-64) takes 55–65 ms on `forest` D = 32, K = 16, the same as WASM SIMD.
- **Memory for the partial fields:** 4 Float32 arrays × T × W × (leafy rows) × D: 12 MB per thread on `forest` at D = 32, 33 MB on `panorama`.

## Conclusion
- **The constant:** a cell–direction update of the 3D row march costs 24–28 ns in TypeScript on this machine, 1.1–1.5× a 2D one. Cost is linear in D·K (R² ≥ 0.987) once D ≥ 16.
- **At the chosen slab** (D = 32, K = 16):
  - **TypeScript:** `forest` 250–290 ms, `panorama` 680–710 ms;
  - **WASM SIMD f32:** about 5× less (`forest` 63 ms);
  - **4 threads:** a further 2.6–3.0× (`forest` ≈ 22 ms).
- **The pyramid is not the cheap option in 3D** *in TypeScript*: its V search costs 8× its deposit. **Corrected by the addendum:** on equal terms (Rust, the same kinds of rewrite) the pyramid costs about what the sweep does.
- **Not measured, and needed before any decision rests on them:**
  - the box-mean approximation's error against an exact 3D ray trace (the M18 test, in 3D);
  - K convergence in 3D (the M6e test);
  - any of this on a phone;
  - the 3D tree passes.

  The review projects the tree passes from the 2D ones and labels them as estimates.
- **Follow-ups:** in the [review](../reviews/2026-10-29-3d-port-review.md) and [ADR 0024](../decisions/0024-3d-slab-port.md) (proposed).

## Addendum (2026-10-29, the G0.5 session): the pyramid on equal terms, the kernel in a browser, and the bundle

### The pyramid on equal terms
**Question:** the measurements above timed the pyramid in TypeScript only, while the sweep got Rust, SIMD and threads. Under the same treatment, is the pyramid still dearer?

**Setup:**
- The pyramid is ported to Rust (`code/2026-10-29-3d-port/rust`, `mod pyr`) in two versions:
  - **literal:** as `SlabPyramid`, searching every cell of the (2r + 1)³ box with the bud at its true position;
  - **precomputed cone:** the 40 cone cells listed once, with the bud at its cell's centre. This is the counterpart of the sweep's fused rewrite. It changes V slightly, by quantising the bud's position.
- The deposit wraps x without a modulo, as the sweep does.
- **3D bud counts:** the season-96 deposits of `forest` and `wideForest`, 27 copies each placed at its own golden-ratio depth: 28,485 and 49,410 buds, D = 32, Float32. That is the review's metamer multiplier at the middle of its range.
- **Runs:** TypeScript and WASM in Node 24 (`pyramid.ts`); native threads split the buds (`native pyr`). Medians.

```bash
SLAB_DIR=runs/slab node docs/experiments/code/2026-10-29-3d-port/pyramid.ts forest 27
docs/experiments/code/2026-10-29-3d-port/rust/target/release/native pyr runs/slab/dep-forest-x27.bin 210 130 32 4 7
```

**Result** (ms a season, deposit + V search):

| `forest`, 28.5k buds | Deposit | V, literal | V, cone | Total, literal | Total, cone |
|---|---|---|---|---|---|
| TypeScript | 54 | 608 | — | 662 | — |
| WASM scalar | 27 | 82 | 8.5 | 109 | 35 |
| WASM SIMD build | 24 | 86 | 9.4 | 110 | 33 |
| Native, 1 thread | 33 | 81 | 9.9 | 114 | 43 |
| Native, 4 threads (deposit serial) | 34 | 21 | 4.4 | 55 | 38 |

| `wideForest`, 49.4k buds | Deposit | V, literal | V, cone |
|---|---|---|---|
| TypeScript | 77 | 1010 | — |
| WASM scalar | 54 | 148 | 24 |
| Native, 4 threads | 62 | 38 | 8.7 |

**Against the sweep at D = 32, K = 16, Float32** (same field sizes):

| | `forest` sweep | `forest` pyramid (cone) | `wideForest` sweep | `wideForest` pyramid (cone) |
|---|---|---|---|---|
| WASM scalar | 128–153 | 35 | 270–276 | 78 |
| WASM SIMD | 63–74 | 33 | 111–148 | 77 |
| 4 threads | 22 (in a browser) | 38 serial deposit; ≈ 15 with a parallel deposit (estimate) | 39 (native) | 71 serial deposit; ≈ 25 parallel (estimate) |

- **Rust buys the pyramid more than the sweep:** 7× on the literal search, against the sweep's 2× scalar. The literal search's distance and angle tests per cell are what V8 handled worst.
- **SIMD buys it nothing:** it is gathers and scattered adds.
- **The precomputed cone cuts the search 8–10×.** It is a rewrite of the same kind as the sweep's fused march.
- **The deposit is serial here.** It scatters into the shared grid, so a parallel deposit needs per-thread grids and a reduction (one ≈ 2.6 MB memset and sum per thread). The ≈ 15 and ≈ 25 ms are estimates.
- **Costs scale differently:** the pyramid ∝ buds (∝ D at fixed closure), the sweep ∝ K·D·W·(leafy rows). A denser stand or a larger K favours the pyramid; a sparser one, the sweep.

**Conclusion:** on equal terms the pyramid with a precomputed cone costs a quarter to two thirds of the sweep single-threaded, and about the same threaded. **The TypeScript-only figure (0.6–1.9 s) does not reject it.** Any rejection must rest on behaviour; the review's Q2 says which.

### The kernel in a browser
The G1 page (`code/2026-10-29-g05-preview/kernel.html`) in headless Chromium 153 on this machine:
- 4-lane WASM SIMD: 22 ms (1 lane 70 ms, scalar 158, TypeScript 335);
- the lanes are Web Workers, each with its own instance and partial field;
- details in the [G0.5 note](2026-10-29-g05-slab-preview.md).

### The garden bundle and the WASM
- **What the TypeScript core costs the garden now** (garden-v0.14.0, `npm run build:garden`, 55.5 kB gzipped). Attributed by source map, gzipping each source's generated code:
  - `src/core` is 14.0 kB of the worker's 15.7 kB, and 5.1 kB of `garden.js`'s 39.8 kB (params, presets and flora, for `forestParams` on the page);
  - the rest of `garden.js` is the renderer and page (19.4 kB) and twgl.js (12.1 kB).
- **What the scratch WASM costs:**
  - **Sizes:** the kernel crate (sweep in both precisions, the pyramid and the exports, std, no wasm-bindgen) is 77–84 kB raw and **28–32 kB gzipped**. `opt-level = "z"` saves nothing (27.8 kB); it is std's panic and format code, not the kernels.
  - **Compile:** `WebAssembly.compile` takes 0.3 ms in Node 24 (Liftoff, lazy tier-up). A phone would take a few times that.
- **Not measured:** a whole Rust core. The estimate is 40–80 kB gzipped for 6.7k lines of core logic in 3D, from these 28–32 kB for about 600 lines, most of which is fixed std overhead.
