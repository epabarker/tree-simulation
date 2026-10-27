# Status

_Last updated: 2026-10-27_

**Current milestone: M17** (seasons), built on `claude/m17-seasons` (with the M16 close-out; not pushed) and previewed with the site at https://m17-seasons-edbarker-dev.edbarker.workers.dev (garden 0.6.0, a local build). edbarker.dev runs garden-v0.5.0 (wind, storms, falling wood).

## Works
- **Core:** C1–C6, R1–R6, O2 and O4 (ADRs 0005–0013); the sky sweep with open or periodic sides; golden hashes. `World.discardDead` for long page runs.
- **Presets:** `skyStand`, `skyGrove`, `skyTree`, `forest`, `thinning`, `weeping`, `troll`; species `conifer`, `birch` and `tropical`, still without R1, R3, R4 and R5.
- **Garden** (`src/web/garden.ts`, ADR 0014):
  - `mountGarden(host, options)`, the living view the lab and the home page share;
  - `npm run build:garden` (43.8 kB gzip, gate 60 kB);
  - M15: Scene work once per snapshot (a frame is 0.07 ms for the forest), pipelined seasons, adaptive quality, `?bench` (lab and `garden.html`);
  - a release workflow on `garden-v*` tags;
  - `garden.html` demo.
- **Lab:** WebGL2 with pseudo-depth, Tweakpane, charts, tap to fell, phone layout. **Headless:** `npm run sim`, `npm run bench` (rings 3.8 ms a season), `analysis/experiments/` m0–m11.

## Next
1. **Ship M17, on the user's go-ahead:** PR, release garden-v0.6.0, sync edbarker-dev, merge `m17-seasons`.
2. **M18:** the row-marched light sweep (changes goldens) and bigger, viewport-shaped worlds. Then **M19–M20**: species per tree (ADR 0016), calibrated species, the succession forest, an open-grown specimen for Plate II.
3. **The user:** the site's `TODO(Ed)` items.

## Open questions (ask when the milestone comes up)
- The design direction (D2). ADR 0016, species per tree (M19). Amendments to ADR 0011 and §O2 (M16), and to ADR 0005 (M18). Art direction (M21).

## Parked (user, 2026-10-27; raise again only when asked)
- The Pages demo URL is unreachable (`barker.garden` NXDOMAIN; `edbarker.dev/lab` works around it). Delete the early `runs/` and `dist/` copies on pCloud?

## Known issues
- R5 reads self-shade; breakage never fires; sagging limbs can sink below the ground; in the lab, ring crowns cross the seam beyond the edge (the garden wraps them). Bimodality is marginal; K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Site deploys:** Cloudflare Workers Builds. A push to `main` goes to production; another branch gets a preview URL, `<branch>-edbarker-dev.edbarker.workers.dev`. A new garden means tag `garden-vX.Y.Z` here, then `node scripts/sync-garden.mjs X.Y.Z` there.
- **Golden-safe means bit-identical.** Check with goldens and `npm run bench -- --compare runs/bench/<sha>.json`.
- **Site loader:** it must stay `is:inline`, because bundling breaks the run-time `import()`. In `.astro` text, break lines inside tags, never next to them (HTML compression eats the space).
- **Headless checks:** puppeteer-core with system Firefox. Reduced motion needs `extraPrefsFirefox: {"ui.prefersReducedMotion": 1}`, since CDP emulation is unsupported. `garden.html` and the lab expose `window.garden`. Firefox rounds `performance.now()` to 1 ms; time per-frame work with `node src/web/render/scene.bench.ts`.
