# Lean audit: why the simulated beech lean one way (2026-11-05)

_Diagnosis only: nothing under src/, rust/, cli/ or tests/ changed; nothing launched. Scripts:
`analysis/experiments/lean_dump.ts` (one trial's dump with params-only controls) and `lean_audit.py`
(`runs|sky|real|bole|report`); summaries in `runs/lean-audit-v2/`. Figure:
[figures/2026-11-05-lean-audit.png](figures/2026-11-05-lean-audit.png)._

## Verdict
**An artefact of the seedling's frame, carried by Troll's set point.** Every seedling is planted with the reference
L = +x (`rust/core/src/principles/c1.rs:179–182`). Beech's trunk aims each new leader shoot `levels[0].setPoint`
(40°, all three assigns) off vertical, toward the azimuth `horizontal_heading` returns (`c4.rs:13–19`): d's own flat
part, and for a vertical d, L's flat part. So every tree's first leader leans toward world +x. From then on the
leader's own lean picks the side, and the lean feeds itself. Flip only L's sign (lean −1e-6°: sky, slab, planting and
every RNG draw unchanged) and the lean flips with it: seasons 2–10 near exactly, and season 70 on average.

- **Not the sky.** With symmetric faces and skyTilt 0, the sky's net horizontal weight is at most 1.8% in any one season.
  Over seasons 1–5 its mean is 0.3% toward **−x**: the wrong sign, and too small.
- **Not the stand's geometry.** Mirroring the planting leaves the lean at +x.
- **Not when the tree is planted.** Planting at season 7 or 13 shifts the sky's phase but leaves the young leaders
  at +x.
- **Model behaviour, unaffected by the fix:**
  - The arch itself: the leader's top 2 m sits at 35–40° from vertical in every condition. That is the set point,
    straightened behind by R3's posture.
  - The lean's magnitude, which is too large against BioDiv (§1c).
  - Rows near the opaque faces lean inward in depth.

## 1. Measurements (seeds 1–20; stand at season 70, all 12 trees; lone tree at 100)
Azimuths are measured from world +x (0°); +90° points into the slab, toward the back face. R is the Rayleigh mean
resultant length; p is Zar's approximation.

### a. The lean's direction, L = +x as shipped
| set | n | mean az | R | p | x+ | x lean (m) | crown centroid x (m) |
|---|---|---|---|---|---|---|---|
| hand stand, middle row | 75 | 352° | 0.56 | 3e-11 | 64/75 | +2.11 | +1.12 |
| v3 stand, middle row | 76 | 356° | 0.46 | 3e-8 | 61/76 | +1.91 | +1.06 |
| v4 stand, middle row | 78 | 0° | 0.25 | 7e-3 | 53/78 | +1.06 | +0.53 |
| hand stand, all 12 | 224 | 358° | 0.46 | 6e-21 | 174/224 | +1.84 | +1.13 |
| every set, age 2 (stand) | 240 | 357–358° | 0.79–0.84 | < 1e-60 | 231–236/240 | | |
| every set, age 10 (stand) | 240 | 357–358° | 0.82–0.85 | < 1e-65 | 234–236/240 | | |
| lone tree (τ 0.2), age 10 | 20 | 3–7° | 0.78–0.83 | < 1e-6 | 19–20/20 | | |
| lone tree (τ 0.2), age 100 | 20 | 0°, 183°, 20° | 0.13–0.25 | 0.28–0.73 | 10–12/20 | | |

- **The crown session's 1.7 m.** The stand's crown centroids sit +1.1 m in x and flip to −1.1 m when L flips. That
  explains the "+x reach" recorded in ADR 0051.
- **The lone tree at 100 is not a clean read.** Its highest twig sits on a fork limb (the path's tilt at mid-height is
  ≈ 50°), so the chord measures the crown, not the bole. Its early lean, ages 2–10, is as concentrated as the stand's.
- **Depth, a real and symmetric effect.** The front row leans +1.5 to +1.7 m into the slab and the back row −1.1 to
  −1.9 m. Both lean away from their opaque face, toward the light in the slab's middle. This survives every L control
  and averages out (all 12: dy ≈ 0).

### b. The controls (the verdict rests on 1 and 2)
1. **Paired flip, lone tree on an open plot** (faces [1, 1], open x; lean 0 against −ε, same seed). x lean mean,
   L = +x against L = −x:

| assign | age 2 | age 10 | age 100 |
|---|---|---|---|
| hand | +0.14 / −0.16 (18 of 20 flip) | +0.97 / −1.06 (17) | +1.61 / +0.41 (8) |
| v3 | +0.14 / −0.16 (18) | +1.10 / −1.09 (18) | +3.42 / +1.23 (7) |
| v4 | +0.14 / −0.13 (19) | +1.04 / −1.02 (19) | −0.50 / +1.41 (8) |

   It is a near-exact mirror while the leader is the tree. By 100 the realisations have diverged, and the chord reads
   the fork limbs.
2. **Paired flip, stand:**

| assign | age 2 | age 10 | age 70 | centroid x at 70 |
|---|---|---|---|---|
| hand | +0.16 / −0.16 (229 of 240 flip) | +1.08 / −1.07 (227) | +1.80 / −2.11 (143 of 211) | +1.09 / −1.10 |
| v3 | +0.16 / −0.15 (228) | +1.14 / −1.10 (229) | +2.06 / −2.20 (162 of 218) | +1.19 / −1.17 |
| v4 | +0.13 / −0.14 (222) | +1.06 / −1.03 (228) | +1.53 / −1.40 (136 of 221) | +0.92 / −0.81 |

   The means mirror (their sum is −0.31 to +0.12 m against ±1.4–2.2 m). The per-tree realisations decorrelate
   (corr ≈ 0), as a chaotic system's do: the flip moves the side, not the tree.
3. **Sky phase** (the hand, L = +x, planted at season 0, 7 and 13): the young leaders aim 1–8° in every case (ages 2–10,
   R 0.66–0.79). A sky imbalance would move with the phase; this does not. The sky's own net horizontal weight
   (`lean_audit.py sky`, a re-derivation of `slab_sweep.rs` `sky` and `sky_offsets`) is at most 0.018 in any season.
   Its means are (−0.003, −0.001) over seasons 1–5 and (−0.0004, −0.0001) over 1–70.
4. **Alternating ±ε per tree** (supporting evidence only): the stand's azimuths go uniform. All 12: R 0.04–0.09,
   p 0.13–0.75; age 2: R 0.02. The lean's magnitude is unchanged: hand middle row 10.1° against 9.0°; all 12, 11.6°
   against 10.2°.
5. **Mirrored planting** (x → W − x, which tests perArea's stagger): still +x (az 0–5°, R 0.39–0.47). The stagger is
   not the cause. This control does not test the sky, whose golden-angle set has a handedness that a mirrored planting
   cannot reverse. Swapping the faces is a no-op at [0, 0] and at [0.2, 0.2], so it was not run.

### c. Real lean (addition 1)
The chord lean angle (top relative to base) on BioDiv's 53 beeches, median over the optimum set's repeats
(`lean_audit.py real`): **median 4.1°** (IQR 2.6–6.3°, p90 8.9°, max 14.7°). Simulated:

| set | median | IQR |
|---|---|---|
| hand stand 70, middle row | 9.0° | 5.6–11.7° |
| v3 stand 70 | 10.4° | 7.1–12.7° |
| v4 stand 70 | 9.3° | 6.8–12.1° |
| lone 100 (τ 0.2), hand / v3 / v4 | 16.4° / 13.3° / 12.4° | |

**The simulated stand leans about 2.3× the real**, and on seeds 101–110 (§5) 1 of 37 (hand), 4 of 39 (v3) and 12 of 40 (v4) exceed the real
maximum. This is
independent of the azimuth: alternating L leaves it unchanged. **Proposed: chord lean angle as a gate c candidate
descriptor**, taken through gate c's protocol (floor, control, tiers) before any registration, never added straight to
v6. It overlaps boleSway (corr 0.61–0.82 per tree, §5), so the gate should test whether it adds anything beyond
boleSway.

## 2. The positive feedback, and the arch (addition 3)
- **What the dumps show.** The leader's top 2 m stands at 35–40° from vertical in every set (stand and lone; the hand
  shaded ≈ 37°, as R5's δ_A scales 40° down). It aims within 17–19° of the chord's azimuth (median; 190–198 of
  ≈ 225 within 45°). So the leader keeps aiming at its set point to the same side for 70 seasons. The chord lean grows
  from 9° at age 1 to 27° at age 10. The path's tilt at 10% of height falls from 23° at age 10 to 4–5° at age 70
  (R3's straightening). At age 70 the stand's path tilts 3–4° at 10% of its height, 10–12° at 50% and 31–37° at 90%:
  an arch that steepens toward the top.
- **Does the feedback alone make the hard arching?** No. Feedback and set point do separate jobs:
  - **The set point makes the arch's angle.** Every new leader shoot aims 40° off vertical whatever its history. An
    azimuth drawn fresh each season would still give a 40° tip.
  - **The feedback makes the arch coherent.** `horizontal_heading` takes d's own flat part, so the side never
    changes. Bends accumulate on one side instead of random-walking, and R3's straightening, capped at c·Δr/r, cannot
    keep up on a slow stand stem. The suppressed trees bend over: §5's flagged trees are 12–16 m tall against the
    stand's 23.
  - **The coherence is not shared between trees.** Under alternating L each tree still leans 10–12°, but on its own
    side. The shared direction is the artefact; the magnitude is model behaviour.
- **Is a relaying leader the biological resolution?** Probably, as Troll's model has it (Hallé, Oldeman & Tomlinson
  1978, cited from memory, unread). The arching axis is overtaken by an erect shoot from the upper side of its curve,
  and the old tip becomes a limb.
  - The core's relay (r2.relay 2, relayAge 15; `r2.rs:290–305`, ADR 0033) has three gaps:
    - It acts only after an apex has *ended* (relayPTerm 0.15, gated off by crowding: relayCrowd 10). A stand leader
      seldom ends.
    - The relay shoot itself takes pa 0's set point, 40° along its own heading. A relay does not restart vertical.
    - The arched tip is not demoted.
  - **Proposed, not implemented; an ADR, since it changes the trunk's rule:** a relay (or a new leader) starts at
    set point 0 and takes Troll's arch only after n nodes. The relay is triggered by the leader's tilt (when the tip
    passes A_set while the tree is in a stand), not only by an ended apex. The overtaken tip drops to pa 1.
  - The alternative, R3's straightening (the crown-base note's candidate), would reduce sway behind the tip but not
    the tip's 40°.
  - Either needs its own probe against lean angle and boleSway. Neither is a knob (ADR 0029's ten do not include
    them).

## 3. Every directional input a shoot reads (from the code)

| input | where | world-fixed bias? |
|---|---|---|
| **The seedling's frame:** h = up, **L = +x** (lean 0) | `rust/core/src/principles/c1.rs:179–182` | **yes, the source**: every tree starts with the same L |
| **C4's set-point target:** azimuth from `horizontal_heading` = d's flat part, else L's, else +x | `c4.rs:13–19`, `c4.rs:22–29` | **yes, the carrier**: a vertical leader with A_set ≠ 0 aims along L's flat part, +x for every tree |
| The trunk's A_set: `direction_params` → `levels[0].setPoint` (beech 40°, η 0.4; all three assigns) | `r2.rs:377–389`; per-shoot in `season.rs:502–539` | no by itself (it sets the angle, not the azimuth), but it is what makes the carrier matter |
| R5's δ_A: A_set × max(0, 1 − dA·shade) | `r5.rs:37–43`, `season.rs:488, 535–537` | no (magnitude only) |
| The trunk's curve and aged offsets | `r2.rs` `curve_offset` (trunk → 0), `aged_offset:411–414` (trunk → 0) | no (off on the trunk) |
| Light orthotropy | `r2.rs:248–276` (pa < 1 exempt) | no (not on the trunk) |
| Phototropism ξ·V | `c4.rs:46–53`; V from the slab sweep | only through the sky (below) |
| The sky: K = 16 directions, golden-angle azimuths, band offset and azimuth turn per **season** | `light/slab_sweep.rs:4–9, 65–94, 112–118` | possible: the same for every seed in a given season; measured below |
| Sky tilt: weights × max(0, 1 + tilt·d_x) | `slab_sweep.rs:96–110` | yes when ≠ 0; **0** in every trial here (oakOpen's c2) |
| Periodic x (the stand's ring) | `slab_sweep.rs:17, 298–302`; `light/mod.rs:61–63` | no (a ring has no side) |
| The z faces, τ front and back | `slab_sweep.rs:17–20`; `light/mod.rs:3, 61` | in depth only, and symmetric when τ_front = τ_back ([0, 0] stand, [0.2, 0.2] lone); swapping them is a no-op here |
| Direction noise: d_prev turned by N(0, σ²) about an axis at a uniform azimuth from L | `c4.rs:33–42`; `season.rs:506–510` (`DIRECTION_NOISE`) | no (uniform azimuth; keyed by tree, metamer, season) |
| R3 posture: toward `set_point_direction(h, l, postureSetPoint)` and the previous metamer, capped at c·Δr/r | `r3.rs:44–76` | through the same carrier, but the trunk's posture set point is 0 (vertical), which has no azimuth |
| R3 ground rest: `horizontal_heading(h, l)` | `r3.rs:285` | the same +x fallback, only for a vertical shoot touching the ground (never here) |
| `any_perpendicular`: h × up, else +x | `geom.rs:58–61`, used at `c1.rs:124` | the fallback for a lateral parallel to its host only |
| Phyllotaxis from the seedling's L (distichous) | `c1.rs` `form_axillary_buds` | world-fixed *plane*, ± symmetric: an axis bias, not a side |

## 4. The proposed fix (not implemented)
**A per-tree azimuth for the seedling's frame.** `plant_seedling` takes L = (cos φ, 0, sin φ) rotated about the
vertical by φ = 2π·uniform(seed, purpose::SEEDLING_AZIMUTH, tree, birthId, season, 0). The purpose is a new
registered one in `rng.rs`, never renumbered. With lean ≠ 0 the lean's plane turns by the same φ, or `lean` keeps its
x–y meaning and φ applies only when lean = 0 (ADR's choice). A bug-fix note in the devlog, and **an ADR**, because it
adds an RNG purpose and changes every tree's realisation.
- **Expected effect:** the stand's azimuths go uniform, as under alternating L (R ≈ 0.05). The lean's magnitude, the
  arch and boleSway's per-tree sway barely move (alternating L: lean 10–12°, top 2 m at 37°). The coherence between
  neighbours goes. A stand that leans all one way is a wind-swept stand; one with random leans is not. Crown
  interpenetration, ADR 0051's +x reach and the floor light may shift, unpredicted.
- **The goldens: all change.** L sets every tree's phyllotaxis plane (distichous and spiral alike) and the noise's
  azimuth origin, so every case changes (`tests/golden.json`'s 16), not only those with a trunk set point. Those with
  one: beech (40°: `beechOpen`, `beechWood`, `mixedWood`, `forest` and the species presets) and hornbeam (30°).
  `troll`'s own c4/r2 set points need a check at implementation.
- **What it invalidates, and the re-run order (addition 2):**
  1. goldens (`npm run golden:update` with the reason);
  2. Level 0 fits, every species (the realisations change; the 20-seed evidence of floor, H/D and crown base re-runs
     with them);
  3. gate c's simulated rows (the d_min control and tiers read simulated trees);
  4. Level 1 (v6 re-registered on the new core).

  The existing fits stay, as the "before" (`docs/experiments/fits/`). v6 is not launched until 1–3 have been done.
- **What it does not fix:** the lean's magnitude (§1c) and the bent-over suppressed trees (§5). Those are §2's
  question, for the user.

## 5. boleSway re-read, with the bent-over trees flagged (diagnostic only)
crown-base's ztable trees (seeds 101–110, season 70, the measured four, coarsened as v5). Flagged: chord lean above
BioDiv's maximum, 14.7°. Real boleSway 0.0182 per metre (SD 0.0082).

| set | n | flagged | their height (others) | z, all | spread, all | z, flagged out | spread, flagged out | corr(lean, sway) |
|---|---|---|---|---|---|---|---|---|
| hand | 37 | 1 | 16.3 m (22.6) | +0.72 | 2.68× | +0.64 | **1.44×** | 0.74 |
| v3 | 39 | 4 | 15.3 m (22.5) | +1.52 | 2.81× | +1.49 | **1.40×** | 0.61 |
| v4 | 40 | 12 | 12.5 m (23.5) | +2.10 | 6.45× | +1.57 | **1.21×** | 0.82 |

- **The spread excess is the bent-over trees.** Without them every set passes the ×2 spread rule. They are suppressed
  trees: shorter, and thinner (DBH 0.25–0.28 against 0.30 m).
- **The location excess is not.** z stays +0.6 to +1.6, so the straight trees sway more than the real ones too (the
  crown-base note's set point and straightening).
- v4 has 12 of 40 bent over; its form knobs (kappa 0.22, branchAngle (1) 40°) make more of them.
- The same trees on seeds 101–110 lean +x (32 of 37, 30 of 39, 32 of 40), so the sheet showed the artefact as drawn.

## After ADR 0054 (the per-tree seedling azimuth; same script, unchanged)
The fix, [ADR 0054](../decisions/0054-seedling-azimuth.md), turns each seedling's L by φ = 2π·uniform(seed,
`SEEDLING_AZIMUTH`, tree id). It is checked by `lean_audit.py runs|sky|report` unchanged, on the new core (summaries in
`runs/lean-audit-v2`; before, in `runs/lean-audit-v2-before`), and by `lean_geometry.py` on both. Figure:
[figures/2026-11-05-lean-audit-after.png](figures/2026-11-05-lean-audit-after.png).

The lean-0 rows (L = +x, the name kept), at season 70 (stand) and 100 (lone):

| set | before: az, R, p | after: az, R, p | lean, before → after | centroid x (m), before → after |
|---|---|---|---|---|
| hand stand, middle row | 352°, 0.56, 3e-11 | 27°, 0.09, **0.56** | 9.0° → 7.7° | +1.12 → **−0.00** |
| hand stand, all 12 | 358°, 0.46, 6e-21 | 345°, 0.09, 0.18 | 10.2° → 9.7° | +1.13 → +0.04 |
| v3 stand, middle row | 356°, 0.46, 3e-8 | 354°, 0.23, **0.016** | 10.4° → 10.4° | +1.06 → +0.30 |
| v3 stand, all 12 | 358°, 0.50, 1e-24 | 45°, 0.03, 0.85 | 12.0° → 12.5° | +1.20 → −0.02 |
| v4 stand, middle row | 0°, 0.25, 7e-3 | 37°, 0.03, 0.94 | 9.3° → 9.0° | +0.53 → +0.22 |
| v4 stand, all 12 | 1°, 0.36, 4e-14 | 83°, 0.06, 0.47 | 11.3° → 11.3° | +0.92 → +0.12 |
| lone (open; τ 0.2), hand | p 0.08; 0.28 | p 0.22; 0.47 | 13.8°, 16.4° → 15.8°, 15.3° | |
| lone, v3 / v4 (open) | p 0.14 / 0.90 | p 0.19 / 0.40 | | |
| young leaders, stand age 2 (all three) | R 0.79–0.84, p < 1e-60 | R 0.07–0.11, p 0.07–0.30 | | |
| young leaders, lone age 2–10 | R 0.71–0.83, p < 1e-5 | R 0.25–0.30, p 0.17–0.30 | | |

- **The one-way lean is gone.** Every lean-0 set is uniform but one: v3's middle row (p 0.016, R 0.23). Its own
  all 12 read p 0.85, and about one test in 20 falls under 0.05 by chance; it is reported, not explained away. Hand's
  crown centroid offset in x is −0.00 m (it was +1.12).
- **The lean's magnitude stays as it was:** 7.7–10.4° on the middle rows, 9.7–12.5° on all 12. That is near
  alternating-L's 10.1° and 11.6° (hand), and still ≈ 2.3× BioDiv's 4.1°. The arch stays: the top 2 m at 33–37°.
  That is the separate ADR's question.
- **The ±ε rows** now lean where the world lean tells them (+x and −x). Lean keeps its world meaning by design; this is
  not the bias.

### The slab's geometry (`lean_geometry.py`: an axial test, which a ±x concentration of either sign would fail)
| set (after) | axial R, p, axis | SD of x / depth lean (m) | tops past a face | lean 3D / as drawn |
|---|---|---|---|---|
| hand stand, middle / all 12 | 0.11, 0.41 / 0.07, 0.30 | 2.91 / 2.56; 3.01 / 2.69 | 0 of 221 | 7.7° / 5.2° |
| v3 stand, middle / all 12 | 0.05, 0.85 / 0.11, 0.05 | 3.17 / 2.93; 3.31 / 3.05 | 0 of 229 | 10.4° / 6.9° |
| v4 stand, middle / all 12 | 0.13, 0.26 / **0.23, 6e-6, 5°** | 3.15 / 2.67; 3.33 / 2.52 | 1 of 229 | 9.0° / 6.2° |
| v4 front / back rows | 0.28, 3e-3 / 0.28, 2e-3 (both ≈ ±x) | 3.40 / 2.03; 3.36 / 2.16 | | |
| lone, age 1 (φ alone, before any growth) | 0.35, 0.09, 168° | | | |
| lone, age 10 / 100 (hand) | 0.32, 0.13 / 0.41, 0.03 | 1.10 / 0.77 (age 10) | 0 | |

- **The lone tree's ±x tendency is in its 20 draws, not the slab.** At age 1 the lean is just L's draw, and it is
  already axial at R 0.35. hand, v3 and v4 share those draws (φ keys on seed and tree id, not the assign), so their
  three lone sets are one sample, not three.
- **The stand's middle row is not axially concentrated in any set** (p 0.26–0.85).
- **A slab limitation, recorded and not fixed here (ADR 0024; the user's ruling):**
  - **The face rows:** in the rows next to the opaque faces, depth leans are damped and gather on ±x as the stand
    grows. v4 shows it most: axial p 3e-3 in each face row at 70, against R 0.10 at age 1 over all 12. Over the whole
    stand, depth's SD runs 8–24% under x's (all 12).
  - **No crown grows past a face** (1 top of 679).
  - **What it affects:** the stand trial's face rows, and any read of the front view alone (Level 0's lone-tree width
    and W/H, which read x only).
  - **The picture:** a lean into depth looks straighter in the frontal picture (as drawn, 5–7°, against 8–10° in 3D).
- **The depth effect the audit found stays as it was.** Front and back rows lean inward (+1.6 to +2.2 m, and −0.9 to
  −1.9 m in depth), away from the dark faces.

## Next (for the user)
1. **The fix (§4): done as ADR 0054** (above). The re-run order is in the reference plan's State. v6 is superseded;
   the re-registration is v7.
2. **Lean angle as a gate c candidate (§1c)**, and **Troll's relay (§2)** as the candidate remedy for the magnitude,
   probed after the fix.
