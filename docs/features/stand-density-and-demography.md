# Stand density and demography

A **World effect** (GLOSSARY): how many trees the garden holds, where they stand, how they arrive and how they die. Decided by the ticket [What demography schedule should the garden run?](https://github.com/epabarker/tree-simulation/issues/85) and recorded in [ADR 0063](../decisions/0063-garden-demography.md). Not yet implemented; hand off through `/implement-principle` (O4).

## What it should look like

A **mature high forest**: about 200–400 drawn stems/ha, most of them canopy trees, with young trees showing only in gaps that deaths leave. Density is the same per area at every width, so the desktop (160 cells, ≈ 0.064 ha) draws about 13–26 stems and the phone (66 cells, ≈ 0.026 ha) about 5–10. It is judged on the **settled garden** (seasons 100–300, what a visitor sees when the garden opens on a grown checkpoint). Seasons 0–50 only need to avoid failure.

## Mechanism

| Part | Decision | Today |
|---|---|---|
| Density | Emerges from establishment and mortality | Set by the cap from about season 50 |
| Cap (`o4.maxTrees`) | A compute guard only. Stems below the display threshold count against it. Reaching it is a failure | Full by seasons 17–49 |
| Mortality | Two parts: a low **canopy rate** that rises with size or age (senescence), and a **suppression rate** driven by low vigour (R1's carbon balance: P/M < 1, or a falling reserve over consecutive seasons) | Size-blind m₀, which empties the canopy (gap phase) |
| Local seeding | Starts at R1's maturity alone. No start season | Same |
| Seed rain | Birch and willow keep it. It lands anywhere in the depth, and suppression mortality removes it under closed canopy | Lands in the 7 m `o4.band` |
| Establishment depth | The whole depth, which is periodic (ADR 0062) | `o4.band` 28 cells |
| Starting planting | About 400/ha (≈ 26 desktop, 10 phone) saplings at keyed positions with a minimum spacing over width × depth, with today's species mix. Self-thinning brings the stand down to the target | 6 desktop / 2 phone in one row |
| Display | Drawn from 1.3 m (the **display threshold**). Below it is the **seedling bank** | Every live tree is drawn |
| Masting | Deferred (no measured mismatch calls for it) | None |

The cap should never be needed: suppression mortality is what keeps the seedling bank small.

## Species expressions

- **Shade tolerance** sets each species' suppression rate. Birch dies fastest in shade, within 1–2 seasons (the regeneration research), and seeds into gaps. Beech and holly die slowest, and wait in the seedling bank.
- **Holly recruits.** Its species-level `o4.enabled: false` is never read; delete the flag, don't honour it. Holly regenerates under shade and forms the understorey of beech woods.
- **Willow** recruits only from rain while planted willows stay below its maturity height (22.5 m).

## Cheap diagnostic

Exploratory: the feature probe ([prototype](https://github.com/epabarker/tree-simulation/tree/wayfinder/feature-probe)), garden at 160 and 66 cells, seeds 1–3, to season 300. Adoption needs the ≥ 20-seed rule with a stated pass rate.

1. Drawn stems at seasons 100, 200 and 300 within 200–400/ha.
2. At least 60% of drawn stems in the canopy (over half the top height) at the same seasons.
3. No gap phase: at least one canopy tree at every season after 50.
4. The cap never reached.
5. No species over 70% of drawn stems.
6. Both named regressions pass: [phoneSeed3](https://github.com/epabarker/tree-simulation/issues/54) and [forestRegeneration](https://github.com/epabarker/tree-simulation/issues/55) (`node cli/regressions.ts`).

## Evidence

- [What the garden's demography does today](../experiments/2026-11-08-garden-demography.md) (exploratory, seeds 1–3).
- [Regeneration research](../research/2026-11-08-regeneration.md): seeding ages, masting, the seedling bank, birch's shade death, parkland densities.
- [ADR 0062](../decisions/0062-light-entry.md): the periodic depth, and trees filling it.
