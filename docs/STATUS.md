# Status

_Last updated: 2026-10-26_

**Current milestone: M2** (C3 Borchert–Honda). M0 and M1 are done. The repo is public at https://github.com/epabarker/tree-simulation, and CI and the Pages deploy are green.

## Works
- Core: SoA tables, keyed-hash RNG, C1 buds and shoots, C2 shadow triangle (default a = 0.2, b = 2, C = 1), the §6 season loop, metrics, golden hashes.
- Page: worker (Comlink), Canvas 2D renderer with tweening and auto-fit, Tweakpane panel, Observable Plot charts. M0 has been checked visually in Firefox.
- Headless: `npm run sim`; `uv run --project analysis python analysis/experiments/m0_growth.py` (growth ratio ≈ 2.0 per season).

## Next
1. M2: Borchert–Honda `bh` and `equal` modes in `c3-allocation.ts`, the conservation test, the λ 0.46 vs 0.56 dominance test, and the §8 λ sweep experiment.
2. Recalibrate a, b, C with C3 on (resource now depends on Q).
3. M3: C4 weighted direction, plus the wall preset.

## Open questions (for the user)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Whether to add `runs/` and `dist/` to the `pcloud-sync` filters (this folder syncs to pCloud hourly).

## Notes for the next session
- Before C3 lands, `c3.mode: "none"` is the milestone scaffold: each bud with Q > 0 grows one metamer.
- The world is a closed box: Q = 0 outside the grid on every side; see architecture.md.
- Visual checks: `npx vite preview`, then drive the system Firefox with puppeteer-core (installed in a scratch folder, not in the repo).
