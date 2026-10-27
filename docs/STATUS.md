# Status

_Last updated: 2026-10-27_

**Current phase: D2** (design exploration, before M16). D1 shipped as garden-v0.3.0. The D2 foundation (obstacles, ADR 0015; planting; the garden's page hooks) is on branch `claude/d2-obstacles` (not pushed). Two site prototypes are on preview: https://d2-clearings-edbarker-dev.edbarker.workers.dev and https://d2-field-guide-edbarker-dev.edbarker.workers.dev (garden 0.4.0, a local build). M0–M14 are done: M14 was merged in PR #7 and released as [garden-v0.1.0](https://github.com/epabarker/tree-simulation/releases/tag/garden-v0.1.0). **edbarker.dev is live** with the garden behind the home page, a CV page and the lab at `/lab/` (epabarker/edbarker-dev `main`, 2026-10-27; content from the user's website brief, with `TODO(Ed)` comments for unconfirmed items). Tracks from the [M12 review](reviews/2026-10-27-m12-review.md): A performance, B realism, C the home page (ROADMAP M13–M21).

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
1. **The user** picks a direction (or a blend) from the two previews; write it up as a design brief.
2. **D3:** release garden-v0.4.0 (PR for `claude/d2-obstacles`), build the chosen direction across the site, merge to edbarker-dev `main`.
3. **M16** motion, **M17** seasons, then **M18–M20**.
4. **The user:** the site's `TODO(Ed)` items in `src/data/cv.ts`.

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
