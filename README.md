# Self-organizing trees

An interactive simulator in which tree form emerges from simple local rules. Buds compete for light in a shared grid, resources flow to the best-lit branches (Borchert–Honda), shaded branches are shed, and stems thicken by the pipe model. Several trees share one light field, so they compete, lean away from each other and suppress the small. It follows Palubicki et al. (2009). Since I2 the trees grow in three dimensions, in a slab 64 cells deep, and are drawn as a flat, frontal illustration ([ADR 0024](docs/decisions/0024-3d-slab-port.md), [ADR 0025](docs/decisions/0025-3d-growth.md)); the planar model it grew from is archived at the tag `golden-2d-ts`. The garden on edbarker.dev runs this 3D model (garden 0.15.0 onwards), with its species fitted to measured trees; where it stands and what's next is in [`docs/STATUS.md`](docs/STATUS.md).

**Live demo:** <https://epabarker.github.io/tree-simulation/> (the lab), and `garden.html` there for the view a home page embeds. The garden is the home page of edbarker.dev ([ADR 0014](docs/decisions/0014-home-page-delivery.md)).

The design is specified principle by principle in [`docs/spec.md`](docs/spec.md). Progress against its build order is in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Branches and releases

- **`3d-port`** is where development happens; work branches open pull requests into it.
- **`main`** follows `3d-port` by merge. A push to `main` deploys the lab to GitHub Pages.
- **`garden-v*` tags** on `3d-port` are the garden's releases: the release workflow builds `garden-<version>.tgz`, and the site (edbarker.dev) syncs it.
- **`golden-2d-ts`** archives the planar TypeScript model and the Rust build that reproduced it bit for bit; CI's `golden-2d` job still checks it.

## Run it

You need Node 24 and npm. The analysis also needs [uv](https://docs.astral.sh/uv/). `npm run check` also builds the Rust core ([ADR 0024](docs/decisions/0024-3d-slab-port.md)). For that you need [rustup](https://rustup.rs/), which installs the version in `rust-toolchain.toml`, and wasm-bindgen-cli at the version `rust/Cargo.lock` pins (`npm run build:wasm` prints the install command).

```bash
npm install
npm run dev        # http://localhost:5173 (add -- --host to open it on a phone over the LAN)
npm run check      # lint, typecheck, tests
npm run build      # static site in dist/ (the lab and garden.html)
npm run build:garden   # garden.js and its worker in dist-garden/, for a host page (size-gated)
```

### Headless runs and analysis

The browser and batch runs share one simulation core, in Rust: WebAssembly on the page, a native binary for batch runs.

```bash
npm run sim -- --preset explosion --seed 3 --seasons 12 --out runs/demo
uv run --project analysis python analysis/experiments/m0_growth.py
```

Each run writes `run.json`, `metrics.csv`, `metamers.csv` and `hash.txt` (see [`docs/architecture.md`](docs/architecture.md)). The page's **Export run** button saves a JSON file that `npm run sim -- --replay <file>` replays exactly. **Runs no longer depend on the JavaScript engine** (I1): the core computes its own `Math` rather than the engine's, so the lab's seeds, shared links and the garden's `?forest=<seed>` regrow the same forest in every browser and in the CLI (checked in Node, Chromium on a laptop and a Pixel 8a, and natively) ([I1 note](docs/experiments/2026-10-29-i1-rust-core.md), [ADR 0002](docs/decisions/0002-keyed-hash-rng.md)). The TypeScript core it replaced reproduced runs only within one JavaScript engine; it is archived at the tag `golden-2d-ts`, with the build of the Rust core that reproduced it bit for bit.

## How it's built

- **Language and threading:** the simulation core is Rust (`rust/`), compiled to WebAssembly for the page and natively for batch runs. It was ported from TypeScript phase by phase, bit-identical at every step ([ADR 0024](docs/decisions/0024-3d-slab-port.md)). The page is TypeScript. The simulation runs in a Web Worker, so the page never stutters.
- **Data layout:** each tree is a set of flat arrays (structure-of-arrays) kept in parent-before-child order, each metamer with a 3D frame (heading and reference) carried along its axis by parallel transport. Every pass over the tree is a plain loop.
- **Randomness:** each random number is a hash of what it is for (ADR 0002), so switching one principle off for an ablation leaves every other draw unchanged.
- **Rendering:** WebGL2, with Canvas 2D as the fallback; the slab is drawn far to near in 64 depth slices ([`docs/architecture.md`](docs/architecture.md), ADR 0001).
- **Libraries:** [Tweakpane](https://tweakpane.github.io/docs/) controls, [Observable Plot](https://observablehq.com/plot/) charts, Vite and Vitest.

## Working on it

Start with [`AGENTS.md`](AGENTS.md): commands, invariants, conventions and the session protocol. It is written for human and AI contributors alike.

## Credits

- W. Pałubicki, K. Horel, S. Longay, A. Runions, B. Lane, R. Měch, P. Prusinkiewicz (2009). _Self-organizing tree models for image synthesis._ ACM TOG 28(3): 58.
- C. Guerra (2026). [Growing trees](https://brashandplucky.com/2026/10/15/growing-trees.html).
- The full reference list is in [`docs/spec.md`](docs/spec.md).

## License

MIT. See [LICENSE](LICENSE).
