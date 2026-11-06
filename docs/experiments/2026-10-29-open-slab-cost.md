# 3D port: the light at the open slab, D = 32, 48 and 64

## Question
The user has fixed the port's frame (2026-10-29, third session):
- trees grow in 3D;
- they are drawn as today's flat, orthographic, frontal illustration;
- the world is **open in z**, with the slab's faces keeping the closed-box rule (Q = 0 beyond them, light passing freely).

D becomes a cost choice deferred to I2. This note measures what the review's re-costing needs ([review](../reviews/2026-10-29-3d-port-review.md) §2):
1. the light at D = 32, 48 and 64 with open z, K = 16, Float32, in TypeScript, scalar WASM, WASM SIMD and SIMD in 4 lanes, for `forest` and `panorama`;
2. the same at D = 64 in cells twice the size, the "coarser lattice";
3. how deep a free crown wants to be: each home-wood species grown alone in the open, its crown width against D;
4. how much more foliage a crown carries per ground column when it is lit from the side, which sets the open-z metamer multiplier.

## Setup
**Code:** garden-v0.14.0's (this branch merges it), at 97d6ba9; Node 24.22.2; headless Chromium 153; the same 4-core VM as the [first light note](2026-10-29-3d-light-cost.md). Nothing in `src/` changed, and every bench hash matches the plain bench (`forest` 3cfd7ec9, `wideForest` b026ba36, `panorama` d9aadbde).

```bash
npm run bench -- --case forest --repeat 1 --snapshot lean --slab fused:48:16:f32      # open z: no 5th field
SLAB_DIR=runs/slab node docs/experiments/code/2026-10-29-3d-port/open-kernels.ts panorama
node docs/experiments/code/2026-10-29-3d-port/open-crowns.ts
```

The G1 page (`code/2026-10-29-g05-preview/kernel.html`) ran in headless Chromium, cross-origin isolated, as the user's phone will run it.

**The coarse lattice:** cells twice the model's size in x, y and z, so D = 64 is 32 coarse cells. Grid 105 × 65 × 32 for `forest` and 260 × 70 × 32 for `panorama`. Deposits land in the coarse cell that holds them, with leaf area divided by the cell's cross-section (4) so optical depth per unit length is kept. Only the light is coarsened; the trees and their metamers are not.

**Free crowns:** each species of the home wood is grown alone on a 300-cell world with open sides, the mixed wood's other params kept, O4 off, 3 seeds. Its crown width is taken at seasons 60, 100 and 150. The closed stands (`forest`, and the home wood at 210 and 520) are the same 3 seeds.

**Leaf area per column:** each season's deposited leaf area (R6 weights included), divided by the crown's width for a lone tree, or by the world's width for a closed stand.

## Result

### 1. The light at the open slab, ms per season (K = 16, Float32, open z)

**`forest`** (210 × 130 ring, about 88 leafy rows; 9.5 M updates at D = 32):

| D | M updates | TypeScript (bench) | WASM scalar | WASM SIMD, 1 lane | WASM SIMD, 4 lanes (browser) |
|---|---|---|---|---|---|
| 32 | 9.5–10.4 | 241 | 118–120 | 54–59 | 23 |
| 48 | 14.2–15.6 | 362 | 220 | 76–77 | 28 |
| 64 | 18.9–20.9 | 472 | 241 | 105–111 | 43 |
| 64 in 2× cells | 2.6 | — | 43 | 12–15 | 6 |

**`panorama`** (520 × 140 ring; 32–35 M updates at D = 32):

| D | M updates | TypeScript (bench) | WASM scalar | WASM SIMD, 1 lane | 4 lanes |
|---|---|---|---|---|---|
| 32 | 32.0–34.6 | 826 | 447 | 191 | ≈ 73 (estimate) |
| 48 | 47.9–51.9 | 1291 | 647 | 242 | ≈ 86 (estimate) |
| 64 | 63.9–69.2 | 1613 | 792 | 335 | ≈ 134 (estimate) |
| 64 in 2× cells | 8.7 | — | 171 | 41 | ≈ 16–20 (estimate) |

- **Sources:**
  - TypeScript is the bench median of 10 timed seasons (60–96).
  - Scalar and SIMD are medians of 5 on the season-96 field, in Node, with the browser's figures where both exist.
  - The `panorama` lanes apply `forest`'s measured 1-to-4-lane ratio at the same D (2.6, 2.8, 2.5).
- **The TypeScript constant** holds at 25–27 ns an update at every D.
- **The WASM tiers grow a little slower than D** (SIMD 1 lane: ×1.4 from 32 to 48 and ×2.0 to 64; 4 lanes: ×1.2 and ×1.9), where TypeScript grows exactly with it. These are single runs on a shared VM: read D = 48's 4-lane 28 ms as 28–37 (37 being linear in D).
- **The coarse lattice** costs about 1/8 of fine D = 64, as the cell count says (`forest` 12–15 against 105–111 ms in one SIMD lane).

### 2. How deep a free crown wants to be
Crown width of each species grown alone in the open; p50 over 3 seeds [min–max]:

| Species | Season 60 | Season 100 | Season 150 |
|---|---|---|---|
| birch | 41 [33–53] | 54 [50–59] | 55 [42–59] |
| oak | 64 [62–124] | 109 [85–119] | 77 [68–129] |
| goat willow | 49 [40–60] | 56 [45–70] | 46 [25–71] |
| beech | 95 [85–108] | 127 [103–147] | 134 [125–158] |
| hornbeam | 94 [85–102] | 137 [104–149] | 84 [46–214] |
| rowan | 38 [35–47] | 45 [35–56] | 38 [33–45] |
| holly | 45 [44–48] | 45 [44–48] | 48 [44–54] |
| field maple | 61 [47–66] | 80 [58–83] | 89 [66–94] |

The first note's `skyTree` (73–76) and `oakOpen` (115–145) sit inside this range. The canopy's dominants (beech, hornbeam, oak) want 80–150 cells; the understorey species want 40–60.

**These are 2D crowns.** A tree that grows in 3D spreads in two horizontal directions. Whether its crown is as wide, in x or in z, as the 2D fan grew is unknown until I2; these widths are the nearest measured stand-in.

### 3. Leaf area per ground column

| Stand | Season 60 | Season 100 | Season 150 |
|---|---|---|---|
| `forest` (closed, periodic) | 8.4 | 8.1 | 7.9 |
| home wood, 210 ring | 9.1 | 11.3 | 9.7 |
| home wood, 520 ring | 10.0 | 11.0 | 11.3 |

Lone trees in the open, per column of their crown's width:

| Species | Season 60 | Season 100 | Season 150 |
|---|---|---|---|
| birch | 23.5 | 15.6 | 12.0 |
| oak | 8.0 | 8.0 | 8.5 |
| goat willow | 9.5 | 9.3 | 9.7 |
| beech | 22.4 | 20.9 | 20.0 |
| hornbeam | 16.4 | 14.7 | 14.0 |
| rowan | 22.1 | 22.3 | 26.1 |
| holly | 19.0 | 24.7 | 26.1 |
| field maple | 15.9 | 16.4 | 12.9 |

- **Side light deepens a crown's foliage:** lone trees carry 0.8–2.4× a closed stand's leaf area per column, median ≈ 1.6. Shade-tolerant species (beech, holly, rowan) take the most.
- **A tree in the open slab** is closed in x (neighbours every 21 cells) and open in z, so its factor should lie between 1 (closed) and the lone tree's. The review uses 1.0–1.6.

## Conclusion
- **Light is linear in D** at every tier, at 25–27 ns an update in TypeScript and 5–7 ns in one SIMD lane.
- **`forest` at the three depths**, 4-lane SIMD in a desktop browser: 23, 28 and 43 ms. `panorama` is about 3× that.
- **The coarse lattice** cuts the light 8× at D = 64. The light is not where the open slab's cost goes at D ≥ 48, though: the review's projection puts more than half of each season in the tree passes.
- **Free crowns** of the canopy species want 80–150 cells of depth, so the faces clip them at every D measured: they keep 23–29% of that depth at D = 32, 35–44% at 48, and 47–59% at 64. The understorey's 40–60-cell crowns fit at D = 48 and 64.
- **The open-z metamer multiplier** is D × fill × side-light factor (1.0–1.6) instead of the periodic stand's D × closure. The review restates it.

## Addendum: G1 on the user's phone and laptop (2026-10-29)
The G1 page (`kernel.html`, this note's §1 configuration) was run by the user, cross-origin isolated, in Chrome 156 on both machines:
- **Phone:** a Pixel 8a, 9 cores reported;
- **Laptop:** a ThinkPad X1 Carbon, Linux, 16 cores reported.

Medians in ms:

| Kernel, slab | Pixel 8a | X1 Carbon | This VM (§1) |
|---|---|---|---|
| TypeScript (fused), D = 32 | 222.1 | 217.4 | 241 (bench) |
| WASM scalar, D = 32 | 117.6 | 118.4 | 118–120 |
| WASM SIMD, 1 lane, D = 32 | 48.2 | 42.2 | 54–59 |
| WASM SIMD, 4 lanes, D = 32 | **32.1** | **13.1** | 23 |
| WASM SIMD, 1 lane, D = 48 | 65.8 | 64.4 | 76–77 |
| WASM SIMD, 4 lanes, D = 48 | 35.8 | 27.5 | 28 |
| WASM SIMD, 1 lane, D = 64 | 86.1 | 88.4 | 105–111 |
| WASM SIMD, 4 lanes, D = 64 | **42.9** | 31.6 | 43 |
| WASM SIMD, 1 lane, D = 64 in 2× cells | 19.6 | 11.2 | 12–15 |
| WASM SIMD, 4 lanes, D = 64 in 2× cells | 11.9 | 2.9 | 6 |

- **The stop rule passes with room:** 4-lane SIMD at D = 32 is 32 ms on the phone, against the rule's 150. Even D = 64 is 43 ms, so the light no longer constrains D.
- **Single-threaded, the phone is within 15% of the laptop:** TypeScript 1.02×, scalar 0.99×, SIMD 1.0–1.14×. It is 0.8–1.0× this VM. **The review's 2.7× phone-per-core multiplier (from M15) is wrong for this phone and these kernels,** and is replaced by these ratios.
- **Lane scaling, 1 to 4 lanes:**

  | | D = 32 | D = 48 | D = 64 | 2× cells |
  |---|---|---|---|---|
  | Pixel 8a | 1.50× | 1.84× | 2.0× | 1.65× |
  | X1 Carbon | 3.2× | 2.3× | 2.8× | 3.9× |

  The review uses the phone's measured ratio per D for the light and, as the user asked, 1.5× for the tree passes' thread gain.
- **Memory held:** the phone ran D = 64 with four lanes (about 170 MB by §2c of the review) without failing.
