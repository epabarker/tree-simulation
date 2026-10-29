# 3D port review: go or no-go (2026-10-29)

Whether, and how, to move from the planar model (spec §2, Option P) to a 3D slab, possibly with the core in Rust compiled to WebAssembly. This is an analysis, not a plan. It answers the [3D-port brief](../background/3d-port-brief.md) after running its §5 measurement ([note](../experiments/2026-10-29-3d-light-cost.md)).

The port would reverse four earlier decisions:
- spec §2 (Option P);
- the M12 review's decision 3 ("There will be no 3D slab");
- ADR 0008 (pseudo-depth view);
- the AGENTS invariant "No SharedArrayBuffer", for the garden.

So it needs the user's agreement and an ADR. [ADR 0024](../decisions/0024-3d-slab-port.md) is drafted as *proposed*.

**Amended the same day, after the user accepted the measurement and the corrections to the brief:**
- **G0.5 comes first:** a frontal preview of the slab, judged by the user on their phone ([note](../experiments/2026-10-29-g05-slab-preview.md)).
- **The z boundary is an open decision** (§3, Qz).
- **The pyramid is compared on equal terms** (Q2; light-cost note, addendum).
- **The WASM gate is argued** (Q7).
- **The 2D freeze is costed in sessions,** and I1 is described as an end state on its own (Q5).

## Decisions already made (user, 2026-10-29)
1. **World shape:** a slab one crown deep, seen from the front, as the garden is now. A full volume and a free camera are out of scope. D is to be measured from crown widths.
2. **Hosting:** edbarker.dev is on Cloudflare and can send COOP/COEP, so WASM threads are available to the garden. GitHub Pages cannot send them, so the lab question is left to this review.
3. **Measurement before judgement:** done first; this review uses it.

## 1. Measured, against the brief's §3 and §4

**D = 32.** Canopy crowns in the closed stands are 20–30 cells wide at seasons 60–150 (p90 26–46). In the thinned home wood they reach 40–75. D = 32 holds the median canopy crown. Every projection below uses D = 32 with periodic z, the dearer boundary: open z costs 8–16% less light in TypeScript (Qz).

**K = 16.** The 2D sky's 7 directions are 25° apart over a half-plane. A hemisphere above 15° at that spacing needs about 24. With `c2.rotate` (M6e), 16 averages out over seasons. This is an estimate, and the 3D M6e convergence test would narrow it. Cost is linear in K.

| Brief figure (its label) | Measured or derived here | Verdict |
|---|---|---|
| §3.1: 170 M updates ≈ 0.5 s in JS "at the current per-update cost" (estimate): about 3 ns an update | 2D row march 18–24 ns an update; 3D 24–28 ns. The same 170 M would take 4–5 s | **Rejected:** 6–9× too optimistic |
| §3.1: about 50× for a thin slab (estimate; the ROADMAP's own figure) | D = 16, K = 16: 48–58× the 2D light phase. D = 32, K = 16: 104–120× (`forest`), 85–89× (`panorama`). D = 32, K = 32: ≈ 210× | **Kept for D = 16, rejected for the slab we chose:** about 100× there |
| §3.1: pyramid 343 updates a bud, "independent of world volume"; "likely the right default" (estimate) | Deposit 400–420 cells a bud (Σ(2q + 1)² is 455, not (q + 1)³). The V cone search, which the brief omits, dominates in TypeScript: 21 µs a sample, 0.6–1.9 s at 3D counts. **On equal terms** (Rust, a precomputed cone): 33–35 ms single-threaded for `forest` at 3D counts, against the sweep's 63–153; about the same as the sweep threaded | **Cost figure rejected** (343, and "independent of volume": it scales with buds). **The recommendation is not rejected on cost;** it is declined on behaviour (Q2) |
| §3.2: 5–20× more metamers (estimate) | Leaf area per ground column is the same in every 2D stand (4.3–5.1 deposits a column in `forest`, `wideForest` and `panorama`), because Beer–Lambert sets it. A closed slab has D times the ground, so foliage scales by D × closure: **22–32× at D = 32** | **Rejected as too low** for this slab |
| §3.2: tree passes 10–80 ms in JS for `forest` (estimate) | Projected 70–200 ms (§2 below; still an estimate) | **Rejected as too low** |
| §3.3: memory 100–200 MB (estimate, for a 300 × 120 × 120 volume) | The volume is out of scope. The slab's field is 17.5 MB (`forest`) or 47 MB (`panorama`) in Float32, plus 12–33 MB of partial field per thread lane | Not applicable |
| §4.1: scalar Rust 1.2–2.5× (estimate) | 1.2–3.3×, median 2.0× (light kernel, 48 configurations) | **Kept**, upper half |
| §4.2: f64x2 ≈ 2×, f32x4 ≈ 4× (estimate) | Against TS: SIMD f64 1.8–3.6× (median 2.3), but only 1.3× over scalar WASM; SIMD f32 3.7–6.3× (median 5.2), 2.5× over scalar | **Kept for f32**; f64 SIMD is barely worth having |
| §4.2: polynomial exp makes the exp pass 5–10× faster (estimate) | In scalar code it is slower than libm, which skips zero depth. In SIMD lanes it gains 1.1–1.4× on the whole kernel. Error 4·10⁻⁸ | **Rejected** as a separate lever; it matters only inside SIMD |
| §4.2: threads 3–4× on a phone's cores (estimate) | Native, 4 desktop cores: 2.6–3.0× with a private partial field per thread; 1.5–2.1× with any reduction or per-row barrier. A phone with 2–4 big cores: 2.0–2.5× (estimate) | **Rejected** for phones; the scheme matters as much as the core count |
| §4.4: about 15× over JS with threads, 4–5× without (estimate) | Desktop: 5.2 × 2.8 ≈ 14×; without threads ≈ 5×. Phone ≈ 10–12× | **Kept** for desktop |
| §4.2: "only exp is implementation-defined; a vendored exp removes that" (estimate) | On about 10⁷ cells, Rust's f64 `exp` on wasm32 gave the same bits as V8's `Math.exp`: the Float64 WASM kernel is bit-identical to the TS kernel | **Kept, and stronger:** a bit-identical port of the 2D goldens looks attainable |
| §4.3: .wasm 40–100 kB gzipped (estimate) | The light kernel alone (both precisions, later with the pyramid) is 24–32 kB, mostly std. A whole 3D core: 40–80 kB (estimate; Q7) | Kept, lower half |
| §2 baseline table (measured) | Stale against M25's presets: `forest` now carries 1905 metamers at season 100 (it said 1575), `panorama` 4751. Re-measured here | Updated |
| §1: first paint about 60 kB against 100 kB (measured) | The garden is 55.3 kB against ADR 0014's 60 kB gate | Corrected |

## 2. Projected season at D = 32, K = 16 (Float32, periodic x; periodic z, the dearer case)

Where the inputs come from: measured where marked; the rest are estimates, with what would narrow them.

| Input | Value | Source |
|---|---|---|
| Light, TS | `forest` 250–290 ms, `panorama` 676–710 ms | measured (bench, fused march) |
| Light, scalar WASM | 12–15 ns an update: `forest` 128–153, `panorama` 318–380 | measured (`forest`, `wideForest`); `panorama` scaled by its 25.8 M updates |
| Light, SIMD f32 WASM | 5.3–7 ns an update: `forest` 63–74, `panorama` 137–155 | measured, scaled the same way |
| Threads on light | desktop 2.6–3.0×; phone 2.0–2.5× | desktop measured (native); phone estimated |
| 2D tree passes (sample through deaths), mature seasons | `forest` 2.1 ms (1905 metamers), `panorama` 8.3 ms (4751) | measured; the bench mean × last-20/mean |
| Metamer multiplier m | 22–32 (D × canopy closure 0.7–1) | derived from measured leaf area per column. A grown 3D stand narrows it |
| Cost multiplier per metamer, 3D against 2D | 1.5–3× (3-vector or quaternion directions, vector moments, 3D samples) | estimate. A 3D `r3-mechanics` and `growShoot` on a synthetic tree would narrow it |
| Rust against TS on tree passes | 1.3–2.0× | estimate; the passes chase parent indices and branch, unlike the light loop. The Rust 2D port measures it |
| Threads on tree passes | desktop 2–3×, phone 1.7–2.3× | estimate: trees are independent between §6 phases, but unequal in size |
| SIMD on tree passes | 1× | sequential traversals |
| Snapshot | TS 0.1 µs a metamer × m × 1.3 (more columns); Rust 1.5× faster plus one memcpy | measured in 2D; the rest estimated |
| Phone against desktop | 2.7× per core | measured once: the user's phone, `coniferStand`, worker 18.15 against 6.7 ms (M15). Assumed for WASM too |

**`forest`** (210 × 130 ring, 25 trees; about 50k metamers in 3D). Each cell is the central value, then the range.

| | Light | Tree passes | Snapshot | Season, desktop | Season, phone |
|---|---|---|---|---|---|
| (a) TypeScript | 270 (250–290) | 115 (70–200) | 8 (4–13) | **390 (320–510)** | ≈ 1.05 s (0.87–1.4) |
| (b) scalar Rust/WASM | 140 (128–153) | 70 (35–155) | 5 (3–9) | **215 (165–320)** | ≈ 580 (450–860) |
| (c) Rust, SIMD f32 | 63 (63–74) | 70 (35–155) | 5 (3–9) | **140 (100–240)** | ≈ 375 (270–640) |
| (d) Rust, SIMD and threads (Cloudflare) | 23 (21–28) | 28 (12–78) | 5 (3–9) | **55 (35–110)** | ≈ 190 (115–370) |

**`panorama`** (520 × 140 ring, 53 trees; about 130k metamers in 3D).

| | Light | Tree passes | Snapshot | Season, desktop | Season, phone |
|---|---|---|---|---|---|
| (a) TypeScript | 690 (676–710) | 450 (275–800) | 32 (17–53) | **1.17 s (0.97–1.56)** | ≈ 3.2 s |
| (b) scalar Rust/WASM | 350 (318–380) | 280 (135–615) | 21 (11–35) | **650 (470–1030)** | ≈ 1.75 s |
| (c) Rust, SIMD f32 | 145 (137–155) | 280 (135–615) | 21 (11–35) | **445 (285–800)** | ≈ 1.2 s |
| (d) Rust, SIMD and threads | 52 (46–60) | 112 (46–307) | 21 (11–35) | **185 (105–400)** | ≈ 610 |

**How to read them against the budgets:**
- **The intro sets the budget.** The garden pipelines the worker behind the tween. Its default intro runs 4 seasons a second, which allows 250 ms a season; the ambient pace runs one season a year (8–32 s), which allows seconds. Grown forests for first paint come from checkpoints (§6 below).
- **Phones get the narrow ring.** `forestParams` caps W by the host's width, so `forest` is a phone's upper case, and `panorama` belongs to a wide desktop.
- **ADR 0001's trigger** (50 ms a season) fires in every case except (d) `forest` on desktop.
- **The intro fits only with (d):** `forest` on the phone (≈ 190 ms) and `panorama` on the desktop (≈ 185 ms). Without threads, (c) gives a phone about 2.7 seasons a second in the intro.
- **Every option fits the ambient pace**, even plain TypeScript.
- **The tree passes are the uncertain half.** After SIMD and threads they are half the season or more, and every input to them is an estimate.

**Memory** (Float32, D = 32):

| Item | `forest` | `panorama` |
|---|---|---|
| Light field (ℓ, Q, V) | 17.5 MB | 47 MB |
| Partial field per thread lane | 12 MB | 33 MB |
| Tree tables (≈ 35 columns) | ≈ 10 MB | ≈ 27 MB |
| Snapshot buffers | ≈ 6 MB | ≈ 16 MB |
| **Total, 4 lanes** | **≈ 80 MB** (the phone's case) | **≈ 220 MB** (desktop) |

Two lanes save a third. Memory, more than compute, is what makes the lane count a phone decision.

## 3. The remaining §7 questions
Q1 (world shape) and Q4 (hosting) are decided above. The lab part of Q4 is answered here.

**Q4, the lab.**
- **Answer:** single-threaded. The lab is also served at edbarker.dev/lab (ADR 0014), so it can have threads there. Only the GitHub Pages copy cannot.
- **Why that is enough:** single-threaded SIMD runs `forest` at about 140 ms a season on desktop, which is plenty for watching mechanisms.
- **What it requires:** the core gives the same bits threaded or not (Q6), so the Pages lab is only slower.
- **Rejected:** a `coi-serviceworker` shim for Pages. It is fragile, reloads on first visit, and buys nothing the edbarker.dev lab does not already have.
- **Check first:** COEP `require-corp` blocks cross-origin subresources without CORP. The site's fonts, images and scripts must pass; `credentialless` is not in Safari.

**Q2, light model.**
- **Answer:** the row-marched Beer–Lambert sweep, extended to the slab as measured.
  - K = 16 with `c2.rotate`;
  - Float32 SIMD;
  - periodic x, with the z boundary per Qz;
  - Q and V per cell from the K directions, as now.
- **What it keeps:** everything the 2D sweep gives. Edge and side light, directional V and the Beer–Lambert canopy that M6–M25 were calibrated under carry into a hemisphere.
- **What it changes:** the 2D march integrates each row's segment exactly, but the 3D one uses the mean over the segment's box. Its error against an exact 3D ray trace is unmeasured and is a gate item (§5). If it is too large, an exact segment integral (a DDA across the 1 + |sx| + |sz| cells a segment crosses) is the fallback, at a cost not yet measured.
- **The pyramid, on equal terms.** The first version of this review rejected it on cost from TypeScript timings (21 µs a sample, 0.6–1.9 s at 3D counts), while the sweep got Rust, SIMD and threads. Given the same treatment (light-cost note, addendum), the answer on cost changes.

  `forest` at D = 32, about 28.5k buds, ms a season:

  | | TypeScript | WASM scalar | WASM SIMD | 4 threads |
  |---|---|---|---|---|
  | Sweep, K = 16 | 250–290 | 128–153 | 63–74 | 22 (browser) |
  | Pyramid, literal V | 662 | 109 | 110 | 55 (deposit serial) |
  | Pyramid, precomputed cone | — | 35 | 33 | 38 serial deposit; ≈ 15 with a parallel one (estimate) |

  So the pyramid is no dearer, and single-threaded it is 2–4× cheaper. It scales with buds, where the sweep scales with K·D.
- **Declined on behaviour, and that is the whole case:**
  - **No sky.** The pyramid casts shade straight down and has no low-elevation light. Under open z the slab's faces are lit only by the absence of foliage directly above, not by side light through the face, so a hedgerow's defining light is missing. Under periodic z the difference is smaller, only gaps and sun angle.
  - **V by search, not by sky.** The least-shaded cell in a 45° cone, quantised to about 40 directions, replaces the light-weighted brightest-sky direction that every calibration since M6 used.
  - **History.** The triangle was last calibrated at M1–M5 in 2D; the sweep carries M6–M27.
  - If the user accepts losing side light, the pyramid becomes the cheaper option, and Qz interacts: it is a weaker loss under periodic z.
- **The pyramid stays the fallback** if G3 shows the 3D march too inaccurate and the exact segment integral too dear.
- **Rejected: the hybrid** (pyramid for Q, a K ≈ 8 sweep for V). It pays for the sweep anyway and splits Q and V between two models that disagree at edges.

**Qz, the z boundary. Open, to be decided by the user after G0.5.** The first version of this review chose periodic z. That choice is the user's, and it changes:
- the model;
- the calibration;
- the G3 accuracy test;
- the cost.

| | Open z: a hedgerow | Periodic z: the front row of a wood |
|---|---|---|
| **Light** | Rays leave through the front and back faces to open sky. Every tree is an edge tree: side light into the crown, a brighter floor, lower crown bases | No faces: a forest interior, as the ring (ADR 0013) made x. Side light only through gaps |
| **Growth at the faces** | The world is a closed box (Q = 0 outside), so crowns that reach for the light at the faces stop flat against them. Either D grows (to about 48–64, so the faces sit beyond the crowns: +50–100% light cost), or growth may leave the slab in z while light stays bounded (a change to the closed-box rule, ADR 0013's sense of "the world") | Crowns meet their neighbours in depth, which are their own clones (below) |
| **The clone** | None | **Every tree competes with its own copy D cells back,** and every gap is repeated behind itself. **Tap-to-fell fells a tree's clone too:** the gap opens in every rank at once, and the neighbours that lean into it are their own clones. Two staggered independent rows (D = 64, a tree's clone 64 back) weaken this at twice the light cost |
| **Calibration** | Far from today's woodland: floor light, shade order and succession (beech rising under pioneers) all shift, because the understorey gets side light. M6's edge-lean results become the norm | Close to today's woodland calibrations in form (floor 2–10%, shade order, succession). The clone's synchrony is new |
| **G3 accuracy test** | Open sides, as M6's side-light tests; the exact tracer stops at the faces | Periodic in x and z: translation invariance in z, and an exact tracer that wraps in both |
| **Cost** | TypeScript: 8–16% cheaper light (zero pads). WASM: no measurable difference (G1 page: 20–51 against 22–70 ms) | The projections in §2 |
| **The look** (G0.5, a crude stand-in) | One row against the sky | A second, paler rank of the same trees |

Neither option is free:
- **open z** pays at the faces;
- **periodic z** pays with the clone.

I see no third option inside the user's frame (one row, one crown deep) that avoids both.

**Q3, grid policy.**
- **Answer:** a dense slab W × H × D in Float32, swept only below the highest leafy row as now. The owner grid for O2 and R5 becomes W × H × D too (Int32, or 16-bit tree ids).
- **Rejected:**
  - **A bricked sparse grid.** Under a closed canopy nearly every column is non-empty, the `top` bound already skips the empty sky, and bricks would break the march's padded row copies.
  - **Per-tree local grids.** Trees compete through one shared field (§C2.9).
  - **Float64.** It is no faster in TS, about 2× slower in SIMD, and buys 10⁻⁶ of C against a model error of 0.04.
- **If the phone is short of time or memory:** D = 24. Cost is ∝ D.

**Q5, language boundary.**
- **Answer:** the whole core in Rust. The light phase goes first behind `LightModel`, only as the step that proves the toolchain and the goldens.
- **Rejected:** light-only Rust as the end state. After SIMD and threads, light is 30–40% of a projected 3D season, and the tree passes, still in TS, would set the pace.
- **The one-implementation cost, in sessions.** A TS core and a Rust core coexist from G2 until I1 reproduces every golden:
  - **G2**, the Rust sky sweep behind `LightModel`: 1 session;
  - **G3**, 3D light, accuracy and K: 1–2 sessions;
  - **I1**, about 6.7k lines of `src/core` and its 27 goldens, bit-identical: 3–5 sessions.

  That is **5–8 sessions**, about two to three days at the project's recent pace (M26–M27b landed 40 commits in one day).
- **What the freeze stops:** any change to 2D behaviour that would have to land twice. That means species fits (as M27 was), new principles, and param defaults. Page and renderer work is unaffected.
- **I'd narrow it:**
  - During G2 and G3 only `light/sky-sweep.ts` is frozen; it last changed at M18. The rest of `src/core` stays open, since the light port's goldens are checked against whatever the TS core is.
  - The full freeze then covers I1 alone: **3–5 sessions**.
  - The cost of narrowing: if I1 starts from a moving target, a change made during G2–G3 is ported as part of I1, not twice.
- **After I1** the TS core is deleted, and 3D replaces 2D in the Rust code in place. There is no dual 2D/3D mode, since each principle would need two code paths.
- **I1 is a worthwhile end state on its own**, if 3D stops after it:
  - **bit-identical** to today's goldens (the light kernel already is);
  - **about 2× faster:** measured 2.0× on the light kernel; the tree passes are estimated at 1.3–2×;
  - **deterministic across browsers and native:** WASM's f64 arithmetic is, and a vendored libm removes the rest, so ADR 0002's "exact on V8 only" ends;
  - **PyO3 a feature flag away:** the core crate builds natively for the CLI anyway;
  - **Rust's types** can guard the ordering invariants.

  It does **not** make the 2D garden visibly better: a 2D season is already about 5 ms, far inside every budget. Its worth is for experiments (multi-core native sweeps, Python import) and for reproducibility.
- **Cost of I1:** a second toolchain in CI, and the WASM in the garden's bundle (Q7).

**Q6, goldens and determinism.** Three stages:
1. **The Rust 2D port** must reproduce today's goldens bit for bit, in Float64 scalar.
   - The light kernel already does on the measured field.
   - The risk is V8's `sin`, `cos`, `atan2`, `pow` and `hypot` against Rust's libm. If they differ, port the same fdlibm routines and use them in both while the two coexist.
   - Failing that, the fallback is one re-hash with the reason in the devlog. That is not a reason to stop.
2. **The 3D core** gets new goldens: Float32 and the polynomial exp, required to be identical across native, scalar WASM, SIMD WASM and any thread count.
   - Directions go into a fixed number of lanes (say 4), summed in lane order whatever the core count.
   - No FMA contraction, no relaxed-SIMD.
   - The SIMD and scalar paths share the formula cell by cell, so they agree; CI checks native against WASM.
   - "Exact on V8 only" (ADR 0002) becomes exact everywhere.
3. **The 2D goldens** are archived with a tag when 3D lands. The evidence tests, not hashes, carry behaviour from then on, as they do now.
- **Rejected:** tolerance goldens. Hashes of rounded values flip at rounding boundaries.

**Q7, renderer budget.** Target: the user's phone (2.7× the desktop per core), at the phone ring (W ≤ 210, about 50k metamers and 25–30k leafy buds):
- **Frame:** main-thread p95 ≤ 6 ms and GPU ≤ 8 ms, to hold 60 fps.
- **Tween and wind move to the vertex shader.** M15 measured CPU tween at 0.05 µs a metamer a frame, and M16's wind adds 0.09. At 50k that is ≈ 7 ms on desktop and ≈ 20 ms on the phone: over budget.
- **Instances:** ≤ 60k branch instances after twig LOD (M15's adaptive quality). Leaves are one card per leafy bud, alpha-tested, in a z-buffer, with no sorting and no per-leaf instances.
- **The light field is not uploaded as a 3D texture.** The garden gets a W × H frontal summary for shading; the lab may show a z-slice.
- **Bundle: argued, not set.** The first version proposed a separate 120 kB WASM gate on a page whose whole first-paint budget is 60 kB (ADR 0014). On measurement:
  - **What the visitor pays.**
    - Today the garden is 55.5 kB gzipped, of which `src/core` is about 19 kB (14.0 in the worker, 5.1 on the page).
    - A Rust core replaces the worker's 14 kB with WASM: the scratch light kernel is 28–32 kB gzipped, and a whole 3D core is estimated at 40–80 kB. That is **+25–65 kB net**.
    - Over Lighthouse's slow 4G (about 200 kB/s) that is 0.13–0.33 s; on ordinary 4G or Wi-Fi, under 50 ms. Compiling costs about 0.3 ms in Node, a few ms on a phone.
    - **The WASM is on the critical path today's design gives it:** the worker decodes the first-paint checkpoint, so the first frame waits for the core.
  - **What they get.** The 3D garden itself. Without the WASM a 3D season is about 1 s on the phone in TypeScript, which keeps the ambient pace but not the intro, and is a second implementation.
  - **The larger number is data, not code.** 3D checkpoints would be 1–6 MB each, against M21's 300 kB. A gate on code alone, at 60 or 120 kB, misses the first paint's real cost.
  - **The fallback if ADR 0014's 60 kB gate is kept as the first-paint budget:** move the WASM off the critical path.
    1. Ship the first paint as a *frame* (a lean snapshot: positions, radii and leaf placements, drawn by the JS renderer with no core).
    2. Start the WASM after first paint, and grow from a checkpoint once it is in.
    3. The 60 kB then covers exactly what it covers today. The frame needs its own data budget, the same problem as the checkpoints.
    4. Fitting the WASM inside the 60 kB itself would need about 20 kB of core (`no_std`, `wasm-opt -Oz`), which the 28 kB scratch kernel already misses.
  - **My recommendation, for the ADR to decide:**
    - keep ADR 0014's 60 kB for first-paint JS;
    - move the WASM after first paint;
    - gate the WASM at its measured size plus 25% once I1 exists (about 40–60 kB for a 2D core);
    - set the 3D data budget (frame and checkpoint) as its own number, at I3.
- **Checkpoints are the hidden cost.** 2D ones are 40–210 kB each (1.3 MB for 12). In 3D they would be 1–6 MB each, against M21's 300 kB budget. Options: grow the forest during the intro (needs (d)), quantise, or bake fewer.
- **Rejected:**
  - **Three.js:** about 150 kB gzipped against a 60 kB gate, for a fixed frontal camera.
  - **WebGPU-only:** ADR 0001's reasons hold, and WebGL2 is still the floor on the target phones.

**Q8, analysis path.**
- **Answer:** keep the CLI with CSV (or Arrow) files. The CLI becomes a native Rust binary that reads the same JSON params and presets as the page. `analysis/sweep.py` keeps its shape; sweeps get faster and can use every core.
- **Rejected for now:** PyO3. It adds maturin to the uv project and freezes a Python-facing API, and in-process import is not wanted yet.
- **What keeps PyO3 cheap later:** the native build exists anyway. The core crate must depend on nothing wasm-only (wasm-bindgen sits in a thin wrapper crate), and threads go behind a feature.

**Q9, milestone order.** The brief's (a)–(f), with these changes:
- **G0.5**, the frontal preview, comes first. It gates everything, because it tests the reason for the port.
- **G1** runs from the same preview deploy.
- Step (b) is held to bit-identical goldens.
- **No calibration milestone is scheduled until I2 has a grown 3D stand the user has looked at.**

| Step | What | What it settles |
|---|---|---|
| G0 | This note and review | done |
| G0.5 | A frontal preview of the slab (2D stands given depth), both z boundaries, beside today's view, on a COOP/COEP preview deploy | whether to port at all (the user's eye); which z boundary; whether `require-corp` breaks the site |
| G1 | The measured kernel on the user's phone, from the same deploy: single-threaded and 4 lanes | phone multiplier, lane scaling, memory. Stop if 4-lane SIMD > 150 ms |
| G2 | The Rust 2D sky sweep behind `LightModel`, f64 scalar; CI toolchain | bit-identical goldens; wasm size |
| G3 | 3D light in Rust: exact-trace accuracy, K convergence, timing in the browser | the light model's error and K |
| I1 | The whole Rust 2D core, every golden bit-identical; delete the TS core | r (Rust against TS on the tree passes), measured |
| I2 | 3D topology and directions: lateral slots by divergence angle, direction frames, C4 in vectors, R3 vector moments | m and the per-metamer multiplier, measured |
| I3 | Frontal 3D renderer with GPU tween and wind; garden on threads behind COOP/COEP; checkpoint policy | frame budget, first paint |
| C1–C8 | Calibration (§4), none before the user has seen I2's grown stand | — |

## 4. What the model has to recalibrate (brief §6, and more)
The 3D model shares its principles with the 2D one but is not the same model.

**The topology invariant.** "Three slots: main, left, right" (AGENTS, `tree.ts`) cannot hold. A node needs laterals at azimuths set by a divergence angle, or whorls at a count. This changes:
- `c1-buds.ts`, `growShoot`, and the R2 generators (`lateralCount`, whorls);
- R4's bud bank (`budAngle` per vacated slot);
- the snapshot and the renderer.

"A parent plus a slot index" can survive with a variable slot count.

**Directions:**
- One angle becomes a unit vector plus roll (or a quaternion).
- **C4:** Palubicki's weighted sum works directly in 3D.
- **Set-points:** A_set (R2, R3, R5) becomes an elevation, with an azimuth free to follow V.

**R3 mechanics:**
- Scalar moments become vector moments (a horizontal lever times weight). Sag and posture become rotations about the horizontal axis perpendicular to the limb.
- E was tuned down because a 2D limb carries less foliage. Restore it and recalibrate, as at M9.

**C6 girth:** with 22–32× the leaves per tree, the pipe model makes trunks √(22–32) ≈ 5× thicker at today's r₀. r₀, and with it H/D (M6c's 60–80), is recalibrated.

**Light (C2), shedding (C5) and R4–R6:**
- Hemisphere light shifts Q at every bud. The thresholds that are fractions of C or Q_top (T_rel, Q_c, Q_rel, Q_est, R6's q_min) transfer in form, not in value.
- k_ext may transfer, since leaf area per column is set the same way.
- Edge lean becomes a 2-vector.
- **The z boundary decides the rest** (Qz): open z makes every tree an edge tree; periodic z makes each tree's depth neighbour its own clone. Either way the light calibrations move further than §2's costs suggest.

**R1 carbon:** production scales with leaves (D×), while sapwood cost follows the pipe area. m_f, m_w and L_h are recalibrated, as at M8.

**Stand dynamics (O2, O4):**
- Seed dispersal and establishment happen on a ground plane.
- Seed rain per 100 cells becomes per area.
- Self-thinning becomes a 3D question. §10's −3/2 is then directly comparable: a gain, since the 2D slopes of −2.8 to −3.1 had to be read against an untested 2D hypothesis.

**Species:** all ten were calibrated per principle under 2D (M19, M20, M25). Phyllotaxis becomes a species trait (distichous beech and hornbeam, spiral oak and birch, whorled fir and pine).

**Metrics and tests:**
- Crown width, lean and ground light become two-dimensional.
- Every evidence test with a measured threshold (`sky`, `species`, `carbon`, `mechanics`, `release`, `forest`, `flora`, `ablation`) is re-derived.
- Every golden changes.

**The page:** ADR 0008's pseudo-depth, the true-scale leaves (M23), autumn (M17) and per-metamer wind (M16) are rebuilt for depth.

**Calibration milestones, M4-style: about 8 (range 6–9).**

| # | Covers | 2D counterpart |
|---|---|---|
| C1 | Light and form core (C2–C5): isolated tree and stand, floor light 2–10%, crown base, edge lean | M1, M2, M4, M6, M6e |
| C2 | Girth and mechanics: r₀ for H/D, E, sag and upturn, posture | M6c, M9 |
| C3 | Carbon (R1) | M8 |
| C4 | Short shoots, dormancy and shade (R6, R4, R5) | M6d, M10 |
| C5 | Stand dynamics on a ring of rings, storms | M11, M16 |
| C6 | Physiological age and phyllotaxis forms (R2) | M7 |
| C7 | Birch, oak, beech, fir | M19, M20 |
| C8 | The six M25 species and the mixed wood's succession | M25 |

Add the five or six steps G1–I3 of §3, and the port is about 14 milestones. That is the size of everything since M13.

## 5. Recommendation: go, with a reduced scope, through cheap gates, starting with the user's eye

**Compute does not stop the port.**
- With Rust, Float32 SIMD and threads on edbarker.dev, a D = 32 `forest` projects to ≈ 190 ms a season on the user's phone and `panorama` to ≈ 185 ms on desktop. Both fit the 4-seasons-a-second intro.
- Plain TypeScript would not: about 1 s on the phone. It would still keep up with the ambient pace.

**What could stop it:**
- the unmeasured half: the tree passes, and the phone's SIMD and thread scaling;
- the calibration bill, about 8 milestones;
- whether depth seen from the front looks better than ADR 0008's pseudo-depth. That is the point of the port. G0.5 puts it in front of the user; it is not something a number settles.

**The reduced scope:**
- **World:** a slab with D = 32 (24 if the phone needs it), periodic in x, a z boundary chosen by the user after G0.5 (open z may need D = 48–64), a frontal camera, K = 16 with rotation, Float32.
- **Core:** all of it in Rust. Threads only for the garden on edbarker.dev; the lab single-threaded on Pages.
- **Out:** a full volume, a free camera, PyO3 (until wanted), WebGPU, and a dual 2D/3D core. The pyramid is not the default but stays the fallback light model (Q2).
- **One implementation:** the TS core is kept only until the Rust 2D core reproduces every golden, then deleted. That is 5–8 sessions, with the full 2D freeze narrowed to I1's 3–5 (Q5).
- **The live garden** stays on its last 2D release until the 3D one passes C7 (four species), not all of C1–C8.

**The smallest first step that can fail cheaply is G0.5,** now built and deployed ([note](../experiments/2026-10-29-g05-slab-preview.md)).
- **What stops the port:** the user, by eye. If the preview is not a clear improvement over pseudo-depth on their phone, the port stops here. The Rust question then reopens separately as a 2D-only port, I1 as an end state (Q5).
- **What the same deploy also answers:** which z boundary, and whether COOP/COEP break the site. Locally they break nothing; the deployed check is owed.

**Then G1, from the same deploy** (`/preview/3d/kernel.html`): the measured kernel (WASM SIMD, the `forest` field at D = 32 and K = 16, 1 and 4 lanes) on the user's phone. On desktop Chromium it takes 22 ms in 4 lanes.
- **What stops the port:** on the user's phone, 4-lane SIMD light above 150 ms a season, twice the projected 70–100 ms. Light alone would then take more than half of the intro's 250 ms before the tree passes (≈ 100 ms projected).
- **What forces the reduced fallback:** cross-origin isolation breaks the site, and `credentialless` cannot fix it in the browsers that matter. That means no threads, and (c) gives ≈ 375 ms a season on the phone. The fallback is the intro at 2–3 seasons a second, D = 24, or cells twice as coarse (light ÷ 8, metamers ÷ 4–8, less detail). If none of those is acceptable, stop.

**After G1:**
- **G2** can fail cheaply on bit-identical goldens and on toolchain friction.
- **G3** can fail on the box-mean error. Stop, or switch to the exact segment integral, if mean |ΔQ|/C against an exact 3D trace is above 0.08 (twice M18's 2D error) and the fix costs more than 2×.

The last cheap point to stop is I2. If a grown 3D `forest` at D = 32 then costs more than 250 ms a season on the phone with threads, the scope falls back to D = 24 or coarser cells before any calibration is spent.

**Open questions for the user:**
- **G0.5:** is the slab a clear improvement on your phone? If not, stop here.
- **Qz:** open z or periodic z.
- **Then:** run G1 on the phone; agree ADR 0024 or not.
- **Later:** the first-paint policy for 3D (Q7: a JS-drawn frame, or growing during the intro, instead of MB-sized checkpoints); and narrowing the 2D freeze to I1 (Q5).
