# Status

_Last updated: 2026-10-29 (3D port: I1 passed, the whole 2D core in Rust, the TypeScript core deleted; PR #20 open, not to merge)_

**M26 and M27 are done** on `claude/gallant-brown-5k4g33`. The woodland grows the species fitted to literature traits (ADR 0020–0023; [note](experiments/2026-10-28-m27-fits.md)), with the hyperbolic hydraulic discount (ADR 0021) and a juvenile phase (ADR 0022) set per species. The hand-tuned species are kept as `HAND_FLORA`.

**3D port** (branch `claude/quirky-archimedes-x14c8k`; [PR #20](https://github.com/epabarker/tree-simulation/pull/20) into `claude/gallant-brown-5k4g33`, still open: the user merges). ADR 0024. G2 and G3 passed (whole-cell shifts, K 16 rotating; calibration runs with rotation on). **I1 passed** ([note](experiments/2026-10-29-i1-rust-core.md)): the simulation is `rust/core`, WASM on the page (production build) and native in the CLI (`rust/cli`). The parity build (V8's Math) reproduces every TypeScript golden, in Chromium too (27 of 27, against 7). The production build has its own goldens. The TypeScript core is archived at the tag **`golden-2d-ts`, made locally: the user pushes it** (cloud sessions get a 403 on tag pushes).

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2 and O4 (ADRs 0005–0013); the 2D sky sweep; the 3D slab sweep (not wired in); checkpoints byte-compatible with the TypeScript core's. `src/core` keeps params, presets, species, fixtures and `types.ts`; `rust/presets.json` is generated from them (`node cli/export-presets.ts`).
- **Two builds:** production (libm, SIMD; page, CLI, bench; `tests/golden-production.json`) and parity (`--parity`; `tests/golden.json`, `tests/fixtures/ts-core.json`, the evidence tests, the opening forests).
- **Species** (`src/core/flora.ts`, `flora-fitted.ts`): birch, oak, beech, hornbeam, field maple, holly, rowan, goat willow; fir and Scots pine (lab).
- **Measuring form** (`rust/core/src/form.rs`, CLI `form.csv`) ([M26 note](experiments/2026-10-28-m26-validation.md)).
- **Woodland presets:** `mixedWood` (`forestParams`), `oakOpen`, one wood per species, `succession`. Others: `skyStand`, `skyGrove`, `skyTree`, `forest`, `thinning`; M7/M9 forms are fixtures (ADR 0019).
- **Garden** (`src/web/garden.ts`, ADR 0014): `mountGarden`; JS 49.1 kB gzip (gate 60), WASM 141.4 kB after first paint (gate 170); grown forests for first paint (seeds 9, 10, 12; the same bytes as 0.14.0); the loupe.
- **Lab:** WebGL2 with pseudo-depth, Tweakpane, charts, tap to fell, phone layout, shareable links. **Headless:** `npm run sim` (native; `--species-patch`, `--parity`), `npm run bench` (per phase native, per season and snapshot in WASM), `analysis/experiments/` m0–m26.

## Next
1. **The user:** push the tag (`git push origin golden-2d-ts`); run `https://preview-3d-edbarker-dev.edbarker.workers.dev/preview/i1/i1.html` on laptop and phone (goldens per core, ms a season); g3.html's numbers (the SIMD path is dropped; it is in 77d4105 if the phone disagrees); decide on PR #20.
2. **3D:** I2 (a stand grown in 3D at D 64), V, I3, calibration (rotation on). Never merge the site's `preview-3d` branch.
3. **Garden:** a release from the Rust core (`garden-v0.15.0`), once the user has seen the lab on a phone. Then the site's sync.
4. **Possible:** a thinner understorey than the hand-tuned wood's by season 400; measured light under fir, holly and the small trees. **Refits:** `m27_fit.py … --skip-done`; `m27_adopt.py`, then `node cli/export-presets.ts`.

## Open questions (ask when the milestone comes up)
- **3D:** first-paint policy (Q7), at I3. Merging PR #20: the user's call.

## Known issues
- **Phones unchecked:** cross-engine determinism holds in Node, headless Chromium and natively; ARM phones are still to be checked (the i1 page runs the goldens).
- **The browser speed-up is modest:** production 0.74–0.77 of the TypeScript core's time a season (Chromium, VM); parity is 1.07–1.18× slower.
- The l–d slope is ≈ 1, not 2/3 (M26); juvenile growth is too fast for oak, pine and fir ([note](experiments/2026-10-28-m27-height-curves.md)); measured floors are darker than hand-tuned beech's and hornbeam's. Breakage fires only under storms. In the lab, ring crowns show beyond the world's ends on wide screens. K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Node:** this container's default is 22; install 24 (`npm i node@24` in the scratchpad, `bin` first on PATH). Playwright runs under the system Node (`NODE_PATH=$(npm root -g)`). **Rust:** `cargo install wasm-bindgen-cli --version 0.2.129 --locked` (≈ 3 min).
- **Code that used the TypeScript core** (`docs/experiments/code/` before I1, the i1 and G3 preview pages) runs at the tag `golden-2d-ts`.
- **Species patches:** a `species` entry in a params patch replaces that species' whole patch; amend with `--species-patch` or `trials.ts` `amendSpecies` (now `cli/trials.ts`).
- **Site deploys:** a push to `main` goes to production; other branches get `<branch>-edbarker-dev.edbarker.workers.dev`. For a new garden: tag `garden-vX.Y.Z` (the user pushes it), then `node scripts/sync-garden.mjs X.Y.Z` there.
- **Golden-safe means bit-identical:** goldens, both builds, and `npm run bench -- --compare runs/bench/<sha>.json` (hashes per build).
