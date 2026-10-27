# Status

_Last updated: 2026-10-27_

**Current milestone: M7** (R2 physiological age, §9 species presets) — to agree with the user. M0–M6b are done; repo public at https://github.com/epabarker/tree-simulation, CI and Pages green.

## Works
- Core: C1–C6 and two light models — the Beer–Lambert sky sweep (default, ADR 0005) and the shadow triangle (pinned in the M1–M5 presets); multi-tree stands; the §6 season loop; golden hashes.
- Page: WebGL2 renderer (tapered SDF capsules, vesica leaves, shade texture; Canvas 2D fallback, `?renderer=canvas`), natural view (light and dark), autoplay, eased camera, tap to fell a tree, themed Tweakpane (Stats shows renderer, fps, draw ms), charts, phone layout. Opens on `skyStand` (`skyGrove` on phones).
- Headless and analysis: `npm run sim`; `analysis/experiments/` (m0, m2 λ sweep, m4 calibration, m6 sky sweep).
- Defaults: sky k_ext = 0.5, K = 7, cosine-weighted; T = 0.1, α = 2, λ = 0.5.

## Next
1. Agree with the user: M7 (R2 physiological age → species presets) or M8 (R1 carbon balance → mortality, height plateau).
2. Measure the WebGL2 renderer on a real phone (Stats → fps, draw ms) once the demo URL works or over the LAN (`npm run dev -- --host`).
3. Leader-share metric; rerun the λ sweep with shedding and the sky on.

## Open questions (for the user)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud (`rclone purge pcloud:Projects/tree-simulation/runs`, `…/dist`)?

## Known issues
- Suppressed decurrent stand trees can lose their crown to C5 in one season (spec-conformant; mortality comes with R1).
- Shadow-triangle presets (M1–M5) still show the seedling trap rarely and no crown lift; the sky sweep does not.

## Notes for the next session
- The world is a closed box for growth (Q = 0 outside); the sky sweep still lets light in from beyond the sides.
- Rendering logic shared by both renderers lives in `src/web/render/scene.ts`; WebGL2 instance data must stay camera-independent (see architecture.md).
- Visual checks: `npx vite preview`, then drive the system Firefox with puppeteer-core from a scratch folder (see auto-memory). Headless Firefox here has WebGL2.
