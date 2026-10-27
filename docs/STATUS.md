# Status

_Last updated: 2026-10-27_

**Current milestone: M10** (R4 dormancy and release, R5 shade avoidance). M0–M9 are done; M9 is on branch `claude/compassionate-heisenberg-u78et8` (M8 merged in epabarker/tree-simulation#2). Repo: https://github.com/epabarker/tree-simulation.

## Works
- Core: C1–C6, R1 (carbon, ADR 0010), R2 (physiological age, ADR 0009), R3 (mechanics, ADR 0011), R6, and two light models: the Beer–Lambert sky sweep (default, ADR 0005; optional `c2.rotate`) and the shadow triangle (pinned in M1–M5 presets). Multi-tree stands, the §6 season loop, golden hashes.
- Presets: the species `conifer`/`coniferStand`, `birch`/`birchStand` and `tropical` (M7; pre-R1 and pre-R3), and the R3 demonstrations `weeping` (willow-like) and `troll` (beech-like).
- Page: leaf styles per species; WebGL2 renderer (Canvas 2D fallback, `?renderer=canvas`); pseudo-depth natural view (ADR 0008); autoplay, eased camera, tap to fell, Tweakpane (R3 folder, stress colour), charts, phone layout. Opens on `skyStand` (`skyGrove` on phones).
- Headless and analysis: `npm run sim` (`--light` writes the light field; metamers.csv has `stressWood`); `analysis/experiments/` (m0–m9).
- Calibrated for the sky presets:
  - light: k_ext 0.5, K 7, p 1; shedding: T 0.03, T_rel 0.12; short shoots: Q_ss 0.1, a_ss 2; r0 0.02;
  - R1: m_w 1, m_f 0.06, L_h 60, α 3;
  - R3: E 10⁶, φ 1, β_g 0.1, γ 0.2, c 0.05, σ_target 3000.
  - The stand levels off at ≈ 78 cells; open limbs droop 22° with tips up 15°; stand H/D 65.

## Next
1. Open and merge the M9 PR once CI is green (only on the user's request).
2. **M10**: R4 dormancy, release and reiteration (epicormic flush after a neighbour is felled), with R3 breakage feeding release; R5 shade avoidance (elongation, fewer bud breaks, upright A_set).
3. R1 and R3 for the species presets (m_f as shade tolerance, L_h per species height); then M11, then **M12: an independent review by a fresh agent** (user), triaged with the user before any post-build-order direction.
4. Look at the depth view and measure the WebGL2 renderer on a real phone (Stats → fps, draw ms).
5. Before M11: world sides that act like a continuing forest. After the main milestones: calibrate oak, willow and beech as species (ADR 0009).

## Parked (user, 2026-10-27; raise again only when asked)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud (`rclone purge pcloud:Projects/tree-simulation/runs`, `…/dist`)?

## Known issues
- R1's plateau freezes the stand (turnover comes with R4 at M10, recruitment with O4 at M11). No self-thinning in the even ten-tree stand yet.
- R3: sagging limbs can sink below the ground (no contact; their buds get no light and are shed). Slender trees with low E buckle. Δ falls below 2 where a parent gets stress wood and its laterals don't.
- Shadow-triangle presets (M1–M5) still show the seedling trap rarely and no crown lift.
- On autoplay the species presets still reach their 160-cell top by season ≈ 50.
- Open world sides light every stand from its edges (M6e). K = 7 puts crown base ≈ 7 cells lower than K = 31.

## Notes for the next session
- New metamer columns (`stressWood`, `moment`) are hashed only when non-zero (`hash.ts` `LATE_COLUMNS`); a future opt-in column can do the same to keep old goldens.
- Rendering logic shared by both renderers lives in `src/web/render/scene.ts`; WebGL2 instance data must stay camera-independent.
- Cloud sessions: `. /opt/nvm/nvm.sh && nvm install 24`, put `/opt/nvm/versions/node/v24.*/bin` first on PATH, `npm ci`. Visual checks: `npx vite preview`, then Playwright's Chromium; pick presets by setting the Tweakpane `<select>` and dispatching `change`.
