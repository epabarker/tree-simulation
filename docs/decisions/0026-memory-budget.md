# 0026: A memory budget for the 3D core

- **Status:** accepted (the user, 2026-10-31), at 256 MB.
- **Date:** 2026-10-31
- **Spec:** ADR 0014 (the garden on the home page), 0024 (the slab), 0025 (I2).
- **Note:** [before C1](../experiments/2026-10-31-pre-c1.md) §1, §4.

## Context
A 2D world held a few MB. A 3D world holds a light field and an owner grid over W × top × D cells, and the core's linear memory grows and never shrinks. Measured over 200 seasons, it is about 1 MB a cell of plate width at D = 64 with a 200-cell top:
- 70 MB on a phone's plate (66 cells);
- 165 MB on a laptop's (160), 257 MB with the specimen beside it;
- 553 MB at the widest plate the garden serves (520).

It hardly depends on the trees. Phones kill tabs and workers that hold too much, at limits browsers don't publish. Worker lanes would add a sweep each (≈ 20 B a cell).

## Decision
The garden's worker holds at most **256 MB** of the core's linear memory, all worlds and lanes included, over 200 seasons at the widest plate it serves. `memory.ts` (the note's code) measures it, by `wasmMemoryBytes()`.
- **Scope:** plates above ≈ 200 cells, the 520-cell panorama included, are out of scope for the garden. It serves plates up to ≈ 200 cells. Wider worlds remain for the lab and the CLI, which this budget does not bind.
- **Pages** cap the plate until the rule holds; I3 puts the cap in `plateWidth`.
- **Tools and tests** free each world as soon as they are done with it (`dispose`, idempotent). The tests fail a world that passes 1.5M live metamers rather than let it exhaust WASM's 4 GB.

## Consequences
- I3 caps the garden's plate at ≈ 200 cells. Cutting the ≈ 40 B a cell the note does not yet account for would give headroom (for the specimen beside a 160-cell plate, 257 MB today). Candidates:
  - an accumulator freed between seasons;
  - rows allocated only up to the top;
  - half-precision V.
- Worker lanes cost a sweep each, so they fit the budget only on narrow plates.
- **Revisit** if a phone's measured limit is known to be higher, or if a wide plate is wanted back in the garden.
