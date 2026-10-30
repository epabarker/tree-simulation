# Architecture

How the code realises the spec. For *why* a choice was made, see `docs/decisions/`.

## Layers

```
            ┌──────────────── page (main thread) ─────────────────┐
 Tweakpane ─┤ main.ts (lab) ─┐                                     │
 Plot ──────┤                ├─ garden.ts ── Renderer (WebGL2 |    │
 host page ─┤ mountGarden() ─┘      │        Canvas 2D) ── input   │
            │                       │ Comlink (calls, transferred buffers)
            └───────────────────────┼─────────────────────────────┘
                                    ▼
            sim.worker.ts ── RustWorld (src/wasm) ══ World (rust/core, WASM)
                                                                   ║
            cli/run.ts ── treesim (rust/cli, native) ══════════════╝
                          (same core, natively → CSV for Python/R)
```

The simulation is the Rust core, `rust/core` (`tree-core`; I1, ADR 0024). The page's worker runs it as WASM through `src/wasm/world.ts`; the CLI runs it natively (`rust/cli`, the `treesim` binary). `src/core` keeps what is plain data, shared by every host and read by the Rust core as JSON (`rust/presets.json`, written by `cli/export-presets.ts` and held to them by `tests/presets-json.test.ts`): the params and their defaults (`params.ts`), presets, species and fixtures, and `types.ts` (the snapshot, metrics and run-record shapes the page reads). It compiles against `lib: es2023` only, so a DOM or Node API used there is a type error.

**One build** (`npm run build:wasm` into `src/wasm/pkg/`, and natively): the `libm` crate's Math, simd128 in WASM. The page, the CLI, the bench, the tests and the opening forests all run it, and `tests/golden.json` holds it natively and in WASM.

**The 2D proof is archived.** The TypeScript core it replaced, and the Rust core's parity build (V8's Math, ported bit for bit) that reproduced it, are at the tag `golden-2d-ts`. CI's `golden-2d` job checks out that tag and runs the 2D goldens there, the TypeScript core's and the parity build's, in WASM and natively.

## The garden and the lab (M14, ADR 0014)

`mountGarden(host, options)` (`src/web/garden.ts`) is the whole living view: worker, renderer, pull loop, input, and the resize, visibility and theme observers. It returns a `Garden` with `view`, `playback`, `stats`, `ready`, `restart`, `step`, `setPlaying`, `setParams`, `record`, `fit`, `redraw` and `destroy`. Two hosts use it:
- **The lab** (`main.ts`, `index.html`): a garden with `interaction: "full"`, `frame: "trees"`, a fixed speed, full snapshots, and the panel, charts and HUD around it.
- **A home page** (`garden.html` here; edbarker.dev in production): the defaults.
  - **World:** `forestParams` puts the `succession` woodland (M19) on a ring whose width follows the host's aspect (54–520 cells since M18, a tree every ≈ 21 cells; a portrait phone gets two or three large trees), with a random seed per visit. The planting runs birch, oak, birch, beech around the ring, turned by the seed.
  - **Leaves (M23):**
    - Each style has an outline (`LEAF_SHAPES`): a width profile along the leaf (`leafProfile`), or five lobes for the palmate maple. WebGL draws it in the fragment shader from a per-instance shape and aspect; Canvas 2D draws it as a polygon.
    - Lengths follow real leaf sizes, so a drawn leaf stands for a small spray: birch 0.5 cells, beech 0.7, oak 0.85.
    - The minimum on-screen size (3.5 CSS px) scales with them.
  - **Species on the page (M19):** each tree is drawn as its species. The snapshot's species table names a leaf style; `Scene.layoutLeaves` gives every leaf its tree's palette, size and cluster; and `leaf-styles.ts` sets each species' calendar: when it flushes, when it turns, and marcescence (young beeches keep their dead leaves through the winter). Both renderers colour each leaf from its own palette's summer and autumn ramps.
  - **Plate II (M19):** with `specimen: "oak"`, the specimen focus grows its own oak alone in a field (`specimenParams`, the `oakOpen` preset), with a new seed each time. The worker keeps the forest aside meanwhile (`swap`), and the forest resumes where it stood when the focus returns.
  - **Pace:** a 40-season intro at 4 seasons/s that slows geometrically to 0.5 seasons/s over its last 12 seasons. While playing, each season's tween is linear and fills its whole interval, so growth never stops between seasons (D1); a single step eases.
  - **Interaction:** tap to fell only. There is no pan, zoom or scroll capture (`touch-action: manipulation`).
  - **Snapshots:** lean (no junctions, no field).
  - **Reduced motion:** the forest as it stands after the intro, still.

`Scene.frame = "world"` fits the world's width and eases out only once crowns pass half the world's height. `Scene.headroom` keeps crowns below the host's text. On a ring, both renderers draw the trees at offsets −W, 0 and +W (`Scene.wrapOffsets`), so crowns that grew across the seam show at both edges, and picking wraps the same way.

**Building and shipping it:**
- `npm run build:garden` (`vite.garden.config.ts`) writes `dist-garden/garden.js` and its worker, resolved relative to `garden.js`.
- `cli/garden-size.ts` fails the build above 60 kB gzipped (M14: 42.7 kB).
- A `garden-vX.Y.Z` tag makes `.github/workflows/release.yml` attach `garden-X.Y.Z.tgz` (`garden/` and the lab as `lab/`, without source maps; ≈ 250 kB) to a GitHub Release. The site vendors it with its `scripts/sync-garden.mjs`.

**Colour tokens for hosts:**
- The scene's tokens live in `render/scene.css` inside `@layer tree-garden`. The garden injects that sheet first in `<head>`, so the layer comes first and any host declaration of a token wins.
- `theme.ts` converts any CSS colour a host gives (oklch(), names) to hex by painting one pixel. A custom property's computed value is its raw text, and the WebGL parser only reads hex and rgb().

**First paint (M21):**
- **Checkpoints** (`rust/core/src/checkpoint.rs`; the TypeScript core's byte for byte): `save` writes a whole World as bytes. The layout is a u32 header length, a JSON header (ASCII, with anything else escaped as \uXXXX, since the core has no text codec), then every tree's metamer and bud columns, padded to 8 bytes. It holds the params, season, flags, event log and queue, and each tree's scalars and tables. `load` restores it: k more seasons hash exactly as N + k from scratch (`tests/evidence/checkpoint.test.ts`). Bytes written by the TypeScript core load in the Rust one (`tests/rust-world.test.ts`, with garden 0.14.0's shipped forest). Light, owners and per-season scratch are rebuilt by the season that reads them.
- **Grown forests:** `cli/first-paint.ts`, run by `npm run build:garden`, grows `forestParams` into `dist-garden/first/` with a `manifest.json`: widths 66, 100, 160 and 220, seeds 6, 9 and 10 (chosen by eye), 40 seasons each, 57–192 kB each and 1.4 MB in all.
- **Plate width:** `plateWidth` sizes the ring to a share of the host's aspect: 0.65 on a portrait host, 0.7 on a landscape one (M24). The plate fits the ring's width, so the share sets how large trees are drawn. A phone shows about three trees; the site's wide plate (1200 px) shows about ten at about 7 px a cell.
- **Leaf studies:** `leafStudy(tree)` returns the tree's species' leaf as an SVG path (`leafStudyPath`), with its real length, for the field card.
- **Opening on one:** `mountGarden({ first: { base, widths, seeds, when } })` picks the width nearest its own and a seed by the day, opens on that forest at the ambient pace, and falls back to growing from seed. With `when: "reduced-motion"` (the site, M23) it does so only for reduced motion.
- **The time-lapse:** `seeds` makes the default forest grow from one of those seeds a day, so it ends in a chosen wood. `?forest=seed` (option `seed`) still grows from seed. The checkpoint was grown from `forestParams(width, seed)`, so that link regrows the same forest only where the browser's `Math` matches Node's (not Chrome's: ADR 0002), at the same ring width.
- **CLI:** `npm run sim -- --checkpoint-at N` saves the CLI's world (dead trees included) as `checkpoint-N.bin.gz`.

**Long runs:** the worker steps with `discard` on, which calls `World::discard_dead` after each season. It frees dead trees' tables (a forest piles up ≈ 20 MB per 1000 seasons otherwise) without changing any live tree (`tests/structure.test.ts`). Page worlds therefore do not hash like CLI worlds.

## Data model (spec §5)

Each `Tree` owns two structure-of-arrays tables (`rust/core/src/tree.rs`, the `table!` macro), one `Vec` per column, stored with the TypeScript typed arrays' conversions (`store_i32` and the like) so the bits match. `src/core/types.ts` names the columns for the page (`METAMER_SCHEMA`, `BUD_SCHEMA`), and `TreeView` reads them out of WASM memory.

**Metamers** (`METAMER_SCHEMA`)

| Column | Meaning |
|---|---|
| `birthId` | Stable id, ascending in array order |
| `parent`, `slot` | Topology: the parent's row, and which slot of the parent's upper node this metamer fills |
| `axis`, `axisNode`, `order` | `birthId` of the axis's first metamer; position along the axis; branching order |
| `baseX`, `baseY`, `baseZ`, `length`, `radius` | Geometry: the base, y up, z the slab's depth from the front face. The metamer runs from its base along H for `length` |
| `hx`, `hy`, `hz`, `lx`, `ly`, `lz` | The frame (I2, ADR 0025): heading H (unit) and reference L ⟂ H, carried by parallel transport |
| `azimuth` | A lateral's angle round its parent's H from the parent's L (0 on the main slot): where R4's bank puts a bud back |
| `scarSumN` | Σ r^n of branches shed at this node (C6 memory) |
| `birthSeason` | |
| `qSum`, `nSum`, `vIn` | Per-season pass results (Q_sum, n_b, resource in). Stored with the row so they survive compaction and can be drawn |
| `stressWood` | Radius added by R3's stress-driven girth. It is local, so C6 sums and remembers only the pipe radius `radius − stressWood` (ADR 0011) |
| `mx`, `my`, `mz` | Bending moment vector at the base after last season's R3 pass; this season's sag comes from M − it (ADR 0011, 0025) |
| `paShift` | R4 reiteration: pa = min(order − paShift, levels − 1) for every R2 lookup. A released dormant bud's shoot gets its host's shift + `r4.juvenile`, and the subtree inherits it (ADR 0012) |

**Buds** (`BUD_SCHEMA`)

| Column | Meaning |
|---|---|
| `birthId` | Stable id |
| `metamer`, `slot` | Where the bud sits |
| `state` | Active, dormant, terminated or aborted; `gone` = consumed, awaiting compaction. M6d appends `shortShoot` (R6, ADR 0006) |
| `age` | |
| `order` | Order of the shoot the bud would produce |
| `hx`…`lz`, `azimuth` | Default growth frame: a terminal bud's is its metamer's; a lateral's is β from it at its azimuth, its L toward the parent axis |
| `q`, `vx`, `vy`, `vz` | Light from C2: Q and the 3D direction V |
| `v` | Resource from C3 |

**Slots instead of child pointers.** A node (the top of a metamer) has the main continuation (slot 0) and up to seven laterals (1–7), as many as its phyllotaxis places (ADR 0025): one for spiral and distichous, two for opposite, `whorl` for a whorl. A slot holds a bud or a child metamer, never both: when a bud grows it is consumed, and the new metamer takes its slot.

The passes need only `parent` and `slot` (`SLOTS` = 8, the stride):
- **Basipetal** (a reverse loop): `qSlot[8·parent + slot] += Q_sum[i]`.
- **Acropetal** (a forward loop): `vIn[i] = vSlot[8·parent + slot]`; the Borchert–Honda split gives the main slot λQ_m/(λQ_m + (1−λ)ΣQ_l) and shares the rest among the laterals by their Q.

`qSlot` and `vSlot` are per-tree scratch arrays, resized on demand and never compacted.

**Ordering invariants.** Rows are appended, so parents always come before children. `compact(keep)` removes rows, keeps the order of the rest, and returns old → new indices; every stored index (`parent`, `bud.metamer`) must be remapped through it. Because tables are append-only and compaction keeps order, `birthId` ascends in array order, which lets snapshots match rows across seasons with a two-pointer merge.

**The hash** (`hash.rs`) is FNV-1a over every column of both tables, in schema order.

**Reallocation.** In Rust the borrow checker keeps a column from being held across an add. On the page, a `TreeView` reads its columns again whenever the world's `version` changes.

## Season loop (spec §6 → `rust/core/src/season.rs`)

One function per phase (`phase_light` … `phase_deaths`, in `PHASES` order); `World::step` calls them with a hook after each, which the bench times. The table names each rule's function as the TypeScript core named it; the Rust function is its snake_case (`growBuds` → `grow_buds`), in `rust/core/src/principles/`.

| §6 step | Code | Milestone |
|---|---|---|
| Phase 1 `ENV.clear`, `deposit`, `compute_light` | `light.clear()`, `addWall`, `depositBuds` (only when C2 is on), `light.compute()` | M1, M6 |
| Phase 2 sample (Q, V) | `sampleBuds` → `LightModel.sample`; with R5, `sampleNodes` also stores each metamer's shade s = 1 − Q/C at its tip in `tree.nodeShade` (λ in `allocate`) | M0 (uniform), M1, M10 |
| BASIPETAL | `gatherLight` (C3): Q_sum, n_b, Q_base | M0 |
| CARBON (R1, M8, ADR 0010) | `carbonBalance` after `gatherLight` when `r1.enabled`: acropetal `pathLen`; per-node production from live buds' leaf area (`depositArea`) and Q, discounted by exp(−L_path/L_h); basipetal live-pipe sapwood cost plus foliage cost into `tree.pSum`/`mSum` (per-metamer scratch, not hashed); tree totals set `production`, `maintenance`, `reserve` (capped at `store`·M), `reproduction`, `starved` and `vBase`, which `allocate` then splits instead of α·Q_base. Phase 3 kills trees with `starvedToDeath` | M8 |
| ACROPETAL | `allocate` (C3, by `c3.mode`): `bh` splits by λ at every node; `equal` shares α·Q_base over live buds; `none` gives v = 1 to any bud with Q > 0. Every mode fills `vIn` | M0 `none`, M2 `bh`/`equal` |
| BUD_FATE, GROW | `growBuds` → `shootSize`, `growShoot`; each new metamer's heading comes from `shootDirection` (C4, a vector sum, ADR 0025) when `c4.enabled`, using the bud's 3D V; its frame's L by parallel transport. `formAxillaryBuds` places laterals by phyllotaxis (`laterals`: count and azimuth step) | M0, M3, I2 |
| R2 (M7, ADR 0009) | No pass of its own: pa = min(order, levels − 1) is looked up where each rule reads its params. `allocate` reads λ per node (`lambdaAt`, with the ontogeny decline); `growBuds` reads A_set and η per bud (`directionParams`); `growShoot` places lateral buds by the axis's generator (`laterals`: spiral, distichous, opposite, whorled with `whorl` laterals on the shoot's last metamer, or none) and forms the terminal bud `terminated` with p_term (`terminates`, `Purpose.sympodialTermination`) | M7 |
| BUD_FATE (R6, M6d) | In `growBuds`: a live bud with n = 0 becomes `shortShoot` if Q ≥ `r6.qMin`, else `dormant`. With R6 on, `depositBuds` deposits leaf area by state (active 1, short shoot `r6.leafArea`, dormant 0) and `gatherLight` weights Q by it | M6d |
| BUD_FATE (R4, R5, M10, ADR 0012) | In `growBuds` (exported for tests), a bud needs `growthThreshold`: 1 without R4, v_cont for active buds and short shoots, and v_break·(1 + δ·age)·(1 + δ_b·s) for dormant ones. A dormant bud that falls short is still released if `lightReleases` (Q ≥ Q_rel·(1 + δ·age)) and the R1 reserve can pay one unit: it grows one metamer. A released bud's shoot gets `paShift` (reiteration). A resting dormant bud older than L_dorm is set `gone` (`tree.aborted`). R5 multiplies internode length by 1 + e_s·s and the shoot's A_set by 1 − δ_A·s. Counters `released`, `epicormic` (from trunk wood ≥ 10 seasons old) and `aborted` feed the metrics | M10 |
| SHED, GIRTH | `shedBranches` (C5; threshold max(T, T_rel·Q_top), Q_top from `crownTopLight` after sampling, ADR 0007): marks dim laterals' subtrees on this season's Q_sum/n_b, records scars, compacts metamers and buds, remaps `parent` and `bud.metamer`. With `r1.shed: "carbon"` (R1 on) the test is P_b < M_b or light per metamer < T_rel·Q_top. Removal is shared with R3 breakage (`removeBranches`), which with R4's bud bank leaves a dormant bud in each vacated slot at the shed branch's azimuth (`budFrame`). Then `updateGirth` (C6): basipetal pipe sums with memory, over the pipe radius r − stressWood | M4, M8, M10 |
| MECHANICS (R3, ADR 0011, 0025) | When `r3.enabled`, `tree.prevRadius` takes the radius before `updateGirth`. After it, `updateMechanics` runs a basipetal pass for weight W and the first moment S (a 3-vector), and the bending moment M = (S − W·base) × (−ŷ), its part across the axis, with leaf weight from `depositArea`. It adds local stress wood where σ = 4·|M|/(πr³) > σ_target, and sets each metamer's turn as a rotation vector: sag φ·l·(M − M_prev)/(E·πr⁴/4) about the moment (`r3.sag: "creep"` uses the whole M), capped at `MAX_SAG`, plus posture toward the set-point direction (β_g·sin θ) and the previous metamer (γ·kink), together at most c·Δr/r. A_set comes from `postureSetPoint`: the R2 row's `postureSetPoint`, else its growth set-point, else `c4.setPoint`. All turns come from the start-of-pass geometry. An acropetal pass then composes them (each metamer turns by its own and all its parent's), rotates the frames, rebuilds base positions and turns the buds. Metamers with σ > `r3.sigmaBreak` (off by default) break off through `removeBranches`, with `tree.stress` compacted alongside (`tree.broken`). `tree.stress` keeps σ/σ_target for the page | M9, M10 |
| COMMIT_STAGING | `commitBuds` compacts consumed buds; new rows were appended past the phase's loop bounds | M0 |
| Phase 3 abrasion, stand (M11, ADR 0013, 0025) | With O2, `depositBuds` also tags `world.owner` (W × H × D; tree id, −2 shared) and `abrade` kills leafy buds whose sway k·Q·h/r, in x and z, reaches another tree's foliage. R1 starvation deaths follow. With O4, `standDynamics` then applies background mortality m₀, turns each tree's `seedPool` (filled by R1's reproductive sink) into seeds, disperses them a Laplace(0, d) distance at a drawn azimuth on the ground (lost beyond a face), and establishes seedlings where ground light ≥ Q_est (p_est, no trunk within a cell on the ground, at most `maxTrees`), appending them to `world.trees` to grow next season. Seed rain (ADR 0018) then lands each species' `o4.rain` seeds per 100 cells of width anywhere on the ground and establishes them by the same rule | M11, M25, I2 |

**Shoot size (ADR 0004).** v' = min(v, `c1.maxMetamersPerShoot`), n = ⌊v'⌋, l = v'/n · l0: the resource is capped, then Palubicki's rule applies unchanged, as in the LPFG SOT model. Internodes stay within [1, 2)·l0.

**Milestone scaffold.** Until C3 lands at M2, `c3.mode: "none"` gives each bud with Q > 0 exactly one metamer of length l0. With C2 off (M0) that is "all buds grow". In 3D it no longer regulates under light (I2): Beer–Lambert light never reaches 0 inside the slab, where the shadow triangle's did, so `shadow` grows as `explosion` does.

**The world is a closed box.** In every light model, everything outside the W × H × D slab is opaque to growth: below the ground, beyond the sides, above the top and beyond the z faces (light still passes the faces, through τ). A bud there gets Q = 0 and never grows, and V never points out of the box. A shoot can overshoot the edge by one metamer, which then stops. The renderer draws the ground over stubs that pushed below it.

Before this rule, shoots that left the grid saw unshaded sky and grew exponentially (found at M1). Make the world large enough for the trees it holds.

## Light models (`rust/core/src/light/`)

All of them sit behind `Light::sample(x, y, z) → (Q, V)` (§C2.8), V a 3D unit vector:
- **The slab sweep** (`slab_sweep.rs`, default `c2.model: "slab"`; G3, ADR 0024): each live bud adds its leaf area to its cell of a Float32 field W × H × D; `compute_lanes` sweeps K sky directions (16, on a spherical Fibonacci set, rotated each season with `c2.rotate`) down from the highest leafy row, row by row, carrying each direction's optical depth G down by whole-cell shifts and adding the row's mean leaf area over each step's box. Q = Σ w_k e^(−k_ext G_k), V the light-weighted direction. Above the foliage, open sky. The sky's weights ∝ sin(elevation)^p · max(0, 1 + tilt·d_x) (`skyTilt`, an oblique sun). x is periodic on a ring or open; z is open, the sky beyond each face seen through τ (`world.faces`, front then back). `world.fade` scales Q to 0 over that many cells before a face. Walls are leaf area through the whole depth.
- **Fixed lanes** (I2): the directions are always split into 4 lanes (k ≡ lane mod 4), each into its own partial field, summed in lane order: one thread or four (`threads`) give the same bits.
- **Pooled** (`c2.model: "pooled"`, the §8 ablation, M22): every leaf gets the mean light of one homogeneous canopy of the slab's leaf area per column.
- **Uniform:** C2 off.

The shadow triangle (M1) and the 2D sky sweep (M6, M18) left with 2D; they are at the tag `golden-2d-ts`. `make_light(params)` picks one (the `Light` enum). It is rebuilt whenever params change. The page's shade overlay is 1 − Q/C averaged across the depth.

### The Rust core (ADR 0024, G2 and I1)
G2 moved the sky sweep (`rust/core/src/light/sky_sweep.rs`) into Rust behind the TypeScript core's `LightModel` ([G2 note](experiments/2026-10-29-g2-rust-sweep.md)). I1 moved the rest, phase by phase, each held to the TypeScript core side by side before the next ([I1 note](experiments/2026-10-29-i1-rust-core.md)).
- **The boundary** (`rust/wasm/src/world.rs`, `src/wasm/world.ts`): params go in as JSON, read with JavaScript's semantics (`rust/core/src/json.rs`: key order kept, numbers printed as `Number.prototype.toString`). Events, checkpoints and records cross as JSON or bytes. A tree's columns are read on demand (`tree_column`), never per frame.
- **The snapshot** is built in Rust into one buffer (`rust/core/src/snapshot.rs`) and copied out of linear memory once; every array the page gets is a view on that copy, and the copy is the transferable.
- **The math** (`rust/core/src/math/`): never a platform `Math`; the `libm` crate, pure Rust.

### The 3D slab sweep (ADR 0024, G3)
`rust/core/src/light/slab_sweep.rs`: the world's light since I2.
- **Fields:** Float32 fields W × H × D, rows of W × D.
- **Sky:** K directions on a spherical Fibonacci set, rotated each season.
- **The march:** the 2D sweep's row march, with the segment averaged over its box. G is carried down by whole-cell shifts, not read bilinearly (G3 measured the bilinear read's blur as a bias).
- **Edges:** periodic x; open z with τ per face.
- **Speed:** a polynomial Float32 exp, and scalar and SIMD kernels that give the same bits. Lanes come from `compute_part`; the world's are fixed (`compute_lanes`).
- **Reference:** `exact_q` is the exact tracer the G3 gate measures against ([G3 note](experiments/2026-10-29-g3-slab-light.md)).

## Randomness (ADR 0002)

`rust/core/src/rng.rs`: `hash_key(seed, purpose, tree, entity, season, k)` mixes 32-bit integers (as `Math.imul` did), so it is bit-exact everywhere. `normal` uses the core's log and cos, so its draws are the same in every engine and natively.

| Draw | Key (tree, entity, season) |
|---|---|
| C1 phyllotaxis: the axis's first azimuth (`sideSequence`) | (tree id, axis id, 0) |
| C4 direction noise: the turn's size (keys 0–1, a normal) and its axis's azimuth (key 2) | (tree id, new metamer's birthId, season) |
| R2 sympodial termination | (tree id, shoot's last metamer birthId, season) |
| O2 abrasion | (tree id, bud birthId, season) |
| O4 mortality | (tree id, 0, season) |
| O4 dispersal (key 0 distance, 1 azimuth), establishment | (parent tree id, seed index, season) |
| O4 seed rain (`seedRain`, 13) | (FNV hash of the species name, 0 count / 1 x / 3 z / 2 establishment, season, seed index) |

## Direct manipulation

Tapping a tree on the page fells it. `Scene.pickTree` finds the nearest drawn segment within 14 px, and the page calls `removeTree(id)`. That is an event at the next season boundary: the tree stops depositing shade, so the next season's light reaches its neighbours. Its branches fade out as ghosts. Snapshots and charts show only live trees; the CLI's metrics.csv keeps rows for dead trees, with `alive = 0`.

## Events and replay

`setParams`, `removeTree` and `plantTree` queue events that apply at the next season boundary. Applied events are logged, and `World.record()` returns `{params, events, seasons}`. The page's **Export run** downloads this record; `npm run sim -- --replay file.json` reproduces the run exactly (the page and the CLI run the same core; a record exported before I1 replays exactly only at the tag `golden-2d-ts`). Changing `trees` mid-run is ignored; a new tree layout needs a new run.

## Worker protocol (`src/worker/api.ts`)

| Call | Effect |
|---|---|
| `init(params)` | New World; returns the season-0 snapshot |
| `step(n)` | Runs n seasons; returns a snapshot. The page asks for one season at a time. While playing it asks as soon as a season is shown, so the worker computes season s+1 while the page tweens to s, and the result waits for its turn (pipelining, M15). Pausing shows the waiting season; while playing, events apply one season later |
| `restore(bytes)` | Starts from a world checkpoint (M21), gzipped or already unzipped by the server; returns the snapshot of its season |
| `swap(params \| null)` | Puts the running world aside and starts `params`, or with null resumes the world put aside (M19: Plate II's own oak while the forest waits). Returns a season snapshot; `init` drops anything put aside |
| `setParams(patch)`, `removeTree(id)` | Queue events |
| `setSnapshotOptions({junctions, field})` | Which optional parts later snapshots carry: the Δ histogram's junction exponents and the shade field. Both default to on (the lab); the home page turns both off (M13) |
| `record()` | Returns the run record |

**Snapshot** (`rust/core/src/snapshot.rs`; the shape is `Snapshot` in `src/core/types.ts`). Flat arrays over all live trees, concatenated in tree-id order:

- **Metamers:** `parent` (row in the snapshot), `x0`, `y0`, `angle`, `length`, `radius`, `z0`, `dirX`…`dirZ` (H), `refX`…`refZ` (L), `tree`, `birthId`, `order`, `light` (Q_sum/n_b), `resource` (vIn), `age`, `stress` (σ/σ_target, R3), `prevIndex`. `angle` and `length` are the segment as drawn in the picture's plane (projected along z), so the renderer rebuilds (x, y) positions from them as it always did; it draws branches far to near by `z0` (I2) until I3's depth buffer.
- **Buds:** `budMetamer`, `budState`, `budQ`.
- **Other:** `shadow` (W×H, or null), `junctions`, `metrics` (with each tree's `species`), `species` (the species table's labels: common and Latin names and leaf style, ADR 0016), `seasonMs`, `snapshotMs` (the worker's time to build the snapshot; the HUD's worker time is the sum).

The arrays share one buffer, copied once out of WASM memory and transferred, not copied again.

**Natural view (default).** Branches are coloured bark-young → bark-old by √(age/max age). Leaves are drawn as lens shapes at the tip of every metamer up to `leafAge` seasons old (default 5), alternating sides by birthId parity, coloured shade → sun by the metamer's light, with a small stable per-leaf variation. They are a view of the foliage only: in the model, buds cast the shade (§C2). Leaves unfold with their metamer, shrink away in the season they age out, and never draw shorter than 5 px so zoomed-out crowns still read as foliage. Sky and ground are screen-space gradients.

**Leaf styles** (`render/leaf-styles.ts`, page only). A species preset names a style in `Preset.leaf` (core/presets.ts); the page copies it into `ViewOptions.leafStyle`, and the renderers into `Scene.leafStyle`. A style sets leaf length and aspect (a needle is a thin lens), spread, leaves per cluster (depth view) and per side (x-ray), the colour ramp (`--needle-*`, `--birch-leaf-*`, `--tropical-leaf-*` tokens in layout.css) and the default leaf age. View → leaf style overrides it. The model's leaf area does not depend on it.

**Drawn vs simulated foliage.** Today the model holds one unit of leaf area per live bud (active or dormant), while the page draws leaves on young metamers. With R6 on (M6d) the model's leaf area follows shoot type, and the page draws a rosette at each short shoot, so the two agree.

**Pseudo-depth (M6c, ADR 0008, page only).** With the `depth` view option on (natural default), `Scene.computeGeometry` maps each metamer's simulated direction through a 2×2 projection: identity on the trunk; each first-order limb's subtree squeezed perpendicular to the trunk by 0.55 + 0.45·|sin φ|, φ hashed from the limb's birthId (spec §C1.4's projected spiral, applied once per limb). `Scene.leaves` then emits `CLUSTER_LEAVES` (3) leaves per leafy metamer spaced around the shoot, each foreshortened by its out-of-plane angle, with depth mixing the axis depth and the leaf's; leaves behind the plane come first (`Leaves.back`), darkened, and both renderers draw them before the branches, the rest after (WebGL2 uses a second leaf batch). With `depth` off (the x-ray view) the page draws exactly the simulated geometry. Picking uses the drawn geometry.

**Colours** live as CSS tokens: the scene's in `src/web/render/scene.css` (light and dark, in a cascade layer a host can override), the lab's own (including the Tweakpane theme) in `src/web/ui/layout.css`. The canvas reads them through `render/theme.ts` and re-reads them when the system scheme or `<html data-theme>` changes, so a host site's theme toggle carries through.

**Camera.** `fit()` sets a target (centre x and scale) covering the trees (`frame: "trees"`) or the world's width (`frame: "world"`), with margins for the ground and `headroom` for text above; `animateCamera` eases toward it each frame (time constant 380 ms) while keeping the ground line pinned. Any pan or zoom by the user stops the following until "Fit view" or a double-tap. In the lab a single tap waits out the double-tap window (320 ms) before it fells a tree.

**Tweening.** `render/scene.ts` (`Scene`) holds everything both renderers share: each frame it rebuilds positions in a single forward loop, interpolating length, angle and radius from the `prevIndex` row; new rows grow from zero; previous rows that nothing maps to are fading ghosts (shed branches). It also tapers each segment toward its thickest child (`tipRadius`), chooses palette indices per colour mode, lays out leaves (camera-independent: base point, direction, size 0…1), fits and eases the camera, and picks trees.

**Per snapshot, not per frame (M15).** These depend only on the snapshot (and view settings), so they are computed when a snapshot is first drawn:
- the pseudo-depth projections;
- the colour indices;
- the leaf layout: which leaves exist; each one's metamer and layer; its direction as a fixed rotation (a, b) of its shoot's direction; its size scale and colour.

A frame then interpolates positions, normalises each leafy shoot's direction, applies the rotations and sizes the leaves. Two geometries take turns as tween origin and target. `node src/web/render/scene.bench.ts` times a frame's Scene work ([M15 note](experiments/2026-10-27-m15-render.md)).

**Adaptive quality** (`render/quality.ts`, M15). While the garden animates, every 60 frame intervals form a window:
- If its 90th percentile is above 24 ms, the quality steps down one level: device pixel ratio 2 → 1.5 → 1, then `ViewOptions.lite` (no back layer of leaves).
- Ten windows in a row under 18 ms step back up.
- A change waits a second before frames count again.

The lab's Stats shows the level. `?bench` turns it off, and also measures the page: the lab takes `?preset=` and `?seasons=`, and `garden.html` works too.

**Renderers** (`render/create.ts` picks one; `?renderer=canvas` forces the fallback):
- `WebGL2Renderer` (default, M6b, ADR 0001; twgl.js). Its instance buffers grow by capacity and frames overwrite them with `bufferSubData` (M15). It draws one instanced quad per metamer shaded in the fragment shader as an uneven capsule (signed distance, antialiased by `0.5 − d/px`; stems under half a pixel draw at half a pixel with alpha scaled by their true coverage), one quad per leaf shaded as a vesica, instanced squares for buds and rectangles for walls, the shade overlay as an RGBA texture, sky and ground as full-screen gradients; premultiplied alpha. Instance data never depends on the camera (zoom-dependent minimum sizes are applied in the shaders), so frames where only the camera moves skip the rebuild and only change uniforms. Handles context loss by recreating its resources.
- `Canvas2DRenderer` (fallback): segments grouped by (colour, width bucket), each group stroked as one path.

Measured in headless Firefox (desktop GPU; phones are slower): a 10-tree stand of about 4k metamers draws in 2.3 ms of CPU per frame during growth playback with WebGL2 against 19 ms with Canvas 2D; 28k metamers in 5.8 ms; panning a paused 55k-metamer scene costs 0.35 ms.

## CLI output (`cli/run.ts` → `rust/cli`)

`cli/run.ts` builds the native binary when its sources are newer and runs it with the same arguments, so `analysis/treesim/sweep.py` runs unchanged. Its files are the TypeScript CLI's formats (at I1 they were byte for byte the TypeScript CLI's, in the archived parity build). `runs/<id>/` contains:

| File | Contents |
|---|---|
| `run.json` | `meta` (preset, seasons, git commit, hash, ms), `params`, `events`, `seasons` |
| `metrics.csv` | One row per tree per season after the season ran. Columns: `season` + `METRIC_COLUMNS` (`types.ts`; `rust/core/src/metrics.rs`) |
| `metamers.csv` | Every metamer at each `--snapshots` season and at the final season. Columns: `season,tree,birthId,parentBirthId,order,axis,x0,y0,x1,y1,length,angle,radius,qSum,nSum,vIn,birthSeason,stressWood,z0,z1,hx,hy,hz,pSum,mSum,stress`; `pSum` and `mSum` are each branch's R1 production and maintenance, from R1's pass on a copy of the tree at the snapshot; `stress` is R3's σ/σ_target from its last pass (0 without R3) |
| `hash.txt` | State hash (same function as the golden tests) |
| `light.csv` | With `--light` only: the light model's per-cell shade (1 − Q/C for the sky sweep) at the same seasons as `metamers.csv`, i.e. the start-of-season field those seasons' buds saw. Columns: `season,col,row,shade,lad`, row 0 at the ground; `lad` is the leaf area density averaged over the depth. Beside it, `ground.csv`: `season,col,layer,q,lai`, the ground's light (of C) per x and z and the leaf area in the column above; and `buds.csv`: `season,tree,metamer,state,age,q,v,y,leaf`, every live bud (its fate, age, light, vigour, tip height and R6 leaf area) |

The analysis reads these with `analysis/treesim_io.py`.
