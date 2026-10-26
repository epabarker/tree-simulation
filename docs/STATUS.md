# Status

_Last updated: 2026-10-26_

**Current milestone: M0** (metamer graph, distichous buds, all buds grow): code complete, not yet committed.

## Works
- Repo skeleton, docs framework, agent instructions, Claude skills, CI and Pages workflows.
- Core: SoA tables, keyed-hash RNG, C1 buds and shoots, the §6 season loop (C2–C6 slots wait for their milestones), metrics, golden hashes.
- Page: worker (Comlink), Canvas 2D renderer with tweening and auto-fit, Tweakpane panel, Observable Plot charts.
- Headless: `npm run sim` writes run.json, metrics.csv, metamers.csv and hash.txt; `analysis/experiments/m0_growth.py` plots growth.

## Next
1. First commit; create `epabarker/tree-simulation` (public) and enable Pages; get CI green.
2. M1: C2 shadow triangle (`light/shadow-triangle.ts`), the shadow overlay and bud-light colouring. Then calibrate a, b, C on an isolated tree.
3. M2: Borchert–Honda `bh` and `equal` modes, plus the λ sweep experiment.

## Open questions
- Whether to add `runs/` and `dist/` to the `pcloud-sync` filters (this folder syncs to pCloud hourly).

## Notes for the next session
- Before C3 lands, `c3.mode: "none"` is the milestone scaffold: each bud with Q > 0 grows one metamer.
- The ground is opaque in every light model (Q = 0 below y = 0); see architecture.md.
