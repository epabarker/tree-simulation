# Status

_Last updated: 2026-10-27_

**Current milestone: M6c** (pseudo-depth natural view, r0 = 0.02). M0–M6b are done; repo public at https://github.com/epabarker/tree-simulation, CI and Pages green. The [2026-10-27 literature review](research/2026-10-27-literature-review.md) added M6c–M6e before M7 (ADRs 0006–0008).

## Works
- Core: C1–C6 and two light models — the Beer–Lambert sky sweep (default, ADR 0005) and the shadow triangle (pinned in the M1–M5 presets); multi-tree stands; the §6 season loop; golden hashes.
- Page: WebGL2 renderer (tapered SDF capsules, vesica leaves, shade texture; Canvas 2D fallback, `?renderer=canvas`), natural view (light and dark), autoplay, eased camera, tap to fell a tree, themed Tweakpane (Stats shows renderer, fps, draw ms), charts, phone layout. Opens on `skyStand` (`skyGrove` on phones).
- Headless and analysis: `npm run sim`; `analysis/experiments/` (m0, m2 λ sweep, m4 calibration, m6 sky sweep).
- Defaults: sky k_ext = 0.5, K = 7, cosine-weighted; T = 0.1, α = 2, λ = 0.5; r0 = 0.08 (→ 0.02 in M6c).

## Next
1. **M6c**: pseudo-depth leaves (back/front clusters, foreshortened laterals, `depth` toggle; ADR 0008); r0 = 0.02 (goldens regenerate); slenderness metric; twig minimum width.
2. **M6d**: relative C5 (`c5.Trel`, ADR 0007); R6 short shoots (ADR 0006); calibration sweep.
3. **M6e**: `groundLight` metric; k_ext to 2–10% stand-floor light; K convergence or `c2.rotate`; overcast preset.
4. Then agree with the user: M7 (R2 → species presets) or M8 (R1, now with two plateau causes).
5. Measure the WebGL2 renderer on a real phone (Stats → fps, draw ms), ideally after M6c.

## Open questions (for the user)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud (`rclone purge pcloud:Projects/tree-simulation/runs`, `…/dist`)?

## Known issues
- Suppressed decurrent stand trees can lose their crown to C5 in one season (spec-conformant; relative C5 in M6d may ease it; mortality comes with R1).
- Shadow-triangle presets (M1–M5) still show the seedling trap rarely and no crown lift; the sky sweep does not.
- Drawn leaves (metamers ≤ 5 seasons old) differ from simulated foliage (one unit per live bud) until R6.

## Notes for the next session
- The world is a closed box for growth (Q = 0 outside); the sky sweep still lets light in from beyond the sides.
- Rendering logic shared by both renderers lives in `src/web/render/scene.ts`; WebGL2 instance data must stay camera-independent (see architecture.md). Pseudo-depth is page-only: picking and the x-ray view use true geometry.
- Visual checks: `npx vite preview`, then drive the system Firefox with puppeteer-core from a scratch folder (see auto-memory). Headless Firefox here has WebGL2.
