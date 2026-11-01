# Fresh look, beech: the ledger

Run: fresh-look-beech, round 1, started 2026-11-01. Every role starts from a fresh context and
reads task.md and this file from disk. Insert at your own marker with a minimal edit; never
rewrite this file or another role's section.

## Proposal A: within the current rules

Brief: the best fix inside the existing rule set and its fields, including rules that exist but
are off.

### A. Verdict in one paragraph

No combination of existing fields alone keeps the stand while changing the lone tree, and I found
why. Every rule that ends or reclines the leader (relay, relayPTerm, level-0 curve and agedSetPoint)
fires by tree age or wood age, and the leader's light cannot tell a lone tree from a stand tree:
I measured the top bud's Q at exactly 1.0 in both at ages 0–60 (stand seed 1), and R5's neighbour
shade at the stand's crown-top relays is 0.000 at ages 20–50. So any setting that stops the lone
tree's height also stops the stand's. Run a-c1: the lone tree is 91–134 cells tall, but the stand
falls to H/D 46–60, floor 1.8–3.0% and LAI 10–11. One interaction fix makes the combination work:
**the relay listens to R5's neighbour signal, read over the whole tree.** I also added a second,
minor fix (R5 on the posture set point). With both, the lone tree is short, broad and multi-stemmed,
with limbs that rise and then arch, and the stand holds. The outline is a **broad block or vase,
not yet a dome** (see the last subsection).

### A. Mechanism and botanical basis

1. **The relay gate (r2.relayCrowd)**, the main change. A pa-0 apex ends with probability
   relayPTerm·max(0, 1 − k·s̄). Here s̄ is the tree's mean R5 neighbour shade over its metamers:
   the neighbour-weighted 1 − Q/C that R5 already computes in phase 2.
   - A tree with no neighbours has s̄ = 0, so the gate does not touch the lone tree.
   - In the stand, s̄ is 0.09 at 15, 0.20–0.28 at 20–25, 0.10–0.15 at 30–40 and 0.05–0.10 after
     50 (measured). With k = 10, the leader keeps growing through the race for height, and the
     relay opens late, on the dominant trees.
   - Basis: the card's own fork evidence. Nicolini & Caraglio 1994 [r] find forks "at both extremes
     of growth rate", while "the intermediate level keeps une structure aérienne bien
     hiérarchisée".
   - Basis: "Vertical lateral axes are more frequent in full light (0.18–0.45) than in shade
     (0.03–0.1)" [r], and "young trees may develop a leader, aged crowns usually are polyarchic"
     (Pfisterer, Troll [r]).
   - Basis (physiology, not on the card): the shade-avoidance syndrome strengthens apical
     dominance. R5 already encodes this locally as dLambda; the gate applies the same signal to
     the leader's lifespan.
   - Open-grown → fork early → polyarchic dome. Neighbours → hierarchical bole → crown ratio
     about 0.5, polyarchic only when old.
2. **R5 on posture (r5.posture)**, minor. R5's set-point scale (1 − dA·s) also multiplies R3's
   posture set point, which is the gravitropic set-point angle, not only the growth target.
   - Without it, R3 posture undoes R5 in the stand: old relay wood reclines toward agedSetPoint
     under neighbours.
   - It changes nothing in the lone tree (s = 0).
   - Effect on seed 1 (a-c21 with it, a-c23 without): stand H/D 98 against 112, LAI 7.8 against
     8.2.
3. **The existing fields, combined** (relay plus level-0 curve plus level-0 agedSetPoint by wood).
   They make the open-grown relays "rise and then arch over" (card, Scaffold [u]). The values
   below matter because of **an interaction I found**: relayPTerm also ends every relay.
   - With the picks' 0.6, each relay lives about 1.7 seasons. Its curve restarts at node 0, and
     its young wood (high Δr/r) is straightened by posture toward 0°. The chain of short modules
     becomes a vertical column, which is why the picks' lone tree still reaches 200 cells. Runs
     a-c15 and a-c9 show the same.
   - So relayPTerm must be low (0.08–0.15) for relays to live long enough to arch, and curveLength
     short (10).
   - Aging by tree (agedBy "tree") flattens everything into an umbrella or table (a-c1).
   - Aging by wood (the default) keeps young tips up while old wood reclines. That is the arch.

### A. Exactly what changes

- `rust/core/src/params.rs`:
  - `R2.relay_crowd: Option<f64>`, read from `r2.relayCrowd` (k; absent = off).
  - `R5.posture: bool`, read from `r5.posture` (absent = false).
- `rust/core/src/tree.rs`: `Tree.relay_crowd: f64`, the tree's s̄ this season (default 0, not
  checkpointed, recomputed every season).
- `rust/core/src/season.rs`:
  - `phase_sample`, after `sample_nodes`: when `r2.relayCrowd` is set and R5 is on,
    `tree.relay_crowd = mean(node_shade[..nm])`; otherwise 0.
  - `phase_mechanics`: when `r5.posture`, call `sample_nodes` again so that `node_shade` lines up
    with the rows after growth and shedding. C5 compacts the metamers but not `node_shade`, so the
    phase-2 values are misaligned by mechanics time.
- `rust/core/src/principles/r2.rs`: `p_term_at(order, age, crowd, params)` and
  `terminates(…, crowd, params)`. The relay branch returns
  `max(level.p_term, relayPTerm·max(0, 1 − k·crowd))`; there are 4 test call sites (`0.0` added).
- `rust/core/src/principles/c1.rs`: `form_terminal_bud` passes `tree.relay_crowd`.
- `rust/core/src/principles/r3.rs`: in the posture block, after the pendulous step,
  `set_point *= set_point_scale(node_shade[i], r5)` when `r5.posture`.
- Fields to add to the TypeScript and presets: `r2.relayCrowd?: number` beside `relay`, `relayAge`
  and `relayPTerm` in `src/core/params.ts`, and `r5.posture?: boolean`. Both default off, so every
  other species' golden is unchanged (the unit tests pass: 125 ok). `tests/golden.json` is absent
  from this sandbox, so the golden test could not run here.
- **Beech values** (the prototype `runs/fresh-look/a-relaygate/assigns.json`; leave the picks'
  level-1 aged set point out):
  `r2.relay 2, relayAge 15, relayPTerm 0.15, relayCrowd 10; r2.levels.0.curve 30, curveLength 10,
  agedSetPoint 80, agedOver 30 (by wood); r5.posture true`.

### A. Pseudocode (full diff: runs/fresh-look/a-relaygate/changes.diff)

    phase_sample(tree):            # after sample_nodes (R5)
      tree.relay_crowd = relayCrowd set && r5.enabled ? mean(tree.node_shade) : 0
    p_term_at(pa, age, crowd):     # pa 0, relay on, age ≥ relayAge
      gate = relayCrowd set ? max(0, 1 − relayCrowd·crowd) : 1
      return max(level.pTerm, relayPTerm·gate)
    phase_mechanics(tree):         # r5.posture only
      sample_nodes(tree)           # realign node_shade after growth and shedding
    R3 posture:  set_point *= (1 − r5.dA·node_shade[i])   # r5.posture only

### A. Prototype sheet and metrics

Sheet: `runs/fresh-look/a-relaygate/sheet.png` (metrics.json beside it). Screening runs a-c1 …
a-c30 are in `runs/fresh-look/a-c*/`, and their assigns are in `runs/fresh-look/a-cand/`.

| seed | lone 60 H, W/H | lone 100 H, W/H, fork | stand alive | H/D | floor | LAI | crown ratio (limb/leaf) |
|---|---|---|---|---|---|---|---|
| 1 | 102, 0.94 | 126, 1.10, 0.20 | 12/12 | 102 | 4.9% | 8.2 | 0.29 / 0.30 |
| 2 | 120, 0.88 | 155, 0.98, 0.33 | 11/12 | 98 | 3.5% | 7.8 | 0.32 / 0.31 |
| 3 | 116, 0.83 | 167, 0.87, 0.34 | 12/12 | 104 | 5.2% | 7.8 | 0.34 / 0.39 |
| today | 145–147, 0.63–0.64 | 182–204, 0.47–0.63, ≈1.0 | 11–12 | 107–109 | 4.3–4.8% | 6.9–7.1 | 0.36–0.41 |
| picks | 116–130, 0.73–0.99 | 202 (ceiling), 0.51–0.70 | 8–9 | 77–93 | 3.1–4.0% | 6.4–7.3 | 0.20–0.34 |

- **Ecology guard:**
  - alive passes (11–12).
  - H/D passes (98–104, inside 70–110, better than today's 107–109).
  - Floor is marginal on seed 3 (5.2% against "about 3–5%").
  - LAI is 7.8–8.2: "near 7", but about 1 higher than today, because of more crown-top stems.
- **Lone tree:**
  - It is about 30% shorter than today, and it forks low (0.2–0.34 of the height against ≈1.0
    today).
  - W/H is 0.83–0.94 at 60 and 0.87–1.10 at 100, in the card's 0.6–1.0.
  - Several limbs of similar size rise and then arch over (leaf-off columns).
  - The pointed spruce top is gone.
- **Stand:** straight clean boles, with polyarchic tops on the dominant trees.
- **Best single tree:** seed 1 of a-c21 (relayAge 20, relayPTerm 0.08, curve 40/15,
  agedSetPoint 100/25): 114 cells tall, W/H 1.15, at 100. Its seeds 2–3 kept the leader too long
  (a-c23), so I chose the more reliable relayAge 15 / relayPTerm 0.15.

### A. Cost

- Measured natively (100 seasons, seed 2, including CSV output):
  - Lone tree: today 163 ms/season; gate only 165; gate and r5.posture 193.
  - Stand: 95, 96 and 110 ms/season.
- The **gate costs nothing**: one mean over node_shade.
- **r5.posture costs about 15–18%**, because it calls `sample_nodes` a second time each season.
  Cheaper: carry `node_shade` through C5's `compact` (as `old_to_new` already does for the
  metamers) and give new rows their parent's value; this would make it nearly free.
- No renderer change.

### A. Risks

- **The gate is only as good as R5's neighbour signal:**
  - It needs `r5.signal = "neighbours"`, which is the world default.
  - A beech at a wood edge or in the mixed garden gets an s̄ between 0 and the stand's, so its
    relay is partly gated. This is probably right (edge trees are lopsided and half-forked), but
    it is untested.
  - Any change to R5's dA or the neighbour window shifts the gate.
- **k = 10 is stiff:** s̄ is 0.05–0.1 in an old stand, so the stand's relay opens only partly
  after about 50. That is the source of the polyarchic tops and of LAI ≈ 8. k = 20 restores
  today's stand (a-c22: H/D 117, floor 5.1%) at the cost of fewer forks in the stand.
- **Shade-survival order:** relays in an understorey beech (high s̄) are suppressed, so it stays a
  monopodial pole. This matches Nicolini's intermediate-vigour hierarchy, but suppressed-beech
  survival was not re-measured.
- **The shared relayPTerm is a compromise:** the same value sets when the trunk ends and how long
  each relay lives. Seed-to-seed variance in fork height (0.2–0.5) comes from this.

### A. What it does not fix

- **Not a dome.** The outline is a broad block (seed 1), a sloped table (seed 2) or a vase with an
  empty V in the middle (seed 3). It is not a rounded cap.
  - In Troll's superposition, each new module rises from the top of the previous arch and refills
    the centre. In the model, a relay takes over at the ended apex, at the outer tip of the arch,
    so every generation steps outward.
  - BH at pa 0 then lets one relay dominate (leaderDominance 5–7), which gives lopsided crowns.
  - **Missing:** a takeover at the arch's highest point (the bend), not the tip, or some damping of
    one relay's dominance over its siblings.
- **Tiered skirt.** The lower crown is still built by the pa-1 limbs of the pre-relay trunk
  (level 1 at 34°, level 2 at 94°), as level, layered plates. Below the forks, the 60-season tree
  reads as a layered block.
- **Thin stand lid.** Stand crown ratio is 0.29–0.34, against the card's 0.47–0.50. The gate keeps
  today's thin lid; it does not deepen the crown.
- **Not addressed:** foliage, bark and leaf cards (the renderer).

<!-- proposal-a -->

## Proposal B: structural

Brief: assume the parameters are not the bottleneck. Growth step, Troll's reiteration, the
shedding rules' light response, the renderer's foliage and bark.

### B: a vigour response (Troll's secondary straightening, gated by the tree's own vigour)

Prototype: `runs/fresh-look/b-vigour/sheet.png` (seeds 1–3), with `metrics.json`, `assign.json`
and `changes.diff` beside it. Exploratory runs are under `runs/fresh-look/b-work/` and `b-split2`.

#### What the code does today, and why the lone beech becomes a cone
- **The trunk cannot become plagiotropic.** Level 0 has `postureSetPoint: 0`, and the trunk's axis
  is exempt from every form offset (curve, aged, pendulous; ADR 0034/0035/0038). So R3 straightens
  the leader every season, whatever its vigour. Troll's trunk is the opposite: a plagiotropic axis
  straightened only where it is vigorous, and lost in the crown with age.
- **The open tree is no shorter than the stand tree.** Lone height at 100 is 182–204 cells and the
  stand's is 178–183. No rule tells an open-grown crown from a stand crown. One signal does:
  the tree's resource v_base is ≈ 17,000–19,000 for the lone tree and ≤ 1,650 for the stand's
  dominants (`b-work/vbase.py`).
- **Apical control is a cliff, not a knob** (diagnostic only, not proposed). Moving `r2.dLambda`
  from 0.0138 to 0.05 (λ < 0.5 after age 15) turns the lone tower into a low mound (W/H 2.3, H 71
  at 60). It also flattens the stand into a lid (floor 1.1%, LAI 11.7): `b-work/dl05`. The dome
  sits between those two, and the change that gets there must spare the stand.
- **Ruled out by prototype:**
  - Weighting Borchert–Honda by hydraulic path (`b-split2`) gives a wider skirt, which reads more
    like a spruce.
  - Absolute-flow forks (`b-work/vr1`) act on the base, not the pointed top.
  - Vigour posture alone (`b-work/vp1`) leans the whole tree, because the single leader stays the
    leader.

#### Mechanism and botanical basis
Each node's vigour is the share of its tree's resource that flows through it:
u = min(1, (vIn / v_base) / s). The tree's own vigour sets a gate,
g = clamp((v_base − lo) / (hi − lo)). Then:
1. **Weak wood forks.** At every node, λ falls by g·(1 − u)·dλ (C3). Card: "forks form at both
   extremes of vigour" (Nicolini & Caraglio 1994 [r]); Troll, "aged crowns usually are
   polyarchic" (Pfisterer [r]).
2. **Only vigorous wood straightens.** R3's posture target moves by g from the level's own value
   toward a blend. The blend runs from the level's growth set point (weak wood stays plagiotropic)
   to `vigourSetPoint` (vigorous wood is orthotropic, 0°), by u. The trunk is included. Card: Troll,
   "all axes develop plagiotropically" (Pfisterer [r]). Also from the card: vigorous trees have an
   orthotropic axis and weak ones a plagiotropic axis with a flat crown (Nicolini 2000 [s]), and
   vertical laterals are more frequent in full light (Nicolini & Caraglio [r]).

Why it spares the stand: a stand member never reaches the gate, and its narrow crown passes most of
its resource up the leader anyway. A big open crown spreads its resource over many limbs, so its top
divides and its leader stops being special. The rule is generic: any species switches it on with
its own lo/hi. The gate is tree-level, like C5's Q_top and R1's maturity height.

#### Exactly what changes (the diff is in `runs/fresh-look/b-vigour/changes.diff`)
- `rust/core/src/params.rs`:
  - New `R2` fields, all off by default: `vigour_share` (`r2.vigourShare`, default 0 = off),
    `vigour_lambda` (`r2.vigourLambda`, 0), `vigour_set_point` (`r2.vigourSetPoint`, 0°),
    `vigour_tree_lo` and `vigour_tree_hi` (`r2.vigourTreeLo`/`vigourTreeHi`, 0/0 = no gate).
  - `PaLevel.vigour_lambda` (`r2.levels[i].vigourLambda`, an optional override per level).
- `rust/core/src/principles/r2.rs`: new functions `vigour_on`, `vigour(v_in, v_base, r2)`,
  `vigour_gate(v_base, r2)` and `vigour_posture(pa, bend, u, params)`.
- `rust/core/src/principles/c3.rs`, `allocate` (BH branch): after `shaded_lambda`,
  `lambda -= drop·gate·(1 − vigour(v, v_base))`.
- `rust/core/src/principles/r3.rs`, `update_mechanics`: the gate is computed once per tree, then
  `set_point += gate·(vigour_posture(pa, bend, u) − set_point)` before the pendulous step.
- Where the fields would live: R2's block in `src/core/params.ts` and types, and the beech values
  in `flora-fitted.ts`, exported to `presets.json`. The TypeScript core needs the same four
  functions only if it still runs R2/R3; the prototype touched no TypeScript.

Pseudocode:

    u(i)  = clamp(vIn[i] / v_base / vigourShare, 0, 1)
    g     = clamp((v_base − vigourTreeLo) / (vigourTreeHi − vigourTreeLo), 0, 1)   // 1 if no gate
    C3:   λ(i) = shaded_lambda(λ_level(pa, age), shade) − g · (1 − u(i)) · vigourLambda[pa]
    R3:   A(i) = A_level(i);  A(i) += g · ( lerp(setPoint[pa] + bend, vigourSetPoint, u(i)) − A(i) )

Prototype values: `{"r2.vigourShare":0.3,"r2.vigourLambda":0.03,"r2.vigourTreeLo":3000,"r2.vigourTreeHi":10000}`.

#### Prototype metrics (seeds 1 / 2 / 3), against the baseline (`baseline/beech-today`)

| | baseline | B |
|---|---|---|
| lone 60 height | 147 / 145 / 145 | 105 / 113 / 110 |
| lone 60 W/H | 0.64 / 0.63 / 0.64 | 1.15 / 1.07 / 1.16 |
| lone 60 leaderDominance | 2.24 / 1.83 / 2.08 | 1.77 / 2.10 / 1.86 |
| lone 100 height | 194 / 182 / 204 | 146 / 155 / 147 |
| lone 100 W/H | 0.55 / 0.63 / 0.47 | 1.11 / 1.04 / 1.11 |
| lone 100 leaderDominance | 5.09 / 5.33 / 3.44 | 1.91 / 2.30 / 2.27 |
| lone 100 forkHeight | 1.0 / 1 / 0.97 | 0.74 / 0.80 / 0.67 |
| stand 100 alive, H/D, floor, LAI, crown ratio | 11, 12, 12; 107–109; 4.3–4.8%; 6.9–7.1; 0.36–0.41 | **identical to the baseline in every number** (the gate is never opened in the stand) |

**Ecology guard: the alive count, floor, LAI and crown ratio pass**, unchanged from today's beech.
**H/D, however, is 108 / 107 / 109, against a limit of 70–110.** That is today's beech, at the edge.

What the sheet shows:
- The lone tree stops being a tower. At 100 it is 25–30% shorter and about as broad as it is tall.
- The top is blunt and rounded on all three seeds at 100, with no spire, and the leader is lost
  near the top.
- At 60 it is a broad, blunt-topped cone.
- **It still reads tiered.** The level plates of the sagged limbs remain: at a glance it is closer
  to a cedar of Lebanon than to a beech dome.
- Cue 1 improves from "pointed cone" to "blunt layered mass"; cue 6 (W/H, low limbs) passes.

Combination: on seed 1 only, B with the accepted picks and dλ 0.02 (`runs/fresh-look/b-work/g-l2-pk`)
is the roundest lone tree I made: H 96/132, W/H 1.14/1.20, a rounded mass at 60. Its stand is the
picks' stand (9/12), because the picks are not gated. If the solver keeps the picks, gate them by
the same `vigour_gate`; that is untested.

#### Cost
- **Rule:** O(1) per node, inside passes that already exist (one division and a lerp in C3 and R3).
  No new arrays, no checkpoint or hash change. Bundle: about 0.5 kB of TypeScript if ported.
- **Indirect cost:** a broader lone crown has more metamers. Native lone runs took 44–58 s for 100
  seasons against 25–42 s for `b-split2`, with two runs in parallel, so the timings are noisy. The
  stand cost is unchanged.
- **Not measured:** the phone budget, in the garden's worker.

#### Risks
- **The gate is in absolute resource units.** It must be re-set if α, R1's costs or the cell size
  change. In the garden's mixed wood, an edge or gap tree with v_base between 3,000 and 10,000 gets
  a partial response; the solver must check the plate.
- **λ is a cliff.** dλ 0.03 at g = 1 is near it: 0.05 without the gate gave the mound.
- **Tests and goldens:** the `golden` test cannot run in this sandbox (`tests/golden.json` is
  absent), so the goldens are unverified here. The 125 unit tests pass. The default-off paths are
  bit-identical by construction (`vigour_on` false gives gate 0, so no λ or set-point change).
- **Not yet written:** tests for `vigour`, `vigour_gate` and `vigour_posture`, and an ADR.

#### What it does not fix
- **The tiers.** The limbs still sag to horizontal plates, because R3's posture authority
  (c·Δr/r) loses to sag on big limbs. So there is no "rise then arch" yet (cue 2), and the plates
  read cedar.
- **The leaf-on picture.** The uniform leaf cards and the single bark ramp are untouched.
- **The stand's H/D** (≈108) and the stand's look are exactly today's.

Secondary recommendation (renderer): draw beech bark pale smooth grey per species, and draw foliage
as level spray plates oriented by the shoot's plane rather than as round points. That would turn the
remaining layering into the card's "level sprays" (cue 4) instead of conifer tiers.

<!-- proposal-b -->

## Proposal C: botany first

Brief: start from what makes a beech recognisable at 20 m in a frontal projection, decide which
cues are even expressible in this model, and only then look at the code.

### C: the vigour fork (excess vigour forks the apex; the arms stay plagiotropic)

Sheet: `runs/fresh-look/c-forkL/sheet.png` (assigns `runs/fresh-look/c-forkL/assign.json`, diff
`runs/fresh-look/c-forkL/changes.diff`). The other `c-fork*` folders are the iterations (A–K), kept
as ablations.

#### Cue-by-cue derivation (before the code), heaviest first

| # | cue at 20 m, frontal, phone | expressible by local rules? | how a real beech makes it (card) |
|---|---|---|---|
| 1 | **outline a dome, no point, no regular tiers** | yes, emergent | apices advance at similar rates in all directions and height growth slows as the crown spreads: Troll, "aged crowns usually are polyarchic" [r, Pfisterer]; "forks form at both extremes of vigour", the intermediate stays "bien hiérarchisée" [r, Nicolini & Caraglio 1994] |
| 2 | **trunk lost in a short zone into several near-equal limbs that rise, then arch** (the photo note calls this *the* cue) | yes | forks giving two near-equal axes (photo note §1), every axis plagiotropic, only the trunk's base straightened (Troll [r]); arching = curvature along the axis |
| 3 | dense, opaque foliage | renderer + LAI; already fine on the lone tree | — |
| 4 | level sprays | partly: `distichous` places buds, but the spray plane is not held level (Nicolini 2000's bilateral shoots [s]) | not pursued: on today's sheet the level plates are *too* legible, as tiers on one axis; the fault is their arrangement, not their absence |
| 5 | smooth pale grey bark | renderer only (one bark ramp for all species) | "smooth, thin and grey" [r]; cheap, not a growth question |
| 6 | open-grown proportion, low limbs kept | only partly; see "does not fix" | low limbs extend for a century in side light [u] |

**Where the card and the model's vocabulary disagree** (found by instrumenting the run, a
throw-away `eprintln` in `grow_buds`):

- **Vigour has no outlet but height.** From season ~25 (height ≥ `hJ`) to ~80 the open-grown
  leader's bud gets v ≈ 2.7–4.1 against a shoot cap of 3 (`c1.maxMetamersPerShoot`); it grows the
  full 3 cells every year and the rest is thrown away. That is why the lone tree is 145 cells at 60
  (36 m; an open beech is ≈ 20 m) and why no λ or set-point fit changed the kind of tree: a
  saturated apex grows the same whatever the allocation. A real beech spends that vigour on
  polycyclism and **forks** (Nicolini & Caraglio: polycyclic shoots 51% in light vs 14% in shade;
  forks at the highest growth rates). The model has no "too vigorous → fork" rule.
- **The model treats every co-dominant arm as a trunk.** Beech's pa-0 row has `setPoint` 40 but
  `postureSetPoint` 0, so any relay (ADR 0033) is straightened to vertical: Troll's "all axes
  plagiotropic" becomes "every arm orthotropic", and the picks' relays build a column of parallel
  stems. The trunk's own base should be straightened; the arms should not.
- **The stand is open-grown when young.** At 21-cell spacing the stand's leaders saturate exactly
  like the lone tree's until ~season 25 (35 of 36 stand trees would fork at v ≥ 0.95·cap from season
  25). Vigour separates them only at the high end: v ≥ 1.3·cap after the juvenile cap releases is
  reached by all 3 lone leaders (season 26, height ≈ 47) and by 4 of 36 stand trees. That is
  Nicolini's "très important" taken literally, and it is what keeps the stand.

#### Mechanism and botanical basis

A pa-0 shoot whose bud received v ≥ `forkAt`·`c1.maxMetamersPerShoot` (more vigour than the
longest shoot can use) **ends its apex** (the terminal bud is set TERMINATED). The existing relay
(ADR 0033, `r2.relay` = 2) then makes the laterals on the shoot's top two nodes pa-0 arms next
season: with beech's distichous phyllotaxis, a fork of two near-equal arms on opposite sides. At
fork time those two buds are re-aimed to `forkAngle` from the apex's heading. Every fork arm (a
pa-0 axis that is not the trunk's own) then **holds the inclination of its own base** as its
growth and posture set point (plus the ADR 0034 curve, so it rises then arches), instead of the
trunk's vertical. Arms that are vigorous enough fork again; the vigour divides with each fork, so
the forking stops by itself. Basis: Nicolini & Caraglio 1994 [r] (forks at the highest growth
rate; vertical laterals more frequent in full light); Troll, *Fagus* type, "all axes develop
plagiotropically ... aged crowns usually are polyarchic" [r, Pfisterer 2000]; "young trees may
develop a leader" (hence no fork while `hJ`'s juvenile cap holds); photo note §1 (each fork two
near-equal axes, the limb a chain of forks bending outward). Generic, not beech-only: any species
with `forkAt` set forks where it is most vigorous. The low-vigour fork of deep shade is the same
rule with a lower threshold; not prototyped (understorey only).

#### Exactly what changes

- `rust/core/src/params.rs`, `R2`: two optional fields, `fork_at` (`r2.forkAt`, absent → 0 = off)
  and `fork_angle` (`r2.forkAngle`, degrees, absent → the laterals' own β).
- `rust/core/src/principles/r2.rs`: `vigour_forks(pa, v, cap, tree_age, params)`: true iff
  `forkAt > 0 && pa == 0 && relay_on && cap >= c1.maxMetamersPerShoot && tree_age >= r2.relayAge
  && v >= forkAt·c1.maxMetamersPerShoot`. `arm_set_point(tree, trunk, pa, m, params)`: with the
  fork on, for a non-trunk pa-0 metamer, the angle from vertical (degrees) of its axis's first
  metamer (found by binary search on `birth_id`, which ascends); None otherwise.
- `rust/core/src/season.rs`, `grow_buds`: (1) in the `direct` closure, after
  `direction_params`, a non-trunk pa-0 shoot takes `arm_set_point` (a new arm from a lateral bud:
  its bud's own inclination) as `dir.set_point`, before the curve/aged/pendulous offsets; (2) after
  `grow_shoot`, if `vigour_forks`, the shoot's new main bud becomes TERMINATED and, with
  `forkAngle`, the lateral buds on its top `relay_nodes(0)` metamers get
  `lateral_frame(tree, m, azimuth, forkAngle)`.
- `rust/core/src/principles/r3.rs`, `update_mechanics`: the posture set point of a metamer is
  `arm_set_point` when Some, else `posture_set_point(pa)` as now; the curve/aged bend is added to
  either.
- Where the fields live for real: `src/core/params.ts`, R2, beside `relay`/`relayAge`/`relayPTerm`
  (`forkAt?: number; forkAngle?: number`), exported to `rust/presets.json`; beech's values through
  `analysis/fit/hand-overrides.toml` → `flora-fitted.ts`: `r2.relay 2, r2.relayAge 0,
  r2.relayPTerm 0, r2.forkAt 1.3, r2.forkAngle 30, r2.levels.0.curve 30, r2.levels.0.curveLength
  30` (the picks' age-driven relay is replaced by the vigour trigger; `relayAge` doubles as an
  optional age gate). Default off: verified bit-identical state hashes against a pristine build
  (beech lone and stand seed 3 to 100, the picks' lone seed 1 to 100, oakOpen seed 1 to 80). The
  sandbox has no `tests/golden.json`, so the golden test itself was not run; the 125 unit tests
  pass.

Pseudocode (the diff is in `changes.diff`, ≈ 80 added lines):

```
grow_buds, per bud i with v ≥ threshold, pa = order − shift:
  direct(): dir = direction_params(pa)
            if forkAt > 0 and pa == 0 and not trunk:
                dir.set_point = angle_from_vertical(first metamer of this axis)   # or the bud's own heading for a new arm
            dir.set_point = curved(dir.set_point, curve + aged)   # as today
  grow_shoot(...)
  if forkAt > 0 and pa == 0 and relay_on and cap ≥ maxMetamers and age ≥ relayAge and v ≥ forkAt·maxMetamers:
      new terminal bud → TERMINATED
      for lateral buds on the shoot's top r2.relay metamers: re-aim to forkAngle from the parent heading
update_mechanics, per metamer: set = arm_set_point(i) ?? posture_set_point(pa); set += curve + aged
```

#### Prototype and numbers (seeds 1/2/3)

| | today | picks | **C (c-forkL)** |
|---|---|---|---|
| lone 60 height | 147/145/145 | 130/116/125 | **124/127/129** |
| lone 60 W/H | 0.64/0.63/0.64 | 0.73/0.99/0.78 | **0.84/0.75/0.78** |
| lone 60 forkHeight | 0.93/1/1 | 0.26/0.30/0.29 | 0.41/0.40/0.39 |
| lone 100 height | 194/182/204 (ceiling) | 203/202/202 (ceiling) | **166/168/183** |
| lone 100 W/H | 0.55/0.63/0.47 | 0.51/0.70/0.60 | **0.79/0.73/0.84** |
| stand alive | 11/12/12 | 9/8/9 | **12/12/12** |
| stand H/D | 108/107/109 | 77/93/85 | 110/93/94 |
| stand crown ratio (limb / leaf) | 0.36–0.41 / 0.35–0.41 | 0.20–0.34 / 0.30–0.62 | 0.29–0.32 / 0.46–0.51 |
| stand floor | 4.5/4.8/4.3% | 4.0/3.1/3.6% | 3.4/3.1/4.8% |
| stand LAI | 6.9/7.1/7.0 | 6.4/7.3/7.3 | 7.7/**8.5**/7.2 |

Ecology guard: alive, floor and H/D pass on all seeds (H/D 110 on seed 1 is at the edge); LAI 8.5
on seed 2 is high against "about 7". By eye: no pointed top on any lone tree at 60 or 100; the
upper crown is a broad, rounded head of forking arms that rise and arch (best: seed 3 at 100,
seed 1 at 100 leaf-off); the stand keeps straight clean boles with a few forked tops, which is what
photo note §3 shows. Ablations: forks with arms straightened to vertical (`c-forkA`) give a
column; forks from the juvenile phase without the cap gate (`c-forkA`, `c-forkB`) collapse the
stand (7–9 alive) and flatten the lone tree; an age gate instead of a high threshold (`c-forkF`,
`c-forkH`) also keeps the stand but forks the lone tree 30–40 cells higher; `c-forkK` (forkAt 1.3,
angle 35, curve 45) gives broader heads (W/H up to 1.05) but stand H/D 115 on two seeds.

#### Cost

No new state, no checkpoint or hash change, no RNG draw. Per season: one comparison per growing
bud, a scan of the shoot's new buds on a fork, and a binary search per non-trunk pa-0 metamer in
R3 (O(n log n), small n). Measured on this machine, 100 seasons with CSV output: lone 175 vs 177
ms/season, stand 101 vs 101 ms/season (within noise); memory unchanged. Bundle: a few hundred
bytes of wasm and two optional TS fields.

#### Risks

- The stand margin rests on one threshold. From the no-fork diagnostic, first forks: at `forkAt`
  1.3 about 4 of 36 stand trees (near season 26), at 1.2 about 14, at 1.1 about 31; at ≤ 1.0 with
  no age gate the stand breaks (`c-forkC`–`E`: 7–10 alive, floor 1.6–3.1%). Fit `forkAt` on more
  seeds than 1–3 before shipping.
- LAI rises (7.2–8.5): a polyarchic crown carries more leaf; watch the floor, which is now 3.1–4.8%.
- `arm_set_point` reads the *current* inclination of the arm's base metamer, which posture and sag
  also move; a stored birth angle (a per-axis column) would be stricter but changes checkpoints.
- It reuses `relayAge` as an optional gate and needs `relay ≥ 1`; with the picks' `relayPTerm` also
  set, both triggers act (not tested together).

#### What it does not fix

- **The lower half is still the juvenile layered cone**: short, level limbs in regular tiers under
  the new head, so the lone tree reads as a broad head on a tiered column (clearest on seed 1 at 60
  and 100), not a dome to the ground. The lower limbs never become scaffold because they are shaded by
  the head and get the trunk's lateral share; that needs a lateral-vigour rule (gravimorphism or a
  fork for limbs, pa 1 via ADR 0037's per-level relay, which I would try next) or side light, not
  this rule. Cue 1 will likely score 1 at best on the lone tree until then.
- **Height** is still ≈ 2× an open beech (166–183 cells at 100, ≈ 42–46 m): forking slows the
  leader but the shoot cap, not R1's hydraulics, still sets the height growth of every saturated
  apex. A decline of the cap (or of the threshold) with path length is the honest next step.
- Level sprays (cue 4), bark (cue 5) and the stand's crown ratio (limb 0.29–0.32, below the card's
  0.4–0.55) are untouched.

<!-- proposal-c -->

## Solver decision

### Decision: combine one part from each proposal (A's gate, C's fork and arms, B's λ drop)

The three proposals are complementary. Each fixes a different part of the problem, and each
alone leaves a fault the others address:

- A's relay gate ends the leader in the open only.
- C's arm hold keeps the relays from standing up as trunks, and C's fork shapes the stand's tops.
- B's λ drop makes the open-grown crown divide and spread.

B's posture half makes things worse, so I dropped it, together with A's two extras.

**What is in the candidate.** Three switchable R2 rules, all default off. The beech patch is
`analysis/fit/hand-overrides.toml` [beech], regenerated into `flora-fitted.ts` and
`rust/presets.json`.

1. **The relay's neighbour gate (A).** The parameter is `r2.relayCrowd` = 10, with relay 2,
   relayAge 15 and relayPTerm 0.15. The age relay's pTerm acts by max(0, 1 − k·s̄), where s̄ is
   the tree's mean R5 neighbour shade.
2. **The vigour fork and the arm hold (C).** The parameters are `r2.forkAt` 1.3 and `forkAngle`
   30, with level-0 curve 30 over 30. With the fork on, every non-trunk pa-0 axis holds the
   inclination of its base, plus the curve.
3. **The vigour drop (B's λ part only).** The parameters are `r2.vigourShare` 0.3,
   `vigourLambda` 0.03 and `vigourTreeLo`/`Hi` 3000/10000. λ falls by g·(1 − u)·0.03, where g is
   the tree's own vigour gate.

**Dropped:**
- B's posture rule.
- A's `r5.posture`, with its second `sample_nodes`, the 15–18% cost.
- A's level-0 agedSetPoint.

**Why each part earns its place (sheets under `runs/fresh-look/solve-*`, seeds 1–3):**

- **B's λ drop is the part that makes the dome.** It is the only change between `solve-ac`
  (A gate and C) and `solve-acbl` (the candidate).
  - Without it, the lone tree at 100 is a tall block, wedge or column: H 124–175, W/H 0.68–1.11.
  - With it, the lone tree at 100 is a broad rounded mass on a short trunk: H 99–111, W/H
    1.48–1.65. Seeds 1 and 3 read as domes.
  - It never touches the stand. The gate stays shut there (stand v_base ≤ 2,000; lone 4,400 by
    season 15 and 10,000 by 30), so the stand numbers of `solve-ac` and the candidate are
    identical.
- **A's gate is what ends the leader in the open.** Without the age relay, B's λ drop weakens
  the leader but never ends it (`solve-bc`, B and C: forkHeight 0.72–0.75, a blunt tiered cone).
  Under B, the leader's v falls to 1–2.4, below any forkAt·cap, so C's fork never fires on the
  lone tree. Ungated, the age relay kills the stand: the picks lose 3–4 of 12.
- **C's fork is the stand's part.** It is bit-identical on the lone tree, as the lone panels of
  `solve-agbl` and `solve-acbl` show, because it never fires there under B. Without it, the
  stand fails the guard: floor 5.4% (seed 1) and 2.9% (seed 3), crown ratio 0.22 (`solve-agbl`).
  With it, the stand's tops fork into the rounded broom of photo note §3.
- **C's arm hold** keeps the gated relays from straightening into a column (A's finding with
  posture 0 on pa 0).
- **B's posture half was harmful.** With it (`solve-acb`, `solve-acb30`, `solve-acba*`), every
  lone tree is a low table of horizontal plates, a cedar of Lebanon, never a dome.

**Tried and rejected (prototype flags, removed from the code):**
- **Gating C's fork by B's tree gate** (`solve-bc2`): the fork still never fired under B, and the
  stand failed (floor 5.9%, H/D 113).
- **An "arch relay"**, Troll's takeover at the arch's highest point (`solve-aarch`,
  `solve-acba`, `solve-acba2`, `solve-aba2`). An arm's apex that has arched past 70–85° ends, and
  its top laterals rise at 15–25°.
  - Without B, the arms never arch: phototropism, C4's ξ·V, holds them at about 50° whatever the
    set point. So the rule hardly fires.
  - With B, it gave tables.
- **λ = 0.5 at the fork nodes**, to damp one relay's dominance (`solve-acf`, `solve-cf`): no
  visible gain, and the stand floor fell to 2.8%.
- **vigourLambda 0.02** (`solve-acbl2`, `solve-acbl3`): more lopsided at 100.
- **relayCrowd 20** (`solve-acbl4`): the lone tree is identical, and the stand is 12/12/12 with
  LAI 8.2/8.0/7.4 and floor 3.3/3.2/4.8%. It was not clearly better, so A's k = 10 stays.

**Against the checklist (my reading, for the reviewer to check):**
- **Lone tree:** no pointed top and no cone on any seed at 60 or 100.
  - At 100, seeds 1 and 3 are broad rounded domes. Seed 2 is a broad mass with a lumpy,
    uneven top.
  - The trunk divides low: forkHeight 0.21–0.54 at 100, against about 1.0 today.
  - The foliage reads in level layers (cue 4), now on a dome rather than on a cone.
- **Stand:** straight clean boles with forked, rounded tops.

**Ecology guard** (stand at 100, seeds 1/2/3):

| | today | **candidate** | guard |
|---|---|---|---|
| alive | 11 / 12 / 12 | **12 / 12 / 11** | ≥ 10 ✓ |
| floor | 4.5 / 4.8 / 4.3% | **4.4 / 4.5 / 4.8%** | 3–5% ✓ |
| LAI | 6.9 / 7.1 / 7.0 | **8.5 / 7.4 / 7.1** | about 7 (seed 1 high) |
| H/D | 108 / 107 / 109 | **88 / 85 / 101** | 70–110 ✓ |
| crown ratio, limb / leaf | 0.36–0.41 / 0.35–0.41 | 0.23 / 0.26 / 0.27 and 0.41 / 0.45 / 0.57 | card 0.47–0.50 |

**Lone tree** (seeds 1/2/3):

| | today | **candidate** |
|---|---|---|
| H at 60 | 147 / 145 / 145 | **81 / 73 / 71** |
| W/H at 60 | 0.64 / 0.63 / 0.64 | **1.48 / 2.05 / 2.09** |
| H at 100 | 194 / 182 / 204 | **99 / 111 / 102** |
| W/H at 100 | 0.55 / 0.63 / 0.47 | **1.65 / 1.48 / 1.61** |
| forkHeight at 100 | 1.0 / 1 / 0.97 | **0.54 / 0.21 / 0.27** |
| leaderDominance at 100 | 5.1 / 5.3 / 3.4 | **4.35 / 4.82 / 2.62** |

Heights in cells: 99–111 cells is 25–28 m, against an open-grown ≈ 20 m on the card.

**Cost:**
- Measured natively, 100 seasons, seed 2, CSV output included: lone 169 → 186 ms/season, from the
  broader crown's extra metamers; stand 100 → 101 ms/season.
- The rules add O(1) per node in C3 and in growth, a mean over node_shade, and a binary search
  per arm metamer in R3.
- No new state is checkpointed, there are no new RNG purposes, and TypeScript gains only seven
  optional fields.

**Candidate:**
- Commit: `2ba590b` on `claude/fresh-look-beech`, not pushed.
- Sheet: `docs/experiments/code/2026-11-01-fresh-look-beech/solve-round1/sheet.png`, with
  `metrics.json` beside it. It is the render of `runs/fresh-look/solve-round1`, from beech's patch
  with no `--assign`.
- **Goldens:** `rust:check` passes, including the native golden. All 14 golden cases pass in WASM
  (`tests/golden.test.ts`; `tests/golden-rust.test.ts` does not exist in this tree). **No golden
  moves:**
  - The cases with beech (`mixedWood:s15`, `oakOpen:s15`) stop at 15 seasons.
  - At 15 seasons, beech has not reached relayAge 15 with a full-length shoot, nor a v_base past
    the drop's gate.
  - So the goldens do not exercise the change. A golden at 40–60 seasons with beech would.
- **Checks:** lint and typecheck pass.

**What the candidate does not yet do.** It is a dome only from about 80 seasons, and not on
every seed:

- **At 60 it is too flat.** On seeds 2 and 3 it is a low umbrella or mound (W/H 2.05–2.09, H
  71–73), not a dome. At 100, W/H 1.5–1.65 is past the photo's 1.3–1.5 and the checklist's
  0.6–1.0.
- **The layers are still there.** The level plates are no longer stacked on a cone, but they
  still read as layers, and a skirt of horizontal limbs remains under the dome (seeds 1–2 at 100,
  leaf-off).
- **The limbs lean rather than rise then arch.** Under C4's light term, an arm holds about 50°
  whatever its set point, so the curve barely bends it. No local rule I tried could make an arm
  arch over without B's posture, which flattened everything into tables.
- **One relay can still dominate:** leaderDominance at 100 is 2.6–4.8, and seed 2's top is
  lumpy and lopsided.
- **The stand is not fully back to the card.**
  - Its crown ratio (limb 0.23–0.27) is lower than today's 0.36–0.41, and further from the
    card's 0.47–0.50.
  - LAI is 8.5 on seed 1.
- **The vigour drop's gate is in absolute resource units** (v_base 3,000–10,000, B's own risk).
  It must move if α, R1's costs or the cell size change. A beech at a wood edge or in a gap of
  the garden will get a partial response, and I have not looked at the garden plate.
- **The fork threshold, the gate's k and the drop's gate rest on seeds 1–3 only.**

<!-- solver -->

## Review

### Review of solve round 1 (fresh reviewer, 2026-11-01)

Scored from `solve-round1/sheet.png`, `solve-round1/metrics.json`, `baseline/beech-today-sheet.png`,
the checklist and `references-beech.md` only, before reading this ledger. Scale: 0 absent,
1 present but weak or inconsistent, 2 clear on 2 of 3 seeds. Each setting has five applicable cues
(max 10); the checklist's "8 of 12" is read as 8 of the 10 available.

#### Scores

| # | cue | stand 100: cand. | lone 60: cand. | lone 100: cand. | stand 100: base | lone 60: base | lone 100: base |
|---|---|---|---|---|---|---|---|
| 1 | no tiers, no pointed top | 2 | 1 | 1 | 1 | 0 | 0 |
| 2 | limbs rise then arch | 1 | 1 | 1 | 1 | 0 | 0 |
| 3 | dense, opaque foliage | 1 | 2 | 2 | 2 | 2 | 2 |
| 4 | level sprays | 1 | 2 | 2 | 0 | 1 | 1 |
| 5 | stand proportion | 2 | — | — | 2 | — | — |
| 6 | open-grown proportion | — | 1 | 1 | — | 1 | 0 |
| | **total / 10** | **7** | **7** | **7** | **6** | **4** | **3** |
| | **setting passes (≥ 8, no 0 on 1–3)** | no (own cues 1, 3, 5 ≥ 1: yes) | no | no | no | no (0 on 1, 2) | no (0 on 1, 2) |

Why, candidate, one line per cue:

1. **Lone:** no point anywhere and no cone, but the outline is a flat-topped table or stepped
   mound built of separate stacked plates (seed 1 at 60 is a tier stack narrowing upward; seeds 1–2
   at 100 have a flat lid on a skirt of tiers); only seed 3 at 100 approaches a dome. It reads as a
   cedar of Lebanon more than a beech dome. **Stand:** crowns are rounded or irregular masses,
   never pointed (2).
2. **Lone, leaf-off:** a trunk runs well up into the crown (seed 1 at 100 most clearly), and the
   main limbs leave near level and run straight out in plates; seeds 2–3 at 100 show a short fan of
   steeper limbs from the trunk, but nothing rises steeply and then bends over along its length.
   **Stand, leaf-off:** a few steep forks at the top (seed 1), but seed 3's trees are poles with a
   central stem and short level laterals.
3. **Lone:** each plate is opaque and the top is closed; white shows only between layers (2).
   **Stand:** the canopy is fragmented, with large see-through holes in the crown band on seed 1
   and an airy, speckled crown on seed 2; only seed 3 is a solid mass (1).
4. **Lone:** level horizontal plates are the dominant feature on every seed (2; if anything
   overstated, which is what produces cue 1's tiers). **Stand:** crowns are tufts and columns,
   not plates (1).
5. **Stand:** clean straight boles with the crown in roughly the top 40–50% on seeds 1–2
   (crownRatio(leaf) 0.41, 0.45; seed 3 deeper at 0.57); limb crown ratio 0.23–0.27 is low, and
   the boles are thin and some are crooked (2, marginally).
6. **Lone:** broad and low branches kept, but far too squat: W/H 1.48 / 2.05 / 2.09 at 60 and
   1.65 / 1.48 / 1.61 at 100, against 0.6–1.0 (at 100 it is near the photograph's 1.3–1.5; at 60
   it is twice the band). Heights are only 71–81 at 60 and 99–111 at 100. Crowns are clipped by the
   panel frame on most lone panels, so the sheet understates the width.

Baseline, one line per cue:

1. Lone: a pointed cone at 60 and a tall leaning spire at 100 (0, 0); stand: narrow ovals,
   slightly pointed on seed 1 (1).
2. Lone: one persistent leader to the tip with level laterals of decreasing length (0, 0);
   stand: brooms with a persistent stem, a few forks near the top (1).
3. Dense and opaque in every setting (2, 2, 2).
4. Lone: a uniform mass with faint horizontal banding (1, 1); stand: brooms and tufts (0).
5. Crown in the top 35–41% (crownRatio 0.35–0.41), clean straight boles (2).
6. At 60 W/H 0.63–0.64, in the band at its lower edge but a narrow cone, not broad (1); at 100
   W/H 0.47–0.63, a spire (0).

**Change:** the candidate gains 3 at 60, 4 at 100 and 1 in the stand. It removes the cone and
the leader, which is the decisive improvement, but no setting reaches 8. The stand trades
opacity (cue 3, 2 → 1) for slightly better structure.

#### Confusion test (candidate, at a glance)

- **(a) Spruce or fir: yes, more beech.** Deciding feature: the outline. It is broad and blunt
  with no spire and no leader to the tip. Caveat: the stacked level plates on a short central
  trunk make it read as a **cedar of Lebanon**, a conifer, and the stand's seed 3 trees (a pole
  with short level laterals) still read as spruce.
- **(b) Hornbeam: yes, but weakly.** Deciding feature: proportion. Hornbeam is an upright oval,
  taller than wide, with fine steep branches; this is a wide, low spread (W/H 1.5–2.1), nearer
  beech's broad habit. But it wins only because neither shape matches it well.
- **(c) Oak: no, ambiguous.** Deciding feature: limb angle. Here the limbs leave near level and
  run out straight from a short, squat trunk into a crown much wider than high (leaf-off at 100,
  seeds 1–2). That is the open-grown oak (or cedar) habit, not beech's steep-then-arching limbs.
  Only the smooth, level foliage plates point to beech rather than oak's lumpy clumps.

#### Ecology guard (stand at 100, `solve-round1/metrics.json`)

| check | seed 1 | seed 2 | seed 3 | result |
|---|---|---|---|---|
| alive ≥ 10 of 12 | 12/12 | 12/12 | 11/12 | pass |
| floor 3–5% | 4.4% | 4.5% | 4.8% | pass (seed 3 near the top) |
| LAI about 7 | 8.5 | 7.4 | 7.1 | **marginal**: seed 1 is 21% high; mean 7.7 |
| H/D 70–110 | 88 | 85 | 101 | pass |

**Guard: pass, with LAI on seed 1 flagged.** I do not count 8.5 as a breach of "about 7", but
the repair must not raise it, and a stricter reading (±1) would fail seed 1. Also noted, outside
the guard: stand height fell from ≈ 178–183 (baseline) to ≈ 149–151.

#### Repair instructions (cues scored 0 or 1), most important first

1. **Cue 2, limbs rise then arch (1 in all three settings).** *What fails:* in the lone tree the
   main limbs leave the trunk near level (or at a fixed moderate lean) and stay straight. There
   is no steep departure that bends outward along the limb, and on seed 1 the trunk persists well
   up into the crown. In the stand, seed 3 is a pole with level laterals. *Kind of change:* a
   **growth rule** for a limb's posture along its length, so a limb's direction changes with its
   age, load or position rather than holding the angle it was born with. A secondary part is a
   **parameter of the new fork rule**: its arms' birth angle and the hold on it, which currently
   lock the arms into straight, flat runs.
2. **Cue 1, no tiers (1 in the lone tree at 60 and at 100).** *What fails:* the outline is a
   flat lid over a stack of discrete level plates, with white bands between tiers and a stepped
   profile narrowing upward at 60. It is a table or cedar, not a dome highest near the middle.
   *Kind of change:* mostly the same **growth rule** as item 1. The plates are the limbs' own
   level runs at intervals up the trunk, so limbs that rise first fill the middle and round the
   top. If the layering persists after that, it is a **parameter of the new rules**: how often and
   at what spacing the fork or relay places level arms, which now sets a regular vertical period.
   The renderer is not the cause; leaf-off shows the same tiers.
3. **Cue 6, open-grown proportion (1 at 60 and at 100).** *What fails:* W/H is 1.5–2.1 (2.0+ on
   two seeds at 60) and heights are 71–81 at 60, so the tree is a squat mound or umbrella. Height
   growth after the fork is too weak relative to lateral spread. *Kind of change:* a **parameter
   of the new rules**: the strength of the vigour drop and fork, or when they set in, relative to
   the tree's height growth, so the crown keeps gaining height through 60. Separately, the
   **sheet's framing** clips the lone crowns at the panel edges. It should fit the whole tree so
   that width can be judged by eye.
4. **Cue 3, opacity in the stand (1).** *What fails:* stand crowns are fragmented, with
   see-through holes in the crown band (seed 1) and an airy, speckled crown (seed 2); the baseline
   was solid. *Kind of change:* a **parameter of the new rules** as they act in the stand. The
   shade-gated relay and the vigour drop in weak wood appear to thin or shed stand crowns. This
   should be fixed without raising seed 1's LAI further, and if crowns close up but LAI rises, the
   guard decides.
5. **Cue 4, level sprays in the stand (1).** *What fails:* stand crowns are tufts and narrow
   columns; only the lone trees show plates. *Kind of change:* likely follows from item 1, a
   **growth rule** for limb posture that also acts under the stand's steep set point. If it does
   not, it is a **parameter** of how the new rules respond to neighbour shade.
6. **Cue 2's stand component and cue 5's limb crown ratio (0.23–0.27).** These are not failures
   of cue 5 as scored, but they are fragile. The repair should not lower the stand crown base
   further.

The repair round should hold the guard (alive, floor, H/D) and keep cue 3 at 2 in the lone tree.

### Blind naming test, round 1 (orchestrator)

48 unlabelled panels (seeds 1–3; lone at 60 leaf-on, lone at 100 leaf-on and leaf-off, stand at 100
leaf-on), from four sources drawn identically: the candidate, today's beech, and two decoys (silver
fir, hornbeam). The namer saw only the image folder. Answers: `blind-round1/answers.md`; key:
`blind-round1/key.json`; images from `blind.py`.

| source | lone 60 | lone 100 (on, off) | stand 100 |
|---|---|---|---|
| candidate | cedar of Lebanon ×3 | cedar of Lebanon ×6 (high) | silver birch ×3 |
| today's beech | Norway spruce ×3 | Norway spruce / larch ×6 | silver birch ×3 |
| decoy: fir | Norway spruce ×3 | Norway spruce / larch ×6 | Norway spruce ×3 |
| decoy: hornbeam | hornbeam ×3 | hornbeam ×6 (second guess beech) | Scots pine ×3 (second guess beech) |

**Beech named first on 0 of 12 candidate panels: fail.** The deciding feature on the candidate's lone
panels: "very wide spreading crown of flat horizontal layered plates". The hornbeam, described as
"one short trunk dividing into many steeply ascending limbs forming a fan", drew beech as the second
guess on every lone panel. The stands of both beeches read as birch ("thin, wavy, slightly leaning
stems with small crowns high up").

**Harness note.** The lone world is 160 cells wide (the species harness's), so a crown of W/H 1.6 at
height 100 meets the world's sides: the reviewer's "clipped at the panel edges" is the world, not only
the framing. A repair that keeps W/H ≤ 1.4 avoids it; a wider lone world is a harness change for the
next round.

**Checklist threshold.** The checklist's "8 of 12" was a slip: each setting has five applicable cues
(10 points). The reviewer's reading, 8 of 10, stands.

### The user's judgement, round 1

Go with one repair round on the reviewers' instructions. The user's own observation, from every
sheet so far: **the lower branches consistently survive, and the lower trunk never becomes bare.**
It may be solved by the repair, and it may be irrelevant to the aim, but it is recorded as the user's.

Orchestrator's note on it, for the repair worker to weigh, not to follow: the photograph note
(`references-beech.md`) has the open-grown beech's trunk clear for its lowest 1/8–1/6 before it divides
into the scaffold, the released stand tree's bole clean for 40% of its height, and the lone tree's
lowest limbs leaving from the division zone, not from a bole clothed to the ground. All three
ideators reported the same remnant: "the tiered skirt grown before the trunk forks". The
candidate's stand boles are already bare (limb crown ratio 0.23–0.27), so the observation bites on
the lone tree and on trees at the garden's edges. Shedding (C5, R1) is physiology the brief holds
fixed for the ecology; a change that clears the young tree's lower limbs under its own developing
crown, without moving the stand's floor or LAI, is within the brief.

<!-- review -->

## Repair

### Repair round 1 (repair worker, 2026-11-01)

**What the candidate's plates are.** They are twigs, not limbs. In the lone tree at 100, every
axis of order ≥ 2 (pa 2, set point 94.6°) lies at 93–97° (median), at every height and every wood
age. The trunk's own limbs (pa 1) stand at 34–40° but are short. The crown's width is therefore
level pa-2 fans reaching up to 80 cells out from a narrow, steep scaffold.

What did not work:
- **Lowering pa 2's set point everywhere** (existing knobs, `repair-e1`/`e2`: 40° plus a curve)
  turned the lone tree into a 160-cell vase and broke the stand: LAI 9.7–10.2, floor 2.4–3.2%,
  9/12 alive.
- **Shoot vigour** cannot tell the lone tree from the stand: pa-2 v/full has a median of 0.40 in
  both.
- **Light** tells the upper crown from the lower one, but ungated it raised stand LAI to 9–10
  (`repair-l1`…`l4`). Only the tree's vigour gate tells lone from stand.

**What changed.** Two generic rules, both default off and both gated by the vigour gate the
candidate already uses (`r2.vigourTreeLo/Hi` 3000–10000). The stand's hashes are bit-identical
to the candidate's, and only beech entries in `rust/presets.json` change.

1. **Light orthotropy** (`r2.lightSetPoint` 35, `lightLo` 0.2, `lightHi` 0.8, `lightOver` 3).
   - Where: R2 `light_set_point`, applied in growth (`season.rs` `grow_buds`) and in posture
     (`r3.rs` `update_mechanics`).
   - Rule: wood of pa ≥ 1 moves from its level's set point toward 35° by
     u = g·clamp((Q − 0.2)/0.6)·min(1, (age + 1)/3). Q is the bud's light in growth, and C5's
     light per metamer of the subtree in posture.
   - Basis:
     - Nicolini & Caraglio 1994 [r]: vertical laterals are more frequent in full light.
     - Nicolini 2000 [s]: axes are plagiotropic under cover and orthotropic in vigorous trees.
     - Troll [r] (Hallé et al. 1978): the proximal part of a plagiotropic axis straightens
       secondarily.
   - Effect: the young shoot spreads near level, and its base rises as it ages. In the lit upper
     crown, old wood sits at 64° against 72–80° for young wood. The shaded lower crown stays near
     level (80–85°). The candidate was 93–97° everywhere.
2. **Own-crown pruning** (`c5.Tvig` 0.25, C5 `shed_branches`).
   - Rule: a vigorous tree also sheds a lateral whose light per metamer is below g·Tvig·Q_top.
   - Basis: relative-light shedding and branch autonomy (Takenaka 1994; Sprugel, Hinckley &
     Schaap 1991; [u], cited from memory, not on the card). The photograph note has the
     open-grown trunk bare for its lowest 1/8–1/6.
   - Effect (this is the user's observation): leaf below H/6 falls from 6–19% to 4–7%, and the
     lowest leaf rises from 0.01–0.05 H to 0.06–0.10 H. Without it (`repair-q9a`), the crown is a
     dense block down to the ground and the scaffold is hidden.

**Sheet:** `repair-round1/sheet.png`, with `metrics.json` beside it. It renders
`runs/fresh-look/repair-round1` from beech's patch, with no `--assign`, at `--lone-width 240`.
The candidate at the same width is `runs/fresh-look/repair-cand240`.

| seeds 1/2/3 | candidate (width 240) | **repair** | guard / target |
|---|---|---|---|
| lone 60: H, W/H | 78/72/71, 1.65/1.93/1.68 | **94/101/94, 1.27/1.19/1.40** | checklist 0.6–1.0, photo 1.3–1.5 |
| lone 100: H, W/H | 96/96/99, 1.83/2.13/1.75 | **139/143/133, 1.18/1.14/1.27** | as above |
| lone 100: forkHeight, leaderDominance | 0.39/0.21/0.24, 3.6/3.4/4.1 | 0.34/0.36/0.18, 3.0/3.4/2.4 | |
| stand 100: alive, floor, LAI, H/D | 12/12/11, 4.4/4.5/4.8%, 8.5/7.4/7.1, 88/85/101 | **identical** | ≥ 10, 3–5%, ≈ 7, 70–110 |
| stand limb crown ratio | 0.23/0.26/0.27 | identical | not lowered |

**What the sheet shows.**
- At 100, the lone tree is a dense, rounded mass on a short trunk on seeds 2–3, and lumpier on
  seed 1.
- The cedar plates and the white bands between them are mostly gone.
- Leaf-off, a short trunk divides into several limbs that rise and then spread.

**What I tried and rejected:**
- `repair-g2`: an erect set point of 0° with no age ramp gives vertical brooms 170 cells tall.
- `repair-q5`, `repair-q7`, `repair-q10`: Tvig 0.30–0.35 opens the crowns into see-through
  umbrellas. Tvig is a cliff between 0.25 and 0.30.

**Cost.** One O(n) light array per tree per season in R3, with no checkpoint, RNG or hash change.
TypeScript gains five optional fields. The lone tree to 100 natively with CSV output takes 21.7 s,
against 25.3 s with the rules off (fewer metamers after pruning). The stand's cost is unchanged.

**Checks.** All pass: `rust:check` (132 unit tests, two of them new), `build:wasm`, golden.test.ts
(14 of 14) and lint and typecheck. With the rules off, the lone run's hash equals the candidate's.

**Commit:** `77b28e6`.

**Still open:**
- **The outline.** It is a rounded block more than a dome highest in the middle: lumpy on seed 1
  at 100, and at 60 still blocky with faint horizontal banding. Tiers are reduced, not gone.
- **Height.** The tree is now too tall: 133–143 cells at 100 (33–36 m, against ≈ 20 m
  open-grown). That is the price of erect lit wood.
- **W/H.** At 1.1–1.4 it is at the low end of the photograph's 1.3–1.5 and above the checklist's
  0.6–1.0.
- **The young skirt** still shows at 60, leaf-off.
- **Hornbeam risk.** The leaf-off now matches the namer's hornbeam description ("a short trunk
  dividing into many steeply ascending limbs"). Only the broader leaf-on mass separates it. No
  blind test was run.
- **The stand is untouched.** Its cue 3 (fragmented crowns), its cue 4 (no sprays) and seed 1's
  LAI of 8.5 are the candidate's.
- **The gate.** It is in absolute units, so beeches at the garden's edges get an untested partial
  response. I have not looked at the garden plate.

<!-- repair -->
