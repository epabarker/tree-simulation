# Status

_Last updated: 2026-10-28 (M25)_

**M25 is live** as garden-v0.11.0 (PR #18; site PR #5): six new species and the mixed wood. Next: the M25 follow-ups, then the user's next milestone.

## Works
- **Core:** C1–C6, R1–R6, O2 and O4 (ADRs 0005–0013); the sky sweep with open or periodic sides; golden hashes. `World.discardDead` for long page runs.
- **Species** (`src/core/flora.ts`): M19's birch, oak, beech and fir; M25's hornbeam, field maple, holly, rowan, goat willow and Scots pine (lab) ([note](experiments/2026-10-28-m25-species.md)).
- **Woodland presets:** `mixedWood`, the home forest (`forestParams`; pioneers fade, beech and hornbeam rise); `oakOpen` (Plate II; `specimen: "oak"`); one wood per species; `succession` (M19).
- **Other presets:** `skyStand`, `skyGrove`, `skyTree`, `forest`, `thinning`, `weeping`, `troll`; species `conifer`, `birch` and `tropical`, still without R1, R3, R4 and R5.
- **Garden** (`src/web/garden.ts`, ADR 0014):
  - `mountGarden(host, options)`, shared by the lab and the home page; `npm run build:garden` (55.3 kB gzip, gate 60);
  - a release workflow on `garden-v*` tags; grown forests for first paint (seeds 9, 10, 12); a leaf style per species.
- **Lab:** WebGL2 with pseudo-depth, Tweakpane, charts, tap to fell, phone layout. **Headless:** `npm run sim`, `npm run bench`, and `analysis/experiments/` m0–m25.

## Next
1. **M25 follow-ups:**
   - check the new species' shade-tolerance scores against Niinemets & Valladares's appendix (esapubs.org is blocked here);
   - lighten field maple's shade;
   - willow's return after large disturbances.
2. **The user:** an hour's soak on a phone (heat, memory); the site's `TODO(Ed)` items.
3. **Ideas:** a magnifying loupe over the plate (true-scale leaves); rooting in windthrow.

## Open questions (ask when the milestone comes up)
- None open.

## Known issues
- R5 reads self-shade; breakage never fires; sagging limbs can sink below the ground; in the lab, ring crowns cross the seam beyond the edge (the garden wraps them). Bimodality is marginal; K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Node:** this container's default is 22, and the goldens fail under it. Install 24 (`npm i node@24` in the scratchpad, then put its `bin` first on PATH).
- **Site deploys** (Cloudflare Workers Builds): a push to `main` goes to production; any other branch gets `<branch>-edbarker-dev.edbarker.workers.dev`. For a new garden: tag `garden-vX.Y.Z` here, then run `node scripts/sync-garden.mjs X.Y.Z` there. A new species needs ink tokens in the site's `global.css`. **Tag pushes are refused (403) from cloud sessions:** ask the user to push the tag.
- **Golden-safe means bit-identical.** Check with goldens and `npm run bench -- --compare runs/bench/<sha>.json`.
- **Site loader:** keep it `is:inline`. In `.astro` text, break lines inside tags.
- **Headless checks:** Playwright Chromium with SwiftShader WebGL works. To see a grown forest, bake checkpoints into `first/` and open `garden.html?first=SEED` under reduced motion. `garden.step()` while paused does not advance in a script.
