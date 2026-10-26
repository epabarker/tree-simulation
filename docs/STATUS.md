# Status

_Last updated: 2026-10-26_

**Current milestone: M1** (C2 shadow triangle). M0 is done: the repo is public at https://github.com/epabarker/tree-simulation, and CI and the Pages deploy are green.

## Works
- Core: SoA tables, keyed-hash RNG, C1 buds and shoots, the §6 season loop (C2–C6 slots wait for their milestones), metrics, golden hashes.
- Page: worker (Comlink), Canvas 2D renderer with tweening and auto-fit, Tweakpane panel, Observable Plot charts. M0 has been checked visually in Firefox.
- Headless: `npm run sim`; `uv run --project analysis python analysis/experiments/m0_growth.py` (growth ratio ≈ 2.0 per season).

## Next
1. M1: C2 shadow triangle (`light/shadow-triangle.ts`), the shadow overlay, bud-light colouring and the M1 tests.
2. Calibrate a, b, C on an isolated tree (ROADMAP "awaiting calibration").
3. M2: Borchert–Honda `bh` and `equal` modes; the λ sweep experiment.

## Open questions (for the user)
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Whether to add `runs/` and `dist/` to the `pcloud-sync` filters (this folder syncs to pCloud hourly).

## Notes for the next session
- Before C3 lands, `c3.mode: "none"` is the milestone scaffold: each bud with Q > 0 grows one metamer.
- The ground is opaque in every light model (Q = 0 below y = 0); see architecture.md.
- Visual checks: `npx vite preview`, then drive the system Firefox with puppeteer-core (installed in a scratch folder, not in the repo).
