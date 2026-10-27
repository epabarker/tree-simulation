# Status

_Last updated: 2026-10-27_

**Current milestone: M6e** (light calibration). M0–M6d are done; repo public at https://github.com/epabarker/tree-simulation, CI and Pages green. The [2026-10-27 literature review](research/2026-10-27-literature-review.md) added M6c–M6e before M7 (ADRs 0006–0008).

## Works
- Core: C1–C6 and two light models — the Beer–Lambert sky sweep (default, ADR 0005) and the shadow triangle (pinned in the M1–M5 presets); multi-tree stands; the §6 season loop; golden hashes.
- Page: WebGL2 renderer (tapered SDF capsules, vesica leaves, shade texture; Canvas 2D fallback, `?renderer=canvas`), natural view (light and dark) with pseudo-depth (ADR 0008; View → depth off = x-ray), autoplay, eased camera, tap to fell a tree, themed Tweakpane (Stats shows renderer, fps, draw ms), charts, phone layout. Opens on `skyStand` (`skyGrove` on phones).
- Headless and analysis: `npm run sim`; `analysis/experiments/` (m0, m2 λ sweep, m4 calibration, m6 sky sweep).
- Defaults: sky k_ext = 0.5, K = 7, cosine-weighted; α = 2, λ = 0.5; r0 = 0.02. Sky presets: relative C5 (T 0.03, T_rel 0.12) and R6 short shoots (Q_ss 0.1, a_ss 2); core defaults keep the baseline (T 0.1, T_rel 0, R6 off).

## Next
2. **M6e**: `groundLight` metric; k_ext to 2–10% stand-floor light; K convergence or `c2.rotate`; overcast preset.
3. Look at the depth view and measure the WebGL2 renderer on a real phone (Stats → fps, draw ms; leaves are now 3× the instances).
4. Then agree with the user: M7 (R2 → species presets) or M8 (R1, now with two plateau causes).

## Open questions (for the user)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud (`rclone purge pcloud:Projects/tree-simulation/runs`, `…/dist`)?

## Known issues
- Suppressed decurrent stand trees can lose their crown to C5 in one season (spec-conformant; relative C5 in M6d may ease it; mortality comes with R1).
- Shadow-triangle presets (M1–M5) still show the seedling trap rarely and no crown lift; the sky sweep does not.
- With R6 on, short shoots weaken gap filling a little (one neighbour shift +0.8 cells); the deep inner crown stays bare.
- On autoplay, `skyStand` trees reach the world's top (110 cells) by season ≈ 55 and the canopy flattens against it; R1's plateau (M8) or a taller world would fix it.

## Notes for the next session
- The world is a closed box for growth (Q = 0 outside); the sky sweep still lets light in from beyond the sides.
- Rendering logic shared by both renderers lives in `src/web/render/scene.ts`; WebGL2 instance data must stay camera-independent (see architecture.md). Pseudo-depth is page-only (`Scene.depth`); picking uses the drawn geometry, the x-ray view the simulated one.
- Visual checks: `npx vite preview`, then drive the system Firefox with puppeteer-core from a scratch folder (see auto-memory). Headless Firefox here has WebGL2.
