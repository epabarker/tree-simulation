# Status

_Last updated: 2026-10-27_

**Current milestone: M14** (garden embed and a first home page). The code is done on branch `claude/m14-garden` (not pushed), and the site's on `garden-home` in `~/Documents/Projects/edbarker-dev` (not pushed). M0–M13 are merged (PR #6). Tracks after the build order, from the [M12 review](reviews/2026-10-27-m12-review.md): A performance, B realism, C the edbarker.dev home page (ROADMAP M13–M21). Repo: https://github.com/epabarker/tree-simulation.

## Works
- **Core:** C1–C6, R1–R6, O2 and O4 (ADRs 0005–0013); the sky sweep with open or periodic sides; golden hashes. `World.discardDead` for long page runs.
- **Presets:** `skyStand`, `skyGrove`, `skyTree`, `forest`, `thinning`, `weeping`, `troll`; species `conifer`, `birch` and `tropical`, still without R1, R3, R4 and R5.
- **Garden** (`src/web/garden.ts`, ADR 0014):
  - `mountGarden(host, options)`, the living view the lab and the home page share;
  - `npm run build:garden` (42.7 kB gzip, gate 60 kB);
  - a release workflow on `garden-v*` tags;
  - `garden.html` demo.
- **Lab:** WebGL2 with pseudo-depth, Tweakpane, charts, tap to fell, phone layout. **Headless:** `npm run sim`, `npm run bench` (rings 3.8 ms a season), `analysis/experiments/` m0–m11.

## Next
1. **M14 close-out, each on the user's go-ahead:**
   - Push `claude/m14-garden` and open a PR. Merge once CI is green.
   - Tag `garden-v0.1.0` on main, which publishes a Release.
   - In edbarker-dev: `node scripts/sync-garden.mjs 0.1.0`; the diff should be empty, since the vendored copy is a local build of the same code.
   - Push `garden-home` (it may deploy to Cloudflare).
   - Look at the home page on a real phone.
2. **M15:** renderer and phone performance: persistent GPU buffers, worker pipelining, adaptive quality, `?bench` page mode.
3. **M16** motion, **M17** seasons, then **M18–M21**.

## Open questions (ask when the milestone comes up)
- How the site deploys: Cloudflare Workers Builds on push, or `wrangler deploy` by hand?
- ADR 0015, species per tree (M19). Amendments to ADR 0011 and §O2 (M16), and to ADR 0005 (M18). Art direction (M21).

## Parked (user, 2026-10-27; raise again only when asked)
- The Pages demo URL is unreachable (`barker.garden` NXDOMAIN; `edbarker.dev/lab` works around it). Delete the early `runs/` and `dist/` copies on pCloud?

## Known issues
- R5 reads self-shade; breakage never fires; sagging limbs can sink below the ground; in the lab, ring crowns cross the seam beyond the edge (the garden wraps them). Bimodality is marginal; K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Golden-safe means bit-identical.** Check with goldens and `npm run bench -- --compare runs/bench/<sha>.json`.
- **Site loader:** it must stay `is:inline`, because bundling breaks the run-time `import()`. In `.astro` text, break lines inside tags, never next to them (HTML compression eats the space).
- **Headless checks:** puppeteer-core with system Firefox. Reduced motion needs `extraPrefsFirefox: {"ui.prefersReducedMotion": 1}`, since CDP emulation is unsupported. `garden.html` exposes `window.garden`.
