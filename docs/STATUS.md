# Status

_Last updated: 2026-10-27_

**Current milestone: M12** (independent review by a fresh agent), to confirm with the user. M0–M11 are done; M11 is on branch `claude/compassionate-heisenberg-u78et8` (M10 merged in epabarker/tree-simulation#4). Repo: https://github.com/epabarker/tree-simulation.

## Works
- Core:
  - C1–C6; R1 carbon (ADR 0010), R2 physiological age (ADR 0009), R3 mechanics (ADR 0011), R4–R5 release with a bud bank, and shade avoidance (ADR 0012), R6;
  - O4 stand dynamics and O2 abrasion (ADR 0013);
  - the Beer–Lambert sky sweep (default, ADR 0005) with open or periodic sides, and the shadow triangle (M1–M5 presets);
  - the §6 season loop; golden hashes.
- Presets:
  - species `conifer`, `birch`, `tropical` and their stands (pre-R1 to pre-R5);
  - R3 demos `weeping` and `troll`;
  - M11 `forest` (a ring with recruitment) and `thinning` (60 seedlings).
- Page: leaf styles, WebGL2 renderer (Canvas 2D fallback), pseudo-depth view, autoplay, tap to fell, Tweakpane (R1–R6, O2, O4 folders, stress colour), charts, phone layout. Opens on `skyStand` (`skyGrove` on phones).
- Headless and analysis: `npm run sim`; metrics include `woodVolume`, `rootX`, `seeds`, `epicormic`; `analysis/experiments/` (m0–m11).
- Results:
  - the stand levels off at ≈ 83 cells; stand H/D 72;
  - limbs droop 22°; a felled tree's neighbours sprout from their boles;
  - a dense ring stand self-thins at slope ≈ −3 to 15–17 trees per 210 cells;
  - the forest keeps a 7–8-tree canopy over a turning understory.

## Next
1. Open and merge the M11 PR once CI is green (on the user's request).
2. **M12: independent review by a fresh agent** (user): spec and ADR conformance, core correctness, test strength, experiment validity, page, docs; a report in `docs/reviews/`, triaged with the user before any post-build-order direction.
3. Species presets onto R1–R5 (m_f as shade tolerance, L_h per species); then oak, willow and beech as species (ADR 0009).
4. Measure the WebGL2 renderer and the depth view on a real phone; the ring presets cost ≈ 25–40 ms a season.

## Parked (user, 2026-10-27; raise again only when asked)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud (`rclone purge pcloud:Projects/tree-simulation/runs`, `…/dist`)?

## Known issues
- Self-thinning's bimodal phase is marginal (Sarle 0.54–0.86 at its peak); O2 barely matters, because light already keeps crowns apart.
- R5 reads self-shade too (no far-red field), so open-grown trees grow taller; `skyTree` reaches its 100-cell top by season ≈ 100. Breakage never fires.
- Sagging limbs can sink below the ground. On a ring, crowns that cross the seam are drawn beyond the world's edge.
- Open-sided presets still light stands from their edges (use `sides: "periodic"`). K = 7 puts crown base ≈ 7 cells lower than K = 31.

## Notes for the next session
- `world.trees` grows during O4 runs: recruits are appended, and dead trees stay with `alive = false`. metrics.csv `season` counts completed seasons, starting at 1.
- New metamer columns are hashed only when non-zero (`hash.ts` `LATE_COLUMNS`), so opt-in principles keep old goldens.
- Cloud sessions: `. /opt/nvm/nvm.sh && nvm install 24`, put `/opt/nvm/versions/node/v24.*/bin` first on PATH, `npm ci`. Visual checks: `npx vite preview`, then Playwright's Chromium; pick presets by setting the Tweakpane `<select>` and dispatching `change`.
