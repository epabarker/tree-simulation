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
            sim.worker.ts ── World (src/core) ── SnapshotBuilder
                                   ▲
            cli/run.ts ────────────┘  (same core under Node → CSV for Python/R)
```

`src/core` is pure TypeScript. It compiles against `lib: es2023` only, so a DOM or Node API used there is a type error. The worker, the page, the CLI and the tests are thin hosts around it.

## The garden and the lab (M14, ADR 0014)

`mountGarden(host, options)` (`src/web/garden.ts`) is the whole living view: worker, renderer, pull loop, input, and the resize, visibility and theme observers. It returns a `Garden` with `view`, `playback`, `stats`, `ready`, `restart`, `step`, `setPlaying`, `setParams`, `record`, `fit`, `redraw` and `destroy`. Two hosts use it:
- **The lab** (`main.ts`, `index.html`): a garden with `interaction: "full"`, `frame: "trees"`, a fixed speed, full snapshots, and the panel, charts and HUD around it.
- **A home page** (`garden.html` here; edbarker.dev in production): the defaults.
  - **World:** `forestParams` puts the `succession` woodland (M19) on a ring whose width follows the host's aspect (54–520 cells since M18, a tree every ≈ 21 cells; a portrait phone gets two or three large trees), with a random seed per visit. The planting runs birch, oak, birch, beech around the ring, turned by the seed.
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
- **Checkpoints** (`core/checkpoint.ts`): `saveWorld` writes a whole World as bytes. The layout is a u32 header length, a JSON header (ASCII, with anything else escaped as \uXXXX, since the core has no text codec), then every tree's metamer and bud columns, padded to 8 bytes. It holds the params, season, flags, event log and queue, and each tree's scalars and tables. `loadWorld` restores it: k more seasons hash exactly as N + k from scratch (`checkpoint.test.ts`). Light, owners and per-season scratch are rebuilt by the season that reads them.
- **Grown forests:** `cli/first-paint.ts`, run by `npm run build:garden`, grows `forestParams` into `dist-garden/first/` with a `manifest.json`: widths 66, 100, 160 and 220, seeds 6, 9 and 10 (chosen by eye), 40 seasons each, 57–192 kB each and 1.4 MB in all.
- **Plate width:** `plateWidth` sizes the ring to the host's aspect. A portrait host gets two thirds of it, so a phone shows about three trees, drawn large enough to fill the plate.
- **Opening on one:** `mountGarden({ first: { base, widths, seeds } })` picks the width nearest its own and a seed by the day, opens on that forest at the ambient pace, and falls back to growing from seed. `?forest=seed` (option `seed`) still grows from seed. The checkpoint was grown from `forestParams(width, seed)`, so that link regrows the same forest.
- **CLI:** `npm run sim -- --checkpoint-at N` saves the CLI's world (dead trees included) as `checkpoint-N.bin.gz`.

**Long runs:** the worker calls `World.discardDead()` after each season. It frees dead trees' tables (a forest piles up ≈ 20 MB per 1000 seasons otherwise) without changing any live tree (`world.test.ts`). Page worlds therefore do not hash like CLI worlds.

## Data model (spec §5)

Each `Tree` owns two structure-of-arrays tables (`soa.ts` `Table`), one typed array per column.

**Metamers** (`METAMER_SCHEMA` in `tree.ts`)

| Column | Meaning |
|---|---|
| `birthId` | Stable id, ascending in array order |
| `parent`, `slot` | Topology: the parent's row, and which slot of the parent's upper node this metamer fills |
| `axis`, `axisNode`, `order` | `birthId` of the axis's first metamer; position along the axis; branching order |
| `baseX`, `baseY`, `angle`, `length`, `radius` | Geometry. `angle` is absolute radians, with 0 = +x and π/2 = up |
| `scarSumN` | Σ r^n of branches shed at this node (C6 memory) |
| `birthSeason` | |
| `qSum`, `nSum`, `vIn` | Per-season pass results (Q_sum, n_b, resource in). Stored with the row so they survive compaction and can be drawn |
| `stressWood` | Radius added by R3's stress-driven girth. It is local, so C6 sums and remembers only the pipe radius `radius − stressWood` (ADR 0011) |
| `moment` | Bending moment at the base after last season's R3 pass; this season's sag comes from M − `moment` (ADR 0011) |
| `paShift` | R4 reiteration: pa = min(order − paShift, levels − 1) for every R2 lookup. A released dormant bud's shoot gets its host's shift + `r4.juvenile`, and the subtree inherits it (ADR 0012) |

**Buds** (`BUD_SCHEMA`)

| Column | Meaning |
|---|---|
| `birthId` | Stable id |
| `metamer`, `slot` | Where the bud sits |
| `state` | Active, dormant, terminated or aborted; `gone` = consumed, awaiting compaction. M6d appends `shortShoot` (R6, ADR 0006) |
| `age` | |
| `order` | Order of the shoot the bud would produce |
| `angle` | Default growth direction |
| `q`, `vx`, `vy` | Light from C2 |
| `v` | Resource from C3 |

**Slots instead of child pointers.** A node (the top of a metamer) has three slots: main continuation = 0, left lateral = 1, right lateral = 2. In 2D a node has only two sides, so three slots cover every phyllotaxis in §C1. A slot holds a bud or a child metamer, never both: when a bud grows it is consumed, and the new metamer takes its slot.

The passes need only `parent` and `slot`:
- **Basipetal** (a reverse loop): `qSlot[3·parent + slot] += Q_sum[i]`.
- **Acropetal** (a forward loop): `vIn[i] = vSlot[3·parent + slot]`.

`qSlot` and `vSlot` are per-tree scratch arrays, resized on demand and never compacted.

**Ordering invariants.** Rows are appended, so parents always come before children. `Table.compact(keep)` removes rows, keeps the order of the rest, and returns old → new indices; every stored index (`parent`, `bud.metamer`) must be remapped through it. Because tables are append-only and compaction keeps order, `birthId` ascends in array order, which lets snapshots match rows across seasons with a two-pointer merge.

**Late columns.** `hash.ts` skips `stressWood`, `moment` and `paShift` while every row is zero, so runs with R3 and R4 off hash exactly as before those columns existed.

**Reallocation.** `Table.add()` may reallocate every column. Read `t.cols.x[i]` through the `cols` object after an add; never hold on to an old array.

## Season loop (spec §6 → `season.ts`)

| §6 step | Code | Milestone |
|---|---|---|
| Phase 1 `ENV.clear`, `deposit`, `compute_light` | `light.clear()`, `addWall`, `depositBuds` (only when C2 is on), `light.compute()` | M1, M6 |
| Phase 2 sample (Q, V) | `sampleBuds` → `LightModel.sample`; with R5, `sampleNodes` also stores each metamer's shade s = 1 − Q/C at its tip in `tree.nodeShade` (λ in `allocate`) | M0 (uniform), M1, M10 |
| BASIPETAL | `gatherLight` (C3): Q_sum, n_b, Q_base | M0 |
| CARBON (R1, M8, ADR 0010) | `carbonBalance` after `gatherLight` when `r1.enabled`: acropetal `pathLen`; per-node production from live buds' leaf area (`depositArea`) and Q, discounted by exp(−L_path/L_h); basipetal live-pipe sapwood cost plus foliage cost into `tree.pSum`/`mSum` (per-metamer scratch, not hashed); tree totals set `production`, `maintenance`, `reserve` (capped at `store`·M), `reproduction`, `starved` and `vBase`, which `allocate` then splits instead of α·Q_base. Phase 3 kills trees with `starvedToDeath` | M8 |
| ACROPETAL | `allocate` (C3, by `c3.mode`): `bh` splits by λ at every node; `equal` shares α·Q_base over live buds; `none` gives v = 1 to any bud with Q > 0. Every mode fills `vIn` | M0 `none`, M2 `bh`/`equal` |
| BUD_FATE, GROW | `growBuds` → `shootSize`, `growShoot`; each new metamer's angle comes from `shootDirection` (C4) when `c4.enabled`, using the bud's V | M0, M3 |
| R2 (M7, ADR 0009) | No pass of its own: pa = min(order, levels − 1) is looked up where each rule reads its params. `allocate` reads λ per node (`lambdaAt`, with the ontogeny decline); `growBuds` reads A_set and η per bud (`directionParams`); `growShoot` places lateral buds by the axis's generator (`lateralCount`; whorls on the shoot's last metamer) and forms the terminal bud `terminated` with p_term (`terminates`, `Purpose.sympodialTermination`) | M7 |
| BUD_FATE (R6, M6d) | In `growBuds`: a live bud with n = 0 becomes `shortShoot` if Q ≥ `r6.qMin`, else `dormant`. With R6 on, `depositBuds` deposits leaf area by state (active 1, short shoot `r6.leafArea`, dormant 0) and `gatherLight` weights Q by it | M6d |
| BUD_FATE (R4, R5, M10, ADR 0012) | In `growBuds` (exported for tests), a bud needs `growthThreshold`: 1 without R4, v_cont for active buds and short shoots, and v_break·(1 + δ·age)·(1 + δ_b·s) for dormant ones. A dormant bud that falls short is still released if `lightReleases` (Q ≥ Q_rel·(1 + δ·age)) and the R1 reserve can pay one unit: it grows one metamer. A released bud's shoot gets `paShift` (reiteration). A resting dormant bud older than L_dorm is set `gone` (`tree.aborted`). R5 multiplies internode length by 1 + e_s·s and the shoot's A_set by 1 − δ_A·s. Counters `released`, `epicormic` (from trunk wood ≥ 10 seasons old) and `aborted` feed the metrics | M10 |
| SHED, GIRTH | `shedBranches` (C5; threshold max(T, T_rel·Q_top), Q_top from `crownTopLight` after sampling, ADR 0007): marks dim laterals' subtrees on this season's Q_sum/n_b, records scars, compacts metamers and buds, remaps `parent` and `bud.metamer`. With `r1.shed: "carbon"` (R1 on) the test is P_b < M_b or light per metamer < T_rel·Q_top. Removal is shared with R3 breakage (`removeBranches`), which with R4's bud bank leaves a dormant bud in each vacated slot (`budAngle`). Then `updateGirth` (C6): basipetal pipe sums with memory, over the pipe radius r − stressWood | M4, M8, M10 |
| MECHANICS (R3, ADR 0011) | When `r3.enabled`, `tree.prevRadius` takes the radius before `updateGirth`. After it, `updateMechanics` runs a basipetal pass for weight W, first moment S and M = S − W·x_base, with leaf weight from `depositArea`. It adds local stress wood where σ = 4·abs(M)/(πr³) > σ_target, and sets each metamer's turn: sag −φ·(M − `moment`)/(E·πr⁴/4)·l (`r3.sag: "creep"` uses the whole M), capped at `MAX_SAG`, plus posture −β_g·sin(A − A_set) − γ·kink, clamped to ±c·Δr/r. A_set comes from `postureSetPoint`: the R2 row's `postureSetPoint`, else its growth set-point, else `c4.setPoint`. All turns come from the start-of-pass geometry. An acropetal pass then accumulates them, rotates the metamers, rebuilds base positions and turns the buds. Metamers with σ > `r3.sigmaBreak` (off by default) break off through `removeBranches`, with `tree.stress` compacted alongside (`tree.broken`). `tree.stress` keeps σ/σ_target for the page | M9, M10 |
| COMMIT_STAGING | `commitBuds` compacts consumed buds; new rows were appended past the phase's loop bounds | M0 |
| Phase 3 abrasion, stand (M11, ADR 0013) | With O2, `depositBuds` also tags `world.owner` (tree id, −2 shared) and `abrade` kills leafy buds whose sway k·Q·h/r reaches another tree's foliage. R1 starvation deaths follow. With O4, `standDynamics` then applies background mortality m₀, turns each tree's `seedPool` (filled by R1's reproductive sink) into seeds, disperses them by Laplace(0, d), and establishes seedlings where ground light ≥ Q_est (p_est, no trunk within a cell, at most `maxTrees`), appending them to `world.trees` to grow next season | M11 |

**Shoot size (ADR 0004).** v' = min(v, `c1.maxMetamersPerShoot`), n = ⌊v'⌋, l = v'/n · l0: the resource is capped, then Palubicki's rule applies unchanged, as in the LPFG SOT model. Internodes stay within [1, 2)·l0.

**Milestone scaffold.** Until C3 lands at M2, `c3.mode: "none"` gives each bud with Q > 0 exactly one metamer of length l0. With C2 off (M0) that is "all buds grow".

**The world is a closed box.** In every light model, everything outside the W×H grid is opaque: below the ground, beyond the sides and above the top. A bud there gets Q = 0 and never grows, and V never points out of the box. A shoot can overshoot the edge by one metamer, which then stops. The renderer draws the ground over stubs that pushed below it.

Before this rule, shoots that left the grid saw unshaded sky and grew exponentially (found at M1). Make the world large enough for the trees it holds.

## Light models (`src/core/light/`)

All of them sit behind `LightModel.sample(x, y, dir) → {q, vx, vy}` (§C2.8):
- `SkySweep` (M6, default `c2.model: "sky"`, ADR 0005): each bud adds one unit of leaf area to its cell; `compute()` (end of Phase 1) sweeps K sky directions from the sky side, accumulating optical depth T_k into every cell with linear interpolation between the two upstream cells, then stores Q = Σ w_k e^(−k_ext T_k) and the light-weighted direction per cell. A bud gets its cell's values (its own cell's foliage does not shade it); rays from beyond the world's sides are open sky; outside the box Q = 0. The shade overlay shows 1 − Q/Q_open. `compute(season)` takes the season so that `c2.rotate` (M6e, off by default) can move the K directions each season: they then sit at (k + f)/K of the sky's span with f = frac(0.5 + season·(φ − 1)), one per equal stratum, and the weights are renormalised to Σw = C.
- `UniformLight`: C2 off.
- `ShadowTriangle` (M1): deposits a·b^(−q) per bud, Q = max(C − s + a, 0), and V points at the least-shaded cell in a wedge of half-angle θ and radius r.
- The sky sweep: M6.

`World.makeLight(params)` picks one. It is rebuilt whenever params change.

**Periodic sides (M11, ADR 0013).** With `world.sides: "periodic"` the sky sweep wraps x for deposits, samples and rays. Shallow rays are swept up to ⌈3H/(rise·W)⌉ + 1 times around the ring from open sky, so the field is translation invariant. Since M13 the sweep stops at the first lap that changes nothing (a lap is a fixed map of the field, so the result is bit-identical), and every sweep stops at the highest leafy row. On `forest` light now costs 2.7 ms a season, against 10.2 before ([M13 note](experiments/2026-10-27-m13-perf.md)). Growth wraps too, and the page draws crowns where they grew.

## Randomness (ADR 0002)

`rng.ts`: `hashKey(seed, purpose, tree, entity, season, k)` mixes 32-bit integers with `Math.imul`, so it is bit-exact in every engine. `normal` uses `Math.log` and `Math.cos`, which are exact only on V8 (Node and Chrome).

| Draw | Key (tree, entity, season) |
|---|---|
| C1 side sequence | (tree id, axis id, 0) |
| C4 direction noise | (tree id, new metamer's birthId, season) |
| R2 sympodial termination | (tree id, shoot's last metamer birthId, season) |
| O2 abrasion | (tree id, bud birthId, season) |
| O4 mortality | (tree id, 0, season) |
| O4 dispersal, establishment | (parent tree id, seed index, season) |

## Direct manipulation

Tapping a tree on the page fells it. `Scene.pickTree` finds the nearest drawn segment within 14 px, and the page calls `removeTree(id)`. That is an event at the next season boundary: the tree stops depositing shade, so the next season's light reaches its neighbours. Its branches fade out as ghosts. Snapshots and charts show only live trees; the CLI's metrics.csv keeps rows for dead trees, with `alive = 0`.

## Events and replay

`World.setParams` and `World.removeTree` queue events that apply at the next season boundary. Applied events are logged, and `World.record()` returns `{params, events, seasons}`. The page's **Export run** downloads this record; `npm run sim -- --replay file.json` reproduces the run exactly on V8. Changing `trees` mid-run is ignored; a new tree layout needs a new run.

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

**Snapshot** (`snapshot.ts`). Flat arrays over all live trees, concatenated in tree-id order:

- **Metamers:** `parent` (row in the snapshot), `x0`, `y0`, `angle`, `length`, `radius`, `tree`, `birthId`, `order`, `light` (Q_sum/n_b), `resource` (vIn), `age`, `stress` (σ/σ_target, R3), `prevIndex`.
- **Buds:** `budMetamer`, `budState`, `budQ`.
- **Other:** `shadow` (W×H, or null), `junctions`, `metrics` (with each tree's `species`), `species` (the species table's labels: common and Latin names and leaf style, ADR 0016), `seasonMs`, `snapshotMs` (the worker's time to build the snapshot; the HUD's worker time is the sum).

Every typed array is transferred, not copied.

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

## CLI output (`cli/run.ts`)

`runs/<id>/` contains:

| File | Contents |
|---|---|
| `run.json` | `meta` (preset, seasons, git commit, hash, ms), `params`, `events`, `seasons` |
| `metrics.csv` | One row per tree per season after the season ran. Columns: `season` + `METRIC_COLUMNS` (`metrics.ts`) |
| `metamers.csv` | Every metamer at each `--snapshots` season and at the final season. Columns: `season,tree,birthId,parentBirthId,order,axis,x0,y0,x1,y1,length,angle,radius,qSum,nSum,vIn,birthSeason,stressWood` |
| `hash.txt` | State hash (same function as the golden tests) |
| `light.csv` | With `--light` only: the light model's per-cell shade (1 − Q/C for the sky sweep) at the same seasons as `metamers.csv`, i.e. the start-of-season field those seasons' buds saw. Columns: `season,col,row,shade`, row 0 at the ground |

The analysis reads these with `analysis/treesim_io.py`.
