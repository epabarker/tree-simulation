# 0032: The acclimated leaf cost, and T_rel fixed per species from its shade leaves

- **Status:** accepted (the user, 2026-11-01).
- **Date:** 2026-11-01
- **Amends:** ADR 0029 (T_rel leaves the fitted physiology: eight knobs), ADR 0020 (what is fitted), spec §R1 (foliage maintenance), §C5 (T_rel).
- **Note:** [the species note](../experiments/2026-10-30-species-3d.md), round 5, "Both shedding rules relaxed at once"; ADR 0031 (the flat top, a limitation).

## Context
ADR 0031's last diagnostic relaxed both shedding rules at biological values on the fitted hornbeam: R1's acclimated leaf cost (c 0.3) with T_rel at the light of its lowest shade leaves. It did not round the lone crown, and that is not this ADR's reason. **Its closed stand matched the measurements where no earlier configuration did:** LAI 9.2–9.6 against hornbeam's measured 8.3 ± 1.5, and a floor of 1% against the measured 1.3%. Every earlier configuration had floors 5–9× too bright (the user's reading; 2–3% for this hornbeam stand under the flat cost). Forest's plateau held on 3 of 3 seeds. The cost is metamers: +40–70% in stands and on lone trees.

## Decision
1. **R1's leaf cost is acclimated, with one global c = 0.3:** foliage maintenance m_f·(0.3 + 0.7·Q) per unit of leaf area (`r1.leafCost` "acclimated", `r1.leafCostShade` 0.3). The core's default stays flat. The model's species (FITTED_FLORA, via `m27_adopt.py`'s `LEAF_COST_SHADE`), `forest` and the woods carry it.
2. **C5's T_rel is fixed per species** from Hagemeier & Leuschner's (2019) "lowest shade leaves" column, as a fraction of incident PAR: **birch 0.21, sessile oak 0.063, hornbeam 0.025, beech 0.008** (measured). The others are **estimates** from Niinemets & Valladares's shade-tolerance score, by ln(%) = 5.00 − 1.108 × score over those four (r = −0.96): **willow 0.14, rowan 0.072, maple 0.044, holly 0.021, fir 0.0091, pine 0.23**. It is removed from the fit's free parameters and written into each targets file's `[fixed]`, with the leaf cost.
3. **`forest`** (and every preset built on it: clearing and the woods) takes the same c and T_rel scaled as hornbeam's, 0.12 × 0.025/0.194 = 0.0155. The woods' species carry their own.
4. **Goldens move** for forest, mixedWood and oakOpen; the devlog gives this reason.

## Consequences
- **The lone tree's top is not the reason and is not changed by this:** the crown fills inside, the top stays flat (ADR 0031).
- **Memory and the phone** (measured 2026-11-01; `experiments/code/2026-10-31-species-round5/budget/`; headless Firefox with software rendering, so draw times are relative, not the phone's): the phone's 66-cell plate decides, and **the budget holds**, with the worker far under 250 ms a season and memory far under 256 MB.

| measure | before ADR 0032 (b99a153) | after (437a57d) |
|---|---|---|
| phone plate (66 cells), WASM memory at 200 seasons | 74.2 MB | 74.9 MB |
| phone plate, live metamers at 200 | 18,440 | 20,713 |
| garden ?bench, phone viewport (390 × 844, dpr 2), seed 10, 40 seasons: worker ms a season (mean / max) | 25.5 / 40 | 32.1 / 45 |
| the same: draw p95 / frame p95 (ms); long frames | 5 / 17.3; 5 | 7 / 17.4; 62 |
| the same: metamers on screen | 11,027 | 12,157 |
| garden ?bench, 100 seasons: worker ms (mean / max) | 37.6 / 67 | 40.7 / 87 |
| the same: draw p95 / frame p95; long frames | 5 / 17.3; 72 | 6 / 17.3; 91 |
| the same: metamers on screen | 12,654 | 12,325 |
| 160-cell plate + specimen (memory.ts), WASM memory at 200 | 312.5 MB | 342.5 MB |
| the same: live metamers at 200 | 85,252 | 120,590 |

  The 160-cell plate with the specimen was already over ADR 0026's 256 MB before this ADR, and is over by more after (+30 MB, +41% metamers). That is I3's open problem (STATUS, known issues).
- The species' fitted physiology (round 2) predates it. The re-fits (round 5's pilot and the eight) fit eight knobs under it.
- The six estimated T_rel values rest on one regression over four species; a measurement for any of them replaces its estimate.
