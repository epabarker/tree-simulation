# 0018: Seed rain from beyond the world

- **Status:** accepted
- **Date:** 2026-10-28
- **Spec:** §O4 (stand dynamics); extends ADR 0013 (rings without edges) and ADR 0016 (species per tree)

## Context
- **§O4 seeds come only from parents in the world.** M25's mixed wood loses goat willow by about season 225 and birch by about 400, and after that nothing can bring them back.
- **Real pioneers return.** Their seed is wind-borne and arrives from far outside any stand: willow and birch seed travels kilometres. That is how pioneers take a large clearing or windthrow in an old wood (the M19 note's succession sources).
- **The garden cares:** a visitor who fells a patch of an old home forest should see pioneers come back.

## Decision
The user agreed (2026-10-28) to extend O4 with **seed rain**:
- **The param:** `o4.rain`, a per-species number of seeds a season per 100 cells of ground that arrive from beyond the world.
- **The draws:** each season the count's whole part arrives, plus one more with probability equal to its fraction. Each seed lands uniformly along the ground. A new RNG purpose (`seedRain`, 13) keys the draws by an FNV hash of the species name, the seed and the season.
- **Establishment** follows the same rule as local seeds: ground light ≥ Q_est, p_est, no live trunk within a cell, and under `maxTrees`.
- **Off by default** (0 or absent), so every preset and golden is unchanged.
- **Values:** in `flora.ts`, goat willow 1 and birch 0.2. Willow's Q_est of 0.3 means rain takes only in large gaps.

## Consequences
- **Clearings come back:** 60-cell clearings felled at season 300 get 9 goat willows over 6 seeds, against none without rain (`flora.test.ts`). In the closed wood, willow keeps a few small trees in storm gaps, and birch fades to under one canopy tree a run.
- **A world now has an outside,** but only for seeds; light and wind still stop at the world's sides.
- **Revisit** if rain should depend on the landscape around the world (a seed source's distance), or vary from year to year (mast years).
