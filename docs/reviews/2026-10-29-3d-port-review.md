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

**Amended again, after G0.5 showed the user's intent had been misread** (third session):
- **The port is about growth, not the picture.** Trees grow in 3D: branches toward and away from the viewer, crowns as volumes, buds competing in three dimensions. The picture stays the garden's flat, frontal, orthographic illustration, (x, y) drawn in z order. There is no perspective, no darkening by depth and no rank behind.
- **G0.5 was therefore not a gate.** It is kept as the record of the hosting check, which passed. The first visual check comes after I2, on a stand grown in 3D.
- **The world is open in z.** The faces keep the closed-box rule; periodic z is out.
- **D is deferred to I2.** §2 is re-costed at D = 32, 48 and 64 with open z ([note](../experiments/2026-10-29-open-slab-cost.md)).
- **Accepted from the second version:** the narrowed freeze, the WASM after first paint, and the pyramid as G3's fallback.

## Decisions already made (user, 2026-10-29)
1. **World shape:** a slab one crown deep, seen from the front, as the garden is now. A full volume and a free camera are out of scope. D is to be measured from crown widths.
2. **Hosting:** edbarker.dev is on Cloudflare and can send COOP/COEP, so WASM threads are available to the garden. GitHub Pages cannot send them, so the lab question is left to this review.
3. **Measurement before judgement:** done first; this review uses it.
4. **The view** (third session): the garden's orthographic frontal illustration, with depth shown only by what it does to silhouette and overlap. A branch pointing at the viewer draws short, leaves pile up where the crown is deep, and the trunk sits inside the crown. There is no perspective camera, foreshortening cue, depth darkening or second rank.
5. **The world** (third session): open in z, each tree a free 3D tree with open sky in front and behind, as the 2D model treats its sides. Buds beyond the slab's faces get Q = 0, so growth stops there, while light passes freely. D is a cost choice, deferred to I2.

## 1. Measured, against the brief's §3 and §4

**D = 32.** Canopy crowns in the closed stands are 20–30 cells wide at seasons 60–150 (p90 26–46). In the thinned home wood they reach 40–75. D = 32 holds the median *closed-stand* crown. With open z a crown is closed in x but free in z, and a free crown wants 40–60 cells (understorey) or 80–150 (beech, hornbeam, oak; [open-slab note](../experiments/2026-10-29-open-slab-cost.md)). So §2 is costed at D = 32, 48 and 64, and D is chosen at I2.

**K = 16.** The 2D sky's 7 directions are 25° apart over a half-plane. A hemisphere above 15° at that spacing needs about 24. With `c2.rotate` (M6e), 16 averages out over seasons. This is an estimate, and the 3D M6e convergence test would narrow it. Cost is linear in K.

| Brief figure (its label) | Measured or derived here | Verdict |
|---|---|---|
| §3.1: 170 M updates ≈ 0.5 s in JS "at the current per-update cost" (estimate): about 3 ns an update | 2D row march 18–24 ns an update; 3D 24–28 ns. The same 170 M would take 4–5 s | **Rejected:** 6–9× too optimistic |
| §3.1: about 50× for a thin slab (estimate; the ROADMAP's own figure) | D = 16, K = 16: 48–58× the 2D light phase. D = 32, K = 16: 104–120× (`forest`), 85–89× (`panorama`). D = 32, K = 32: ≈ 210× | **Kept for D = 16, rejected for the slab we chose:** about 100× there |
| §3.1: pyramid 343 updates a bud, "independent of world volume"; "likely the right default" (estimate) | Deposit 400–420 cells a bud (Σ(2q + 1)² is 455, not (q + 1)³). The V cone search, which the brief omits, dominates in TypeScript: 21 µs a sample, 0.6–1.9 s at 3D counts. **On equal terms** (Rust, a precomputed cone): 33–35 ms single-threaded for `forest` at 3D counts, against the sweep's 63–153; about the same as the sweep threaded | **Cost figure rejected** (343, and "independent of volume": it scales with buds). **The recommendation is not rejected on cost;** it is declined on behaviour (Q2) |
| §3.2: 5–20× more metamers (estimate) | Leaf area per ground column is about the same in every closed 2D stand, because Beer–Lambert sets it; side-lit crowns carry 0.8–2.4× more. With open z, foliage scales by D × plan fill × a side-light factor: **22–46× at D = 32, 29–69× at 48, 35–92× at 64** (§2) | **Rejected as too low** for this slab |
| §3.2: tree passes 10–80 ms in JS for `forest` (estimate) | Projected 66–280 ms at D = 32, up to 105–550 at D = 64 (§2; still an estimate) | **Rejected as too low** |
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

## 2. Projected season at the open slab: D = 32, 48 and 64, K = 16, Float32, open z

Where the inputs come from: measured where marked; the rest are estimates, with what would narrow them. The script that combines them is `code/2026-10-29-3d-port/project.py`.

| Input | Value | Source |
|---|---|---|
| Light, TS | `forest` 241 / 362 / 472 ms at D = 32 / 48 / 64; `panorama` 826 / 1291 / 1613 | measured (bench, fused march, open z) |
| Light, scalar WASM | `forest` 119 / 220 / 241; `panorama` 447 / 647 / 792 | measured (Node) |
| Light, SIMD f32, 1 lane | `forest` 54–59 / 76–77 / 105–111; `panorama` 191 / 242 / 335 | measured (Node and browser) |
| Light, SIMD, 4 lanes | `forest` 23 / 28 (up to 37 if linear) / 43 | measured (desktop browser, the G1 page) |
| | `panorama` ≈ 73 / 86 / 134 | estimated from `forest`'s 1-to-4 ratio |
| Light, D = 64 in 2× cells | `forest`: scalar 43, SIMD 12–15, 4 lanes 6; `panorama`: scalar 171, SIMD 41 | measured. TS ≈ fine D = 64 ÷ 8, estimate |
| Lanes on light, phone | 2.0–2.5× | estimate (big.LITTLE); G1 measures it |
| 2D tree passes (sample through deaths), mature seasons | `forest` 2.0 ms (1905 metamers), `panorama` 6.8 ms (5092) | measured on garden-v0.14.0; bench mean × last-20/mean |
| 2D lean snapshot, mature seasons | `forest` 0.25 ms, `panorama` 0.94 ms | measured, the same way |
| Metamer multiplier m, open z | D × plan fill (0.7–0.9) × side-light factor (1.0–1.6) × D_eff/D. D_eff: understorey crowns (40–60 cells) do not fill D = 48 or 64. Result: 32 (22–46) at D = 32; 45 (29–69) at 48; 57 (35–92) at 64 | the factors measured in 2D (open-slab note §2–3); combining them is an estimate. A grown 3D stand (I2) replaces it |
| Cost multiplier per metamer, 3D against 2D | 1.5–3× | estimate. I2 measures it |
| Rust against TS on tree passes | 1.3–2.0× | estimate. I1 measures it |
| Threads on tree passes | desktop 2–3×, phone 1.7–2.3× | estimate: trees are independent between §6 phases, but unequal in size |
| Snapshot | 2D × m × 1.3 (more columns); Rust 1.5× faster | estimate from measured 2D |
| Phone against desktop | 2.7× per core | measured once (M15, the user's phone, JS). Assumed for WASM; G1 measures it |

In 3D that is about 61k metamers for `forest` at D = 32 (42k–88k), 86k at 48 and 109k at 64; `panorama` about 163k, 229k and 290k.

Each cell below reads light · tree passes · snapshot = **season, central (range)**, in ms unless marked s. The "2× cells" row coarsens the light grid only (§2b).

**`forest`, desktop**: light · tree passes · snapshot = season, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 241 · 128 · 10 = **379 (295–551)** | 119 · 80 · 7 = **206 (156–342)** | 57 · 80 · 7 = **144 (92–281)** | 23 · 32 · 7 = **62 (37–141)** |
| 48 | 362 · 180 · 15 = **557 (429–827)** | 220 · 112 · 10 = **342 (270–553)** | 77 · 112 · 10 = **199 (126–410)** | 32 · 45 · 10 = **87 (49–211)** |
| 64 | 472 · 228 · 19 = **0.72 s (0.55–1.09)** | 241 · 142 · 12 = **396 (301–686)** | 108 · 142 · 12 = **263 (165–556)** | 43 · 57 · 12 = **112 (65–278)** |
| 64, light in 2× cells | 59 · 228 · 19 = **306 (170–646)** | 43 · 142 · 12 = **198 (103–488)** | 14 · 142 · 12 = **169 (72–460)** | 6 · 57 · 12 = **75 (30–239)** |

**`forest`, phone (×2.7)**: light · tree passes · snapshot = season, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 651 · 346 · 28 = **1.02 s (0.80–1.49)** | 321 · 216 · 19 = **556 (421–924)** | 154 · 216 · 19 = **389 (248–759)** | 70 · 108 · 19 = **197 (110–444)** |
| 48 | 977 · 486 · 39 = **1.50 s (1.16–2.23)** | 594 · 304 · 26 = **0.92 s (0.73–1.49)** | 208 · 304 · 26 = **0.54 s (0.34–1.11)** | 94 · 152 · 26 = **273 (150–650)** |
| 64 | 1274 · 616 · 50 = **1.94 s (1.49–2.95)** | 651 · 385 · 33 = **1.07 s (0.81–1.85)** | 292 · 385 · 33 = **0.71 s (0.45–1.50)** | 133 · 192 · 33 = **358 (196–878)** |
| 64, light in 2× cells | 159 · 616 · 50 = **0.82 s (0.46–1.74)** | 116 · 385 · 33 = **0.53 s (0.28–1.32)** | 38 · 385 · 33 = **0.46 s (0.19–1.24)** | 17 · 192 · 33 = **243 (95–748)** |

**`panorama`, desktop**: light · tree passes · snapshot = season, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 826 · 435 · 39 = **1.30 s (1.01–1.89)** | 447 · 272 · 26 = **0.75 s (0.58–1.21)** | 191 · 272 · 26 = **489 (321–950)** | 73 · 109 · 26 = **208 (115–485)** |
| 48 | 1291 · 612 · 55 = **1.96 s (1.52–2.89)** | 647 · 382 · 37 = **1.07 s (0.82–1.79)** | 242 · 382 · 37 = **0.66 s (0.41–1.38)** | 86 · 153 · 37 = **276 (149–708)** |
| 64 | 1613 · 775 · 70 = **2.46 s (1.88–3.73)** | 792 · 484 · 46 = **1.32 s (1.00–2.31)** | 335 · 484 · 46 = **0.87 s (0.54–1.85)** | 134 · 194 · 46 = **374 (193–949)** |
| 64, light in 2× cells | 202 · 775 · 70 = **1.05 s (0.59–2.21)** | 171 · 484 · 46 = **0.70 s (0.38–1.69)** | 41 · 484 · 46 = **0.57 s (0.25–1.56)** | 17 · 194 · 46 = **257 (101–815)** |

**`panorama`, phone (×2.7)**: light · tree passes · snapshot = season, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 2230 · 1175 · 106 = **3.51 s (2.73–5.09)** | 1207 · 734 · 70 = **2.01 s (1.56–3.26)** | 516 · 734 · 70 = **1.32 s (0.87–2.57)** | 234 · 367 · 70 = **0.67 s (0.39–1.51)** |
| 48 | 3486 · 1652 · 148 = **5.29 s (4.10–7.79)** | 1747 · 1033 · 99 = **2.88 s (2.21–4.82)** | 653 · 1033 · 99 = **1.79 s (1.12–3.73)** | 297 · 516 · 99 = **0.91 s (0.50–2.20)** |
| 64 | 4355 · 2093 · 188 = **6.64 s (5.09–10.07)** | 2138 · 1308 · 125 = **3.57 s (2.70–6.24)** | 905 · 1308 · 125 = **2.34 s (1.46–5.00)** | 411 · 654 · 125 = **1.19 s (0.65–2.95)** |
| 64, light in 2× cells | 545 · 2093 · 188 = **2.83 s (1.58–5.96)** | 462 · 1308 · 125 = **1.90 s (1.02–4.56)** | 111 · 1308 · 125 = **1.54 s (0.67–4.21)** | 50 · 654 · 125 = **0.83 s (0.33–2.55)** |

**How to read them against the budgets:**
- **The intro sets the budget:** 4 seasons a second, 250 ms a season, with the worker pipelined behind the tween. The ambient pace allows seconds, so every tier fits it.
- **Phones get the narrow ring:** `forestParams` caps W by the host's width, so `forest` is the phone's upper case and `panorama` belongs to a wide desktop.
- **Where the phone's intro holds under (d):** D = 32, at ≈ 197 ms (110–444).
  - **D = 48:** ≈ 273 ms (150–650), about 10% over, an intro at about 3.7 seasons a second.
  - **D = 64:** ≈ 358 ms (196–878), about 2.8 seasons a second.
- **Where the desktop panorama's intro holds under (d):** D = 32 only, at ≈ 208 ms; 276 at 48 and 374 at 64.
- **No tier without lanes holds the intro on a phone at any D.**
- **At D ≥ 48 the tree passes are the larger share,** and they are the estimated half. Every range above is set by the m and per-metamer estimates, not by the light.

### 2a. What the faces clip, at each D
A free crown's depth is taken as its open-grown crown width at season 100 (2D stand-ins; open-slab note §2). The share of that depth inside the slab is min(1, D/width):

| Species (open-grown width) | D = 32 | D = 48 | D = 64 |
|---|---|---|---|
| rowan, holly (45) | 71% | all | all |
| birch (54), goat willow (56) | 57–59% | 86–89% | all |
| field maple (80) | 40% | 60% | 80% |
| oak (109) | 29% | 44% | 59% |
| beech (127), hornbeam (137) | 23–25% | 35–38% | 47–50% |
| for reference: `skyTree` (74), `oakOpen` (115–145) | 22–43% | 33–65% | 44–86% |

The canopy's dominants are clipped at every D costed here. They would fit only at D ≈ 110–150, where `forest`'s light alone is 2.3–3× D = 48's.

**Seen from the front the clipping is invisible, as the user says, but it is not free in the model.** See Qz.

### 2b. The coarser lattice: a cheaper way to the same result?
**Light in cells twice the size at D = 64** (32 coarse cells deep) costs 1/8 of the fine light: `forest` 6 ms in 4 lanes, against 43. But at D = 64 the light was not what broke the budget. With the tree passes unchanged, the phone's `forest` season under (d) is ≈ 243 ms (95–748), against 358 at fine cells and 197 at fine D = 32.

So coarse light buys D = 64 about the time budget of fine D = 32. It is **not the same result:**
- **light at half the resolution:** a bud's "own cell" (which it does not shade) becomes 8 cells' worth of foliage;
- **coarser shade:** gaps narrower than 2 cells close, and a crown's self-shading is averaged over 2 × 2 × 2 blocks;
- **recalibration:** M18's accuracy work and every k_ext and threshold calibration assumed unit cells, so C1 recalibrates more.

**Coarsening the whole model** (metamers twice as long, so a tree has 4–8× fewer) would cut the tree passes too, and make D = 64 cheap. But it changes the picture: fewer, longer twigs, a coarser silhouette. Against the user's aim it is the wrong trade, so I have not costed it as a row.

### 2c. Memory (Float32, 4 lanes)

| | `forest` D = 32 / 48 / 64 | `panorama` D = 32 / 48 / 64 |
|---|---|---|
| Light field (ℓ, Q, V) | 17.5 / 26 / 35 MB | 47 / 70 / 93 MB |
| Partial fields, 4 lanes | 48 / 72 / 96 MB | 132 / 200 / 264 MB |
| Tree tables (≈ 35 columns) | ≈ 13 / 18 / 23 MB | ≈ 34 / 48 / 61 MB |
| Snapshot buffers | ≈ 7 / 10 / 13 MB | ≈ 20 / 27 / 35 MB |
| **Total** | **≈ 86 / 126 / 167 MB** | **≈ 233 / 345 / 453 MB** |

Two lanes save about a third on the phone. The desktop panorama at D = 64 is near half a gigabyte, so there the lane count is a memory decision.

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
  - periodic x, open z (the faces clip growth, not light);
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
  - **No sky.** The pyramid casts shade straight down and has no low-elevation light. With open z, the light through the front and back faces is what makes each tree a free 3D tree, and the pyramid cannot produce it. The decision for open z makes this the decisive point.
  - **V by search, not by sky.** The least-shaded cell in a 45° cone, quantised to about 40 directions, replaces the light-weighted brightest-sky direction that every calibration since M6 used.
  - **History.** The triangle was last calibrated at M1–M5 in 2D; the sweep carries M6–M27.
  - If the user accepts losing side light, the pyramid becomes the cheaper option.
- **The pyramid stays the fallback** if G3 shows the 3D march too inaccurate and the exact segment integral too dear.
- **Rejected: the hybrid** (pyramid for Q, a K ≈ 8 sweep for V). It pays for the sweep anyway and splits Q and V between two models that disagree at edges.

**Qz, the z boundary: open (the user, third session).** Periodic z is out, with its clone lattice and the tap-to-fell problem.
- **The model:** each tree is a free 3D tree, with open sky in front and behind, as the 2D model treats rays beyond its sides. Buds beyond a face get Q = 0, and growth stops there; light passes freely.
- **G3:** the exact tracer stops at the faces, as M6's side-light tests do in x.
- **Cost:** open z is the cheaper boundary in TypeScript (zero pads), and no different in WASM.

**Where I disagree, in part:** the clipping is invisible from the front, but it is not only a cost choice. Three effects reach the picture through the trees' form:
1. **Foliage piles up at the faces.** Light is best near a face, where low-elevation rays come in through open sky. The face also stops growth: shoots reaching for that light end there, and the lit buds they leave become short shoots or dormant buds.
   - So the front of every clipped crown fills with leaves in a layer one or two cells deep.
   - In the frontal view, "leaves pile up where the crown is deep" becomes "leaves pile up at the face", most of all at small D, where the dominants keep under a third of their depth.
2. **Allocation.** Borchert–Honda sends resource toward the best-lit buds, and at a face those buds cannot extend. The resource then goes to their siblings, or is lost to the budget (R1). That shifts the balance of height against spread, so D changes the silhouette as well as the depth.
3. **D and the look are coupled.** The visual check after I2 should therefore show the grown stand at two values of D (say 32 and 48). It is the only way to see whether face-clipped crowns read as volumes or as hedges.
- **A possible softening, to try at I2:** the faces stay hard for growth, but Q fades over the last 2–3 cells before a face, so crowns round off toward it instead of flattening.
- **Rejected:** letting growth cross the faces while light stays bounded. A bud beyond the slab would see unshaded sky, which is the M0 runaway that the closed-box rule exists to stop.

**Q3, grid policy.**
- **Answer:** a dense slab W × H × D in Float32, swept only below the highest leafy row as now. The owner grid for O2 and R5 becomes W × H × D too (Int32, or 16-bit tree ids).
- **Rejected:**
  - **A bricked sparse grid.** Under a closed canopy nearly every column is non-empty, the `top` bound already skips the empty sky, and bricks would break the march's padded row copies.
  - **Per-tree local grids.** Trees compete through one shared field (§C2.9).
  - **Float64.** It is no faster in TS, about 2× slower in SIMD, and buys 10⁻⁶ of C against a model error of 0.04.
- **D:** deferred to I2. The phone's intro holds at D = 32 under (d) (§2). D = 48 costs about 10% of the intro's pace, and D = 64 about 30%; memory grows with D (§2c).

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

**Q7, renderer budget.** The view is the garden's orthographic frontal illustration: (x, y) projected, drawn in z order, as today's renderer draws but with real depth. ADR 0008's pseudo-depth squeeze goes, since the geometry carries its own depth. There is no perspective, depth darkening or second rank, so none of G0.5's drawing code is in scope. The target is the user's phone (2.7× the desktop per core), at the phone ring (W ≤ 210, about 60k metamers and 30k leafy buds at D = 32, about 100k at D = 64):
- **Frame:** main-thread p95 ≤ 6 ms and GPU ≤ 8 ms, to hold 60 fps.
- **Tween and wind move to the vertex shader.** M15 measured CPU tween at 0.05 µs a metamer a frame, and M16's wind adds 0.09. At 50k that is ≈ 7 ms on desktop and ≈ 20 ms on the phone: over budget.
- **Instances:** ≤ 60k branch instances after twig LOD (M15's adaptive quality). Leaves are one card per leafy bud, alpha-tested, in a z-buffer, with no sorting and no per-leaf instances.
- **The light field is not uploaded as a 3D texture.** Leaves keep today's colour by their own light (a per-instance value), which is light, not depth. The lab's shade overlay shows a z-slice.
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

**Q9, milestone order** (third session):
- **G1 now**, on the existing deploy, at D = 32, 48 and 64. The stop rule applies at D = 32, the depth §2 recommends for the phone's intro.
- Then G2, G3, I1 and I2.
- **Then the visual check:** a stand grown in 3D, drawn orthographically with the existing renderer, beside today's pseudo-depth, on the user's phone. The user decides by eye.
- Only then calibration.
- Step (b) is held to bit-identical goldens.

| Step | What | What it settles |
|---|---|---|
| G0 | This note and review | done |
| G0.5 | A preview deploy with COOP/COEP (its perspective panels misread the intent; kept as a record) | hosting: `require-corp` breaks nothing on the site (checked locally). **Not a visual gate** |
| G1 | The measured kernel on the user's phone, from the same deploy: 1 and 4 lanes at D = 32, 48, 64, and D = 64 in 2× cells | phone multiplier, lane scaling, memory. Stop if 4-lane SIMD at D = 32 > 150 ms |
| G2 | The Rust 2D sky sweep behind `LightModel`, f64 scalar; CI toolchain | bit-identical goldens; wasm size |
| G3 | 3D light in Rust: exact-trace accuracy, K convergence, timing in the browser | the light model's error and K |
| I1 | The whole Rust 2D core, every golden bit-identical; delete the TS core | r (Rust against TS on the tree passes), measured |
| I2 | 3D topology and directions: lateral slots by divergence angle, direction frames, C4 in vectors, R3 vector moments; a stand grown at two values of D | m and the per-metamer multiplier, measured; D's cost |
| V | **The visual check:** I2's stand drawn orthographically with the existing renderer, beside today's pseudo-depth, on the user's phone | whether 3D-grown crowns are worth the port (the user's eye); which D |
| I3 | Frontal 3D renderer with GPU tween and wind; garden on threads behind COOP/COEP; checkpoint policy | frame budget, first paint |
| C1–C8 | Calibration (§4), only after V | — |

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

**C6 girth:** with 22–92× the leaves per tree (D = 32–64), the pipe model makes trunks √(22–92) ≈ 5–10× thicker at today's r₀. r₀, and with it H/D (M6c's 60–80), is recalibrated.

**Light (C2), shedding (C5) and R4–R6:**
- Hemisphere light shifts Q at every bud. The thresholds that are fractions of C or Q_top (T_rel, Q_c, Q_rel, Q_est, R6's q_min) transfer in form, not in value.
- k_ext may transfer, since leaf area per column is set the same way.
- Edge lean becomes a 2-vector.
- **Open z makes every tree an edge tree in z** (Qz). Floor light, crown base, shade order and succession all move from today's woodland values, because the understorey is lit through the faces. Face clipping adds its own effect on allocation. C1 and C8 carry most of this.

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
| C5 | Stand dynamics on a ring in x, open in z; storms | M11, M16 |
| C6 | Physiological age and phyllotaxis forms (R2) | M7 |
| C7 | Birch, oak, beech, fir | M19, M20 |
| C8 | The six M25 species and the mixed wood's succession | M25 |

Add the five or six steps G1–I3 of §3, and the port is about 14 milestones. That is the size of everything since M13.

## 5. Recommendation: go, with a reduced scope; first G1, and the first look at V

**Compute does not stop the port at D = 32.**
- With Rust, Float32 SIMD and 4 lanes on edbarker.dev, an open-z `forest` at D = 32 projects to ≈ 197 ms a season on the user's phone (110–444). The desktop `panorama` projects to ≈ 208 ms. Both fit the 4-seasons-a-second intro.
- At D = 48 and 64 the intro slows to about 3.7 and 2.8 seasons a second.
- Plain TypeScript would take about 1 s on the phone at D = 32, which keeps up with the ambient pace but not the intro.

**What could stop it:**
- the estimated half: the tree passes, which I1 and I2 measure;
- the phone's SIMD and lane scaling, which G1 measures;
- the calibration bill, about 8 milestones;
- above all, whether crowns grown in 3D are worth it in the garden's flat illustration. That is the user's judgement at V, after I2.

**The reduced scope:**
- **World:** a slab periodic in x and open in z, the faces clipping growth but not light; D chosen at I2 (32 recommended for the phone's intro); K = 16 with rotation; Float32.
- **View:** the garden's orthographic frontal illustration, drawn in z order. No perspective anywhere in scope.
- **Core:** all of it in Rust. Threads only for the garden on edbarker.dev; the lab single-threaded on Pages.
- **Out:** a full volume, a free camera, perspective, periodic z, PyO3 (until wanted), WebGPU, and a dual 2D/3D core. The pyramid is not the default but stays G3's fallback (Q2).
- **One implementation:** the TS core is kept only until the Rust 2D core reproduces every golden, then deleted. That is 5–8 sessions, with the full 2D freeze narrowed to I1's 3–5 (Q5).
- **The live garden** stays on its last 2D release until the 3D one passes C7 (four species).

**The smallest step that can fail cheaply is G1, now,** from the existing deploy (`/preview/3d/kernel.html`). It runs the measured kernel at D = 32, 48 and 64, and at D = 64 in 2× cells. On desktop Chromium it takes 23, 28 and 43 ms in 4 lanes.
- **What stops the port:** on the user's phone, 4-lane SIMD at D = 32 above 150 ms a season, about twice the projected 70–80. Light alone would then take more than half of the intro's 250 ms before the tree passes (≈ 110 ms projected).
- **What the other rows tell:** how much D = 48 or 64 would cost on the phone, for the choice at I2.

**After G1:**
- **G2** can fail cheaply on bit-identical goldens and on toolchain friction.
- **G3** can fail on the box-mean error, measured with the exact tracer stopping at the faces. Stop, or switch to the exact segment integral or the pyramid, if mean |ΔQ|/C is above 0.08 (twice M18's 2D error) and the fix costs more than 2×.
- **I2** is the last cheap point to stop on cost. If a grown 3D `forest` costs more than 250 ms a season on the phone at D = 32 with lanes, fall back to coarser light cells (§2b) before any calibration is spent.

**Where I still disagree:**
- **Face clipping and D** (Qz): D shapes the crowns, not only the cost, so V should see two values of D.
- **V is the first look, and it comes after 5–8 sessions of porting** (G2, G3, I1) plus I2. A cheaper first look exists: a throwaway 3D growth prototype in a scratch copy, outside `src/` like G0.5's code, covering C1–C5 only (buds in 3D, the measured slab sweep in TypeScript, Borchert–Honda, shoot direction, shedding). It would grow one open-z stand and draw it orthographically with the existing renderer in about two sessions.
  - It would not be the model, and it could not be calibrated.
  - It would show whether 3D-grown crowns read better than fans before any Rust work.
  - That is the user's call. The user has said there is no earlier way to judge, and I think this one is worth two sessions if the port's value is in real doubt.

**Open questions for the user:**
- **Now:** run G1 on the phone.
- **Then:** agree ADR 0024 or not.
- **Before G2:** whether to spend two sessions on the throwaway 3D prototype before the Rust work.
- **At I2:** D, and the face softening (Qz).
- **Later:** the first-paint policy for 3D (Q7).
