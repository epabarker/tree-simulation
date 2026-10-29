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

**Amended a third time, after G1 and the 3D prototype** (fourth session):
- **G1 passed with room** ([open-slab note](../experiments/2026-10-29-open-slab-cost.md), addendum). 4-lane SIMD light at D = 32 is 32 ms on the user's Pixel 8a and 13 ms on their laptop; D = 64 is 43 and 32. **Light no longer constrains D.**
- **The 2.7× phone multiplier is replaced** by the two measured ratios: single-threaded the phone is within 15% of the laptop, and its 1-to-4-lane scaling is 1.5–2.0× against the laptop's 2.3–3.2×.
- **A throwaway 3D growth prototype measured the tree passes and the crowns** ([note](../experiments/2026-10-29-proto3d.md)). Its numbers replace §2's estimates, labelled measured-in-prototype.
- **D = 64 with a 3-cell fade** is recommended (§2a, Qz). ADR 0024 moves to accepted with D and the fade filled in, as the user asked, and may be revised before G2.

**Amended a fourth time, after the face-transmission runs** (fifth session):
- **The faces' transmission τ** was added to the prototype's light, per face ([note](../experiments/2026-10-29-face-transmission.md)). It is run at D = 48 and 64 for τ ∈ {1, 0.5, 0.2, 0}, for a wood edge (1 in front, 0 or 0.2 behind), and for a 42-cell planting.
- **The user's thesis holds for the lower crown:** open faces keep it, and τ ≤ 0.2 removes it. It is incomplete for the hedge, whose other half is density (§2d).
- **ADR 0024 is back to accepted in principle,** with D and the faces (τ, the fade) open until the user has looked. §2d gives τ and D for three looks and their costs. **τ is a world parameter the garden can expose, not a one-time choice.**

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
| §3.2: 5–20× more metamers (estimate) | Measured in the prototype, 3D over 2D under the same rules: **13–26× while the stand grows, about 8× once it plateaus**, nearly independent of D. My own estimate of 22–92× was too high: the neighbours every 21 cells close a crown in x, whatever D | **Kept, roughly**; my estimate rejected |
| §3.2: tree passes 10–80 ms in JS for `forest` (estimate) | 61–70 ms on the phone at season 40 (19–252 over the range); measured-in-prototype multipliers on the full model's measured 2D costs (§2) | **Kept** |
| §3.2: 2–4× per metamer (estimate; mine was 1.5–3×) | Measured in the prototype: **1.1–1.8×**, up to 2.7× in the fastest growth | **Both rejected as too high** |
| §3.3: memory 100–200 MB (estimate, for a 300 × 120 × 120 volume) | The volume is out of scope. The slab's field is 17.5 MB (`forest`) or 47 MB (`panorama`) in Float32, plus 12–33 MB of partial field per thread lane | Not applicable |
| §4.1: scalar Rust 1.2–2.5× (estimate) | 1.2–3.3×, median 2.0× (light kernel, 48 configurations) | **Kept**, upper half |
| §4.2: f64x2 ≈ 2×, f32x4 ≈ 4× (estimate) | Against TS: SIMD f64 1.8–3.6× (median 2.3), but only 1.3× over scalar WASM; SIMD f32 3.7–6.3× (median 5.2), 2.5× over scalar | **Kept for f32**; f64 SIMD is barely worth having |
| §4.2: polynomial exp makes the exp pass 5–10× faster (estimate) | In scalar code it is slower than libm, which skips zero depth. In SIMD lanes it gains 1.1–1.4× on the whole kernel. Error 4·10⁻⁸ | **Rejected** as a separate lever; it matters only inside SIMD |
| §4.2: threads 3–4× on a phone's cores (estimate) | Native, 4 desktop cores: 2.6–3.0× with a private partial field per thread; 1.5–2.1× with any reduction or per-row barrier. **G1, Pixel 8a: 1.5× at D = 32, 1.8–2.0× at 48–64**; laptop 2.3–3.2× | **Rejected** for phones; mine (2.0–2.5×) too high at D = 32 |
| (mine, M15) phone 2.7× slower per core | **G1: the Pixel 8a is within 15% of the laptop single-threaded** (TS 222 against 217 ms; 1-lane SIMD 48 against 42) | **Rejected** |
| §4.4: about 15× over JS with threads, 4–5× without (estimate) | Desktop: 5.2 × 2.8 ≈ 14×; without threads ≈ 5×. Phone ≈ 10–12× | **Kept** for desktop |
| §4.2: "only exp is implementation-defined; a vendored exp removes that" (estimate) | On about 10⁷ cells, Rust's f64 `exp` on wasm32 gave the same bits as V8's `Math.exp`: the Float64 WASM kernel is bit-identical to the TS kernel | **Kept, and stronger:** a bit-identical port of the 2D goldens looks attainable |
| §4.3: .wasm 40–100 kB gzipped (estimate) | The light kernel alone (both precisions, later with the pyramid) is 24–32 kB, mostly std. A whole 3D core: 40–80 kB (estimate; Q7) | Kept, lower half |
| §2 baseline table (measured) | Stale against M25's presets: `forest` now carries 1905 metamers at season 100 (it said 1575), `panorama` 4751. Re-measured here | Updated |
| §1: first paint about 60 kB against 100 kB (measured) | The garden is 55.3 kB against ADR 0014's 60 kB gate | Corrected |

## 2. Projected season at the open slab (second version: after G1 and the prototype)
At the end of the garden's intro, season 40, when growth and cost peak; for `forest` (the phone's ring) and `panorama` (the wide desktop's), on the user's two devices. The script is `code/2026-10-29-3d-port/project.py`.

| Input | Value | Source |
|---|---|---|
| Light, by device, tier and D | phone 4-lane SIMD 32 / 36 / 43 ms at D = 32 / 48 / 64; 1-lane 48 / 66 / 86; scalar 118 and TypeScript 222 at D = 32. Laptop 13 / 28 / 32, 1-lane 42 / 64 / 88 | **measured (G1)**. TS and scalar at D = 48 and 64 scale D = 32 by this VM's ratios (estimate) |
| Light, `panorama` | this VM's measured `panorama` × the device's ratio to the VM on `forest` | estimate |
| Single-thread speed of the passes, device against this VM | phone 0.92×, laptop 0.90× | **measured (G1)**, on the TypeScript kernel |
| Full model's 2D passes per metamer | 1.05 μs (`forest`), 1.34 μs (`panorama`) | measured (VM) |
| Full model's 2D metamers at season 40 | `forest` 1972; `panorama` 5092 (season 100) | measured (VM) |
| m, 3D over 2D | 19.0 / 20.1 / 20.5 at D = 32 / 48 / 64 (season 40, with R6); low 8.2–8.3 (the plateau without R6); high 42–45 (the prototype's absolute count over the full model's) | **measured in prototype** |
| 3D over 2D cost per metamer | 1.69 / 1.65 / 1.78 (season 40, with R6); range 1.1–2.7 | **measured in prototype** |
| Rust over TypeScript on the passes | 1.6× (1.3–2.0) | estimate; I1 measures it |
| Lanes on the passes | phone 1.5×, as the light at D = 32 (the user's rule); laptop 2× (1.5–3) | estimate |
| Snapshot | 0.13 μs a metamer, Rust 1.5× faster | estimate from measured 2D |

**What is left estimated:**
- Rust's speed-up on the passes and their lane gain;
- what R2–R5, mechanics and stand dynamics do to m and to the per-metamer cost. In 2D, R4 and R5 cut the same planting's metamers 2–9×, while mechanics adds about a quarter to the passes.

The ranges' high ends assume none of that pruning.

Each cell reads light · tree passes · snapshot = **season, central (range)**, ms unless marked s.

**`forest`, phone**, season 40: light · tree passes · snapshot = season, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 222 · 61 · 4 = **288 (229–479)** | 118 · 38 · 3 = **159 (121–311)** | 48 · 38 · 3 = **89 (55–238)** | 32 · 25 · 3 = **61 (37–161)** |
| 48 | 334 · 63 · 5 = **402 (335–609)** | 217 · 39 · 3 = **260 (216–426)** | 66 · 39 · 3 = **108 (72–267)** | 36 · 26 · 3 = **65 (41–172)** |
| 64 | 435 · 70 · 5 = **509 (431–720)** | 238 · 43 · 3 = **285 (235–452)** | 86 · 43 · 3 = **133 (91–292)** | 43 · 29 · 3 = **75 (47–182)** |
| 64, light in 2× cells | 54 · 70 · 5 = **129 (70–321)** | 30 · 43 · 3 = **76 (38–233)** | 20 · 43 · 3 = **66 (28–222)** | 12 · 29 · 3 = **44 (18–150)** |

**`forest`, laptop**, season 40: light · tree passes · snapshot = season, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 217 · 60 · 4 = **282 (224–474)** | 118 · 37 · 3 = **159 (122–312)** | 42 · 37 · 3 = **83 (49–232)** | 13 · 19 · 3 = **35 (16–141)** |
| 48 | 327 · 62 · 5 = **393 (328–602)** | 219 · 39 · 3 = **261 (217–428)** | 64 · 39 · 3 = **106 (70–266)** | 28 · 19 · 3 = **50 (30–163)** |
| 64 | 426 · 68 · 5 = **499 (422–711)** | 240 · 43 · 3 = **285 (237–453)** | 88 · 43 · 3 = **134 (93–294)** | 32 · 21 · 3 = **56 (34–170)** |
| 64, light in 2× cells | 53 · 68 · 5 = **126 (68–320)** | 30 · 43 · 3 = **76 (38–233)** | 11 · 43 · 3 = **57 (20–213)** | 3 · 21 · 3 = **27 (7–140)** |

**`panorama`, phone**, season 40: light · tree passes · snapshot = season, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 761 · 202 · 12 = **0.97 s (0.74–1.68)** | 442 · 126 · 8 = **0.58 s (0.43–1.12)** | 162 · 126 · 8 = **295 (175–799)** | 108 · 84 · 8 = **199 (117–539)** |
| 48 | 1190 · 208 · 12 = **1.41 s (1.13–2.21)** | 639 · 130 · 8 = **0.78 s (0.61–1.38)** | 207 · 130 · 8 = **345 (216–885)** | 113 · 87 · 8 = **207 (122–567)** |
| 64 | 1487 · 229 · 12 = **1.73 s (1.40–2.57)** | 783 · 143 · 8 = **0.93 s (0.73–1.56)** | 267 · 143 · 8 = **419 (270–966)** | 133 · 95 · 8 = **237 (141–599)** |
| 64, light in 2× cells | 186 · 229 · 12 = **0.43 s (0.23–1.07)** | 169 · 143 · 8 = **320 (182–853)** | 57 · 143 · 8 = **209 (81–725)** | 35 · 95 · 8 = **139 (52–486)** |

**`panorama`, laptop**, season 40: light · tree passes · snapshot = season, ms

| D | (a) TypeScript | (b) scalar Rust/WASM | (c) Rust, SIMD f32 | (d) SIMD + 4 lanes |
|---|---|---|---|---|
| 32 | 745 · 197 · 11 = **0.95 s (0.73–1.66)** | 445 · 123 · 8 = **0.58 s (0.43–1.13)** | 141 · 123 · 8 = **272 (156–776)** | 44 · 62 · 8 = **113 (51–466)** |
| 48 | 1165 · 204 · 12 = **1.38 s (1.11–2.18)** | 644 · 127 · 8 = **0.78 s (0.61–1.39)** | 202 · 127 · 8 = **338 (212–880)** | 86 · 64 · 8 = **158 (90–537)** |
| 64 | 1455 · 224 · 12 = **1.69 s (1.37–2.53)** | 788 · 140 · 8 = **0.94 s (0.74–1.57)** | 274 · 140 · 8 = **422 (276–974)** | 98 · 70 · 8 = **176 (100–559)** |
| 64, light in 2× cells | 182 · 224 · 12 = **0.42 s (0.22–1.07)** | 170 · 140 · 8 = **318 (183–855)** | 33 · 140 · 8 = **181 (59–697)** | 8 · 70 · 8 = **87 (20–456)** |

**Reading them against the budgets:**
- **The intro sets the budget:** 4 seasons a second, 250 ms a season.
- **On the phone under (d), `forest`'s intro holds at every D:** ≈ 61 / 65 / 75 ms. Even the ranges' high ends (161–182) fit.
- **Without lanes it still holds:** under (c), single-threaded SIMD, 89 / 108 / 133 ms, so the lab and a phone without cross-origin isolation keep the intro too. Scalar (b) holds at D = 32 only; TypeScript (a) holds at none.
- **The desktop `panorama`** under (d) on the laptop: 113 / 158 / 176 ms.
- **D no longer has a cost answer between 32 and 64.** D = 64 costs about 14 ms more than D = 32 on the phone. It is chosen by the crowns (§2a).
- **The coarse lattice** (light in 2× cells) is no longer needed, and §2b's caution about it stands.

### 2a. What the faces do, at each D (measured in prototype)
Replacing the first version's table, which assumed 2D open-grown widths:
- **Free crowns in 3D are about 0.8 × their height deep:** 39 cells at height 48, 49 at 57, 65 at 71–89. The full model's trees reach 90–96 cells by season 100, so they would want about 70–85.
- **With R6** (lit resting buds become leafy short shoots), clipping stacks foliage at the faces:
  - **D = 32:** the outer 4-cell bands hold twice the interior's share by season 100, with 3.5k leaves stranded beyond the faces. The 3-cell fade removes the stranded leaves but not the pile, which moves 3 cells inward.
  - **D = 48:** a mild pile (outer bands 10–11% against 6–10%); the fade cures it, at 4 cells of crown depth.
  - **D = 64:** crowns taper to 2–3% at the faces; by season 100 they are just reaching them (128 leaves beyond).
- **Without R6** the trees stop at height 48, their crowns fit inside D = 48, and nothing piles.

**So D = 64, with the 3-cell fade** (fourth session; held open in the fifth, §2d):
- it is the only D at which the prototype's crowns taper of their own accord;
- the fade costs nothing, and keeps the full model's taller trees (70–85 cells of free depth) from stranding leaves at the faces as they near full height;
- D = 48 with the fade is the fallback if memory or the phone's budget ever bites (about 10 ms and 40 MB less).

The fade at D = 64 was not grown in the prototype; I2 should grow D = 64 with and without it. **All of this is at τ = 1.** At every τ < 1 the crowns stop short of the faces and nothing piles (§2d).

### 2b. The coarser lattice
Light in 2× cells cut the light 8× at D = 64 in every measurement. With light already cheap it is not needed, and it is not the same result (§2 of the second version: half the light resolution, coarser shade, more recalibration). It stays a reserve.

### 2c. Memory (Float32, 4 lanes, `forest` on the phone)

| | D = 32 | D = 48 | D = 64 |
|---|---|---|---|
| Light field (ℓ, Q, V) | 17.5 MB | 26 MB | 35 MB |
| Partial fields, 4 lanes | 48 MB | 72 MB | 96 MB |
| Tree tables (≈ 35 columns × 37k–40k metamers; high 89k) | ≈ 8 (19) MB | ≈ 9 (19) MB | ≈ 9 (19) MB |
| Snapshot buffers | ≈ 5 MB | ≈ 5 MB | ≈ 5 MB |
| **Total** | **≈ 79 MB** | **≈ 112 MB** | **≈ 145 MB** |

G1 ran D = 64 on the phone with four lanes, the field and the partials included, without trouble. Two lanes would save about 50 MB at D = 64, at the cost of the phone's lane gain.

### 2d. The faces' transmission τ, and three looks (measured in prototype)
**The mechanism** ([note](../experiments/2026-10-29-face-transmission.md)):
- A ray entering the slab through a z face, below the stand's top, carries transmission τ, as if a wood as tall as the stand stood beyond that face.
- τ is set per face, as [front, back], front being the viewer's.
- In the sweep it is one constant per face in the padded line, so it costs no time.

**What τ does,** in the R6 set at seasons 40–100:

| Faces (front, back) | Below half height, p50 | Picture cover below half | Crown depth (D 64) | Faces' share | m at season 40 (D 64) |
|---|---|---|---|---|---|
| 1, 1 (today's open z) | 12–15% | 26–33% | 56–64 | 2% at D 64; 11–13% at D 48 | 20.5 |
| 0.5, 0.5 | 7–9% | 14–19% | 50–52 | 0 | 18.0 |
| 1, 0.2 (edge) | 7% | 14–16% | 51–56 | 1% | 18.0 |
| 1, 0 (edge) | 4–7% | 10–14% | 51–54 | 1% at D 64; front band 17% at D 48 | 18.1 |
| 0.2, 0.2 | 0–1% | 1–2% | 46 | 0 | 16.4 |
| 0, 0 | 0 | 0 | 43 | 0 | 15.1 |
| Today's 2D garden (`forest`, `mixedWood`) | 13–15% | 1–3% | — | — | — |

**τ and D for each look,** with costs from the note's §5 (forest, season 40, tier (d); light is measured, the passes rest on the prototype's m and §2's estimates):

| Look | Faces (front, back) | D | Why this D | Phone | Laptop | Memory |
|---|---|---|---|---|---|---|
| **Hedgerow** (a row in open country) | 1, 1 | 64 | At D 48 the open faces pile 11–13% of the foliage by season 100; at 64 crowns taper (2%) | ≈ 75 ms | ≈ 56 ms | ≈ 145 MB |
| … as single trees | 1, 1; trees 42 cells apart | 64 | Crowns fill D 64 (60–64 deep) | ≈ 71 | ≈ 53 | ≈ 145 |
| **Wood edge** (seen from the field) | 1, 0.2 | 64 | At D 48 the open face piles (front band 17%); at 64 the crown leans forward without reaching it | ≈ 71 | ≈ 53 | ≈ 145 |
| **Wood interior** | 0.2, 0.2 | 48 | Crowns are 37–40 deep and stop 4 cells short of each face | ≈ 56 | ≈ 43 | ≈ 112 |
| … at the one D below | 0.2, 0.2 | 64 | | ≈ 69 | ≈ 51 | ≈ 145 |

- **Why 0.2 and not 0 for the interior and the edge's back:** both leave bare stems (0–2% cover below half). τ 0 is a black wall, from which nothing in a real wood comes. τ 0.2 keeps the canopy's response to side light (crowns 46 deep, not 43).
- **Why 0.5 is no look:** it is half a hedge. The lower crown is halved but still there, on both sides.

**One D for every look: 64.** τ is a world parameter the garden can expose, not a one-time choice:
- **In the core** it is plain JSON, `world.faces: [front, back]`, read by the sweep each season. A change takes effect the next season, and the crowns answer it over tens of seasons, as they would answer a felled neighbour.
- **In the garden** it can be a host option (the home page a wood edge, another page a hedgerow), or a control.
- **D cannot move like that.** It sizes the field, the owner grid and every tree's z. Changing it means reallocating, and it clips or strands the crowns already grown, so it is fixed per world.
- **So D must hold the most demanding look,** the hedgerow and the edge at τ 1, which want 64. The interior's saving at 48 (13 ms and 33 MB) does not pay for a second calibration.
- **The fade** is then only a hedge-row question at full height, and I2 grows D = 64 with and without it as planned. At τ < 1 it has nothing to do.

**Where I disagree, or add:**
- **The thesis is half the hedge.** τ moves the lower crown exactly as the user argued: open faces light it, nothing prunes it, and dark faces remove it.
  - **But the share below half height does not separate the 3D stands from today's garden.** `forest` and `mixedWood` keep 13–15% of their canopy trees' leaf area below half height, and the open-grown oak 36%.
  - **What differs is how much of the picture is leaf:** 26–33% of the lower half at τ 1 against the garden's 1–3%; and even at τ 0, 19–46% of the upper half against its 3–7%. That is 10–20× the leaves on the same picture, from m and from R2–R5 being off. τ does not touch it; calibration does.
- **So judge τ by where the foliage is, not by how dense it is.** The density is the prototype's, not the faces'.
- **The interior's τ is calibration's to fine-tune.** With R4 and R5 on, which prune shaded branches, an interior will read barer than these stands at the same τ, so 0.2 may become 0.3–0.5 after C1 and C8.
- **The τ wood is crude:** uniform, as tall as the stand, the same in every direction. A lower or a gapped neighbour, or a south-facing edge, would need τ to vary with height or azimuth. Nothing so far asks for that.

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

**Measured in the prototype** (§2a): the clipping is invisible from the front, but it shapes the crowns, as the second version argued. The outcome depends on R6:
- **With R6, foliage stacks at the faces.** At D = 32 the outer bands hold twice the interior's share, and the fade only moves the pile inward; at D = 48 the fade cures a mild pile; at D = 64 crowns taper of their own accord.
- **Without R6 nothing piles**, since crowns stop small.
- **Allocation:** the prototype grew equal metamer counts at every D (within 2–8%), so the effect on the balance of height against spread is small next to the pile.
- **The decision** (fourth session): D = 64 with Q fading linearly to 0 over the last 3 cells before each face (§2a). **Held open in the fifth:** what is beyond each face is now a world parameter, the transmission τ (§2d). With D, it waits for the user's look.
- **Rejected:** letting growth cross the faces while light stays bounded. A bud beyond the slab would see unshaded sky, which is the M0 runaway that the closed-box rule exists to stop.

**Q3, grid policy.**
- **Answer:** a dense slab W × H × D in Float32, swept only below the highest leafy row as now. The owner grid for O2 and R5 becomes W × H × D too (Int32, or 16-bit tree ids).
- **Rejected:**
  - **A bricked sparse grid.** Under a closed canopy nearly every column is non-empty, the `top` bound already skips the empty sky, and bricks would break the march's padded row copies.
  - **Per-tree local grids.** Trees compete through one shared field (§C2.9).
  - **Float64.** It is no faster in TS, about 2× slower in SIMD, and buys 10⁻⁶ of C against a model error of 0.04.
- **D = 64** recommended (§2a, §2d), open until the user has looked at the τ stands. Its cost is ≈ 69–75 ms a season on the phone under (d), by τ, and about 145 MB (§2c).

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

**Q7, renderer budget.** The view is the garden's orthographic frontal illustration: (x, y) projected, drawn in z order, as today's renderer draws but with real depth. ADR 0008's pseudo-depth squeeze goes, since the geometry carries its own depth. There is no perspective, depth darkening or second rank, so none of G0.5's drawing code is in scope. The target is the user's phone (a Pixel 8a, within 15% of their laptop per core; G1), at the phone ring (W ≤ 210, about 40k metamers at D = 64 by the prototype's multiplier, up to 90k without R4/R5 pruning):
- **Frame:** main-thread p95 ≤ 6 ms and GPU ≤ 8 ms, to hold 60 fps.
- **Tween and wind move to the vertex shader.** M15 measured CPU tween at 0.05 µs a metamer a frame, and M16's wind adds 0.09. At 40–90k that is ≈ 6–13 ms a frame on desktop and about the same on this phone: over budget at the high end.
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

**Q9, milestone order** (fourth session):
- **G1** passed.
- **The prototype** has reported, and so have the τ runs. ADR 0024 is accepted in principle, with D and the faces (τ, the fade) open.
- **G2 starts next**, after the user has looked at the τ stands and settled D and τ. Then G3, I1 and I2.
- **Then the visual check:** a stand grown in 3D, drawn orthographically with the existing renderer, beside today's pseudo-depth, on the user's phone. The user decides by eye.
- Only then calibration.
- Step (b) is held to bit-identical goldens.

| Step | What | What it settles |
|---|---|---|
| G0 | This note and review | done |
| G0.5 | A preview deploy with COOP/COEP (its perspective panels misread the intent; kept as a record) | hosting: `require-corp` breaks nothing on the site (checked locally). **Not a visual gate** |
| G1 | The measured kernel on the user's phone, from the same deploy: 1 and 4 lanes at D = 32, 48, 64, and D = 64 in 2× cells | **passed:** phone 32 ms at D = 32 against the 150 ms rule; lane scaling and device ratios measured |
| P | A throwaway 3D growth prototype (C1–C6, R1, and R6 as a second set), outside `src/` | **done:** m, the per-metamer cost, the foliage profile across z, D = 64 with the fade |
| P-τ | The prototype with a face transmission τ per face: τ 1, 0.5, 0.2, 0, the edge, 42-cell spacing | **done:** τ and D for three looks (§2d); the user looks before G2 |
| G2 | The Rust 2D sky sweep behind `LightModel`, f64 scalar; CI toolchain | bit-identical goldens; wasm size |
| G3 | 3D light in Rust: exact-trace accuracy, K convergence, timing in the browser | the light model's error and K |
| I1 | The whole Rust 2D core, every golden bit-identical; delete the TS core | r (Rust against TS on the tree passes), measured |
| I2 | 3D topology and directions: lateral slots by divergence angle, direction frames, C4 in vectors, R3 vector moments; a stand grown at D = 64 with and without the fade, with every principle | m and the per-metamer cost with R2–R5 in; the fade at D = 64 |
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
  - **How much depends on τ** (§2d). Each look the garden exposes must be calibrated at its τ, or the calibration held at one τ and the others checked against it.

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

## 5. Recommendation: go, with a reduced scope; G2 after ADR 0024's values are confirmed

**Compute does not stop the port, at any D from 32 to 64.**
- With Rust, Float32 SIMD and 4 lanes, `forest` at season 40 projects to ≈ 61–75 ms a season on the user's phone, against the intro's 250 ms. Even the ranges' high ends fit, and so does single-threaded SIMD.
- Light is measured on the device. The tree passes rest on measured-in-prototype multipliers, with Rust's speed-up and the missing principles' effect still estimated.

**What could still stop it:**
- what R2–R5 do in 3D, which I2 measures;
- the calibration bill, about 8 milestones;
- above all, whether crowns grown in 3D are worth it in the garden's flat illustration. That is the user's judgement at V.

The prototype's page is an uncalibrated first look, not V. Under open z the side light keeps lower crowns leafy, so its stands read as hedges. A face transmission τ moves that lower crown as the user predicted (§2d); the stands' density, 10–20× the garden's leaves on the same picture, is calibration's.

**The reduced scope:**
- **World:** a slab periodic in x and open in z, the faces clipping growth; the sky beyond each face seen through a world parameter τ (§2d); **D = 64 recommended, with τ by look and the fade for I2 to settle** (open until the user has looked); K = 16 with rotation; Float32.
- **View:** the garden's orthographic frontal illustration, drawn in z order. No perspective anywhere in scope.
- **Core:** all of it in Rust. Threads only for the garden on edbarker.dev; the lab single-threaded on Pages.
- **Out:** a full volume, a free camera, perspective, periodic z, PyO3 (until wanted), WebGPU, and a dual 2D/3D core. The pyramid is not the default but stays G3's fallback (Q2).
- **One implementation:** the TS core is kept only until the Rust 2D core reproduces every golden, then deleted. That is 5–8 sessions, with the full 2D freeze narrowed to I1's 3–5 (Q5).
- **The live garden** stays on its last 2D release until the 3D one passes C7 (four species).

**G1 and the prototype are done.** The next steps, and what can stop them:
- **G2,** once the user has looked at the τ stands and settled D and τ: the Rust 2D sweep behind `LightModel`. It can fail cheaply on bit-identical goldens and on toolchain friction.
- **G3** can fail on the box-mean error, measured with the exact tracer stopping at the faces. Stop, or switch to the exact segment integral or the pyramid, if mean |ΔQ|/C is above 0.08 (twice M18's 2D error) and the fix costs more than 2×.
- **I2** is the last cheap point to stop on cost. If a grown 3D `forest` with every principle costs more than 250 ms a season on the phone at D = 64 with lanes, fall back to D = 48 with the fade (§2a) before any calibration is spent.

**Where I still disagree, or add:**
- **The prototype's rules.** C1–C6 and R1 alone stunt both models at height 48, so I added R6 (dimension-free, already imported, no new code) as a second set. The D answer rests on that set. Without it the answer would have been "anything from 48 up", for the wrong reason.
- **The phone's lane gain on the tree passes.** You set 1.5× from the light at D = 32. The light itself scaled 1.8–2.0× at D = 48 and 64, so 1.5× is the floor. I kept it.
- **The prototype's page is not V.** Its stands are uncalibrated, and under open z they read as hedges leafy to the ground. V must wait for I2's stand with every principle, as the ADR says.

**Open questions for the user:**
- **Now:** look at the τ stands on the proto page; then settle D (64 recommended) and which looks τ should offer (§2d).
- **Then:** G2.
- **Later:** the first-paint policy for 3D (Q7).
