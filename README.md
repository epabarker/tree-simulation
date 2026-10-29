# Self-organizing trees in a 2D world

An interactive simulator in which tree form emerges from simple local rules. Buds compete for light in a shared 2D grid, resources flow to the best-lit branches (Borchert–Honda), shaded branches are shed, and stems thicken by the pipe model. Several trees share one light field, so they compete, lean away from each other and suppress the small. It follows Palubicki et al. (2009), translated to a genuinely planar world.

**Live demo:** <https://epabarker.github.io/tree-simulation/> (the lab), and `garden.html` there for the view a home page embeds. The garden is the home page of edbarker.dev ([ADR 0014](docs/decisions/0014-home-page-delivery.md)).

The design is specified principle by principle in [`docs/spec.md`](docs/spec.md). Progress against its build order is in [`docs/ROADMAP.md`](docs/ROADMAP.md).

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

The browser and batch runs share the same TypeScript simulation core.

```bash
npm run sim -- --preset explosion --seed 3 --seasons 12 --out runs/demo
uv run --project analysis python analysis/experiments/m0_growth.py
```

Each run writes `run.json`, `metrics.csv`, `metamers.csv` and `hash.txt` (see [`docs/architecture.md`](docs/architecture.md)). The page's **Export run** button saves a JSON file that `npm run sim -- --replay <file>` replays. The replay is exact on the same JavaScript engine, but not between Node and a browser: their `Math` functions differ in the last bit ([G2 note](docs/experiments/2026-10-29-g2-rust-sweep.md)). The Rust core removes that once it carries the whole simulation.

## How it's built

- **Language and threading:** TypeScript, with the core moving to Rust compiled to WebAssembly in bit-identical steps ([ADR 0024](docs/decisions/0024-3d-slab-port.md); `rust/`). So far the sky sweep is ported. The simulation runs in a Web Worker, so the page never stutters.
- **Data layout:** each tree is a set of flat typed arrays (structure-of-arrays) kept in parent-before-child order. Every pass over the tree is a plain loop.
- **Randomness:** each random number is a hash of what it is for (ADR 0002), so switching one principle off for an ablation leaves every other draw unchanged.
- **Rendering:** Canvas 2D for the prototype; WebGL2 is planned (ADR 0001).
- **Libraries:** [Tweakpane](https://tweakpane.github.io/docs/) controls, [Observable Plot](https://observablehq.com/plot/) charts, Vite and Vitest.

## Working on it

Start with [`AGENTS.md`](AGENTS.md): commands, invariants, conventions and the session protocol. It is written for human and AI contributors alike.

## Credits

- W. Pałubicki, K. Horel, S. Longay, A. Runions, B. Lane, R. Měch, P. Prusinkiewicz (2009). _Self-organizing tree models for image synthesis._ ACM TOG 28(3): 58.
- C. Guerra (2026). [Growing trees](https://brashandplucky.com/2026/10/15/growing-trees.html).
- The full reference list is in [`docs/spec.md`](docs/spec.md).

## License

MIT. See [LICENSE](LICENSE).
