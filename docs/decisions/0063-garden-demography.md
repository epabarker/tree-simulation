# 0063: The garden's demography schedule

- **Status:** accepted (user, 2026-11-08). A decision of the feature-playbook map, implemented by spec #111's tickets (the garden flip in #121).
- **Amended by [0065](0065-garden-demography-reported-targets.md) (2026-11-12):** decisions 1–2's per-hectare bars and the cap are reported counts, not gates (the gate moves to #129); canopy is over half the drawn stems' 90th-percentile height; decision 3's suppression signal is an option (`o4.suppressionSignal`).
- **Spec:** §O4, §R1 (maturity, the carbon balance). ADRs 0013, 0018, 0058, 0062.
- **Ticket:** [What demography schedule should the garden run?](https://github.com/epabarker/tree-simulation/issues/85)
- **Playbook page:** [Stand density and demography](../features/stand-density-and-demography.md)
- **Evidence:** [the garden-demography note](../experiments/2026-11-08-garden-demography.md) (exploratory, seeds 1–3); [the regeneration research](../research/2026-11-08-regeneration.md).

## Context
- **The cap sets the density.** `o4.maxTrees` is full by seasons 17–49 and holds ≈ 2,000 stems/ha over the 7 m band. From season 50, 0.91–1.0 of drawn stems are recruits, and 58–81% of them are under 5 m. That is the clutter the user reported.
- **m₀ ignores size and vigour.** Planted trees die of it, not of starvation (P/M 2–12 in their last seasons). This leaves a gap phase: at desktop seed 3, season 150, every planted tree is dead and the tallest stem is about 12 m.
- **Nothing dies of shade.** Suppressed recruits persist, so the stand never thins.
- **ADR 0062** made the depth periodic and requires trees to fill it.

## Decision
1. **The target is a mature high forest**: 200–400 drawn stems/ha, mostly canopy, the same per area at every width. It is judged on seasons 100–300. Seasons 0–50 need only avoid failure.
2. **Density emerges** from establishment and mortality. The cap is a compute guard: stems below the display threshold count against it, and a run that reaches it fails the schedule.
3. **Mortality has two parts** and replaces size-blind m₀: a low canopy rate that rises with size or age, and a suppression rate from low vigour (R1's carbon balance). Each species' shade tolerance sets its suppression rate (birch fastest; beech and holly slowest).
4. **Local seeding starts at maturity alone**, with no start season. **Seed rain** (birch, willow) stays and lands anywhere in the depth. `o4.band` goes.
5. **Planting:** about 400/ha of saplings at keyed positions with a minimum spacing over the full width × depth.
6. **Display threshold 1.3 m.** Below it the seedling bank is simulated and not drawn.
7. **Holly recruits.** Its unread `o4.enabled: false` is deleted.
8. **Masting is deferred** until a measured mismatch calls for it.

## Alternatives
- **Parkland (80–250/ha):** fits rounded crowns but contradicts the bare bole, which needs a closed stand. The lone-tree stage already covers the rounded crown.
- **Keep the cap as the density setter and lower it:** it treats the symptom. Suppressed recruits would still fill the cap, and the gap phase would remain.
- **A start season:** it only postpones the moment the cap fills.

## Consequences
- O4 changes (mortality, establishment band, planting), which changes the goldens and the regressions. Reasons go in the devlog when this is implemented.
- Shade tolerance becomes a per-species parameter: a Species expression of this feature.
- The acceptance check is in the playbook page. Adoption needs ≥ 20 seeds.
