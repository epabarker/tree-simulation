# 0071: R5's shade term on λ raised to δλ 0.40, so shaded saplings grow (rejected as written)

- **Status:** rejected as written (the user, 2026-11-20, in chat: "Go ahead with all four"), on [the re-probe on M](../experiments/2026-11-19-sapling-release-on-m.md): δλ 0.40 fails on 20 seeds in both scopes. For all species it floods the band (1,100–1,400 stems ≥ 7 cm/ha from season 200), freezes maple (no-growth share 0.97) and empties the seedling bank. For beech and hornbeam only it makes a beech wood (0.84 of the canopy). `r5.dLambda` stays 0.02. Lower doses were then run on M ([the low-dose ladder](../experiments/2026-11-20-sapling-release-low-dose.md), the user 2026-11-20: "I accept your recommendations"): **no dose of δλ alone passes.** 0.10 and 0.15 give realistic growth (0.18 and 0.28 m a decade), but every dose worsens the stems ≥ 7 cm at frames 200 and 300 against M and freezes maple (0.90–0.94). 0.10 is not accepted with the late band waived. `r5.dLambda` stays 0.02 until there is a sink for stems ≥ 7 cm. Earlier: deferred (the main session, under the user's delegation, 2026-11-16). **Not adopted:** nothing in `params.ts`, `flora.ts`, the presets or the goldens changes. dl40 clears the pooled bar by 0.01 (0.60 against ≤ 0.61), and it costs more than it gains: stems ≥ 7 cm reach 852/ha at 160 cells, more than twice the top of ADR 0068's band (200–400; HEAD 266), canopy trees/ha go from 109 to 188, and maple's no-growth share rises from 0.78 to 0.97. #134 is about to change the stand, so this is re-probed there, beside #132's ramp, which has to absorb the stems ≥ 7 cm. A per-species patch (beech and hornbeam) is the variant to try first.
- **Spec:** §R5 (δλ: λ + δλ·s at a shaded node), §C3.4 (v < 1 grows nothing), §R1.4. ADRs 0004, 0012, 0068.
- **Ticket:** [#138](https://github.com/epabarker/tree-simulation/issues/138).
- **Evidence:** [the sapling-release probe](../experiments/2026-11-16-sapling-release-probe.md): the pilot (seeds 1–3) and its "Confirmation" (seeds 1–20 at widths 160 and 66, bars committed before the runs).

## Context
- HEAD's understorey saplings (1–5 m) are frozen, not starved: C3 splits their surplus over a median 15 buds, each below v ≥ 1, and the unspent v is lost. HEAD's saplings grow no metamer in 75% of sapling-seasons (20 seeds) and gain a median 0.02 m a decade.
- R5's δλ (HEAD 0.02) raises λ at shaded nodes, so more of a node's v goes to its main axis and the leader passes its threshold. It is an existing calibration knob; no rule changes.
- On 20 seeds, δλ 0.40 (`dl40`) passes every bar: the no-growth share falls in 18 of 20 seeds against HEAD's same seed and the median gain rises in 20 of 20; pooled 0.75 → 0.60 (bar ≤ 0.61); #122's gates 20 / 20 at both widths; canopy trees/ha 109 → 188 (160 cells) and 76 → 133 (66), with the stand's top height rising. δλ 0.25 misses the pooled bar by 0.01, 0.10 by 0.09.
- The lone trees do not move: R5's signal is neighbour shade, zero for a tree alone; the lone beech's state hash is HEAD's at 0.25 and 0.40.

## Decision (proposed)
- **`r5.dLambda` 0.02 → 0.40** for the garden. Two scopes, for the user to choose:
  1. **World** (`DEFAULT_PARAMS.r5.dLambda` in `src/core/params.ts`): what the probe ran. Every species and every preset with R5 on takes it.
  2. **Per species** (an `r5: { dLambda: 0.4 }` in the species' patch in `src/core/flora.ts`; `SpeciesPatch` allows `r5`, none carries one today): beech and hornbeam only, which the probe shows released (no-growth 0.69 → 0.57, 0.76 → 0.65). Not run as such: it would need its own 20-seed confirmation.

## Consequences
- **Costs, reported and not gated:**
  - stems ≥ 7 cm DBH reach 852/ha at 160 cells (HEAD 266; ADR 0068's band 200–400): #132's understorey re-tune must absorb it.
  - Maple (0.78 → 0.97), holly (0.65 → 0.82) and rowan (0.83 → 0.87) freeze harder: concentrating v at the leader starves the bushier species. Scope 2 avoids this.
  - On the phone the seedling bank falls from 55 to 33.5 stems a frame and the stand sits at its cap 30 seasons longer (186.5 → 217).
- **What adoption touches:**
  - `npm run golden:update`, with the reason in `docs/devlog.md` (forest goldens move; lone goldens should not);
  - `node cli/export-presets.ts` → `rust/presets.json`;
  - `npm run regressions -- --update` with a devlog reason (`phoneSeed3` and `forestRegeneration` will move);
  - the feature playbook's garden page (`docs/features/stand-density-and-demography.md`) re-read, and the phone looked at in the browser;
  - `npm run check:stamp` green.
- **Not settled here:** whether the ≥ 7 cm band (#132) or the bushier species' freeze is acceptable; whether to run scope 2's confirmation first.
