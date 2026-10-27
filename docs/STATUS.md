# Status

_Last updated: 2026-10-27_

**Current milestone: choose M7 or M8 with the user.** M0–M6e are done; repo public at https://github.com/epabarker/tree-simulation. M6c–M6e came from the [2026-10-27 literature review](research/2026-10-27-literature-review.md) (ADRs 0006–0008).

## Works
- Core: C1–C6, R6 and two light models — the Beer–Lambert sky sweep (default, ADR 0005; optional `c2.rotate`) and the shadow triangle (pinned in the M1–M5 presets); multi-tree stands; the §6 season loop; golden hashes.
- Page: WebGL2 renderer (Canvas 2D fallback, `?renderer=canvas`), natural view with pseudo-depth (ADR 0008; View → depth off = x-ray), autoplay, eased camera, tap to fell a tree, themed Tweakpane, charts, phone layout. Opens on `skyStand` (`skyGrove` on phones).
- Headless and analysis: `npm run sim` (`--light` writes the light field); `analysis/experiments/` (m0, m2, m4, m6, m6d, m6e).
- Calibrated (sky presets): k_ext 0.5, K 7, p 1 (`overcast` preset p 1.5); T 0.03, T_rel 0.12; Q_ss 0.1, a_ss 2; r0 0.02. Floor light under a closed stand 3.5–6% (target 2–10%); interior H/D ≈ 67.

## Next
1. Agree with the user: M7 (R2 physiological age → §9 species presets; k_ext as a species knob fitted on crown leaf area and depth, not floor light) or M8 (R1 carbon balance, two plateau causes; also stops autoplayed stands hitting the world's top).
2. Look at the depth view and measure the WebGL2 renderer on a real phone (Stats → fps, draw ms).
3. Before M11: world sides that act like a continuing forest (periodic, or canopy beyond the sides).

## Parked (user, 2026-10-27; raise again only when asked)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud (`rclone purge pcloud:Projects/tree-simulation/runs`, `…/dist`)?

## Known issues
- Suppressed decurrent stand trees can lose their crown to C5 in one season (spec-conformant; mortality comes with R1).
- Shadow-triangle presets (M1–M5) still show the seedling trap rarely and no crown lift; the sky sweep does not.
- With R6 on, short shoots weaken gap filling a little; the deep inner crown stays bare.
- On autoplay, `skyStand` trees reach the world's top (110 cells) by season ≈ 55 and the canopy flattens against it.
- Open world sides light every stand from its edges: floor light 20% under edge trees, 8% one tree in; closing the sides slows the whole stand (M6e).
- K = 7 puts the stand crown base ≈ 7 cells lower than K = 31; use K = 11 if a milestone depends on crown base.

## Notes for the next session
- The world is a closed box for growth (Q = 0 outside); the sky sweep still lets light in from beyond the sides.
- Rendering logic shared by both renderers lives in `src/web/render/scene.ts`; WebGL2 instance data must stay camera-independent (see architecture.md).
- Cloud sessions: the image has Node 22; install Node 24 with `. /opt/nvm/nvm.sh && nvm install 24` and put `/opt/nvm/versions/node/v24.*/bin` first on PATH, then `npm ci`. Visual checks there: `npx vite preview`, then Playwright's Chromium (`require('playwright')`); Tweakpane checkboxes are hidden inputs, so click them via `el.click()`.
- Local visual checks: drive the system Firefox with puppeteer-core from a scratch folder (see auto-memory).
