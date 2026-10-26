# Status

_Last updated: 2026-10-26_

**Current milestone: M3** (C4 shoot direction). M0–M2 are done. The repo is public at https://github.com/epabarker/tree-simulation, and CI and the Pages deploy are green.

## Works
- Core: SoA tables, keyed-hash RNG, C1 buds and shoots, C2 shadow triangle (default a = 0.2, b = 2, C = 1), C3 Borchert–Honda (`bh`/`equal`), the §6 season loop, metrics, golden hashes.
- Page: worker (Comlink), Canvas 2D renderer with tweening and auto-fit, Tweakpane panel, Observable Plot charts. M0 has been checked visually in Firefox.
- Headless: `npm run sim`; `uv run --project analysis python analysis/experiments/m0_growth.py` (growth ratio ≈ 2.0 per season).

## Next
1. M3: C4 weighted direction (w_d, ξ·V, η·tropism to A_set, noise σ via `Purpose.directionNoise`), a wall preset, and tests (the wall pushes the centroid away; the tropism sign changes the spread).
2. M4: C5 shedding (scars, compaction with remap) and C6 pipe girth with memory; the junction-exponent histogram.
3. M5: multi-tree stands; tap to remove a tree.
4. Recalibrate a, b, C with C3 on; add a leader-share metric (λ sweep follow-up).

## Open questions (for the user)
- Confirm the shoot-length reading of §C3.4: l = v/⌊v⌋ with uncapped ⌊v⌋ (see architecture.md, "Shoot size").
- **The Pages demo URL is unreachable.** The user site `epabarker.github.io` has the custom domain `barker.garden`, which no longer resolves in DNS (NXDOMAIN), so every project page redirects to it. Fix: remove that custom domain, restore the DNS, or give this repo its own domain.
- Whether to add `runs/` and `dist/` to the `pcloud-sync` filters (this folder syncs to pCloud hourly).

## Notes for the next session
- Before C3 lands, `c3.mode: "none"` is the milestone scaffold: each bud with Q > 0 grows one metamer.
- The world is a closed box: Q = 0 outside the grid on every side; see architecture.md.
- Visual checks: `npx vite preview`, then drive the system Firefox with puppeteer-core (installed in a scratch folder, not in the repo).
