# 0064: The grid's scale, one cell = 0.25 m

- **Status:** accepted (user, 2026-11-10). Records a scale already in the code (`stand::CELL_METRES`).
- **Spec:** §O4 (planting, the display threshold). ADRs 0062, 0063.
- **Spec issue:** [#111, the feature playbook](https://github.com/epabarker/tree-simulation/issues/111)
- **Playbook page:** [Stand density and demography](../features/stand-density-and-demography.md)

## Context
- The core works in cells and has no unit of its own. The playbook's decisions are in metres and hectares: a display threshold of 1.3 m and a planting density per hectare (ADR 0063, decisions 5 and 6).
- **Two documents already fix the scale.** ADR 0062 reads the garden's 64-cell depth as 16 m. The stand-density page reads the 160-cell garden as ≈ 0.064 ha (160 × 64 cells). Both give 0.25 m a cell.
- `stand::CELL_METRES = 0.25` (#113) states that scale once, but no decision recorded it.

## Decision
1. **One cell is 0.25 m**, in every axis. `stand::CELL_METRES` is the one place the code states it. Any conversion between cells and metres or hectares reads that constant.
2. **The display threshold** is 1.3 m = 5.2 cells (`stand::DISPLAY_THRESHOLD = 1.3 / CELL_METRES`).
3. **Planting's hectares** are width × depth × CELL_METRES² / 10,000 (`principles::planting::plant`). At 0.25 m, the 160 × 64-cell desktop garden is 0.064 ha.

## Alternatives
- **Leave the scale implicit,** with each page converting by its own reading: two readings could drift apart, and the threshold and the density would then disagree about the size of the world.
- **A different scale (e.g. 0.5 m):** it would contradict ADR 0062's 16 m depth and the stand-density page's areas, which the playbook's targets were set against.

## Consequences
- Measures in cells convert to metres by CELL_METRES: for example metrics.csv's `height` and `crownLength` (× 0.25 m).
- Changing the scale would move the display threshold and the planted density together. That needs a new ADR, not an edit to the constant.
