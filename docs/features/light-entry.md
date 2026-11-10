# Light entry

A **World effect** (GLOSSARY): how sky enters the slab past its bounds. Decided by the ticket [Should the slab admit side light from its front and back?](https://github.com/epabarker/tree-simulation/issues/82) and recorded in [ADR 0062](../decisions/0062-light-entry.md); spec §C2.13. **Status: the open-grown lone-tree stage is built ([#115](https://github.com/epabarker/tree-simulation/issues/115)); the garden's periodic depth is not yet.**

## What it should look like

- **The lone tree is open-grown:** its crown shows the species' form, not the shape of its box, and it is round in plan (as wide as it is deep), lit equally from all four sides.
- **The box holds the crown at a recorded rate.** At 20 seeds the 60 m box holds most crowns, not all (ADR 0062's amendment). A seed whose crown reached a bound is named and left out of the form's judgement, so a cut crown is never mistaken for a form; no crown is clipped to save cost.
- **The garden's trees stand inside a wood,** not between two walls: side light follows from the stand's density alone (ADR 0058's periodic depth, with ADR 0063's demography).
- **Every species in a world sees the same light.** No species carries a light-entry setting.

## Mechanism

| Part | Decision | Today |
|---|---|---|
| Lone-tree stage | Open sky on all four sides (τ = 1 on both z faces, open x sides), a square 60 m box (240 cells), the tree at its centre, the woods' 50 m top. `oakOpen`, `beechOpen` and `loneTreeParams` (the feature probe's and the species trials' lone tree) | **Built** (#115) |
| Its check | `npm run evidence:open-grown`: the six exemplars × seeds 1–20 to season 100. **The box's bar is the recorded rate** (ADR 0062's amendment): it held oak 19, maple 20, birch 16, beech 18, hornbeam 20 and holly 20 of 20 (not held: oak s15; birch s3 at the top, s5, s13, s18; beech s11, s15). A run that holds fewer fails. Every seed with a bud outside is named and **excluded** from the form's measures, neither a pass nor a fail of the form | **Built** (#115) |
| Roundness in plan | Reported, not a bar: width and depth within 0.75 (min ÷ max) at season 100, over the held seeds: oak 15 of 19, maple 19 of 20, birch 16 of 16, beech 18 of 18, hornbeam 20 of 20, holly 19 of 20. The oak's is a finding | Reported |
| Garden depth | Periodic (`sidesZ: "periodic"`, ADR 0058); D stays 64 unless the density needs more | τ 0.2 faces |
| τ faces | Kept as settings for a host page: wood edge (1, 0.2), hedgerow (1, 1); never a default or a calibration stage | Same |
| `faceWood` | Superseded, kept off and bit-identical | Same |
| Sky | 15–90° (K = 16), unchanged | Same |

**Kept in the half-walled world** (`HALF_WALLED` in presets.ts, 160 × 64 between τ 0.2 faces): the species trials' stands, shade house and woods (`cli/trials.ts`' `trialBase`), which were calibrated there, and the garden's specimen (`specimenParams`), whose worker budget (ADR 0026, `plate.ts`) the open box would not fit. Whether the garden's specimen takes the box is not decided.

## Cost

The lab's open-grown tree costs about 3–4× the half-walled one in time and memory (bench numbers in the devlog, 2026-11-10; the [open-box note](../experiments/2026-11-08-open-box.md) saw 0.9 s/season and 530–700 MB in WASM against 0.3 s and 140–200 MB). Whether the lab runs it as is, with a cheaper light field over empty air, or only headless is not decided. The crown is never clipped to save cost.

## Evidence, not baselines

Every calibration made between the τ 0.2 walls (the species fits' lone tree, C1's rounds, the crown-base screens, the self-pruning and flat-cap notes) was made in a different world. They are marked as evidence, not baselines.
