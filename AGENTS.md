# AGENTS.md

Instructions for any coding agent (Claude Code reads this through `CLAUDE.md`).

## What this is

An interactive 2D tree-growth simulator for a personal website. The trees self-organise in the style of Palubicki et al. (2009): buds compete for light in a shared grid, resources are allocated by the Borchert–Honda rule, shaded branches are shed, and girth follows the pipe model. The goal is beautiful behaviour that emerges from simple local principles. It is served as static files. The simulation core is Rust (ADR 0024): WASM on the page, and a native binary for batch experiments analysed in Python or R.

## Where the truth lives

| Need | Read |
|---|---|
| The design: principles C1–C6, R1–R6, O1–O4, the season loop, the build order | `docs/spec.md`. Cite sections as §N. It is long (≈25k tokens): read only the section you need |
| Where we are and what's next | `docs/STATUS.md` (loaded every session) |
| Milestones M0–M11, and a table tracing each principle to its code | `docs/ROADMAP.md` |
| Why things are the way they are | `docs/decisions/` (ADRs) |
| Data layout, season-loop mapping, worker protocol, file formats | `docs/architecture.md` |
| History of changes and surprises | `docs/devlog.md` (newest first) |
| Experiment write-ups | `docs/experiments/` |
| Literature reviews (evidence, gaps, calibration anchors) | `docs/research/` |

**Ask before diverging.** If a change would contradict `docs/spec.md` or an ADR, stop and ask the user. Once they agree, record the decision as a new ADR.

## Commands

```
npm run dev                # page with hot reload (add -- --host to test on a phone over the LAN)
npm run check              # builds the WASM, Rust fmt/clippy/tests, lint, typecheck, tests: run before saying anything is done
npm run build:wasm         # the Rust core → src/wasm/pkg/ (generated; check and test build it too)
npm run rust:check         # cargo fmt, clippy -D warnings and tests, with and without the threads feature
npm run test               # tests only
npm run format             # Biome auto-fix
npm run build              # static site in dist/ (the lab, and garden.html)
npm run build:garden       # garden.js + worker in dist-garden/ for a host page, size-gated (ADR 0014)
npm run bench              # per phase (native), per season and snapshot (WASM), hashes; --compare runs/bench/<sha>.json
npm run sim -- --preset explosion --seasons 12 --out runs/x   # native headless run → CSV
npm run golden:update      # regenerate golden hashes (intended behaviour changes only)
node cli/export-presets.ts # regenerate rust/presets.json after changing params, presets or species
uv run --project analysis python analysis/experiments/m0_growth.py runs/x
```

The toolchain is Node 24 (it runs `.ts` files directly), npm, uv, and for the Rust core (ADR 0024) Rust with the wasm32 target and wasm-bindgen-cli. Versions are in `.node-version`, `analysis/.python-version` and `rust-toolchain.toml` (rustup installs it on first use). wasm-bindgen-cli must match `rust/Cargo.lock`; `npm run build:wasm` says how to install it.

## Layout

```
src/core/            the core's data, in TypeScript: no DOM, no Node (its tsconfig enforces this)
  params.ts          Params type and defaults (names follow spec symbols)
  presets.ts         named param patches, shared by the page and the CLI (→ rust/presets.json)
  flora.ts flora-fitted.ts fixtures.ts   species, the fitted ones, retired presets as fixtures
  types.ts           what the page reads: slots, bud states, column schemas, Snapshot, TreeMetrics, RunRecord
src/worker/          Web Worker (Comlink) running the Rust core; api.ts is the shared interface
src/web/             page: garden.ts (mountGarden, the living view any page embeds), main.ts (the lab),
                     render/ (WebGL2, Canvas 2D, scene, input, scene.css tokens), ui/ (Tweakpane, charts, CSS)
src/wasm/            world.ts: RustWorld, the Rust core for the worker, Node tools and tests; pkg/ is generated
rust/core/           tree-core, the simulation:
  src/params.rs json.rs        typed Params read from the JSON params, with JavaScript's semantics
  src/rng.rs                   keyed-hash randomness and the Purpose registry (ADR 0002)
  src/tree.rs world.rs         SoA tables, slots, bud states; World: trees, light, events, replay
  src/season.rs                the §6 season loop, one function per phase
  src/light/                   light models (§C2.8): shadow triangle, the 2D sky sweep, the 3D slab sweep
  src/principles/              one file per principle: c1.rs, c3.rs, …, each with its unit tests
  src/checkpoint.rs snapshot.rs metrics.rs form.rs hash.rs
  src/math/                    the core's Math: the libm crate, the same natively and in WASM
  tests/                       the goldens, natively
rust/wasm/           tree-wasm: the thin wasm-bindgen wrapper (World, SlabSweep; Math exports with `testing`)
rust/cli/            treesim: the native headless runner → runs/<id>/{run.json,metrics.csv,metamers.csv,hash.txt}
cli/run.ts           builds treesim when stale and runs it (analysis/treesim/sweep.py calls this)
tests/               goldens in WASM, checkpoints, evidence/ (the milestone tests)
analysis/            uv project: polars + plotnine; experiments/ holds one script per milestone
```

## Invariants (keep these true)

- **The core is Rust** (`rust/core`, I1, ADR 0024). The page, the CLI and the tests all run it; there is no second implementation. `src/core` holds its params and presets as plain data and imports no DOM or Node APIs (`npm run typecheck` fails if it does). The TypeScript core is archived at the tag `golden-2d-ts`.
- **Parent-before-child.** In every tree, `parent[i] < i`. New metamers and buds are only appended. Removal uses `compact`, which keeps row order, and every stored index is remapped through the map it returns. As a result, `birthId` ascends in array order.
- **Topology is a parent plus a slot.** Each node has three slots: main = 0, left = 1, right = 2. A slot holds either a bud or a child metamer. There are no child pointers.
- **Stable ids.** `birthId` (metamers and buds) keys RNG draws and tweening. Never key anything on an array index.
- **Randomness** comes only from `rng.rs`: `hash(seed, purpose, tree, entity, season, k)`. Register new purposes in `purpose` and never renumber them. The core has no other source of randomness (the page may use `Math.random`, e.g. for "Reseed").
- **Season order follows spec §6.** All trees read one start-of-season light field. Loops over a table run only over the rows that existed when their phase began; this is the "staging".
- **Principles sit behind params.** Each has an `enabled` flag, or a `mode` that names its §8 ablation. Param names follow spec symbols (`lambda`, `alpha`, `qMax`, …). Params are plain JSON.
- **No SharedArrayBuffer.** Snapshots move to the page as transferable buffers. (GitHub Pages can't send the COOP/COEP headers that SharedArrayBuffer needs.)
- **One build, its goldens natively and in WASM** (ADR 0024). `tests/golden.json` is the Rust core's. The TypeScript core's 2D goldens are a proof, not a mode: archived at the tag `golden-2d-ts` with the parity build that reproduced them, and run there by CI's `golden-2d` job. Nothing at HEAD reproduces them, and nothing should try.
- **The Rust core never calls a platform `Math`.** It uses `rust/core/src/math`: the `libm` crate's functions, identical natively and in WASM. A function the core starts to use goes into `math/`, never taken from `std` (only the exact ones, `sqrt`, `floor`, `ceil` and `abs`, are).
- **Goldens change only on purpose.** If `tests/golden.json` must change, run `npm run golden:update` and give the reason in `docs/devlog.md`.
- **Checkpoints keep their bytes.** `checkpoint.rs` writes and reads the layout the TypeScript core did; shipped forests are those bytes. Change the layout only with a version and a reader for the old one.

## Conventions

- Each principle file starts with a header naming the principle, its spec section, its rule in one paragraph, and the params it reads.
- Comments explain _why_, citing spec sections or papers. Code reads like the existing files: in Rust, plain loops over column `Vec`s, free functions per rule, and no structs beyond the tables, `Tree`, `World` and the params.
- Formatting: `cargo fmt` and clippy with `-D warnings` for Rust; Biome for TypeScript (2 spaces, double quotes, width 100). TypeScript is strict with `erasableSyntaxOnly`: no enums, namespaces or constructor parameter properties. Use `as const` objects instead.
- Tests: one unit test per local rule (a `#[cfg(test)]` module in the principle's file; `crate::testing::preset` gives a preset's params), plus each milestone's "visible test" from §7 as an automated check where possible (`tests/evidence/`).
- **Seeds in evidence tests:** a claim about all of N seeds needs N ≥ 20 and a stated pass rate ("≥ 15 of seeds 1–20"), with the counts each build reached written beside it. Five fixed seeds test the seeds, not the behaviour: any change of realisation breaks them ([note](docs/experiments/2026-10-30-production-thresholds.md)).
- Scene colours are CSS tokens in `src/web/render/scene.css` (light and dark, in a layer a host page can override); the lab's own are in `src/web/ui/layout.css`. The canvas reads them via `src/web/render/theme.ts`. Don't hard-code colours in TypeScript.
- Generated output (`runs/`, `dist/`, `analysis/out/`) is never committed. Small figures that support an experiment note go in `docs/experiments/figures/`.

## Session protocol

1. **Start.** `docs/STATUS.md` is already in context. Read the ROADMAP row for the current milestone and the spec § for the principle in hand.
2. **Work** in small steps, running `npm run check` often. Use `.claude/skills/implement-principle/SKILL.md` as the checklist for any new principle.
3. **End.** Follow `.claude/skills/wrap-up/SKILL.md`:
   - rewrite STATUS;
   - prepend a devlog entry;
   - tick the ROADMAP;
   - write an ADR if a decision was made;
   - commit.

**A milestone is done when:**
- `npm run check` passes;
- its automated checks exist;
- its visible test has been looked at in the browser;
- the docs are updated;
- the commit is pushed (CI and Pages go green).
