# Architecture

How the code realises the spec. For *why* a choice was made, see `docs/decisions/`.

## Layers

```
            ┌───────────── page (main thread) ─────────────┐
 Tweakpane ─┤ main.ts ── Canvas2DRenderer ── input.ts       │
 Plot ──────┤    │ Comlink (async calls, transferred buffers)│
            └────┼──────────────────────────────────────────┘
                 ▼
            sim.worker.ts ── World (src/core) ── SnapshotBuilder
                                   ▲
            cli/run.ts ────────────┘  (same core under Node → CSV for Python/R)
```

`src/core` is pure TypeScript. It compiles against `lib: es2023` only, so a DOM or Node API used there is a type error. The worker, the page, the CLI and the tests are thin hosts around it.

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

**Buds** (`BUD_SCHEMA`)

| Column | Meaning |
|---|---|
| `birthId` | Stable id |
| `metamer`, `slot` | Where the bud sits |
| `state` | Active, dormant, terminated or aborted; `gone` = consumed, awaiting compaction |
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

**Reallocation.** `Table.add()` may reallocate every column. Read `t.cols.x[i]` through the `cols` object after an add; never hold on to an old array.

## Season loop (spec §6 → `season.ts`)

| §6 step | Code | Milestone |
|---|---|---|
| Phase 1 `ENV.clear`, `deposit`, `compute_light` | `light.clear()`, `addWall`, `depositBuds` (only when C2 is on) | M1 |
| Phase 2 sample (Q, V) | `sampleBuds` → `LightModel.sample` | M0 (uniform), M1 |
| BASIPETAL | `gatherLight` (C3): Q_sum, n_b, Q_base | M0 |
| CARBON | — | M8 |
| ACROPETAL | `allocate` (C3, by `c3.mode`) | M0 `none`, M2 `bh`/`equal` |
| BUD_FATE, GROW | `growBuds` → `shootSize`, `growShoot` (C1, C4 direction) | M0, M3 |
| SHED, GIRTH | — | M4 |
| MECHANICS | — | M9 |
| COMMIT_STAGING | `commitBuds` compacts consumed buds; new rows were appended past the phase's loop bounds | M0 |
| Phase 3 abrasion, stand | — | M11 |

**Milestone scaffold.** Until C3 lands at M2, `c3.mode: "none"` gives each bud with Q > 0 exactly one metamer of length l0. With C2 off (M0) that is "all buds grow".

**The world is a closed box.** In every light model, everything outside the W×H grid is opaque: below the ground, beyond the sides and above the top. A bud there gets Q = 0 and never grows, and V never points out of the box. A shoot can overshoot the edge by one metamer, which then stops. The renderer draws the ground over stubs that pushed below it.

Before this rule, shoots that left the grid saw unshaded sky and grew exponentially (found at M1). Make the world large enough for the trees it holds.

## Light models (`src/core/light/`)

All of them sit behind `LightModel.sample(x, y, dir) → {q, vx, vy}` (§C2.8):
- `UniformLight`: C2 off.
- `ShadowTriangle` (M1): deposits a·b^(−q) per bud, Q = max(C − s + a, 0), and V points at the least-shaded cell in a wedge of half-angle θ and radius r.
- The sky sweep: M6.

`World.makeLight(params)` picks one. It is rebuilt whenever params change.

## Randomness (ADR 0002)

`rng.ts`: `hashKey(seed, purpose, tree, entity, season, k)` mixes 32-bit integers with `Math.imul`, so it is bit-exact in every engine. `normal` uses `Math.log` and `Math.cos`, which are exact only on V8 (Node and Chrome).

| Draw | Key (tree, entity, season) |
|---|---|
| C1 side sequence | (tree id, axis id, 0) |
| C4 direction noise | (tree id, new metamer's birthId, season) |

## Events and replay

`World.setParams` and `World.removeTree` queue events that apply at the next season boundary. Applied events are logged, and `World.record()` returns `{params, events, seasons}`. The page's **Export run** downloads this record; `npm run sim -- --replay file.json` reproduces the run exactly on V8. Changing `trees` mid-run is ignored; a new tree layout needs a new run.

## Worker protocol (`src/worker/api.ts`)

| Call | Effect |
|---|---|
| `init(params)` | New World; returns the season-0 snapshot |
| `step(n)` | Runs n seasons; returns a snapshot. The page asks for one season at a time, after the previous tween ends (pull model, no queueing) |
| `setParams(patch)`, `removeTree(id)` | Queue events |
| `record()` | Returns the run record |

**Snapshot** (`snapshot.ts`). Flat arrays over all live trees, concatenated in tree-id order:

- **Metamers:** `parent` (row in the snapshot), `x0`, `y0`, `angle`, `length`, `radius`, `tree`, `birthId`, `order`, `light` (Q_sum/n_b), `resource` (vIn), `age`, `prevIndex`.
- **Buds:** `budMetamer`, `budState`, `budQ`.
- **Other:** `shadow` (W×H, or null), `metrics`, `seasonMs`.

Every typed array is transferred, not copied.

**Tweening.** Each frame, the renderer rebuilds positions in a single forward loop. It interpolates length, angle and radius from the `prevIndex` row; new rows grow from zero; previous rows that nothing maps to are drawn as fading ghosts (shed branches). Segments are grouped by (colour, width bucket) and each group is stroked as one path.

## CLI output (`cli/run.ts`)

`runs/<id>/` contains:

| File | Contents |
|---|---|
| `run.json` | `meta` (preset, seasons, git commit, hash, ms), `params`, `events`, `seasons` |
| `metrics.csv` | One row per tree per season after the season ran. Columns: `season` + `METRIC_COLUMNS` (`metrics.ts`) |
| `metamers.csv` | Every metamer at each `--snapshots` season and at the final season. Columns: `season,tree,birthId,parentBirthId,order,axis,x0,y0,x1,y1,length,angle,radius,qSum,nSum,vIn,birthSeason` |
| `hash.txt` | State hash (same function as the golden tests) |

The analysis reads these with `analysis/treesim_io.py`.
