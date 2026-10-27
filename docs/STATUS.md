# Status

_Last updated: 2026-10-27_

**Current milestone: M16** (motion: wind sway, falling branches, toppling trees). M15 is merged (PR #8), released as garden-v0.2.0 and live on edbarker.dev; on the user's phone a 10k-metamer stand runs at 60 fps (frame p95 16.8 ms). M0–M14 are done: M14 was merged in PR #7 and released as [garden-v0.1.0](https://github.com/epabarker/tree-simulation/releases/tag/garden-v0.1.0). **edbarker.dev is live** with the garden behind the home page, a CV page and the lab at `/lab/` (epabarker/edbarker-dev `main`, 2026-10-27; content from the user's website brief, with `TODO(Ed)` comments for unconfirmed items). Tracks from the [M12 review](reviews/2026-10-27-m12-review.md): A performance, B realism, C the home page (ROADMAP M13–M21).

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
1. **The user:** look at edbarker.dev on a real phone (the intro fills much of a phone screen; M21 art direction), and settle the site's `TODO(Ed)` items in `src/data/cv.ts`.
2. **M16** motion: wind sway, falling branches, toppling trees (which also cover the season of latency pipelining adds to a tap). Then **M17** seasons and **M18–M21**.

## Open questions (ask when the milestone comes up)
- ADR 0015, species per tree (M19). Amendments to ADR 0011 and §O2 (M16), and to ADR 0005 (M18). Art direction (M21).

## Parked (user, 2026-10-27; raise again only when asked)
- The Pages demo URL is unreachable (`barker.garden` NXDOMAIN; `edbarker.dev/lab` works around it). Delete the early `runs/` and `dist/` copies on pCloud?

## Known issues
- R5 reads self-shade; breakage never fires; sagging limbs can sink below the ground; in the lab, ring crowns cross the seam beyond the edge (the garden wraps them). Bimodality is marginal; K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Site deploys:** Cloudflare Workers Builds. A push to `main` goes to production; another branch gets a preview URL, `<branch>-edbarker-dev.edbarker.workers.dev`. A new garden means tag `garden-vX.Y.Z` here, then `node scripts/sync-garden.mjs X.Y.Z` there.
- **Golden-safe means bit-identical.** Check with goldens and `npm run bench -- --compare runs/bench/<sha>.json`.
- **Site loader:** it must stay `is:inline`, because bundling breaks the run-time `import()`. In `.astro` text, break lines inside tags, never next to them (HTML compression eats the space).
- **Headless checks:** puppeteer-core with system Firefox. Reduced motion needs `extraPrefsFirefox: {"ui.prefersReducedMotion": 1}`, since CDP emulation is unsupported. `garden.html` and the lab expose `window.garden`. Firefox rounds `performance.now()` to 1 ms; time per-frame work with `node src/web/render/scene.bench.ts`.
