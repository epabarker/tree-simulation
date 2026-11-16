# 0070: Hornbeam's seed supply cut 60-fold (`o4.cSeed` 300): a draft for the user

- **Status:** proposed (drafted by the agent for #137, 2026-11-16; not accepted). Nothing in `flora.ts`, the presets or the goldens has changed. Adoption is the user's call.
- **Spec:** §O4 (seed production and the cap), §O4.11, §10. ADRs 0063, 0065, 0068.
- **Ticket:** [#137](https://github.com/epabarker/tree-simulation/issues/137).
- **Evidence:** [the seed-supply probe](../experiments/2026-11-16-seed-supply-probe.md), 20 seeds at widths 160 and 66, bars committed before the runs.

## Context
- The garden sits at its compute cap (`maxTrees`) for a median 235 of 300 seasons on the desktop and 186.5 on the phone (HEAD, dec3526). ADR 0068 showed mortality cannot clear the cap; #137 offers the seed supply or §O4.11's stubs.
- O4 makes ⌊pool / `cSeed`⌋ seeds a season, so `cSeed` is a cost per seed: a supply cut raises it. Hornbeam (cSeed 5) makes 92% of the garden's seeds (336,481 of 364,503 a desktop run).
- In the probe hornbeam's supply ½ failed the pilot; ¼ and 1/10 pass the bars but move the cap by 2–20 seasons a run. **× 1/60 (`cSeed` 300, d1's seed part) passes every gate and bar**: the cap's seasons fall by a median 31 a run on the desktop (235 → 206) and 96 on the phone (186.5 → 78.5). Hornbeam keeps a canopy tree in all 60 desktop frames, canopy trees/ha are head's (109), and no species takes over the canopy (3 frames against head's 4).
- No run is cap-free: the other species' seeds (about 29,000 a desktop run) still refill every death slot. Drawn stems/ha are not lowered.

## Decision (proposed)
1. Hornbeam's `o4.cSeed` is 300 in `flora.ts` (from 5), with the comment citing this ADR and the probe.
2. The cap's seasons stay a reported count (ADR 0065 decision 2). The representation, §O4.11's stubs outside `maxTrees`, stays #137's open question: the supply shortens the cap and cannot end it.

## Consequences
- `node cli/export-presets.ts` regenerates `rust/presets.json`; `flora-fitted.ts`'s hornbeam is changed alike or the difference noted.
- Goldens whose worlds grow hornbeam with O4 on change: `npm run golden:update`, the reason in the devlog. `npm run regressions`: phoneSeed3 (`forestParams(66, 3)`) may move; forestRegeneration cannot (its world has no species table).
- Lone trees are unchanged (O4 is off there; the probe's hashes match).
- Recruitment shifts towards beech, maple and birch (hornbeam's share of recruits reaching 1.3 m 0.69 → 0.58), not over to them.
- The feature playbook's garden page is re-read, the phone is looked at in the browser.
- The cost of 300 a nutlet is fitted to the cap, not taken from a seed-rain source; a source check (hornbeam's seed rain per hectare) belongs with adoption.
