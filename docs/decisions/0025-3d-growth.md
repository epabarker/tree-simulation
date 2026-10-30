# 0025: How the trees grow in 3D (I2)

- **Status:** accepted (the user, 2026-10-31, after V); proposed with I2 (2026-10-30).
- **Date:** 2026-10-30
- **Spec:** §5 (topology), §C1.4–C1.5 (phyllotaxis), §C2.8, §C4, §R3, §R4, §O2, §O4; ADR 0004, 0009, 0011, 0012, 0013, 0024.
- **Note:** [I2](../experiments/2026-10-30-i2-3d-growth.md).

## Context
ADR 0024 decided that the trees grow in a slab W × H × D (D = 64), open in z with a transmission τ at each face, and that 3D replaces 2D in place, with no dual mode. The review (§4) listed what that changes: topology, directions, C4, R3, R4's bud bank, the light, the formats, and every calibrated result. I2 is the first milestone that changes behaviour. These are the choices it made where the spec, the review and the brief left room.

## Decision
**Frames, not angles.** Every metamer and bud carries a heading H (unit, y up) and a reference L ⟂ H. A shoot's frame is carried from bud to metamer to metamer by parallel transport (the least rotation from one heading to the next), so phyllotaxis follows its axis as it bends, whatever way the axis lies in the world. A metamer runs from its base along H; the base of each is its parent's tip.

**Slots by phyllotaxis.** A node has the main slot (0) and up to seven laterals (1–7; the slot scratch's stride is 8). Lateral j of a node at place k on its axis sits at azimuth φ = φ_axis + k·δ + j·2π/n round its parent's H from the parent's L, tilted β from H. φ_axis is a draw per axis (the `sideSequence` purpose, re-used). δ and n:
- **spiral** (new): one lateral a node, δ = c1.divergence (137.5°);
- **distichous:** one, δ = 180°;
- **opposite:** two at 180°, δ = 90° (decussate);
- **whorled:** n = the level's `whorl` (default 4, at most 7), each whorl offset π/n from the last;
- without R2, `c1.phyllotaxis` (spiral by default, or distichous).

A lateral's own L points to its parent axis's side (adaxial). Each metamer keeps its `azimuth`, so R4's bud bank puts a dormant bud back where a shed branch was, at the same azimuth round the parent as it now lies.

**Species' phyllotaxis.** 2D's only planar sequence was distichous, so every fitted species had distichous rows; in 3D that would put all of a tree's first-order branches in one plane through its trunk. Each species now takes its botanical phyllotaxis where its rows said distichous, an overlay in `flora.ts` (the fitted file is generated, not edited): spiral alternate in birch, oak, holly, rowan, goat willow and Scots pine's laterals; distichous in beech, hornbeam and silver fir's flat sprays; decussate in field maple. Whorls stay. This is a trait, not a fit; C6 calibrates the rest.

**C4 as a vector sum.** d = normalize(w_d·d_prev + ξ·V + η·t(A_set) + ε·u), V the slab's 3D light direction. t(A_set) lies in the vertical plane through d_prev's heading (its horizontal part, or the frame's L for a vertical shoot), A_set from vertical. The noise u turns d_prev by σ·N(0, 1) about an axis perpendicular to it at an azimuth drawn round it (`directionNoise`, keys 0–1 for the normal, 2 for the azimuth).

**R3 with vector moments.** Each metamer's base takes the load W (scalar) and first moment S (a 3-vector) of everything above; gravity's moment is M = (S − W·base) × (−ŷ), and only its part across the axis bends (torsion is left out). σ = 4|M|/(πr³) as before. Sag is a rotation φ·l·ΔM/(E·πr⁴/4) about ΔM itself, ΔM the increment since last season (the stored moment is a vector, `mx, my, mz`), capped at 0.2 rad. Posture is a rotation toward the set-point direction (β_g·sin θ) and toward the previous metamer of the axis (γ·kink), together within c·Δr/r. Rotations are composed acropetally (each metamer turns by its own and all its parent's), and buds turn with their metamer. A limb under the ground rests on it on its own heading. In the plane these reduce exactly to 2D's turns, with the same signs.

**E restored.** E = 4·10⁶ (wood's own, ≈ 10 GPa in units of ρ_w·g·cell), for the defaults and every species. 2D had lowered it to 10⁶ (2.5·10⁶ for oak and maple) because a planar limb carried less foliage than the 3D limb it stood for (ADR 0011). Species' own stiffnesses are C2's.

**The light.** C2 is the slab sweep (G3) or the pooled ablation; the shadow triangle and the 2D sky sweep are gone (at the tag `golden-2d-ts`). K = 16 with rotation on by default. The sky's tilt (an oblique sun) carries over as weights × max(0, 1 + tilt·d_x). Walls are leaf area through the slab's whole depth. τ is `world.faces` [front, back], default [0.2, 0.2] (the wood interior), and the lab sets it (a "World" folder with the three looks); `world.fade` fades Q over the last cells before a face (default 0).

**Fixed lanes.** The light is computed as four fixed partial fields (directions k ≡ lane mod 4), summed in lane order, whether the lanes run one after another or on four threads (`threads`): the same bits either way, as the review's Q6 required. `compute` (one march over every direction) stays for G3's tests.

**The world on the ground plane.** Trees stand at (x, z) (`trees[].z`, default the slab's middle). O4's seeds land a Laplace(0, d) distance away at a drawn azimuth (`dispersal`, key 1), and are lost beyond a face; seed rain lands anywhere on the ground; spacing is by distance on the ground. The owner grid (O2, R5) is the slab's, W × H × D; abrasion sways in x and z; R5's neighbour signal reads the 3 × 3 column above a node.

**Formats.**
- **Tables** (`types.ts` ⇄ `tree.rs`): metamers gain baseZ, H, L, azimuth and the moment's vector, lose angle and moment; buds gain H, L, azimuth and vz, lose angle.
- **The snapshot** gains z0, the heading and the reference. `angle` and `length` are the segment as drawn in the picture's plane, so today's renderer rebuilds positions as before.
- **Metrics** gain rootZ, crownDepth and centroidOffsetZ, appended.
- **Checkpoints** are version 2. Version 1 (2D) still loads, as a planar forest in a one-cell slab (its params have no depth).
- **The CLI's** metamers.csv gains z0, z1 and the heading.

**Goldens.** `tests/golden.json` holds 14 new 3D cases, natively and in WASM. The 2D goldens stay at the tag, run by CI's `golden-2d` job.

**The 2D evidence.** The milestone tests whose thresholds were calibrated on the 2D model (`tests/evidence-2d/`) leave the default run. They are calibration's backlog (C1–C8), runnable with `npm run evidence:2d`, and each will be re-derived in 3D under the seed rule (AGENTS.md). The structural ones (checkpoints, obstacles, trials, storms, the invariants) run on the 3D core in the default suite.

**The page.** ADR 0008's pseudo-depth squeeze is off; branches draw far to near by z. The 3D renderer (depth-ordered drawing of leaves and wood, the GPU tween) is I3's. The preview of V draws orthographically through the prototype's slab view. 3D first paint is Q7, at I3: `cli/first-paint.ts` grows no opening forests until then.

## Consequences
- **Easier:** trees that grow in three dimensions, as ADR 0024 decided; phyllotaxis as a species trait; mechanics in 3D with physical stiffness; the same bits on any lane count.
- **Harder:**
  - every calibrated result moves (the 2D evidence is the backlog);
  - the full model carries far more metamers in 3D than the review projected (the I2 note);
  - the live garden stays on 0.14.0 until the 3D one passes C7, as the review said.
- **Revisit** at V (whether 3D-grown crowns are worth it), or if calibration finds a phyllotaxis or a moment the model needs that this leaves out (torsion, or a whorl of more than seven).
