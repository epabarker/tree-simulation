# 3D port: an independent review, and the path to a finished garden (2026-11-01)

**For:** the user, and the sessions that follow.
**Answers:** the [handover](2026-11-01-3d-port-handover.md), at `3d-port` eb5547d (PR #22 merged, C1 rounds 1–2).
**Method:** a read of the docs, the code (`rust/core`, `src/web`, `src/core`, `cli/`, `tests/`) and CI. Nothing was re-run: every number below is from the notes, or derived from the code with the derivation shown. The derivations are claims for round 3 to check by measurement.

## 1. Summary
- **The engineering is in good shape.**
  - A Rust core of ≈ 10k lines with 98 unit tests and 14 3D goldens, bit-identical natively, in WASM and on one lane or four.
  - Deterministic across engines, which the 2D core never was.
  - No TODO or FIXME in `rust/`, and CI green on every run since I1.
  - Memory is measured and budgeted (ADR 0026), and the phone's seasons fit in one lane.
- **The process is the project's strength:** every number traces to a note with its commands, decisions are ADRs, and explorations say they are not evidence. Keep it.
- **Calibration is at its start, not its middle.** One of C1's four targets is met (generic presets level off); floor, crown base and H/D are not. All ten species are 2D fits. C2–C8 have not started.
- **The picture is still 2D's.** I3 has not started: the garden draws the 3D core through the 2D renderer.
- **Three of round 2's diagnoses need correcting** (§3): the sapwood cost, the zenith, and beech's parameters. Each changes what round 3 measures first.

## 2. Against the goal
The goal (user, 2026-11-01): realistic trees calibrated to real species, drawn as a flat projection on the personal website, performant on most laptops and phones.

| Goal | Where it stands |
|---|---|
| **Realistic, species-calibrated** | Floor 17% (target 2–10%); crown ratio 0.99 everywhere (should lift in a stand); H/D 6–18 (target 60–80). Beech and hornbeam run to the 200 top. 39 of 78 backlog tests pass. |
| **A flat projection on the site** | The snapshot projects each metamer to an in-plane angle and length (`snapshot.rs:113`). Only WebGL2 sorts wood far to near by `z0`; leaves are drawn after all wood, unsorted; Canvas 2D ignores depth. No plate cap, no 3D first paint (`FIRST_PAINT_3D = false`), framing under the 200 top unsolved. |
| **Performant on most devices** | On the Pixel 8a: 67–219 ms a season in one lane, against 250 ms. Those predate round 2, which took `forest` from 59k to 105k metamers and tripled the garden's planting. The Pixel 8a is mid-range, so slower phones have no headroom. Memory is fine (70 MB phone, 165 MB laptop). |

## 3. Corrections to round 2
### 3.1 R1's sapwood cost does not grow with trunk thickness
`r1.rs:66–77` charges each metamer m_w·π·r_live²·l, where r_live is the pipe of the live tips above it: r_live² = Σ r0^n over tips^(2/n). At n = 2 that is tips·r0², so the tree's wood cost is m_w·π·r0²·Σ(path length to each live tip). It is linear in tips, and the radius C6 actually lays down never enters it.
- **So thick trunks do not raise R1's cost ratio.** That fits round 2's measured P_b/M_b ≈ 4–5 (M/P ≈ 20–25%), close to 2D's.
- **Drop "R1's sapwood cost through thick trunks" from the leaf-area limiters** (handover §4.2).
- **H/D is C6's alone.** The trunk's radius is r0·√tips. 20–50× 2D's tips give 4.5–7× the radius, which is about round 2's 4–10× too thick.
- **The cheap fix:** lower r0 for H/D, and raise m_w so m_w·r0² stays the same. R1 then pays exactly what it pays now, so its calibration (the plateau at 82–87) survives. One knob, before any floor knob.

### 3.2 The sky has a near-zenith band
`slab_sweep.rs:76–81` splits sin(elevation) into K equal bands from sin 15° to 1, which are equal solid angles. At K = 16 the top band spans 72.5–90°; its static direction is at 77.7°, and rotation moves it through the band.
- **Round 2's "none at the zenith" is inaccurate,** and the sky needs no extra zenith band (handover §4.1).
- **Why the floor is the same under crowns as in gaps:** the canopy is a thin layer high up. Crowns are ≈ 0.25 × height deep (≈ 21 cells) at heights of 60–83. Even the near-zenith direction reaches the floor 15–20 cells sideways from where it entered the canopy; the oblique ones 50–75. Every ray samples the canopy's mean.
- **The limiter is leaf area.** A floor of 17% is an effective k·LAI ≈ 1.8 (−ln 0.17). At k_ext 0.5 that is an LAI of ≈ 3.5 in model units. Closed temperate stands carry 4–7 (spec §10's crown LAI 2–8), and 2–10% on the floor needs k·LAI ≈ 2.3–3.9. The stand needs 1.3–2× its leaf area, not a different sky.
- **Round 3 measures this first:** stand LAI from `ground.csv`, the canopy's leaf area by height, then the bud budget (the share of buds with v ≥ 1, bud fates, leaf area a bud). `r6.leafArea` raises leaf area without adding metamers, so it costs no compute; more metamers do.

### 3.3 The beech wood runs on the fitted beech, not the hand one
Round 2 explains the runaway by beech's "m_f 0.035 and no L_h of its own, so 60". Those are `HAND_FLORA`'s values. The woods run `FLORA`, the fitted species (`rust/presets.json`):

| Species | L_h (hyperbolic) | m_f | Q_ss | r0 |
|---|---|---|---|---|
| beech | 108.9 | 0.077 | 0.0126 | 0.0248 |
| hornbeam | 92.4 | 0.082 | 0.0126 | 0.0249 |
| oak (levels off) | 41.0 | 0.055 | 0.113 | 0.0226 |

- **The hyperbolic discount at L_h 109 is 0.35 at a 200-cell path.** Production hardly falls with height inside the world, so nothing stops the climb below the top.
- **Q_ss 0.013 keeps short shoots in leaf down to 1.3% light**, which is how a crown pinned at the top fills with 1.3–2.6M metamers.
- **Both are 2D fits** (ADR 0020, 0021). Hand-setting L_h (round 2 tried 40 and 30) moves one symptom. **The fix is a 3D re-fit** against the same literature targets (§5, track 3).

### 3.4 The crown-base measure cannot lift
`metrics.rs:164–167` takes the bole as the lowest live first-order branch, and `c1.py` does the same. A single surviving low twig pins the crown ratio at 0.99, and R4's bank makes such twigs legitimately.
- **Redefine it before calibrating against it:** the height below which a small share (say 5%) of the tree's leaf area lies. That is how foresters read a live crown base: the lowest *live crown*, not the lowest twig.
- Keep the old measure as a column, so 2D's numbers stay comparable.

## 4. The handover's questions
1. **Floor and the sky:** reachable with this sky. The sky has a near-zenith band (§3.2), and the limiter is leaf area.
2. **What limits leaf area:** not R1's sapwood (§3.1). Measure LAI and the bud budget first (§3.2). R4 off made the floor brighter, which says bud break is not the limiter either. The remaining candidates are R6's leaf area a bud and how far shoots extend into the gaps.
3. **R5 on neighbours, planting in depth:** sound on the evidence. Own shade made 3D lone trees into poles, and a 64-deep slab with one row is a hedgerow, not a wood. What neighbours-only loses (M10's stand H/D) comes back through C6 (§3.1). The neighbourhood (3 × 3 columns, 12 rows) is hard-coded in `r5.rs`. Record the default as an amendment to ADR 0012.
4. **"R1 needs no change":** right for `forest` and the lone tree; the 300-season curves are flat in every seed. It is not evidence (3 seeds), and it says nothing about the species (§3.3).
5. **Order:** decided below (§5).
6. **Method:** the notes label 3 seeds as exploration, correctly. Two measures need work: the crown base (§3.4) and "own tops" (0.17 for the hedgerow reads a wall, but a 4-cell window is arbitrary). Young tips as a proxy for leaves are fine for coverage; LAI should come from the light field's leaf area (`ground.csv`), not from tips.

Also worth saying:
- **The backlog's 39 failures are three kinds** and should be triaged so the count means something:
  - **retire** the scaffolds that cannot regulate in 3D by construction (`shadow`, R1 off): Beer–Lambert light never reaches zero, so nothing stops a tree;
  - **restate** the 2D-only facts (distichous alternation, whorls of 2);
  - **re-derive** the ≈ 30 calibration misses, at their tracks.
- **Fitting throughput is the long pole.** The 2D fits took ≈ 30k tree-runs per species at ≈ 0.6 s each. A 3D lone tree at 150 seasons costs tens of seconds natively, so a naive re-fit costs 10–50× as much. It needs a plan of its own (§5, track 3).
- **Performance will move again.** Bringing LAI to 4–6 roughly doubles leaves, and metamers with them unless `r6.leafArea` carries it. Re-time the phone after C1 and C2, and again after the species.

## 5. The path (agreed with the user, 2026-11-01)
**Done means a shippable bar:**
- the mixed wood looks right in the garden, in 3D, drawn in depth;
- it runs within budget on the user's phone;
- floor, H/D and crown base hold as evidence at 20 seeds.

C3–C6 and the rest of the backlog follow after shipping. The live site stays on 2D (0.14.0) until then.

**Order:** I3 alongside a merged C1 + C2, alternating sessions. I3 does not depend on parameter values, and calibration needs the 3D picture to be judged by eye.

| Track | What | Done when |
|---|---|---|
| **1. Form (C1 + C2)** | r0 down and m_w up (§3.1); the crown-base measure (§3.4); stand LAI and the bud budget (§3.2); then the floor and crown lift together, calibrated on patterns (Reynolds & Ford 2005) | floor 2–10%, crown ratio lifting in a stand and not alone, stand H/D 60–80, the plateau kept; ≥ 15 of 20 seeds |
| **2. I3** | depth-ordered wood and leaves; the plate cap (≈ 200, ADR 0026) in `plateWidth`; framing under the 200 top; first paint for 3D (Q7: a checkpoint of 1–6 MB, or a live intro with a pace that adapts to the device); drop the snapshot's unread `dir*`/`ref*` columns (≈ 30% of its bytes); re-time the phone | the garden draws a 3D stand in depth on the phone, within budget |
| **3. Species (C7–C8)** | re-fit the garden's species on the 3D core with the existing harness (`analysis/treesim/fit.py`, `cli/trials.ts` with depth): warm-started from the 2D fits, shorter trials, the light on native threads; a throughput measurement first. **Runs overnight on the user's 12-core machine;** sessions prepare the harness and read the results | beech and hornbeam level off below the top; the mixed wood's succession and shade order hold |
| **4. Hold-outs (C3–C6)** | the backlog's carbon, mechanics, release and thinning tests, after the fits; fix what fails and shows | after shipping, except what shows |
| **5. Ship** | ADRs (3D first paint; R5's default); garden release; the site's PR; the user's phone soak; README and ADR 0002's wording | edbarker.dev runs the 3D garden |

## 6. Housekeeping (one commit, any time; none blocks the tracks)
- `principles/c6.rs` has no unit test (pipe sums, memory, stress wood out of the sums).
- `rust/tools/sweep_fixture.ts` imports the deleted `src/core/light/sky-sweep.ts`.
- Stale: `WORLD_HEIGHT = 130` in `garden.ts` (I3), the `GardenOptions.params` doc ("succession"; it is `mixedWood`), the header of `vite.garden.config.ts`, and comments naming deleted `checkpoint.ts`, `form.ts`, `metrics.ts`.
- `wasmMemoryBytes` has no caller: the garden could log it under `?bench`.
- ADR 0008's pseudo-depth code in `scene.ts` is dead on both pages, kept alive by tests; remove it at I3.
- Storms (`o2.stormP`) fire while `o2.enabled` is false: say so in the params, or gate them.
- No Rust test covers checkpoints, v1 → v2 included (the TypeScript tests do).
