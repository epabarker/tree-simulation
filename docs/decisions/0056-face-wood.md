# 0056: A virtual wood beyond the slab's depth faces (`world.faceWood`)

- **Status:** proposed and **parked** (2026-11-06; box A4). It is in the core, off by default, and bit-identical when off. No preset sets it.
- **Spec:** §C2 (light), §C5 ("neighbour shade lifts the crown base"). ADR 0024 (the faces' τ, "as through a wood as tall as the stand").
- **Evidence:** [the crown-base note](../experiments/2026-11-06-crown-base.md), A4 section; [the box's plan](../plans/2026-11-06-box-0.17.md), "A4 and A5's gates".

## Context
- **The problem:** the garden's trees keep their crowns to the ground (like-for-like crown base 0.01–0.02 of H). Real stands sit at 0.22–0.38.
- **The cause:** C5 prunes when there is shade; a closed stand lifts beech and hornbeam into or above the real band. The garden is one row in an open-sided slab, so its lower limbs get 5–20% of the top's light and earn 3–8× their keep.
- **The user's choice:** a boundary condition, not a pruning rule. A pruning rule would override measured shade thresholds, as ADR 0043 did and was rejected for.

## Decision (proposed)
- **The rule:** beyond both z faces stands a virtual wood whose leaf-area density at each height is `faceWood` × the slab's own mean leaf area per cell at that height, gaps included.
- **Its effect on light:** a ray leaving through a face also crosses that wood's leaf area above its exit height, along its slant (÷ dy). This applies in the row sweep (the padded G beyond the faces) and in the exact rays (G3).
- **At 1** it is "a wood like the strip": its canopy, crown base, understorey and leaf area index (measured 3.6–9.5 in a 7 m strip, against closed stands' 5–9), growing with the garden.
- **Off:** absent or 0 is bit-identical (goldens unchanged; review 2026-11-06).

## Consequences
- **At the garden's depth (64),** the wood is 8 m from the row and barely acts.
- **With the slab narrowed to the recruit band (7 m)** at `faceWood` 1:
  - G-forest passes, with a real wood's floor (in band in 18 of 20 seeds, against B0's 2) and planted H/D (9, against 3), at a third of the CPU;
  - the hard crown-base gate fails (beech 2 of 7 counted seeds, hornbeam 4 of 6);
  - the garden carries 0.15× the metamers.
- **Four fills** (half wood, more recruits, closer planting) don't keep it full. **Parked;** the user's next question is why a shaded garden here carries so much less foliage than real closed woods at the same leaf area index.

## Open questions (the review, 2026-11-06; unverified)
- **The wood adds to the faces' τ.** ADR 0024 already reads τ as a wood beyond. Should `faceWood` > 0 imply τ = 1? The A4 runs used τ 0.2 plus the wood.
- **Walls** are leaf area through the whole depth, so they enter the wood's mean density.
- **A ray leaving through a face partway through a row:** the sweep counts the wood above the row's top line, while the exact rays interpolate. With the wood on, the sweep is up to one row's density ÷ dy brighter.
