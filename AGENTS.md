# AGENTS.md

Instructions for any coding agent (Claude Code reads this through `CLAUDE.md`).

## What this is

An interactive 2D tree-growth simulator for a personal website. The trees self-organise in the style of Palubicki et al. (2009): buds compete for light in a shared grid, resources are allocated by the Borchert–Honda rule, shaded branches are shed, and girth follows the pipe model. The goal is beautiful behaviour that emerges from simple local principles. It is served as static files, and the same simulation core runs headless for batch experiments analysed in Python or R.

## Where the truth lives

| Need | Read |
|---|---|
| The design: principles C1–C6, R1–R5, O1–O4, the season loop, the build order | `docs/spec.md`. Cite sections as §N. It is long (≈25k tokens): read only the section you need |
| Where we are and what's next | `docs/STATUS.md` (loaded every session) |
| Milestones M0–M11, and a table tracing each principle to its code | `docs/ROADMAP.md` |
| Why things are the way they are | `docs/decisions/` (ADRs) |
| Data layout, season-loop mapping, worker protocol, file formats | `docs/architecture.md` |
| History of changes and surprises | `docs/devlog.md` (newest first) |
| Experiment write-ups | `docs/experiments/` |

**Ask before diverging.** If a change would contradict `docs/spec.md` or an ADR, stop and ask the user. Once they agree, record the decision as a new ADR.

## Commands

```
npm run dev                # page with hot reload (add -- --host to test on a phone over the LAN)
npm run check              # lint + typecheck + tests: run before saying anything is done
npm run test               # tests only
npm run format             # Biome auto-fix
npm run build              # static site in dist/
npm run sim -- --preset explosion --seasons 12 --out runs/x   # headless run → CSV
npm run golden:update      # regenerate golden hashes (intended behaviour changes only)
uv run --project analysis python analysis/experiments/m0_growth.py runs/x
```

The toolchain is Node 24 (it runs `.ts` files directly), npm and uv; versions are in `.node-version` and `analysis/.python-version`.

## Layout

```
src/core/            simulation: pure TypeScript, no DOM, no Node (its tsconfig enforces this)
  params.ts          Params type and defaults (names follow spec symbols)
  presets.ts         named param patches, shared by the page and the CLI
  rng.ts             keyed-hash randomness and the Purpose registry (ADR 0002)
  soa.ts             structure-of-arrays tables
  tree.ts            metamer and bud tables, slots, bud states
  world.ts           World: trees, light model, events, replay
  season.ts          the §6 season loop, phase by phase
  light/             LightModel boundary (§C2.8) and its implementations
  principles/        one file per principle: c1-buds.ts, c3-allocation.ts, …
  metrics.ts snapshot.ts hash.ts
src/worker/          Web Worker (Comlink) running the core; api.ts is the shared interface
src/web/             page: main.ts, render/ (Canvas 2D, input), ui/ (Tweakpane panel, charts, CSS)
cli/run.ts           headless runner → runs/<id>/{run.json,metrics.csv,metamers.csv,hash.txt}
tests/               golden-hash tests; unit tests sit next to code as src/core/**/*.test.ts
analysis/            uv project: polars + plotnine; experiments/ holds one script per milestone
```

## Invariants (keep these true)

- **The core is pure.** `src/core` imports no DOM or Node APIs; `npm run typecheck` fails if it does.
- **Parent-before-child.** In every tree, `parent[i] < i`. New metamers and buds are only appended. Removal uses `Table.compact`, which keeps row order, and every stored index is remapped through the map it returns. As a result, `birthId` ascends in array order.
- **Topology is a parent plus a slot.** Each node has three slots: main = 0, left = 1, right = 2. A slot holds either a bud or a child metamer. There are no child pointers.
- **Stable ids.** `birthId` (metamers and buds) keys RNG draws and tweening. Never key anything on an array index.
- **Randomness** comes only from `rng.ts`: `hash(seed, purpose, tree, entity, season, k)`. Register new purposes in `Purpose` and never renumber them. There is no `Math.random` in `src/core` (the page may use it, e.g. for "Reseed").
- **Season order follows spec §6.** All trees read one start-of-season light field. Loops over a table run only over the rows that existed when their phase began; this is the "staging".
- **Principles sit behind params.** Each has an `enabled` flag, or a `mode` that names its §8 ablation. Param names follow spec symbols (`lambda`, `alpha`, `qMax`, …). Params are plain JSON.
- **No SharedArrayBuffer.** Snapshots move to the page as transferable buffers. (GitHub Pages can't send the COOP/COEP headers that SharedArrayBuffer needs.)
- **Goldens change only on purpose.** If `tests/golden.json` must change, run `npm run golden:update` and give the reason in `docs/devlog.md`.
- **Column arrays may be reallocated** by `Table.add()`. Don't hoist `tree.m.cols.x` above a loop that adds rows.

## Conventions

- Each principle file starts with a header naming the principle, its spec section, its rule in one paragraph, and the params it reads.
- Comments explain _why_, citing spec sections or papers. Code reads like the existing files: plain loops over typed arrays, with no classes beyond `Table`, `Tree` and `World`.
- Formatting comes from Biome: 2 spaces, double quotes, width 100. TypeScript is strict with `erasableSyntaxOnly`: no enums, namespaces or constructor parameter properties. Use `as const` objects instead.
- Tests: one unit test per local rule, plus each milestone's "visible test" from §7 as an automated check where possible.
- Page colours are CSS tokens in `src/web/ui/layout.css` (light and dark); the canvas reads them via `src/web/render/theme.ts`. Don't hard-code colours in TypeScript.
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
