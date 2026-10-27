# Status

_Last updated: 2026-10-27_

**Current milestone: M9** (R3 mechanics). M0–M8 are done; M8 is on branch `claude/busy-euler-qvbifp` (a new PR after epabarker/tree-simulation#1 merged). Repo: https://github.com/epabarker/tree-simulation.

## Works
- Core: C1–C6, R1 (carbon balance, ADR 0010), R2 (physiological age, ADR 0009), R6 and two light models — the Beer–Lambert sky sweep (default, ADR 0005; optional `c2.rotate`) and the shadow triangle (pinned in the M1–M5 presets); multi-tree stands; the §6 season loop; golden hashes.
- Species presets (M7): `conifer`/`coniferStand` (fir-like, Massart), `birch`/`birchStand` (pioneer), `tropical` (Terminalia-like, Aubréville); 160-cell worlds.
- Page: per-species leaf styles (needle, small, large; View → leaf style); WebGL2 renderer (Canvas 2D fallback, `?renderer=canvas`), natural view with pseudo-depth (ADR 0008; View → depth off = x-ray), autoplay, eased camera, tap to fell a tree, themed Tweakpane, charts, phone layout. Opens on `skyStand` (`skyGrove` on phones).
- Headless and analysis: `npm run sim` (`--light` writes the light field); `analysis/experiments/` (m0, m2, m4, m6, m6d, m6e, m7, m8).
- Calibrated (sky presets): k_ext 0.5, K 7, p 1 (`overcast` p 1.5); T 0.03, T_rel 0.12; Q_ss 0.1, a_ss 2; r0 0.02; R1 m_w 1, m_f 0.06, L_h 60 with α 3. Stand levels off ≈ 78 cells; floor light 3.5–6%; interior H/D ≈ 56 (M6 pre-R1: 67). Species presets are pre-R1.

## Next
1. Open and merge the M8 PR once CI is green.
2. **M9**: R3 mechanics (sag, posture control, stress-driven girth): drooping limbs with upturned tips, willow, Troll straightening.
3. R1 for the species presets (m_f as shade tolerance, L_h per species); then M10–M11, then **M12: independent review by a fresh agent** (user), triaged with the user before any post-build-order direction.
4. Look at the depth view and measure the WebGL2 renderer on a real phone (Stats → fps, draw ms).
5. Before M11: world sides that act like a continuing forest. After the main milestones: revisit oak, willow, beech (ADR 0009).

## Parked (user, 2026-10-27; raise again only when asked)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud (`rclone purge pcloud:Projects/tree-simulation/runs`, `…/dist`)?

## Known issues
- R1's plateau freezes the stand (nothing changes once every bud's share is below one metamer); turnover comes with R4 (M10) and recruitment with O4 (M11). No self-thinning yet in the even ten-tree stand.
- Shadow-triangle presets (M1–M5) still show the seedling trap rarely and no crown lift; the sky sweep does not.
- With R6 on, short shoots weaken gap filling a little; the deep inner crown stays bare.
- On autoplay the species presets (pre-R1) still reach their 160-cell top by season ≈ 50.
- Open world sides light every stand from its edges: floor light 20% under edge trees, 8% one tree in; closing the sides slows the whole stand (M6e).
- K = 7 puts the stand crown base ≈ 7 cells lower than K = 31; use K = 11 if a milestone depends on crown base.

## Notes for the next session
- The world is a closed box for growth (Q = 0 outside); the sky sweep still lets light in from beyond the sides.
- Rendering logic shared by both renderers lives in `src/web/render/scene.ts`; WebGL2 instance data must stay camera-independent (see architecture.md).
- Cloud sessions: the image has Node 22; install Node 24 with `. /opt/nvm/nvm.sh && nvm install 24` and put `/opt/nvm/versions/node/v24.*/bin` first on PATH, then `npm ci`. Visual checks there: `npx vite preview`, then Playwright's Chromium (`require('playwright')`); Tweakpane checkboxes are hidden inputs, so click them via `el.click()`.
- Local visual checks: drive the system Firefox with puppeteer-core from a scratch folder (see auto-memory).
