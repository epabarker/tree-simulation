# 0066: Four choices left open by spec #111's review, kept as built

- **Status:** accepted (user, 2026-11-13, accepting the agent's recommendations). Amends [ADR 0063](0063-garden-demography.md) decision 6 (for the lab only) and AGENTS.md's Rust convention on structs.
- **Spec:** §O4, §C2.13. ADRs 0026, 0046, 0062, 0063, 0065.
- **Tickets:** [#111](https://github.com/epabarker/tree-simulation/issues/111), [#120](https://github.com/epabarker/tree-simulation/issues/120) (the display threshold). The code review of spec #111 raised all four.

## Context
The review found four things that the code does and no ticket, ADR or comment records:
- The lab draws seedlings below the 1.3 m display threshold (commit 6ddf383, `SnapshotOptions.seedlings`). #120's first criterion said neither the garden nor the lab should.
- The garden's specimen tree still stands in the half-walled world (`specimenParams`, `HALF_WALLED`). The open box costs ≈ 550 MB in WASM against the specimen worker's 230 MB budget (ADR 0026; the devlog's open-box entry).
- The core has new plain-data structs: `SpeciesStems` and `StandMetrics` (stand.rs, the stand's per-season summary), `CrownFrame` (private to metrics.rs), and `Limb` (the `bole_limbs` example, outside the core). AGENTS.md allows "no structs beyond the tables, `Tree`, `World` and the params".
- The garden opens on the live intro, not a settled forest. No 3D shipped forests exist (ADR 0046).

## Decision
1. **The lab is exempt from the display threshold.** The garden hides the seedling bank (ADR 0063 decision 6); the lab, the inspection view, draws every tree, so its lone tree shows from its first season. The rule stays in one place (`stand::is_drawn`), and stand.csv's `drawn` count is unchanged.
2. **The garden's specimen stays half-walled** until its worker budget can hold the open box. Whether it moves is a cost question for the lab's open-box work, still fog.
3. **Plain-data records are allowed in the core:** a struct of values a phase or a metric returns, read once and not kept between seasons, with no methods beyond construction. Behaviour stays in free functions over the column tables. AGENTS.md's convention says so.
4. **The garden keeps opening on the live intro.** ADR 0046 stands; opening on a settled forest waits for #129 to change the stand.

## Alternatives
- **Hide seedlings in the lab too** (#120 as written): the lab's lone tree would be invisible for its first years, and the lab exists to inspect growth.
- **Put the specimen in the open box now:** it does not fit the worker budget.
- **Refactor the records into column tables or tuples:** more code for one-row summaries, and no change of behaviour.
- **Ship a settled forest now:** it would be regenerated after #129, and reopens ADR 0046.

## Consequences
- No code, golden or regression changes. #120's first criterion is read as "the garden".
- A new struct that holds state between seasons, or behaviour, still needs the user's yes.
