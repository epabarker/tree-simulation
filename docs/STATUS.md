# Status

_Last updated: 2026-10-26_

**The prototype (M0–M5) is complete.** The repo is public at https://github.com/epabarker/tree-simulation, and CI and Pages are green. Next is M6: sky sweep + WebGL2 renderer.

## Works
- Core: SoA tables, keyed-hash RNG, C1 buds, C2 shadow triangle, C3 Borchert–Honda (plus the `equal` ablation), C4 direction, C5 shedding, C6 pipe girth with memory, multi-tree stands, the §6 season loop, golden hashes. 51 tests.
- Page: worker, Canvas 2D with tweening and shed ghosts, tap to fell a tree, Tweakpane folders C1–C6, charts (metamers, height, Q per tree, junction Δ), and a layout that works at phone width.
- Headless and analysis: `npm run sim`; `analysis/experiments/` (m0 growth, m2 λ sweep, m4 calibration).
- Defaults: a = 0.15, b = 1.5, qMax = 6, C = 1, T = 0.1, α = 2, λ = 0.5 (all `calibrate` except α).

## Next
1. Agree the next step with the user: M6 (Beer–Lambert sky sweep, the WebGL2 renderer) or polish first.
2. M6 is expected to lift crown bases in stands and on isolated trees. Re-run the bole checks then.
3. Leader-share metric; rerun the λ sweep with shedding on.

## Open questions (for the user)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Whether to add `runs/` and `dist/` to the `pcloud-sync` filters (this folder syncs to pCloud hourly).

## Known issues
- The shadow triangle can't lift crown bases: shade reaches only qMax layers below a bud (→ M6 sky sweep).
- The seedling starvation trap (4+ buds in a cell, each v < 1) is now rare at a = 0.15, but stalls are permanent until R1/R4 exist.

## Notes for the next session
- Before C3 was implemented, `c3.mode: "none"` was the milestone scaffold: any bud with Q > 0 grows one metamer.
- The world is a closed box: Q = 0 outside the grid on every side.
- Visual checks: `npx vite preview`, then drive the system Firefox with puppeteer-core from a scratch folder (see auto-memory).
