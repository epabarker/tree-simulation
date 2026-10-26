# Status

_Last updated: 2026-10-26_

**Current milestone: M6b** (WebGL2 renderer) or M7 (R2 physiological age). M0–M6 are done; repo public at https://github.com/epabarker/tree-simulation, CI and Pages green.

## Works
- Core: C1–C6 and two light models — the Beer–Lambert sky sweep (default, ADR 0005) and the shadow triangle (pinned in the M1–M5 presets); multi-tree stands; the §6 season loop; golden hashes. 66 tests.
- Page: natural view (bark, leaves, sky; light and dark), autoplay, eased camera, tap to fell a tree, themed Tweakpane folders C1–C6 (C2 has a model switch), charts, phone layout. Opens on `skyStand` (`skyGrove` on phones).
- Headless and analysis: `npm run sim`; `analysis/experiments/` (m0 growth, m2 λ sweep, m4 calibration, m6 sky sweep).
- Defaults: sky k_ext = 0.5, K = 7, cosine-weighted; T = 0.1, α = 2, λ = 0.5.

## Next
1. Agree with the user: M6b (WebGL2 renderer, ADR 0001) or M7 (R2 physiological age, §9 species presets).
2. Leader-share metric; rerun the λ sweep with shedding and the sky on.
3. Sweep K / sky exponent; consider R1 (M8) to turn crown loss into mortality.

## Open questions (for the user)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Delete the ≈ 5 MB of early `runs/` and `dist/` copies on pCloud (`rclone purge pcloud:Projects/tree-simulation/runs`, `…/dist`)?

## Known issues
- Suppressed decurrent stand trees can lose their crown to C5 in one season (spec-conformant; mortality comes with R1).
- Shadow-triangle presets (M1–M5) still show the seedling trap rarely and no crown lift; the sky sweep does not.

## Notes for the next session
- The world is a closed box for growth (Q = 0 outside); the sky sweep still lets light in from beyond the sides.
- Visual checks: `npx vite preview`, then drive the system Firefox with puppeteer-core from a scratch folder (see auto-memory).
