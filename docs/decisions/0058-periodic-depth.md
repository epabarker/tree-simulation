# 0058: A periodic depth (`world.sidesZ: "periodic"`)

- **Status:** proposed (2026-11-06; box A6). It is in the core, off by default, and bit-identical when off. No preset sets it yet.
- **Spec:** §C2 (the slab), §O2, §O4. ADR 0024 (the slab's open depth and its faces' τ), ADR 0056 (`faceWood`, the approximation this replaces when on).
- **Evidence:** [the day-2 plan, A6 and A6b](../plans/2026-11-06-day2.md); [the crown-base note](../experiments/2026-11-06-crown-base.md).

## Context
- **The user:** the wood must be as dense as a real wood, and the open sides must be dealt with.
- **The garden today** is one row in a 16 m slab with semi-transparent faces: about 89 trees per hectare planted and 39 canopy trees per hectare at 150. Real (Wytham) is 289. Its floor gets 14–18% of open light, against a real wood's 2–10%.

## Decision (proposed)
- **The rule:** with `sidesZ` "periodic", the depth wraps as the width does with `sides` "periodic". Beyond a z face lie the slab's own rows from the other side. This applies to the light sweep (padded G and leaf area), the exact rays, deposit, sampling, O2's grid, O4's seed landing and planting.
- **No faces:** the faces' τ, `fade` and `faceWood` are unused, and no extra trees are simulated.
- **Tests:**
  - shifting the canopy round the depth shifts the field exactly; open faces do not;
  - deposits beyond a face land wrapped;
  - O2's grid wraps.

## Consequences (screens, 2026-11-06)
- **A periodic depth alone** (depth 20–28, spacing 28) does not lift the crowns. The canopy stays sparse (71–150/ha), because half the planted trees die by 150.
- **What keeps the crowns low is the planting.** The equal nine-species ring puts canopy trees beside small ones. At a real density with stand dynamics off (300/ha) the crown base stays at 0.02, while all-beech lifts to 0.41.
- **A layered wood with a periodic depth** (canopy of beech, oak, hornbeam and birch every 5.25 m, depth 24 = 6 m; understorey half a depth away), at 150 on 12 seeds:
  - hornbeam crown base median 0.21 (real 0.22), 64% of trees in band; oak 0.21 (real 0.26);
  - floor light 3.7–5.4% (real 2–10%);
  - **planted beech starves** (22 of 24 dead, as etiolated 4–10 m whips at about 3–5% of open light, where real beech saplings live at 1–3%).
- **Not adopted.** The next question is beech's shade carbon balance (R1), for the night.

## Day3 reevaluation (2026-11-08)

Fixed A6b after beech lifespan-off, with current oak retained, fails the registered
A4 crown gates: beech2/6 eligible seeds (needs≥5), hornbeam4/18 (needs≥14). The
legacy LAI medians11.663/11.821 also miss5–9; their model-unit limitation remains.
Beech survival27/40 and G-forest against approved B1 pass, but do not override
these failures. All9 E2 conditions×20seeds are sensitivity evidence, not alternative
adoption candidates. See [step6 results](../experiments/2026-11-07-day3-step6.md).

**Still proposed and not adopted.** The shipping garden does not set periodic
depth or change planting. No user look approval is sought for the blocked candidate.
Post-box pruning diagnosis must use existing live levers before proposing a new
mechanism with a measured unresolved mismatch and approved ADR.
