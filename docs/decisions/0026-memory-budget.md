# 0026: A memory budget for the 3D core

- **Status:** proposed (2026-10-31), for the user to accept or amend before I3.
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
- **Pages** cap the plate, or the core cuts its bytes a cell, until the rule holds. The garden's plates above ≈ 200 cells do not hold it today: I3 must choose.
- **Tools and tests** free each world as soon as they are done with it (`dispose`, idempotent). The tests fail a world that passes 1.5M live metamers rather than let it exhaust WASM's 4 GB.

## Consequences
- I3 either caps the garden's plate or finds the ≈ 40 B a cell the note does not yet account for. Candidates:
  - an accumulator freed between seasons;
  - rows allocated only up to the top;
  - half-precision V.
- Worker lanes cost a sweep each, so they fit the budget only on narrow plates.
- **Revisit** if a phone's measured limit is known to be higher, or if the garden's widest plate is dropped.
