# Status

_Last updated: 2026-10-27_

**Current milestone: M14** (garden embed and a first home page). M0–M13 are done. M12 was the [review](reviews/2026-10-27-m12-review.md); it triaged the work after the build order into M13–M21 (ROADMAP), in three tracks: A performance, B realism, C the edbarker.dev home page. M12 and M13 are in PR epabarker/tree-simulation#6 (branch `claude/m13-bench`). Repo: https://github.com/epabarker/tree-simulation.

## Works
- **Core:** C1–C6, R1–R6, O2 and O4 (ADRs 0005–0013); the sky sweep with open or periodic sides; the §6 season loop; golden hashes.
- **Presets:** `skyStand`, `skyGrove`, `skyTree`, `forest`, `thinning`, `weeping`, `troll`; species `conifer`, `birch` and `tropical`, still without R1, R3, R4 and R5.
- **Page:** WebGL2 renderer with pseudo-depth, Tweakpane lab, charts, tap to fell, phone layout.
- **Headless:** `npm run sim`, `npm run bench` (phase timings and hashes; [M13 note](experiments/2026-10-27-m13-perf.md): rings 3.8 ms a season), and `analysis/experiments/` m0–m11.
- **Results:** stand H/D 72; limbs droop 22°; neighbours sprout from their boles after a felling; self-thinning slope ≈ −3; the forest keeps a 7–8-tree canopy.

## Next (ROADMAP "After the build order")
1. Merge PR #6 once CI is green (on the user's request).
2. **M14:** `mountGarden` split out of `src/web/main.ts`, plus the garden build and release (ADR 0014). Then a full-bleed home page in `epabarker/edbarker-dev` (not cloned yet; clone it to `~/Documents/Projects/edbarker-dev`).
3. **M15:** renderer and phone performance, then M16 motion and M17 seasons.
4. **M18–M21:** light rework, then species per tree, the succession forest, and launch.

## Open questions (ask when the milestone comes up)
- **ADR 0015:** the design of species per tree (M19).
- Amendments to ADR 0011 for ground contact and to §O2 for wind storms (M16).
- An amendment to ADR 0005 for the row-marched sweep (M18).
- Art direction of the launch page (M21).

## Parked (user, 2026-10-27; raise again only when asked)
- **The Pages demo URL is unreachable.** The custom domain `barker.garden` is NXDOMAIN. Hosting the lab at `edbarker.dev/lab` (M14) works around it.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud?

## Known issues
- R5 reads self-shade; breakage never fires; sagging limbs can sink below the ground; crowns that cross a ring's seam are drawn beyond the edge.
- Bimodality in self-thinning is marginal. K = 7 puts the crown base ≈ 7 cells low.

## Notes for the next session
- **Golden-safe means bit-identical.** `hashWorld` hashes every Float64 column, so reordering float operations changes goldens. `npm run bench -- --compare runs/bench/<sha>.json` checks six 100-season hashes as well. Bench files live in the gitignored `runs/`, so re-run the baseline from its commit if it is missing.
- **The home page wants lean snapshots:** `setSnapshotOptions({ junctions: false, field: false })`.
- `world.trees` grows during O4 runs (dead trees stay). New metamer columns go in `LATE_COLUMNS`.
- **Cloud sessions:** `. /opt/nvm/nvm.sh && nvm install 24`, then `npm ci`. Visual checks: `npx vite preview`, then Playwright or Firefox.
