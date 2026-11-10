# Light entry

A **World effect** (GLOSSARY): how sky enters the slab past its bounds. Decided by the ticket [Should the slab admit side light from its front and back?](https://github.com/epabarker/tree-simulation/issues/82) and recorded in [ADR 0062](../decisions/0062-light-entry.md); spec §C2.13. **Status: the open-grown lone-tree stage is built ([#115](https://github.com/epabarker/tree-simulation/issues/115)); the garden's periodic depth is not yet.**

## What it should look like

- **The lone tree is open-grown:** its crown shows the species' form, not the shape of its box, and it is round in plan (as wide as it is deep), lit equally from all four sides.
- **No bud grows past a bound.** A crown cut by its box is never mistaken for a form, and is never clipped to save cost.
- **The garden's trees stand inside a wood,** not between two walls: side light follows from the stand's density alone (ADR 0058's periodic depth, with ADR 0063's demography).
- **Every species in a world sees the same light.** No species carries a light-entry setting.

## Mechanism

| Part | Decision | Today |
|---|---|---|
| Lone-tree stage | Open sky on all four sides (τ = 1 on both z faces, open x sides), a square 60 m box (240 cells), the tree at its centre, the woods' 50 m top. `oakOpen`, `beechOpen` and `loneTreeParams` (the feature probe's and the species trials' lone tree) | **Built** (#115) |
| Its check | `budsOutside` = 0 in every season of every run: `npm run evidence:open-grown`, the six exemplars × seeds 1–20 to season 100, with the crown's width and depth agreeing within 0.75 (min ÷ max) | **Built.** At 20 seeds the box held hornbeam, maple and holly in every run, oak in 19, beech in 18 and birch in 16 (birch s3's leader at the top; the rest at a side). Round in plan in 15–20 of 20 per species (oak lowest). Devlog, 2026-11-10 |
| Garden depth | Periodic (`sidesZ: "periodic"`, ADR 0058); D stays 64 unless the density needs more | τ 0.2 faces |
| τ faces | Kept as settings for a host page: wood edge (1, 0.2), hedgerow (1, 1); never a default or a calibration stage | Same |
| `faceWood` | Superseded, kept off and bit-identical | Same |
| Sky | 15–90° (K = 16), unchanged | Same |

**Kept in the half-walled world** (`HALF_WALLED` in presets.ts, 160 × 64 between τ 0.2 faces): the species trials' stands, shade house and woods (`cli/trials.ts`' `trialBase`), which were calibrated there, and the garden's specimen (`specimenParams`), whose worker budget (ADR 0026, `plate.ts`) the open box would not fit. Whether the garden's specimen takes the box is not decided.

## Cost

The lab's open-grown tree costs about 3–4× the half-walled one in time and memory (bench numbers in the devlog, 2026-11-10; the [open-box note](../experiments/2026-11-08-open-box.md) saw 0.9 s/season and 530–700 MB in WASM against 0.3 s and 140–200 MB). Whether the lab runs it as is, with a cheaper light field over empty air, or only headless is not decided. The crown is never clipped to save cost.

## Evidence, not baselines

Every calibration made between the τ 0.2 walls (the species fits' lone tree, C1's rounds, the crown-base screens, the self-pruning and flat-cap notes) was made in a different world. They are marked as evidence, not baselines.
