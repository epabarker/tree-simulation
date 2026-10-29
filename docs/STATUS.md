# Status

_Last updated: 2026-10-29 (3D port: re-costed at the open slab; G1 ready for the phone)_

**M26 and M27 are done** on `claude/gallant-brown-5k4g33`. The woodland grows the species fitted to literature traits (two CMA-ES rounds, then hand adjustments: ADR 0020–0023; [note](experiments/2026-10-28-m27-fits.md)), with the hyperbolic hydraulic discount (ADR 0021) and a juvenile phase (ADR 0022) set per species. The hand-tuned species are kept as `HAND_FLORA`.

**3D port** (branch `claude/quirky-archimedes-x14c8k`, which merges this one; nothing in `src/` changed): [measurement](experiments/2026-10-29-3d-light-cost.md), [review](reviews/2026-10-29-3d-port-review.md), ADR 0024 *proposed*: trees grow in 3D, drawn as today (orthographic); open z; D at I2 ([cost](experiments/2026-10-29-open-slab-cost.md)). The site's `preview-3d` branch (COOP/COEP): G1 at `preview-3d-edbarker-dev.edbarker.workers.dev/preview/3d/kernel.html`; G0.5 is only the hosting record.

## Works
- **Core:** C1–C6, R1–R6, O2 and O4 (ADRs 0005–0013); the sky sweep with open or periodic sides; golden hashes. `World.discardDead` for long page runs.
- **Species** (`src/core/flora.ts`, `flora-fitted.ts`): birch, oak, beech, hornbeam, field maple, holly, rowan, goat willow; fir and Scots pine (lab). Fitted in M27 ([note](experiments/2026-10-28-m27-fits.md)); the hand-tuned M19/M25 versions are `HAND_FLORA`.
- **Measuring form** (`src/core/form.ts`, CLI `form.csv`): crown profile, apical control, angles by order, droop, Δ, l–d and leaf–section slopes ([M26 note](experiments/2026-10-28-m26-validation.md)).
- **Woodland presets:** `mixedWood`, the home forest (`forestParams`; pioneers fade, beech and hornbeam rise); `oakOpen` (Plate II; `specimen: "oak"`); one wood per species; `succession` (M19).
- **Other presets:** `skyStand`, `skyGrove`, `skyTree`, `forest`, `thinning`. The M7/M9 forms are test fixtures (`fixtures.ts`, ADR 0019).
- **Garden** (`src/web/garden.ts`, ADR 0014):
  - `mountGarden(host, options)`, shared by the lab and the home page; `npm run build:garden` (56.1 kB gzip, gate 60);
  - a release workflow on `garden-v*` tags; grown forests for first paint (seeds 9, 10, 12); a leaf style per species;
  - the loupe: hold on the forest for a 4× glass with true-scale leaves (`loupe` option, default on).
- **Lab:** WebGL2 with pseudo-depth, Tweakpane, charts, tap to fell, phone layout, shareable links (`?preset&seed&p`). **Headless:** `npm run sim` (`--species-patch`), `npm run bench`, `analysis/experiments/` m0–m26.

## Next
1. **3D, the user:** run G1 on the phone (stop if 4-lane SIMD at D 32 > 150 ms); then ADR 0024; then G2, G3, I1, I2, V (the visual check), calibration. Never merge the site's `preview-3d` branch.
2. **The user:** try garden 0.14.0 on edbarker.dev, and the loupe on a phone; say whether to open the lab's PR to `main` (GitHub Pages).
3. **Possible:** a thinner understorey than the hand-tuned wood's by season 400 (holly, rowan, willow 0.3–0.7 a run): revisit if it reads wrong. Measured light under fir, holly and the small trees would replace estimated floors.
4. **Refits:** move `fits/*.json` to a round folder, then `m27_fit.py --species all --skip-done --start <round> --restarts 2,0 --generations 50 --seeds 3` (≈ 8 min a species); `m27_adopt.py` regenerates `flora-fitted.ts`. **Ideas:** rooting in windthrow; the leaf–section slope against live pipe area (r_live).

## Open questions (ask when the milestone comes up)
- **3D:** G1's result; ADR 0024; a two-session throwaway 3D prototype before G2 (review §5)? At I2: D and the face softening (Qz). Later: first-paint policy (Q7).

## Known issues
- The l–d slope is ≈ 1, not 2/3 (M26). With the default exponential discount height stalls early in every species (the hand-tuned ones); the hyperbolic form fixes the tail, but juvenile growth is still too fast for oak, pine and fir ([note](experiments/2026-10-28-m27-height-curves.md)). Measured floors (Hagemeier & Leuschner) are darker than hand-tuned beech's and hornbeam's. Breakage fires only under storms. R5 reads self-shade by default (the woodland uses the neighbour signal). In the lab, a ring crown's copies show beyond the world's ends on wide screens (as in the garden). Bimodality is marginal; K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Node:** this container's default is 22; `npm test` now refuses it. Install 24 (`npm i node@24` in the scratchpad, then put its `bin` first on PATH). Playwright runs under the system Node (`NODE_PATH=$(npm root -g)`).
- **Species patches:** a `species` entry in a params patch replaces that species' whole patch. Amend one with `patchSpecies` (CLI `--species-patch`), or dotted paths (`trials.ts` `amendSpecies`).
- **Fitting:** `--smoke` on either M27 script checks the pipeline in seconds and writes only under `runs/`.
- **Site deploys** (Cloudflare Workers Builds): a push to `main` goes to production; any other branch gets `<branch>-edbarker-dev.edbarker.workers.dev`. For a new garden: tag `garden-vX.Y.Z` here, then run `node scripts/sync-garden.mjs X.Y.Z` there. **Tag pushes are refused (403) from cloud sessions:** ask the user to push the tag.
- **Golden-safe means bit-identical.** Check with goldens and `npm run bench -- --compare runs/bench/<sha>.json` (baseline `efb3bbd` after the `firWood` swap).
- **3D preview:** build with `npx vite build -c docs/experiments/code/2026-10-29-g05-preview/vite.config.ts` after `bake.ts` (outputs in `runs/`), and copy to the site's `public/preview/3d/`. This container cannot reach edbarker.dev or workers.dev.
- **Headless checks:** Playwright Chromium with SwiftShader WebGL works; adaptive quality drops to "lite" there. Long-press a touch with CDP `Input.dispatchTouchEvent`.
