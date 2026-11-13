# Stand density and demography

A **World effect** (GLOSSARY): how many trees the garden holds, where they stand, how they arrive and how they die. Decided by the ticket [What demography schedule should the garden run?](https://github.com/epabarker/tree-simulation/issues/85) and recorded in [ADR 0063](../decisions/0063-garden-demography.md), amended by [ADR 0065](../decisions/0065-garden-demography-reported-targets.md). **Status: built** (spec #111's tickets; the garden flip in [#121](https://github.com/epabarker/tree-simulation/issues/121), at round 6's rates of [the schedule note](../experiments/2026-11-10-garden-schedule.md)). The per-hectare targets are not met and are now reported, not gated: their gate is [#129](https://github.com/epabarker/tree-simulation/issues/129)'s (crown extent and girth). **Accepted at round 6 on seeds 1–20** by [#122](https://github.com/epabarker/tree-simulation/issues/122) ([note](../experiments/2026-11-12-garden-acceptance.md), `npm run evidence:garden`): the gates hold 20 of 20 at both widths; d1 was not adopted (18 of 20 on the phone) and is the first lever for #129 to re-test. Round 6 is capped and flooded: a median canopy share of 0.14 at 160 cells and 235 of 300 seasons at the cap.

## What it should look like

A **mature high forest**: about 200–400 drawn stems/ha, most of them canopy trees (GLOSSARY: over half the top height, the mean of the 100 tallest drawn stems per hectare), with young trees showing only in gaps that deaths leave. Density is the same per area at every width, so the desktop (160 cells, ≈ 0.064 ha) draws about 13–26 stems and the phone (66 cells, ≈ 0.026 ha) about 5–10. It is judged on the **settled garden** (seasons 100–300). The 3D garden ships no grown checkpoint (ADR 0046) and opens on the live intro from season 0, so a visitor reaches the settled garden only by watching it grow; whether it should open there is an open question (#122's note). Seasons 0–50 only need to avoid failure.

## Mechanism

| Part | Decision | Today |
|---|---|---|
| Density | Emerges from establishment and mortality | Set by the cap from about season 50 |
| Cap (`o4.maxTrees`) | A compute guard only. Stems below the display threshold count against it. Reaching it is a reported count of seasons, not a failure (ADR 0065) | 2,500/ha; reached in most probe runs (`meta.capSeasons`) |
| Mortality | Two parts: a low **canopy rate** that rises with size or age (senescence), and a **suppression rate** driven by low vigour (R1's carbon balance: P/M < 1, or a falling reserve over consecutive seasons). The signal is an option (ADR 0065): `carbon` (P/M), `topLight` (a dark top) or `growth` (a stalled leader) | `twoPart`, m_c 0.003, `carbon` (#121); d1 (`topLight` θ_q 0.15 + hornbeam c_seed 300) is a named patch for #122 |
| Local seeding | Starts at R1's maturity alone. No start season | Built |
| Seed rain | Birch and willow keep it. It lands anywhere in the depth, and suppression mortality removes it under closed canopy | Lands in the 7 m `o4.band` |
| Establishment depth | The whole depth, which is periodic (ADR 0062) | Built (#119, #121) |
| Starting planting | About 400/ha (≈ 26 desktop, 10 phone) saplings at keyed positions with a minimum spacing over width × depth, with today's species mix. Self-thinning brings the stand down to the target | Built: `o4.planting` 400/ha, spacing 12 cells (#121) |
| Display | Drawn from 1.3 m (the **display threshold**). Below it is the **seedling bank** | Built (`stand::is_drawn`) |
| Masting | Deferred (no measured mismatch calls for it) | None |

The cap should never be needed: suppression mortality is what keeps the seedling bank small.

## Species expressions

- **Shade tolerance** sets each species' suppression rate. Birch dies fastest in shade, within 1–2 seasons (the regeneration research), and seeds into gaps. Beech and holly die slowest, and wait in the seedling bank.
- **Holly recruits.** Its species-level `o4.enabled: false` is never read; delete the flag, don't honour it. Holly regenerates under shade and forms the understorey of beech woods.
- **Willow** recruits only from rain while planted willows stay below its maturity height (22.5 m).

## Cheap diagnostic

Exploratory: the feature probe ([prototype](https://github.com/epabarker/tree-simulation/tree/wayfinder/feature-probe)), garden at 160 and 66 cells, seeds 1–3, to season 300. Adoption needs the ≥ 20-seed rule with a stated pass rate.

Amended by ADR 0065: items 1, 2, 4 and 5 are **reported with counts**, not gates; items 3 and 3a are the gates (#122: ≥ 18 of seeds 1–20 at both widths).

1. Drawn stems at seasons 100, 200 and 300 within 200–400/ha (reported; #129 gates it).
2. At least 60% of drawn stems in the canopy (over half the top height, stand.csv's `canopy` beside `topHeight100`) at the same seasons (reported; #129 gates it).
3. No gap phase: at least one canopy tree at every season after 50 (gate). Under the top height this means at least one drawn stem; the real canopy target is #129's.
   3a. At the phone width (66 cells), at least one canopy tree from season 100 (gate).
4. Seasons at the cap (reported: run.json's `meta.capSeasons`).
5. No species over 70% of drawn stems, read only in frames with at least 8 drawn stems (reported).
6. Both named regressions pass (phoneSeed3 is expected to fail until #123 re-baselines it after #121's flip): [phoneSeed3](https://github.com/epabarker/tree-simulation/issues/54) and [forestRegeneration](https://github.com/epabarker/tree-simulation/issues/55) (`node cli/regressions.ts`).

## Evidence

- [What the garden's demography does today](../experiments/2026-11-08-garden-demography.md) (exploratory, seeds 1–3).
- [Regeneration research](../research/2026-11-08-regeneration.md): seeding ages, masting, the seedling bank, birch's shade death, parkland densities.
- [ADR 0062](../decisions/0062-light-entry.md): the periodic depth, and trees filling it.
- [The garden schedule](../experiments/2026-11-10-garden-schedule.md): seven rounds of rates; round 6 landed (#121).
- [The 20-seed acceptance](../experiments/2026-11-12-garden-acceptance.md) (#122): round 6 against d1, seeds 1–20 at both widths; round 6 kept.
- The #121 probes, all exploratory: [suppression signals](../experiments/2026-11-10-garden-suppression-probe.md), [canopy levers](../experiments/2026-11-11-garden-canopy-levers.md), [crown occupancy](../experiments/2026-11-11-garden-crown-occupancy.md), [path length](../experiments/2026-11-11-garden-pathlength-probe.md); [crown-extent research](../research/2026-11-11-crown-extent-and-canopy-density.md).
