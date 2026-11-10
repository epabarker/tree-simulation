# 0062: How light enters the slab

- **Status:** accepted (user, 2026-11-08). A decision of the feature-playbook map. Decision 2 (the open-grown lone box) is implemented by build (a), [#98](https://github.com/epabarker/tree-simulation/issues/98): 60 m, kept by the user although 7 of 120 trees leave it at 20 seeds ([note](../experiments/2026-11-09-open-box-build.md)). Decisions 3 and 4 wait for build (b). It amends ADR 0024's default look, accepts ADR 0058 as the garden's default, and supersedes ADR 0056.
- **Spec:** §C2 (light, the slab), §C2.8, §C5, §O4. ADRs 0024, 0056, 0058.
- **Ticket:** [Should the slab admit side light from its front and back?](https://github.com/epabarker/tree-simulation/issues/82)
- **Evidence:** [the slab-light note](../experiments/2026-11-08-slab-light.md) (exploratory, seed 1).

## Context
- **The faces are walls.** Each z face passes the sky at τ = 0.2 below the world's tallest leafy row, whatever stands locally. Near the ground this dims the whole 16 m depth (≈ 0.42 with no foliage). Inside foliage it brightens low buds near the faces and darkens the top's outer metre.
- **The "open-grown" lone oak is half walled.** `oakOpen` has open x sides and τ 0.2 faces. Its low buds get 0.39 near an x edge and 0.20 near a face. τ = 1 gives it 2.6× the buds. It fills its 40 × 16 m box, and 100–500 buds a season sit past a bound with Q = 0.
- **τ is a second density knob.** In the garden it sets how dark the side light is, independently of the stand that actually grows.

## Decision
1. **Light entry is a World effect.** It is set per world, and every species in the world sees the same light. Species differ only in how they respond (shade thresholds, shedding). No species carries its own τ.
2. **The lone-tree stage is open-grown** (GLOSSARY): open sky on all four sides (τ = 1 on both z faces, open x sides), in a square box sized from the crown so that no bud ever grows past a bound. Zero buds outside the box is a hard check of the feature probe. Accuracy comes before cost: if the lab can't afford the box, the performance budget is revisited, and the crown is not clipped.
3. **The garden's depth is periodic** (ADR 0058, `sidesZ: "periodic"`): beyond each face lies the slab's own stand. Side light then follows from the stand's density (the demography decision) and has no knob of its own. D stays 64 unless the density needs a longer period.
4. **Trees fill the whole depth.** A periodic depth with one planted row is a plantation of rows 16 m apart, so planting and recruits must spread over the full depth. Where and how densely is the demography decision's.
5. **The τ faces stay as settings** (`sidesZ: "open"`): the wood edge (1, 0.2) and the hedgerow (1, 1), available to a host page, never the default and never a calibration stage. Open-edge crown deepening comes from gaps made by deaths.
6. **The sky stays at 15–90°** (K = 16). The 0–15° band (≈ 3% of the weight) is revisited only if a probe of an open-grown tree shows a starved lower flank.
7. **ADR 0056 (`faceWood`) is superseded** by the periodic depth. It stays in the core, off and bit-identical, and is not deleted.

## Consequences
- The lone-tree findings measured in the half-walled box (self-pruning, the flat cap, the oak spire) must be re-measured in the open-grown box before the rounding and bole mechanisms are decided.
- Every garden calibration made on the τ walls (C1's interior τ, the crown-base screens) was made in a different world. They are evidence, not baselines.
- Changing the presets changes goldens and regressions, with reasons given in the devlog when the change is implemented.
