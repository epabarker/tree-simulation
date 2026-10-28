# Status

_Last updated: 2026-10-28 (M26 done; M27 round 1 fitted, round 2 waiting on the user's run)_

**M26 is done** on `claude/gallant-brown-5k4g33`. **M27 round 1** is fitted and held out ([note](experiments/2026-10-28-m27-fits.md); `fits/round1/`). After it, survival light (four species) and late growth (H100/H60) entered the fit (ADR 0020 addendum), and two model changes landed, both off by default: the hyperbolic hydraulic discount (`r1.hydraulic`, ADR 0021) and the juvenile phase (`r2.hJ`, ADR 0022). The home forest is unchanged. **Waiting on the user** to run round 2.

## Works
- **Core:** C1–C6, R1–R6, O2 and O4 (ADRs 0005–0013); the sky sweep with open or periodic sides; golden hashes. `World.discardDead` for long page runs.
- **Species** (`src/core/flora.ts`): M19's birch, oak, beech and fir; M25's hornbeam, field maple, holly, rowan, goat willow and Scots pine (lab) ([note](experiments/2026-10-28-m25-species.md)).
- **Measuring form** (`src/core/form.ts`, CLI `form.csv`): crown profile, apical control, angles by order, droop, Δ, l–d and leaf–section slopes ([M26 note](experiments/2026-10-28-m26-validation.md)).
- **Woodland presets:** `mixedWood`, the home forest (`forestParams`; pioneers fade, beech and hornbeam rise); `oakOpen` (Plate II; `specimen: "oak"`); one wood per species; `succession` (M19).
- **Other presets:** `skyStand`, `skyGrove`, `skyTree`, `forest`, `thinning`. The M7/M9 forms are test fixtures (`fixtures.ts`, ADR 0019).
- **Garden** (`src/web/garden.ts`, ADR 0014):
  - `mountGarden(host, options)`, shared by the lab and the home page; `npm run build:garden` (56.1 kB gzip, gate 60);
  - a release workflow on `garden-v*` tags; grown forests for first paint (seeds 9, 10, 12); a leaf style per species;
  - the loupe: hold on the forest for a 4× glass with true-scale leaves (`loupe` option, default on).
- **Lab:** WebGL2 with pseudo-depth, Tweakpane, charts, tap to fell, phone layout, shareable links (`?preset&seed&p`). **Headless:** `npm run sim` (`--species-patch`), `npm run bench`, `analysis/experiments/` m0–m26.

## Next
1. **The user:** review M26 (the loupe on a phone); say whether to open the PR and release garden-v0.13.0 (tag push is the user's).
2. **Handoff (the user), round 2:** plugged in, with Node 24 on PATH: `uv run --project analysis python analysis/experiments/m27_fit.py --species all --skip-done --start round1 --restarts 2,0 --generations 50 --seeds 3` (warm from round 1's fits; ≈ 6–10 min a species, estimated).
3. **Then (session):** `m27_holdout.py`, round 2 in the M27 note, and the user's decision on adoption (M27b).
4. **Ideas:** rooting in windthrow; the leaf–section slope against live pipe area (r_live); measured holly and rowan growth curves, and quantum-sensor light under fir and the small trees (their targets are estimates).

## Open questions (ask when the milestone comes up)
- None open.

## Known issues
- The l–d slope is ≈ 1, not 2/3 (M26). With the default exponential discount height stalls early in every species (the hand-tuned ones); the hyperbolic form fixes the tail, but juvenile growth is still too fast for oak, pine and fir ([note](experiments/2026-10-28-m27-height-curves.md)). Measured floors (Hagemeier & Leuschner) are darker than hand-tuned beech's and hornbeam's. Breakage fires only under storms. R5 reads self-shade by default (the woodland uses the neighbour signal). In the lab, a ring crown's copies show beyond the world's ends on wide screens (as in the garden). Bimodality is marginal; K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Node:** this container's default is 22; `npm test` now refuses it. Install 24 (`npm i node@24` in the scratchpad, then put its `bin` first on PATH). Playwright runs under the system Node (`NODE_PATH=$(npm root -g)`).
- **Species patches:** a `species` entry in a params patch replaces that species' whole patch. Amend one with `patchSpecies` (CLI `--species-patch`), or dotted paths (`trials.ts` `amendSpecies`).
- **Fitting:** `--smoke` on either M27 script checks the pipeline in seconds and writes only under `runs/`.
- **Site deploys** (Cloudflare Workers Builds): a push to `main` goes to production; any other branch gets `<branch>-edbarker-dev.edbarker.workers.dev`. For a new garden: tag `garden-vX.Y.Z` here, then run `node scripts/sync-garden.mjs X.Y.Z` there. **Tag pushes are refused (403) from cloud sessions:** ask the user to push the tag.
- **Golden-safe means bit-identical.** Check with goldens and `npm run bench -- --compare runs/bench/<sha>.json` (baseline `efb3bbd` after the `firWood` swap).
- **Headless checks:** Playwright Chromium with SwiftShader WebGL works; adaptive quality drops to "lite" there. Long-press a touch with CDP `Input.dispatchTouchEvent`.
