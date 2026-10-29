# Status

_Last updated: 2026-10-30 (3D port: I2 built, the trees grow in 3D; V and the phone's timings are the user's)_

**3D port** (branch `claude/quirky-archimedes-x14c8k`, PRs into `claude/gallant-brown-5k4g33`). ADR 0024 (accepted), **ADR 0025 (I2's design, proposed)**. G2, G3, I1 accepted; parity is a proof at the tag `golden-2d-ts` (CI's `golden-2d` job). **I2** ([note](experiments/2026-10-30-i2-3d-growth.md)):
- the trees grow in a slab, D = 64, K 16 rotating, τ per face (default interior 0.2), with every principle in 3D: frames, phyllotaxis, vector C4 and R3 (E = 4·10⁶), the bank in 3D, O4 on the ground;
- 3D goldens (14 cases); the 2D-calibrated milestone tests are `tests/evidence-2d/`, calibration's backlog (47 of 90 pass in 3D);
- m 25–83 with every principle (two to four times the prototype's; under its rules the core reproduces it); 1.5–2.2× per metamer;
- `forest` at season 40 on the VM's browser: 191–235 ms in one lane, 130–185 with the light in four lanes.

## Works
- **Core** (`rust/core`, one build): C1–C6, R1–R6, O2, O4 in 3D; the slab sweep in fixed lanes (the same bits on 1 or 4 threads); checkpoints v2 (v1 loads as a planar forest); `geom.rs` for frames.
- **Species** (`flora.ts` over `flora-fitted.ts`): the ten, with their botanical phyllotaxis and wood's E (an I2 overlay). Uncalibrated in 3D.
- **Presets** as before, now 3D; `shadow` (C3 `none` under light) no longer regulates.
- **Garden** (`mountGarden`, ADR 0014): the 3D core; no opening forests until I3 (Q7), so it grows from seed; pseudo-depth off, branches far to near. The live site stays on 0.14.0 (2D).
- **Lab:** the World folder sets τ (the three looks); C1's phyllotaxis. **Headless:** `npm run sim`, `npm run bench`, `npm run evidence:2d`.

## Next
1. **The user:**
   - **V:** `https://preview-3d-edbarker-dev.edbarker.workers.dev/preview/i2/i2.html`, the 3D forest beside today's garden, best on the phone with "the planting alone";
   - **timing:** the page's "Run" on phone and laptop (paste the JSON);
   - accept or amend ADR 0025.
2. **If V says go:** I3 (the 3D renderer: depth-ordered leaves and wood, GPU tween, threads behind COOP/COEP, checkpoints and first paint, Q7), then calibration C1–C8 under rotation, starting from the backlog in `tests/evidence-2d/` and the I2 note's findings:
   - O4 fills plates with seedlings;
   - trees reach the world's top;
   - open looks pile foliage at their faces;
   - slenderness is 12–20.
3. **Possible:** WASM threads for the browser's lanes (needs nightly's build-std for atomics); the native `threads` path clones the sweep per lane (correct, not faster).

## Open questions (ask when the milestone comes up)
- V's verdict. First-paint policy for 3D (Q7), at I3. The interior's exact τ, at C1.

## Known issues
- The 3D model is uncalibrated (the I2 note's contradictions; `tests/evidence-2d/`). Some backlog tests share stands across tests or build too many 3D worlds for WASM's 4 GB.
- A 3D world holds ≈ 70 MB (light field and owner grid); dispose worlds in tools and tests.
- The renderer draws leaves after all wood (I3 orders them).

## Notes for the next session
- **Node:** this container's default is 22; install 24 (`npm i node@24` in the scratchpad, `bin` first on PATH). Playwright runs under the system Node (`NODE_PATH=$(npm root -g)`). **Rust:** `cargo install wasm-bindgen-cli --version 0.2.129 --locked`. Tests compile optimised (`[profile.test]`); a 3D golden run is 12 s natively.
- **Code that used the 2D core** runs at the tag `golden-2d-ts` (`--parity` there reproduces the TypeScript core). The tag's 2D CLI with `code/2026-10-30-i2/2d-bench-series.patch` gives 2D series for comparison.
- **Site deploys:** a push to `main` goes to production; other branches get `<branch>-edbarker-dev.edbarker.workers.dev`; never merge `preview-3d` (now ≈ 360 MB of stands). Tag pushes are refused from cloud sessions: the user pushes tags.
- **Golden-safe means bit-identical:** goldens and `npm run bench -- --compare runs/bench/<sha>.json`.
