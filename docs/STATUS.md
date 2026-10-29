# Status

_Last updated: 2026-10-30 (3D port: I1 accepted and merged; parity removed, production the only build; then I2)_

**M26 and M27 are done** on `claude/gallant-brown-5k4g33`. The woodland grows the species fitted to literature traits (ADR 0020–0023; [note](experiments/2026-10-28-m27-fits.md)), with the hyperbolic hydraulic discount (ADR 0021) and a juvenile phase (ADR 0022) set per species. The hand-tuned species are kept as `HAND_FLORA`.

**3D port** (branch `claude/quirky-archimedes-x14c8k`, PRs into `claude/gallant-brown-5k4g33`; PR #20, through I1, is merged). ADR 0024. G2, G3 and **I1** passed and were accepted ([I1 note](experiments/2026-10-29-i1-rust-core.md); laptop and Pixel 8a: 27 of 27 goldens in Rust, 7 in TypeScript). **Parity is now a proof, not a mode** ([note](experiments/2026-10-30-production-thresholds.md)): one build (libm, SIMD) for the page, CLI, bench, tests and opening forests; the TypeScript core and the parity build are at the tag `golden-2d-ts` (pushed), run by CI's `golden-2d` job. **Next: I2.**

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2 and O4 (ADRs 0005–0013); the 2D sky sweep; the 3D slab sweep (not wired in); checkpoints byte-compatible with the TypeScript core's. `src/core` keeps params, presets, species, fixtures and `types.ts`; `rust/presets.json` is generated from them (`node cli/export-presets.ts`).
- **One build:** libm, SIMD; `tests/golden.json` natively and in WASM. Evidence tests re-derived on it; M5 restated as ≥ 15 of seeds 1–20 (counts on record in the note).
- **Species** (`src/core/flora.ts`, `flora-fitted.ts`): birch, oak, beech, hornbeam, field maple, holly, rowan, goat willow; fir and Scots pine (lab).
- **Measuring form** (`rust/core/src/form.rs`, CLI `form.csv`) ([M26 note](experiments/2026-10-28-m26-validation.md)).
- **Woodland presets:** `mixedWood` (`forestParams`), `oakOpen`, one wood per species, `succession`. Others: `skyStand`, `skyGrove`, `skyTree`, `forest`, `thinning`; M7/M9 forms are fixtures (ADR 0019).
- **Garden** (`src/web/garden.ts`, ADR 0014): `mountGarden`; JS 49.1 kB gzip (gate 60), WASM 141.4 kB after first paint (gate 170); grown forests for first paint (seeds 9, 10, 12; the same forests as 0.14.0 to 10⁻¹² cells); the loupe.
- **Lab:** WebGL2 with pseudo-depth, Tweakpane, charts, tap to fell, phone layout, shareable links. **Headless:** `npm run sim` (native; `--species-patch`), `npm run bench` (per phase native, per season and snapshot in WASM), `analysis/experiments/` m0–m26.

## Next
1. **3D: I2** (the user's brief, 2026-10-29): 3D topology (divergence angles, R2 whorls), direction frames, C4 as a vector sum, R3 vector moments with E physical, R4's bank per vacated 3D slot, the slab light at D 64, K 16 rotating, τ a world parameter; z and frames in snapshots and checkpoints; first 3D goldens. Deliverables: a D 64 planting in three looks drawn orthographically on the preview beside today's garden (V); m and per-metamer cost against the prototype; phone season time, one lane and four; contradictions of the prototype. Then V, I3, calibration (rotation on). Never merge the site's `preview-3d` branch.
2. **The user:** g3.html's numbers, if wanted (the SIMD path is dropped; it is in 77d4105).
3. **Garden:** a release from the Rust core (`garden-v0.15.0`), once the user has seen the lab on a phone. Then the site's sync.
4. **Possible:** a thinner understorey than the hand-tuned wood's by season 400; measured light under fir, holly and the small trees. **Refits:** `m27_fit.py … --skip-done`; `m27_adopt.py`, then `node cli/export-presets.ts`.

## Open questions (ask when the milestone comes up)
- **3D:** first-paint policy (Q7), at I3. Merging PR #20: the user's call.

## Known issues
- **The browser speed-up is modest:** 0.8× the TypeScript core's time a season on the laptop, level on the phone (I1 was for determinism). Evidence tests other than M5 still assert all of 3–6 seeds (listed in the 2026-10-30 note): restate any that fails, never widen it.
- The l–d slope is ≈ 1, not 2/3 (M26); juvenile growth is too fast for oak, pine and fir ([note](experiments/2026-10-28-m27-height-curves.md)); measured floors are darker than hand-tuned beech's and hornbeam's. Breakage fires only under storms. In the lab, ring crowns show beyond the world's ends on wide screens. K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Node:** this container's default is 22; install 24 (`npm i node@24` in the scratchpad, `bin` first on PATH). Playwright runs under the system Node (`NODE_PATH=$(npm root -g)`). **Rust:** `cargo install wasm-bindgen-cli --version 0.2.129 --locked` (≈ 3 min).
- **Code that used the TypeScript core** (`docs/experiments/code/` before I1, the i1 and G3 preview pages) runs at the tag `golden-2d-ts` (there, `--parity` reproduces its runs).
- **Species patches:** a `species` entry in a params patch replaces that species' whole patch; amend with `--species-patch` or `trials.ts` `amendSpecies` (now `cli/trials.ts`).
- **Site deploys:** a push to `main` goes to production; other branches get `<branch>-edbarker-dev.edbarker.workers.dev`. For a new garden: tag `garden-vX.Y.Z` (the user pushes it), then `node scripts/sync-garden.mjs X.Y.Z` there.
- **Golden-safe means bit-identical:** goldens and `npm run bench -- --compare runs/bench/<sha>.json`.
