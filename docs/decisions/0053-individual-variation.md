# 0053: Individual variation: a per-tree draw of the limb-posture parameters (proposed)

- **Status:** proposed (2026-11-05). Drafted from reading only: no simulation, no probe. Nothing below is implemented.
- **Spec:** §C4 (direction noise), §R2 (set points by physiological age), §R3 (posture control), §C3 (Borchert–Honda λ).
  ADR 0002 (keyed randomness), 0029 (the form knobs), 0042 (light orthotropy), 0049 (the principle line;
  acceptance §4: spread within ×2).
- **Evidence:**
  - [pilot v3](../experiments/2026-11-05-level1-beech-pilot-v3.md) (the gate's failure);
  - [the sensitivity note](../experiments/2026-11-04-level1-sensitivity.md) (what moves spread);
  - the registration `analysis/fit/sources/level1-beech.json` v5 (the real spreads);
  - per-tree outputs already on disk: `runs/level1-sensitivity/raw/main-*.json` (69 single-knob conditions,
    seeds 101–110, read for this ADR, not re-run).

## Context
- **The finding.** Pilot v3, beech's first real Level 1 fit, fails ADR 0049 §4 on one clause only.
  - The between-tree spread is too small for limb posture: limbDroop 0.48× real (fitted) and limbUpturn 0.47×
    (held out).
  - Held out passes on 19 of 20 seeds. Every other descriptor's spread is within ×2 (0.54–1.24×).
- **On the hand:**
  - leaderDominance's spread is 0.26× real, tortuosity05's 0.51×, limbUpturn's 0.32×.
  - Of 72 single-knob conditions, 2 bring limbUpturn's spread within ×2, both dLambda at ΔL0 ≥ +22. At ΔL0 ≤ 2
    the best is 0.46× (r1.mf).
- **The framing to correct first:** "deterministic knobs cannot add variance" is half true.
  - A knob can change how far the variance the model already has (light, neighbours, deaths) is amplified.
  - The sensitivity note shows this works for three of the four:
    - r0 at its bound restores leaderDominance's spread to 1.00× at ΔL0 −0.5 (a Level 0 knob, frozen in the pilot);
    - r3.c 0.30 gives limbDroop 0.97× at +0.3;
    - r1.mf 0.02 gives centroidHeight 0.80×.
  - limbUpturn is the one that no affordable knob amplifies enough.
- **What the model lacks** is a source of variation shared by all of one tree's limbs and not by its neighbour's.

## 1. What varies between real beeches in one stand

**BioDiv's 53 trees** (Forest Gap Experiment plots, leaf-off TLS QSMs; between-tree SD after detrending on ln DBH,
95% CI, `level1-beech.json` `real`):

| descriptor | median | between-tree SD (95% CI) | repeat floor (QSM noise) | Demol's SD (15 trees, out of sample) |
|---|---|---|---|---|
| limbUpturn | 13.7° | 10.8° (9.1–13.4) | 4.3° | 10.2° |
| limbDroop | 40.2° | 18.0° (15.0–22.3) | 4.9° | — |
| limbElevation05 | 27.9° | 14.0° (11.7–17.3) | 1.2° | 10.4° |
| leaderDominance | 1.59 | 0.65 (0.55–0.81) | 0.18 | 0.43 |
| tortuosity05 | 1.27 | 0.14 (0.12–0.17) | 0.04 | 0.10 |

- **Real, not reconstruction noise.** The between-tree SD is 2.5–11× the repeat floor in every row.
- **A second site agrees for the posture rows.** Demol (Belgium, 15 trees) gives limbUpturn's SD 10.2° against
  BioDiv's 10.8°.
- **Microsite and history are part of it.** The two treatments of the gap experiment (G 23 trees, GD 30;
  `real_trees_by_gap`) differ in median limbUpturn by 5.0° (12.7 against 17.7), about half a real SD. They differ in
  widestAt by 0.15.
  - The rest of the spread is within a treatment. Splitting it needs the per-tree tables, which are not committed
    (ADR 0049's licence ruling). That is a reading for the probe's step 0, below.
  - Whether the gaps predate most of the measured wood was not checked.
- **The literature** (paraphrased; each verified only at the level stated, mostly the abstract via a search summary; no full text read):
  - **Competition and neighbour position (the best supported):**
    - Old-growth beech crowns shift away from close neighbours. Displacement correlates best with neighbours'
      basal area and position within ≈ 12 m. The authors call the crowns highly plastic (Schröter, Härdtle &
      von Oheimb 2012, *Eur. J. For. Res.* 131:787, doi:10.1007/s10342-011-0552-y; abstract via a search summary).
    - In 55 TLS-scanned beeches, those among other species had longer, flatter branches than those among beech.
      Management intensity changed the height of the widest crown and stem straightness (Juchheim et al. 2017,
      *Trees* 31:1723, doi:10.1007/s00468-017-1581-z; abstract via a search summary).
    - In mixture, beech had flatter branch angles and more ramification than in pure stands (Bayer, Seifert &
      Pretzsch 2013, *Trees* 27:1035, doi:10.1007/s00468-013-0854-4; read from a search summary, not the
      abstract).
  - **Genotype (weak):**
    - A Swedish 33-provenance trial found provenance differences in stem crookedness and double stems, and none in
      lateral branching above 4.5 m (Bergkvist 2019, SLU MSc thesis, not peer-reviewed; abstract). Other trials'
      forking differences (Danish, Romanian) were seen only in a search summary and are not cited.
    - **No heritability of branch angle or limb posture in *Fagus* was found.**
  - **Damage and release:** beech trunk epicormics sprout in a trade-off with radial growth (Colin et al. 2012,
    *Ann. Bot.* 110:995, doi:10.1093/aob/mcs178). No source found that ties release or lost leaders to limb
    posture in beech.
  - **Mechanics of posture:** a stem's long-term inclination is a race between rising self-weight and the
    gravitropic correction made by diameter growth. The balance depends on the tree's dimensions and wood traits
    (Alméras & Fournier 2009, *J. Theor. Biol.* 256:370, doi:10.1016/j.jtbi.2008.10.011; abstract via a search
    summary).
    - The model has this race: R3's sag against reaction wood within c·Δr/r.
    - So a tree that grows girth faster rights its limbs better. Its wood traits are one plausible per-tree factor.
- **Not found:** any published between-tree SD or CV of branch angle or limb inclination within a beech stand. **The
  only measurement of the size of this variation is the QSMs themselves.**

## 2. Where variation enters the model now, and why it misses limb posture

**Every random draw** goes through `rng.rs` (purposes at `rust/core/src/rng.rs:9–21`):

| purpose | where | what it varies |
|---|---|---|
| SIDE_SEQUENCE | `principles/c1.rs:108` (`axis_phase`) | each axis's phyllotactic start |
| DIRECTION_NOISE | `season.rs:509–512` (C4, σ 20°, weight ε 0.5; `params.ts:623`, on in every stand, `presets.ts:27`) | each new metamer's heading, independently by metamer and season |
| SYMPODIAL_TERMINATION | `principles/r2.rs:325` | whether an apex ends |
| WIND | `season.rs:115`, `principles/r3.rs:190` | storms; windthrow |
| ABRASION | `principles/o2.rs:114` | O2 (off in the woods) |
| MORTALITY, DISPERSAL, ESTABLISHMENT, SEED_RAIN | `principles/o4.rs:55–160` | O4: background mortality and recruitment (whether on in the Level 1 stand was not checked) |
| SHEDDING, BUD_BREAK | registered, no call site | — |

**Every draw is per metamer, per axis or per event. None is per tree.**

**Why it reaches the outline (0.85–1.13× real) but not posture:**
- **The outline integrates feedback.** Small heading and termination differences change which buds get light. C3
  then amplifies them through Borchert–Honda, and neighbours and deaths (beech 4–6.6 of 12 by 150) add more. The
  profile and widestAt are where that cascade lands.
- **Posture is pulled back to a parameter every season:**
  - The set point A_set comes from the params by order (`posture_set_point`, `principles/r3.rs:45–50`). Light
    adjusts it only within `lightLo`–`lightHi` (ADR 0042, `principles/r2.rs:248`).
  - Reaction wood turns every metamer toward that set point by up to c·Δr/r (`posture_turn`, `r3.rs:56`; Bastien's
    AC model).
  - C4's noise is drawn independently each metamer and season, so the posture loop should erase it. This is read
    from the code, not measured.
  - Sag depends on load and girth, which are deterministic given the light.
- **leaderDominance follows the same pattern:** λ comes from the order and the tree's age (`lambda_at`,
  `principles/r2.rs:97–108`), and the main share is a deterministic function of Q (`bh_main_share`,
  `principles/c3.rs:54`).
- **Medians average the rest away.** A tree's limbDroop and limbUpturn are medians over its first-order limbs of
  ≥ 10 metamers (`form.rs:87–108`, the same rule in `describe.py`). Independent per-limb noise of SD σ reaches the
  tree's median as roughly 1.25σ/√K for K limbs.
- **A floor compresses limbUpturn.** Upturn is the tip's elevation minus the limb's lowest, so it is ≥ 0
  (`form.rs:105`).
  - On the hand, 27 of 40 trees read exactly 0.
  - Across the 69 conditions, the per-condition SD rises with the median (r 0.58). The fitted line gives 5.9° at
    the real median of 13.7°, about 0.55× real (raw, undetrended; upturn's slope on DBH is −0.27°).
  - So moving the location off the floor (the sensitivity note's ADR list, item 1: tip upturn) would recover part
    of the spread, not all of it. The variation case stands, smaller than the 0.47× suggests.

## 3. Options (each under ADR 0049 §2: a local rule with a measured parameter, never an envelope)

### (a) A per-tree draw of some form parameters
- **What it is:** at a tree's birth, a few form parameters take a value drawn around the species' value, keyed
  `hash(seed, INDIVIDUAL, tree, k)`. That is a new purpose, appended and never renumbered (ADR 0002). The rules are
  unchanged; each tree reads its own value.
- **Which parameters.** The sensitivity note's cheapest movers:
  - limbUpturn: λ (1) (f 0.61 at ΔL0 +1.0) and postureSetPoint (1) (the pair 0.69 at +1.9);
  - limbDroop: r3.c (spread 0.97× at +0.3);
  - leaderDominance: r0 and λ (0).

  Recommended: **postureSetPoint (1) and λ (1) only, first.**
  - Both are form knobs (ADR 0029), not Level 0's.
  - They are what posture and dominance at order 1 read.
  - r0 and r3.c set girth and mechanics, and they move Level 0 (talloH, length0). Their spread can already be had
    by their species value.
- **Its parameter, measured rather than fitted.** No published between-tree SD exists (§1).
  - The SD of the posture set point, σ_A, is read from BioDiv's QSMs: the between-tree SD of each tree's
    first-order limb elevation (the per-cylinder `limbElevation`, report-only since gate c v3, never gated).
  - **That realised SD bounds σ_A from above; it does not measure it.** It already holds sag and light variance,
    which the model reproduces at 0.54× (limbElevation05).
  - **The value used:** that part removed in quadrature. On limbElevation05's numbers,
    √(14.0² − (0.54 · 14.0)²) ≈ 11.8°. The bound is the cap.
  - Step 0 replaces those numbers with `limbElevation`'s own SD less its repeat floor
    (`phase1-tolerances.json`). It was demoted for resolution, so its QSM noise is read first.
  - λ (1)'s SD has no direct QSM analogue. Either it stays 0, or it is set from the length ratio of order-1 to
    trunk growth between trees (`length1`/`length0`; length1 is held out for resolution). That ratio would need
    a registration.
- **What it changes:**
  - **Goldens:** none, with the SDs at 0 by default. Turned on, `forest`, `mixedWood`, `beechWood` and every
    stand golden change, along with every species stand.
  - **Level 0 fits:** the per-tree draws add between-tree variance to height and CR. Tallo's gate reads a median
    z, so it is moved little. lateShare's per-seed noise may rise. Level 0 is re-read, not re-fitted, unless it
    fails.
  - **Checkpoints:** the draw is recomputed from the seed and the tree id, so it adds no bytes (the invariants).
- **How the gates judge it:** ADR 0049 §4 as registered.
  - Location: held out |z| ≤ 2 on 15 of 20.
  - Spread: within ×2 on all 16 descriptors.
  - Level 0's gate is read beside it.
- **The circularity, and the hold-out.**
  - `limbElevation` and the held-out limbElevation05 are one measurement at two resolutions. Once σ_A is set from
    the first, **limbElevation05's spread is calibrated, not evidence**, and it no longer counts toward the spread
    gate's verdict on the draw.
  - **The evidence is limbUpturn's spread on BioDiv**, whose |r| with limbElevation05 is 0.23 at n 53 (near
    independent).
  - **The out-of-sample check is Demol's spreads:** limbUpturn 10.2°, limbElevation05 10.4°. On 15 trees an SD's
    95% CI is about ±35%, so Demol can refute a gross miss, not confirm a match.
- **Local rule or envelope.**
  - It is a local rule: R3 still turns each metamer toward a set point, and only that set point's value is per
    tree. Nothing reads positions, cells or an outcome shape.
  - ADR 0049 §2 also excludes "any knob added to serve a fit". This parameter exists because a gate failed. The
    defence: its value is measured and frozen before any fit and never enters a candidate's search.
  - **That reading is the user's to accept or refuse** (a question, below).
  - The draw *describes* unmodelled causes (neighbour plasticity, microsite, genotype); it does not explain them.
    The spread it produces is put in, not emergent, which is against the project's grain and should be said so.

### (b) Noise inside the posture and dominance rules (per limb)
- **What it is:** each first-order axis draws its own offset to A_set (or to λ at its base), keyed by the axis.
- **What it does:** it raises the spread *within* a tree. By §2's averaging it reaches the per-tree median as about
  1.25σ/√K.
  - Getting 10° of between-tree SD from limbs of K ≈ 10–20 would need σ ≈ 25–35° per limb.
  - That would widen within-tree spread far past anything measured, and nothing gates it.
- **Its parameter:** it could be measured from the QSMs' within-tree SD of limb elevation (the per-limb spread
  around the tree's median). That is a cleaner measurement than (a)'s, but it targets the wrong level.
- **Verdict:** it does not reach the gate's quantity without a per-tree shared part, and with one it is (a).

### (c) History dependence: damage and release events
- **What it is:** posture depends on events.
  - A lost leader re-sets the set point of the limbs that take over (R2's relay already passes the trunk's row to
    a relay).
  - Release after a neighbour's death changes R3's correction rate.
- **What is there already:**
  - The stand has deaths (beech 4–6.6 of 12 by 150), storms (WIND) and the relay.
  - Yet posture spread is 0.47×. Those events change light, and posture reads light only within ADR 0042's band.
- **Its parameter:** an event rate is measurable (mortality, storms). How much posture shifts per event is not.
  It would be fitted, which ADR 0049 rules out.
- **Verdict:** the most realistic in kind, but the least measurable. It has no data here: BioDiv has no stand
  histories, and its gap treatments are one coarse event.

## 4. Recommendation
**(a), on postureSetPoint (1) alone first, with its SD measured from BioDiv's report-only `limbElevation`.**

**Why:**
- It is the only option whose parameter can be read from data without fitting.
- It adds variance at the level the gate reads (per tree).
- It names a cause the literature supports: plasticity to neighbours and microsite (Schröter 2012; Juchheim 2017).
  Genotype is possible but unsupported for posture.
- Its default (SD 0) changes nothing.

λ (1) waits until a measured SD exists. (b) and (c) are not recommended.

**The probe (designed, not run).** The cheapest experiment showing the draw moves limbUpturn's spread toward 1× at
ΔL0 ≤ 2:
- **Step 0 (no simulation, an hour).**
  - From the per-tree QSM tables, local only and never committed:
    - BioDiv's between-tree SD of `limbElevation`, per treatment (G and GD) and pooled; that sets σ_A;
    - the within-treatment share of limbUpturn's SD.
  - `limbElevation`'s repeat floor (`phase1-tolerances.json`), and σ_A as in §3(a).
  - Optional, reported only: emulate the draw from the 69 conditions on disk (the hand's trees pooled with
    postureSetPoint (1)'s grid conditions, weighted by a normal of SD σ_A). It is **inconclusive here and decides
    nothing**:
    - the hand is floored (27 of 40 trees at 0°), so a symmetric draw pushes half its trees further into the floor;
    - the grid has five support points (20, 34.3, 62.2, 90 and one between).
- **Step 1 (one session, the implement-principle checklist).**
  - The draw behind `r2.individual.postureSd` (default 0).
  - A unit test: the per-tree values have the requested SD, keyed by tree id, and are stable across a
    checkpoint.
  - Goldens unchanged at 0.
- **Step 2 (≈ 40 min on 12 workers).**
  - Pilot v3's best (postureSetPoint (1) 33.7°, limbUpturn median 6.0°, off the floor) at σ_A and at 0; the hand
    beside it, reported only (floored).
  - The finalists' seeds 101–110, the stand at the matched season, the registered `level1_eval.ts`.
  - **Read:** limbUpturn's, limbDroop's and limbElevation05's spread ratio; each descriptor's z; ΔL0 (the Level 0
    sum's change, with its bootstrap SE).
  - **Passes when:** limbUpturn's ratio is ≥ 0.71× at ΔL0 ≤ 2, and no other descriptor's spread leaves ×2.
    - 0.71× (√0.5) is halfway, on the gate's log scale, between its edge (0.5×) and 1×.
    - That margin covers the shift seen between the finalists' seeds and the gate's (limbDroop 0.51 → 0.48).
  - **Stops when:** under 0.6× at pilot v3's best. The draw on this knob cannot do it, and the case returns to the
    tip-upturn rule (the sensitivity note's item 1).
- **Registered before step 2:** σ_A from step 0, the seeds, the pass rule and the hold-out (below).

## 5. Advisor on the draft

One review, on the draft (2026-11-05). Each objection, and the answer taken:

1. **Circular as drafted.** σ_A from `limbElevation` makes limbElevation05's spread a calibrated quantity.
   - Accepted. limbElevation05's spread no longer counts toward the verdict on the draw.
   - The evidence is now limbUpturn's spread (|r| 0.23 with limbElevation05), with Demol out of sample. Demol has
     15 trees, so it can refute a gross miss, not confirm a match.
2. **The realised SD bounds the set point's SD; it does not measure it.**
   - Accepted. σ_A is that SD less the model's own posture variance, in quadrature (≈ 11.8° on today's numbers),
     with the bound as its cap.
   - Step 0 reads `limbElevation`'s repeat floor first.
3. **A local rule, but "a knob added to serve a fit" applies.**
   - Accepted as a question for the user, not settled here.
   - The defence: the value is measured and frozen before any fit, and is never searched.
   - It also describes causes rather than explaining them: the spread is put in, not emergent.
4. **Step 0's stop rule read at a floored base.**
   - Accepted. The emulation is reported only and decides nothing.
   - The stop rule moves to step 2, read at pilot v3's best, whose upturn median is 6.0°.
5. **The pass threshold needs a reason.**
   - Accepted. It is now 0.71× (√0.5): halfway, on the gate's log scale, between its edge and 1×, which covers the
     seed shift seen in pilot v3.
6. **Citation hygiene.**
   - Accepted. Each source is marked with the level at which it was verified.
   - The Danish and Romanian forking claims, seen only in a search summary, are dropped.
7. **The posture loop "erases" C4's noise is an inference.** Labelled as read from the code, not measured.

## Question for the user
- Does a per-tree parameter whose SD is measured from QSMs and frozen before any fit sit inside ADR 0049 §2? Or is
  it "a knob added to serve a fit"?
- If outside: limbUpturn's spread falls to the tip-upturn rule (the sensitivity note's item 1) together with its
  median, and this ADR is rejected.

## Consequences (if accepted)
- A new RNG purpose, INDIVIDUAL, appended in `rng.rs` (id 15: ADR 0054 took 14, `SEEDLING_AZIMUTH`).
- A per-tree parameter read in R3's posture and C4's growth set point, through one accessor that every reader
  calls.
- Goldens unchanged at the default; ADR 0049's spread clause becomes testable for posture.
- The ROADMAP's trace table gains the rule.
- The sensitivity note's ADR list is reordered by the user, not by this ADR. Item 1 (tip upturn) is still needed
  for limbUpturn's median.
