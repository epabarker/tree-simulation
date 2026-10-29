# 3D port review (2026-10-29)

Whether, and how, to move from the planar model (spec §2, Option P) to trees that grow in a 3D slab, with the core in Rust compiled to WebAssembly. It answers the [3D-port brief](../background/3d-port-brief.md).

**Status:** go. [ADR 0024](../decisions/0024-3d-slab-port.md) is accepted:
- D = 64;
- the faces' transmission τ is a world parameter, with the wood interior the default look;
- G1 and G2 have passed;
- G3 is next.

The port reverses four earlier decisions:
- spec §2 (Option P);
- the M12 review's decision 3 ("There will be no 3D slab");
- ADR 0008 (pseudo-depth view);
- the AGENTS invariant "No SharedArrayBuffer", for the garden.

**How it was reached.** The review was written in one day over six sessions. Each session's measurements are in their own notes, and this document carries their conclusions:
1. the light's cost at depth ([light-cost note](../experiments/2026-10-29-3d-light-cost.md));
2. a hosting check on the site's preview ([G0.5 note](../experiments/2026-10-29-g05-slab-preview.md)). Its perspective panels misread the intent, which the user corrected: the port is about growth, not the picture;
3. the open slab's cost at D = 32–64, and G1 on the user's phone ([open-slab note](../experiments/2026-10-29-open-slab-cost.md));
4. a throwaway 3D growth prototype ([prototype note](../experiments/2026-10-29-proto3d.md));
5. the faces' transmission ([τ note](../experiments/2026-10-29-face-transmission.md));
6. G2, the Rust sky sweep ([G2 note](../experiments/2026-10-29-g2-rust-sweep.md)).

## Decisions (the user's, 2026-10-29)
1. **The goal:** trees that grow in three dimensions: branches toward and away from the viewer, crowns that are volumes, buds competing in three dimensions.
2. **The view:** the garden's flat, frontal, orthographic illustration, (x, y) drawn in z order. Depth shows only through silhouette and overlap: a branch pointing at the viewer draws short, leaves pile up where the crown is deep, and the trunk sits inside the crown. There is no perspective, foreshortening cue, depth darkening or second rank. A full volume and a free camera are out of scope.
3. **The world:** a slab W × H × D, periodic in x and **open in z**. Buds beyond a face get Q = 0, so growth stops there; light passes. **D = 64.** Periodic z is out.
4. **The faces' transmission τ** is a world parameter, set for the front and back faces separately, and exposed as a host option and a lab control.
   - **The default look is the wood interior:** τ ≈ 0.2 on both faces.
   - **The edge** (1 in front, 0.2 behind) **and the hedgerow** (1, 1) are presets.
   - **The interior's exact τ and the face fade** are settled when the full model grows in 3D (I2, C1).
5. **Foliage density** is a calibration and renderer target, measured by picture coverage, not a modelling one (§2e).
6. **Hosting:** edbarker.dev is on Cloudflare and sends COOP/COEP, so the garden gets WASM threads. The lab on GitHub Pages is single-threaded.
7. **The core moves to Rust, whole,** through gates. During G2–G3 only the sky sweep is frozen; the full 2D freeze starts at I1.
8. **Measurement before judgement.** The prototype's measurements replace the earlier estimates, labelled measured-in-prototype.

## 1. Measured, against the brief's §3 and §4

| Brief figure (its label) | Measured | Verdict |
|---|---|---|
| §3.1: 170 M updates ≈ 0.5 s in JS (estimate): about 3 ns an update | 2D row march 18–24 ns an update; 3D 24–28 ns. The same 170 M would take 4–5 s | **Rejected:** 6–9× too optimistic |
| §3.1: about 50× for a thin slab | D = 16, K = 16: 48–58× the 2D light phase. D = 32: 104–120× (`forest`), 85–89× (`panorama`). D = 64: about twice that | Kept for D = 16; rejected for the slab chosen |
| §3.1: pyramid 343 updates a bud, "independent of world volume"; "likely the right default" | 400–420 cells a bud, plus a V cone search the brief omits. On equal terms (Rust, a precomputed cone) 33–35 ms single-threaded for `forest`, against the sweep's 63–153 | Cost figure rejected; the pyramid is declined on behaviour (Q2), not cost |
| §3.2: 5–20× more metamers | Measured in prototype: **13–26× while a stand grows, about 8× at a plateau**, nearly independent of D | Kept, roughly |
| §3.2: 2–4× cost per metamer | Measured in prototype: **1.1–1.8×**, up to 2.7× in the fastest growth | Rejected as too high |
| §4.1: scalar Rust 1.2–2.5× | The f32 light kernel: 1.2–3.3×, median 2.0×. **The bit-identical f64 2D sweep (G2) is 0.74× in WASM:** its march is 2× faster, but exp in WASM costs 2.2× V8's native one | Kept for new kernels; **not for a port held to V8's bits** |
| §4.2: f64x2 ≈ 2×, f32x4 ≈ 4× | SIMD f64 1.3× over scalar WASM; SIMD f32 2.5× over scalar (5.2× over TS) | Kept for f32 |
| §4.2: threads 3–4× on a phone | **G1, Pixel 8a: 1.5× at D = 32, 1.8–2.0× at 48–64**; laptop 2.3–3.2×; native 4 cores 2.6–3.0× | Rejected for phones |
| (mine, M15) phone 2.7× slower per core | **G1:** the Pixel 8a is within 15% of the laptop single-threaded | Rejected |
| §4.2: "only exp is implementation-defined; a vendored exp removes that" | **G2:** Node's V8 computes sin, cos and exp by fdlibm, pow by the C library (glibc), and hypot by its own formula. Rust's libm matches none of sin, cos, pow or hypot. All four are ported, and match on 4M samples | **Rejected:** five functions, not one; pow is not fdlibm's |
| §4.3: .wasm 40–100 kB gzipped | **G2:** the 2D sweep with its math is 24 kB gzip (50 kB raw), plus 2.3 kB of glue | Lower than estimated, so far |

## 2. The season at the open slab: projected costs
For the end of the garden's intro, season 40, when growth and cost peak. `forest` is the phone's ring and `panorama` the wide desktop's, each on the user's two devices. The script is `code/2026-10-29-3d-port/project.py`.

| Input | Value | Source |
|---|---|---|
| Light, by device, tier and D | phone 4-lane SIMD 32 / 36 / 43 ms at D = 32 / 48 / 64; 1-lane 48 / 66 / 86; scalar 118 and TS 222 at D = 32. Laptop 13 / 28 / 32, 1-lane 42 / 64 / 88 | **measured (G1)** |
| Single-thread speed of the passes, device against this VM | phone 0.92×, laptop 0.90× | **measured (G1)** |
| Full model's 2D passes | 1.05 μs a metamer (`forest`), 1.34 (`panorama`); 1972 metamers at season 40 (`forest`) | measured |
| m, 3D over 2D | 19.0 / 20.1 / 20.5 at D = 32 / 48 / 64 (season 40, R6 set, τ = 1); 15–18 at τ ≤ 0.5 | **measured in prototype** |
| 3D over 2D cost per metamer | 1.65–1.78 (season 40); range 1.1–2.7 | **measured in prototype** |
| Rust over TypeScript on the passes | 1.6× (1.3–2.0) | **estimate**, and G2 is a caution: under bit-identity, any pass that leans on exp or trig is slower in WASM, not faster. I1 measures it |
| Lanes on the passes | phone 1.5×; laptop 2× | estimate |

What is left estimated: Rust's gain on the passes, their lane gain, and what R2–R5, mechanics and stand dynamics do to m. In 2D, R4 and R5 cut the same planting's metamers 2–9×. The ranges' high ends assume none of that pruning.

**`forest`, phone**, season 40: light · tree passes · snapshot = **season, central (range)**, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 222 · 61 · 4 = **288 (229–479)** | 118 · 38 · 3 = **159 (121–311)** | 48 · 38 · 3 = **89 (55–238)** | 32 · 25 · 3 = **61 (37–161)** |
| 48 | 334 · 63 · 5 = **402 (335–609)** | 217 · 39 · 3 = **260 (216–426)** | 66 · 39 · 3 = **108 (72–267)** | 36 · 26 · 3 = **65 (41–172)** |
| 64 | 435 · 70 · 5 = **509 (431–720)** | 238 · 43 · 3 = **285 (235–452)** | 86 · 43 · 3 = **133 (91–292)** | 43 · 29 · 3 = **75 (47–182)** |

**`forest`, laptop**, season 40, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | **282 (224–474)** | **159 (122–312)** | **83 (49–232)** | **35 (16–141)** |
| 48 | **393 (328–602)** | **261 (217–428)** | **106 (70–266)** | **50 (30–163)** |
| 64 | **499 (422–711)** | **285 (237–453)** | **134 (93–294)** | **56 (34–170)** |

**`panorama`**, season 40, under (d): phone 199 / 207 / 237 ms, laptop 113 / 158 / 176 ms at D = 32 / 48 / 64. Scalar and TypeScript take 0.6–1.7 s, and the full tables are in the open-slab note.

**Against the intro's budget (4 seasons a second, 250 ms a season):**
- On the phone under (d), `forest` holds at every D: ≈ 61 / 65 / 75 ms, high ends 161–182.
- Single-threaded SIMD (c) holds too, at 89 / 108 / 133 ms, so the Pages lab and a phone without cross-origin isolation keep the intro. Scalar (b) holds at D = 32 only; TypeScript at none.
- D = 64 costs about 14 ms more than D = 32 on the phone. **D is chosen by the crowns, not by cost.**
- A darker world is cheaper: at the interior's τ = 0.2, m falls by a fifth and the phone's season to ≈ 69 ms at D = 64 (§2d).

### 2a. What the faces do to the crowns (measured in prototype, τ = 1)
- **Free crowns in 3D are about 0.8 × their height deep:** 39 cells at height 48, 49 at 57, 65 at 71–89. The full model's trees reach 90–96 cells, so they would want 70–85.
- **With R6** (lit resting buds become leafy short shoots), clipping stacks foliage at open faces:
  - **D = 32:** the outer bands hold twice the interior's share, and a 3-cell fade only moves the pile inward.
  - **D = 48:** a mild pile (10–13%), which the fade cures.
  - **D = 64:** crowns taper to 2–3% at the faces of their own accord.
- **At every τ < 1 nothing piles:** crowns stop short of the faces, 33–56 cells deep (§2d).

### 2b. The coarser lattice
Light in 2× cells cuts the light 8× at D = 64. It halves the light's resolution, so it needs its own recalibration. With light this cheap it is not needed, and stays a reserve.

### 2c. Memory (Float32, 4 lanes, `forest` on the phone)

| | D = 32 | D = 48 | D = 64 |
|---|---|---|---|
| Light field (ℓ, Q, V) | 17.5 MB | 26 MB | 35 MB |
| Partial fields, 4 lanes | 48 MB | 72 MB | 96 MB |
| Tree tables (37k–40k metamers; high 89k) | ≈ 8 (19) MB | ≈ 9 (19) MB | ≈ 9 (19) MB |
| Snapshot buffers | ≈ 5 MB | ≈ 5 MB | ≈ 5 MB |
| **Total** | **≈ 79 MB** | **≈ 112 MB** | **≈ 145 MB** |

G1 ran D = 64 with four lanes on the phone without trouble. Two lanes would save about 50 MB.

### 2d. The faces' transmission τ, and the three looks (measured in prototype)
**The mechanism.** A ray entering through a z face, below the stand's top, carries transmission τ, as if a wood as tall as the stand stood beyond the face. τ is set per face, [front, back], front being the viewer's. In the sweep it is one constant per face in the padded line, so it costs nothing.

**Why it matters.** Open faces light the lower crown, which the tree keeps: R4 and R5 prune unproductive foliage, not lit foliage. That is why the prototype's stands read as hedges. Measured at seasons 40–100 (R6 set):

| Faces (front, back) | Leaf area below half height, p50 | Picture cover below half | Crown depth (D 64) | Pile at the faces | m at season 40 (D 64) |
|---|---|---|---|---|---|
| 1, 1 (hedgerow) | 12–15% | 26–33% | 56–64 | 2% at D 64; 11–13% at D 48 | 20.5 |
| 0.5, 0.5 | 7–9% | 14–19% | 50–52 | 0 | 18.0 |
| 1, 0.2 (edge) | 7% | 14–16% | 51–56 | 1% | 18.0 |
| 1, 0 | 4–7% | 10–14% | 51–54 | 1% at D 64; front band 17% at D 48 | 18.1 |
| 0.2, 0.2 (interior) | 0–1% | 1–2% | 46 | 0 | 16.4 |
| 0, 0 | 0 | 0 | 43 | 0 | 15.1 |
| Today's 2D garden (`forest`, `mixedWood`) | 13–15% | 1–3% | — | — | — |

**The looks, as decided:**

| Look | Faces | Role | Phone (d) | Laptop (d) |
|---|---|---|---|---|
| **Wood interior** | 0.2, 0.2 | the default | ≈ 69 ms | ≈ 51 ms |
| **Wood edge** | 1, 0.2 | preset | ≈ 71 | ≈ 53 |
| **Hedgerow** | 1, 1 | preset | ≈ 75 | ≈ 56 |

All are at D = 64, with memory ≈ 145 MB.
- **One D for every look.** D sizes the field, the owner grid and every tree's z, so it is fixed per world. It must hold the most demanding look: the hedgerow and the edge pile at D = 48. τ, by contrast, can change between seasons, and the crowns answer it over tens of seasons, as they would answer a felled neighbour.
- **τ 0 is not a look:** a black wall, from which nothing in a real wood comes. **τ 0.5 is not one either:** half a hedge on both sides.
- **The interior's τ is calibration's to fine-tune.** With R4 and R5 on, an interior reads barer than these stands at the same τ, so 0.2 may become 0.3–0.5 at C1.
- **The τ wood is crude:** uniform, as tall as the stand, the same in every direction. A lower or gapped neighbour, or a south-facing edge, would need τ to vary with height or azimuth. Nothing so far asks for that.
- **Calibration:** calibrate at the default τ, and check the presets against it.

### 2e. Foliage density: two halves, two milestones
At every τ, the 3D stands put 10–20× today's leaves on the same picture: even at τ 0 the upper half is 19–46% covered, against the garden's 3–7%. The measure is **picture coverage**: the share of 1-cell cells holding a leaf in the lower and upper halves of the canopy's height, and the leaves per covered cell ([τ note](../experiments/2026-10-29-face-transmission.md) §3, `cover.py`). It is a calibration and renderer target, not a modelling one, and it has two halves:
- **Projection's half (I3's):** some coverage is inherent to drawing a volume orthographically. A crown D cells deep stacks its leaves over one (x, y) cell. How thick the crowns *draw* (leaf size, opacity, level of detail) is the renderer's to set, at I3.
- **The model's half (C1's):** the rest is m and R2–R5 being off in the prototype. How much foliage the model *carries* is C1's to set, with R4 and R5 on.

Neither milestone tries to fix the other's half. I3 does not thin the drawing to hide a model that carries too much, and C1 does not under-grow foliage to suit a renderer that draws it too thick. C1 reports coverage with I3's leaf drawing fixed at today's, and I3 tunes against C1's stands.

## 3. The brief's §7 questions

**Q4, the lab.** Single-threaded on Pages, with threads in the copy at edbarker.dev/lab. Single-threaded SIMD runs `forest` at about 140 ms a season on desktop, plenty for watching mechanisms. The core gives the same bits threaded or not (Q6). Rejected: a `coi-serviceworker` shim for Pages, which is fragile and buys nothing the edbarker.dev lab lacks.

**Q2, the light model.** The row-marched Beer–Lambert sweep extended to the slab: K = 16 with `c2.rotate`, Float32 SIMD, periodic x, open z with τ at the faces.
- **It keeps** everything the 2D sweep gives: side light, directional V, and the canopy M6–M27 were calibrated under.
- **It changes** one thing: the 3D march uses a box mean over each row's segment, where the 2D march integrates it exactly. Its error against an exact trace is G3's.
- **The pyramid, on equal terms,** is no dearer (single-threaded 2–4× cheaper) but is **declined on behaviour:**
  - it casts shade straight down, with no low-elevation sky, and so no light through the faces (which τ now controls);
  - its V comes from a cone search, not the sky;
  - it was last calibrated at M1–M5.

  It stays G3's fallback. Rejected: the hybrid (pyramid for Q, a sweep for V).

**Qz, the z boundary.** Open, with the closed-box rule at the faces. What lies beyond each face is τ (§2d). Rejected: letting growth cross the faces while light stays bounded (the M0 runaway).

**Q3, the grid.** A dense Float32 slab W × H × 64, swept only below the highest leafy row. The O2/R5 owner grid is W × H × D. Rejected: bricked sparse grids, per-tree grids, and Float64.

**Q5, the language boundary.** The whole core in Rust.
- **Sequence:** the sky sweep first, behind `LightModel` (G2, done), to prove the toolchain and the goldens. Light-only Rust is not an end state: the tree passes would set the pace.
- **Two cores coexist from G2 until I1** reproduces every golden: G2 took 1 session; G3 is 1–2; I1 is 3–5.
- **The freeze:** during G2–G3 only `light/sky-sweep.ts` is frozen, and any change to it must land in both cores and pass the parity test. The full 2D freeze covers I1 alone.
- **After I1** the TS core is deleted, and 3D replaces 2D in place. There is no dual mode.
- **I1 as an end state,** if 3D stops after it:
  - bit-identical to today's goldens;
  - deterministic across browsers and native;
  - PyO3 a feature flag away;
  - Rust's types guarding the ordering invariants;
  - **not**, under bit-identity, faster in the browser. G2 measured the light 1.35× slower in WASM, where exp costs 2.2× V8's native one. Natively it is faster.

  Its worth is reproducibility and experiments, not the 2D garden's speed.

**Q6, goldens and determinism.**
1. **The Rust 2D port reproduces today's goldens bit for bit (G2, for the sweep).** That took porting V8's `Math`:
   - fdlibm's sin, cos and exp;
   - glibc's pow, since V8's `Math.pow` calls the C library;
   - V8's own two-argument hypot.

   **I1 ports the rest the same way:** atan2, log, log1p, cbrt, tanh, and asin, acos, atan, expm1. Rust's libm already matches the last four, but they are vendored anyway.
2. **The TypeScript core is not deterministic across engines, today.** In headless Chromium 153, 20 of the 27 goldens fail. Chrome's V8 uses glibc's sin and cos, its exp differs, and `Math.pow` is whatever the platform's C library computes.
   - So a seed or a shared link grown by the CLI is not the forest a Chrome visitor sees, and phones can differ from laptops.
   - The goldens are defined by Node on x86-64 Linux with glibc's FMA pow.
   - **The Rust core, with vendored math, gives those bits everywhere; I1 is where that starts.**
3. **The 3D core gets new goldens:** Float32 and its own polynomial exp, identical across native, scalar WASM, SIMD WASM and any lane count (directions in fixed lanes, summed in lane order; no FMA contraction, no relaxed SIMD).
4. **The 2D goldens are archived** with a tag when 3D lands. The evidence tests carry behaviour from then on.

Rejected: tolerance goldens, since hashes of rounded values flip at rounding boundaries.

**Q7, the renderer and the bundle.** The view is today's renderer with real depth: (x, y) in z order. ADR 0008's squeeze goes.
- **Frame:** main-thread p95 ≤ 6 ms and GPU ≤ 8 ms on the Pixel 8a, at 40–90k metamers.
- **Drawing:** tween and wind move to the vertex shader; ≤ 60k branch instances after twig LOD; leaves are one alpha-tested card per leafy bud, z-buffered. How thick crowns draw is I3's half of §2e.
- **The bundle:**
  - ADR 0014's 60 kB stays the first-paint JS budget.
  - The WASM loads after first paint, so the first frame is a lean snapshot the JS renderer draws without the core.
  - G2's module is 24 kB gzip; the gate (measured size plus 25%) is set at I1.
- **The larger cost is data, not code:** 3D checkpoints would be 1–6 MB each, against M21's 300 kB, so the frame and checkpoint budget is set at I3.
- Rejected: Three.js (150 kB for a fixed camera), and WebGPU-only.

**Q8, analysis.** The CLI keeps its files (CSV or Arrow) and becomes a native Rust binary reading the same JSON. Rejected for now: PyO3. The core crate depends on nothing wasm-only, and threads sit behind a feature, so PyO3 stays cheap later.

**Q9, milestone order.**

| Step | What | Outcome |
|---|---|---|
| G0 | The measurement and this review | done |
| G0.5 | A preview deploy with COOP/COEP | hosting passed (`require-corp` breaks nothing on the site); not a visual gate |
| G1 | The measured light kernel on the user's phone and laptop | **passed:** phone 32 ms at D = 32 against the 150 ms rule; 43 at D = 64 |
| P | A throwaway 3D growth prototype (C1–C6, R1, R6) | m, cost per metamer, crown depth, the faces |
| P-τ | The prototype with τ per face, and a 42-cell planting | the three looks; the density split |
| G2 | The Rust 2D sky sweep behind `LightModel`, Float64 scalar; the toolchain in CI and `check` | **passed:** 27/27 goldens and field parity bit for bit; 24 kB gzip; see its note for what would have stopped it |
| **G3** | 3D light in Rust: exact-trace accuracy (the tracer stopping at the faces, τ applied), K convergence, timing in the browser | the light model's error and K. **Next** |
| I1 | The whole Rust 2D core, every golden bit-identical; the rest of `Math` vendored; the TS core deleted | Rust's speed on the passes, measured; cross-engine determinism |
| I2 | 3D topology and directions, a stand grown at D = 64 with every principle, with and without the fade, at the interior's τ | m and the cost with R2–R5; the fade |
| V | **The visual check:** I2's stand drawn orthographically beside today's view, on the user's phone | whether 3D-grown crowns are worth it (the user's eye) |
| I3 | The 3D renderer: GPU tween and wind, crown drawing (§2e), threads behind COOP/COEP, checkpoints | frame budget, first paint |
| C1–C8 | Calibration (§4), only after V | — |

## 4. What the model has to recalibrate
The 3D model shares its principles with the 2D one but is not the same model.
- **Topology:** "three slots: main, left, right" cannot hold. Laterals sit at azimuths set by a divergence angle, or in whorls. This changes `c1-buds.ts`, R2's generators, R4's bud bank, the snapshot and the renderer. "A parent plus a slot index" survives with a variable slot count.
- **Directions:** an angle becomes a unit vector plus roll. C4's weighted sum works directly in 3D. Set-points become an elevation, with the azimuth free.
- **R3 mechanics:** scalar moments become vector moments; E is restored and recalibrated (M9).
- **C6 girth:** 10–20× the leaves make trunks 3–5× thicker at today's r₀, so r₀ and H/D are recalibrated.
- **Light, shedding, R4–R6:**
  - thresholds that are fractions of C or Q_top transfer in form, not value;
  - k_ext may transfer;
  - edge lean becomes a 2-vector;
  - floor light, crown base, shade order and succession all move with τ. C1 and C8 calibrate at the default τ and check the presets against it.
- **R1 carbon:** m_f, m_w and L_h are recalibrated (M8).
- **Stand dynamics:** seeds land on a ground plane; self-thinning becomes directly comparable with §10's −3/2.
- **Species:** all ten are recalibrated. Phyllotaxis becomes a species trait.
- **Metrics and tests:** crown width, lean and ground light become two-dimensional. Every evidence test with a threshold is re-derived. Every golden changes.
- **The page:** pseudo-depth, true-scale leaves, autumn and wind are rebuilt for depth.

**About 8 calibration milestones:**

| # | Covers | 2D counterpart |
|---|---|---|
| C1 | Light and form core (C2–C5), with foliage coverage (§2e): isolated tree and stand, floor light 2–10%, crown base, edge lean, the interior's τ | M1, M2, M4, M6, M6e |
| C2 | Girth and mechanics | M6c, M9 |
| C3 | Carbon (R1) | M8 |
| C4 | Short shoots, dormancy and shade (R6, R4, R5) | M6d, M10 |
| C5 | Stand dynamics; storms | M11, M16 |
| C6 | Physiological age and phyllotaxis (R2) | M7 |
| C7 | Birch, oak, beech, fir | M19, M20 |
| C8 | The six M25 species and the mixed wood | M25 |

With the gates G1–I3 the port is about 14 milestones, the size of everything since M13.

## 5. Recommendation: go; G3 next

**Compute does not stop the port.**
- With Rust, Float32 SIMD and 4 lanes, `forest` at season 40 projects to ≈ 61–75 ms a season on the user's phone, against the intro's 250 ms. Even the ranges' high ends fit, and so does single-threaded SIMD.
- The light is measured on the device. The passes rest on the prototype's multipliers, with Rust's gain on them unmeasured until I1.

**What could still stop it:**
- G3's box-mean error. Stop, or switch to the exact segment integral or the pyramid, if mean |ΔQ|/C is above 0.08 (twice M18's 2D error) and the fix costs more than 2×.
- I1's size: about 6.7k lines and the rest of `Math`, bit for bit.
- What R2–R5 do in 3D (I2): fall back to D = 48 only if a season exceeds 250 ms on the phone with lanes, and then only for the interior look.
- The calibration bill, about 8 milestones.
- Above all, whether crowns grown in 3D are worth it in the garden's flat illustration: the user's judgement at V.

**The scope:**
- **World:** a slab, periodic in x and open in z with τ at the faces, D = 64, K = 16 with rotation, Float32.
- **View:** the orthographic frontal illustration.
- **Core:** all of it in Rust, with threads for the garden on edbarker.dev.
- **Out:** a full volume, a free camera, perspective, periodic z, PyO3 until wanted, WebGPU, and a dual 2D/3D core.
- **The live garden** stays on its last 2D release until the 3D one passes C7.

**Where I disagree, or add:**
- **"Port the fdlibm routine" does not hold for pow.** V8's `Math.pow` is not fdlibm's; it is the C library's. An fdlibm pow would have broken 9% of results, so G2 ports glibc's (Arm's code, MIT), FMA variant included. That ties the goldens to glibc on x86-64 with FMA: a CI runner with another glibc would fail the *TypeScript* goldens, while the Rust core gives the same bits anywhere.
- **Reproducibility is already broken in the browser.** Shared links and "Export run" replays are exact in Node and between identical browsers, not between Node and Chrome (20 of the 27 goldens differ in Chromium) or, likely, across devices. Until I1, nothing should promise more; ADR 0002's "exact on V8 only" should read "exact on one engine build".
- **Bit-identical Rust is not faster in the browser.** The page should not switch to the Rust sweep at G2: it would add 26 kB, run the light 1.35× slower, and change what browser visitors see, since it gives Node's bits while the rest of the core gives Chrome's. The switch comes whole, at I1.
- **The prototype's page is not V.** Its stands are uncalibrated. V waits for I2's stand with every principle.

**Open questions for the user:** none for G3. Later: the first-paint policy for 3D (Q7), at I3.
