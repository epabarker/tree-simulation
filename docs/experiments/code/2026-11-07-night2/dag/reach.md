# Reach: which knobs can reach which outcomes

Built by `build_dag.py` from the Rust core on `claude/a6-periodic-z` (c6b60df). Read-only; nothing in the repo changed. The graph is in `dag.json`. The figures are `dag.png` (overview), `dag_full.png` (every principle-to-principle edge) and `dead_levers.png`.

## How to read it

- **Nodes.**
  - **param groups and params:** the 2–4 params a principle reads together are merged into one node, e.g. `r3.posture / betaG / gamma / c`.
  - **principles:** 23 steps of `run_season`, each with its phase.
  - **state:** the tree's tables and scalars, and the world's light and owner grids.
  - **outcomes.**
- **Edges.**
  - `reads`: param → principle, carrying a **gate**, the condition under which the code reads that param.
  - `reads` / `writes`: between principles and state.
  - `feeds`: principle → principle within a season, in spec §6's phase order.
  - `feedback`: a write that an earlier phase reads, so it only acts next season.
  - The order within a season is spec §6's phase order, plus an order I assigned by hand inside each phase, read from `season.rs`:
    - Light: obstacles → storm → C2 → owner grid;
    - Sample: Q → R5 → s̄ → Q_top;
    - Allocate: C3 basipetal → R1 → C3 split;
    - Grow: R4 → R2 form → C4 → C1 → R6;
    - Deaths: O2 → R1 starvation → O4.
  - So `feeds` edges are acyclic by construction; `assert_acyclic` cannot fail.
  - Audit the orders above, not the assert. One known simplification: the vigour fork marks new buds terminated after C1 has grown them. Those buds are not processed until next season, so this order is right in effect.
- **Lag** is the fewest season boundaries on a path from a param to an outcome.
  - Almost everything reaches the outcomes in 0 seasons: growth (phase 4), shedding, girth and mechanics write the tree before it is measured.
  - The exception is **floor light**. It is the field built at the start of the season, so only `c2.*`, `world.*` and `r6.leafArea` act on it in the same season. Everything else acts one season later, through L1.
- **Structurally, every param reaches every tree outcome.**
  - Across seasons, L1 (light and foliage) and L2 (cost of size) connect everything that changes a single leaf or metamer to everything else.
  - So reachability alone separates nothing. What separates is the **gates**: a param whose every read is closed by another param's value, or by the context, cannot matter at all. Those are the dead levers below.

## Validation against the sweep

- 17 params were swept ±10% (3 seeds, lone tree, 100 and 150 seasons). Five species have results so far: beech (partial; some rows rest on 2 seeds), holly, hornbeam, maple and rowan. Birch, oak and willow have none yet.
- The gates predict exactly one of the 17 dead in every species: `c5.T`.
- The sweep finds exactly one bit-identical to base: `c5.T`, in all five species. Every other swept param changed the run.
- So the DAG and the sweep agree on all 17 params in every species with results.

## Feedback loops

| id | loop | carried by | what it does |
|---|---|---|---|
| L1 | light and foliage | light field, bud Q | new foliage and positions shade next season's buds (self- and mutual shading) |
| L2 | cost of size | P, M, v_base | more tips and longer paths raise maintenance and the hydraulic discount, which lowers next season's v_base. R1 recomputes live pipes from topology (tip r0), not from stored radius, so girth (C6/R3) does not feed maintenance |
| L3 | reserve and starvation | reserve, starved | the reserve carries over; k_starve empty seasons kill the tree |
| L4 | carbon-shedding memory | deficit | a branch must run a deficit r1.kShed seasons in a row |
| L5 | mechanics | stress wood, set points | load causes sag and stress wood, which change next season's positions, radius and load |
| L6 | height thresholds | geometry (height) | height → r2.hJ cap on shoot size; height ≥ r1.maturity diverts fRep of net production to seeds, which lowers v_base and so the vigour gate where one exists (beech) |
| L7 | clocks | tree age, bud age, wood age | λ's ontogenetic fall (aC, ramp), relayAge, forks, aged set points; R4's vBreak·(1 + δ·age) and lDorm; c5.g, r6.lifespan, lightOver |
| L8 | neighbours (stand only) | owner grid, shade s, s̄ | other trees' foliage → R5 shade → λ, elongation, break threshold, relay gate |
| L9 | demography (stand only) | seed pool, trees | seeds → recruits → foliage → floor light → establishment |

### Loops on each outcome's paths

- height, crown shape (D, W/H), crown base, metamers, H/D: L1–L8.
  - L8 only in a stand.
  - Height and H/D also cross L6's thresholds directly.
- Floor light: L1 first, with a one-season lag. Then everything behind L1.
- Survival: L3 (starvation), L5 (windthrow, storms only), and L9 / O4's m0 in a stand.
- Recruits: L9 on top of all the above. Recruits are dead in the lone tree, where o4 is off.

## Known dead or weak levers observed 2026-11-06 (checked in code)

1. **Birch's `c5.T` had no effect. It is dead in every species, but not for the reason given.**
   - `c5.rs` `shed_branches` (line 46) computes `t = max(T, Trel·Q_top)`. Only the non-carbon branch uses `t`.
   - Every species' effective params have `r1.shed = "carbon"` (`species_effective_lone.json`). That branch tests `deficit[i] >= r1.kShed || light < Trel·Q_top`.
   - So `c5.T` is never read. "T_rel·Q_top binds" is not the mechanism.
   - The DAG flagged `c5.T` as dead before the sweep was consulted. In `sweep_effects.csv`, `c5.T` ±10% is **bit-identical** to the base in all 5 species with results (beech, holly, hornbeam, maple, rowan: every seed, at 100 and 150). It is the only swept param that is.
   - In carbon mode the live shedding knobs are `c5.Trel`, `c5.g`, `r1.kShed`, and through P/M `r1.mf`, `r1.mw`, `r1.Lh`, `c3.alpha`.
2. **Holly's `r2.vigourTreeLo` had no effect. It has no reader at any height, so the height cap is a red herring.**
   - `vigour_gate` (r2.rs:234) has three readers:
     - C3's vigour drop, which needs `vigourShare > 0` and `vigourLambda ≠ 0` (`vigour_drop_on`);
     - light orthotropy, which needs `lightSetPoint` (`light_set_point`);
     - C5's own-crown pruning, which needs `c5.Tvig > 0`.
   - Holly's overrides copied `vigourTreeLo/Hi` (3000/10000) from beech but none of the three rules that read them (`analysis/fit/hand-overrides.toml` [holly]). `vigour_forks` does not read the gate.
   - So `vigourTreeLo/Hi` are dead in holly in both contexts. They are live only in beech.
   - **This looks like a config slip.** Holly's override comment says it takes "Beech's fork rules ... (ADR 0033, 0039-0041)". ADR 0041 is the vigour drop, and holly sets neither `vigourShare` nor `vigourLambda`.
   - So the holly the user judged has the relay, the relay gate and the fork, but not the vigour drop. Reported only; nothing was changed.
   - vigourTreeLo is not in the sweep, so this rests on code reading alone. One real link does exist: once height ≥ r1.maturity, `fRep` (0.8 in holly) diverts net production away from v_base (r1.rs `carbon_balance`). Height therefore lowers v_base, and would move the gate if a reader were on.
3. **Beech's `r2.dLambda` is only 0.0138, so twigs-keep-λ (`r2.levels[k].dLambdaShare`) barely moves it.**
   - `lambda_at` (r2.rs:103) gives λ = level.λ − share·dLambda·t, with t = min(1, (age − aC)/ramp). Beech has aC 14.4 and ramp 1, so t = 1 from age ≈ 15.
   - Taking share from 1 to 0 shifts λ by at most **0.0138** at that level. At the same node, beech's vigour drop subtracts up to `vigourLambda·g·(1 − u)` = 0.03 (C3).
   - In a stand, R5 adds up to `r5.dLambda·s` = 0.02. That term is 0 in the lone tree, where shade s is 0.
   - So the share lever is dominated, but it is not dead. λ is tested against the B-H split at every node, and hornbeam's crown was recorded flipping within ±0.01 of dLambda (hand-overrides.toml [hornbeam]). The DAG cannot rule out a threshold.
   - Birch is the species where the lever is large: dLambda 0.078, and its twigs carry `dLambdaShare 0`.

## Other dead levers the gates find (lone tree = the sweep's setting)

- **Dead everywhere at today's settings.** These rest on code reading. They hold provided pa = order − paShift ≥ 0, which `released_shift` = min(order, …) and the relay's shift keep, so `pa_level` never returns None with R2 on.
  - `c1.branchAngle`, `c1.phyllotaxis`, `c3.lambda` and `c4.eta`: R2 is on, so `r2.levels[k]` supplies β, the generator, λ, η and the set point (`direction_params`, `branch_angle_of`, `lambda_at`).
  - `c5.T`: carbon shedding (item 1).
  - `r1.qHalf`: response is linear.
  - `o2.sway / maxSway / pAbr`: o2 is off.
- **Lone tree only:**
  - all of R5 (`r5.eS`, `dLambda`, `dB`, `dA`) and `r2.relayCrowd`: the signal is "neighbours", and a lone tree's neighbour share is 0, so s = 0 and s̄ = 0;
  - o4: off, so no recruits;
  - `o2.stormLoad`: stormP is 0.
- **By species (both contexts):**
  - the relay, fork and vigour knobs are dead wherever the rule they gate is off;
  - in hornbeam, birch, oak, rowan and willow, `relayAge`, `relayPTerm`, `forkAt` and `forkAngle` are dead because the relay is off;
  - maple's `forkAngle` is dead because forkAt is unset;
  - `vigourShare/Lambda/TreeLo/Hi` and `lightLo/Hi/Over` are dead in all species but beech.
- Per-species tables follow.

## Reach by outcome (structural: every gate open)

Lag = the fewest season boundaries on a path from the param to the outcome: 0 means it acts in the season it is read; 1 or more means only through a feedback loop. Every param below reaches the outcome; groups in bold reach it with lag 0.

### height

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### crown shape: dome D, W/H (crown.py on the dump)

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### crown base: limbBase / leafCrownRatio

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `o2.sway / maxSway / pAbr`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### floor light (groundLight)

- groups: c1, **c2**, c3, c4, c5, c6, o2, o4, r1, r2, r2.levels, r3, r4, r5, **r6**, **world**
- lag 0: `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `r6.leafArea`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.kStarve`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.lifespan`, `r6.qMin`, `seed`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### survival / mortality

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, **o4**, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.kStarve`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### recruits

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, **o4**, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.kStarve`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### metamers

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### slenderness H/D

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

## Dead levers by species (gates evaluated on each species' effective params)

A param is dead when no gated path reaches any outcome: at these settings the code never reads it, so changing it cannot change the run. Context 'lone' is the sweep's lone tree (o2, o4 off, no storms, no neighbours, so R5's neighbour shade is 0); 'stand' assumes neighbours, o4 on and storms (the forest preset).

Not listed: `world.obstacles` and `o2.stormP` (lone), which are off at their value and switch their own rule on when set. A lever listed dead may still come alive when another param opens its gate (e.g. r2.forkAt needs the relay on).

Dead in every species and both contexts: `c1.branchAngle`, `c1.phyllotaxis`, `c3.lambda`, `c4.eta`, `c5.T`, `o2.sway / maxSway / pAbr`, `r1.qHalf`

### lone

| species | dead params (beyond the common set) | principles off |
|---|---|---|
| beech | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.relayCrowd`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| hornbeam | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| birch | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| oak | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| holly | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.lightLo / lightHi / lightOver`, `r2.relayCrowd`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| maple | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.lightLo / lightHi / lightOver`, `r2.relayCrowd`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| rowan | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| willow | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |

### stand

| species | dead params (beyond the common set) | principles off |
|---|---|---|
| beech | - | O2_ABRADE, OBST |
| hornbeam | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| birch | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| oak | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| holly | `r2.lightLo / lightHi / lightOver`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST |
| maple | `r2.forkAngle`, `r2.lightLo / lightHi / lightOver`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| rowan | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| willow | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |

## Within-season principle edges (feeds) and across-season ones (feedback)

| from | to | kind | via |
|---|---|---|---|
| OBST | OBST | feedback | S_geom |
| R1_CARBON | R1_CARBON | feedback | S_reserve |
| R4_FATE | C2_LIGHT | feedback | S_budstate |
| R4_FATE | O2_TAG | feedback | S_budstate |
| R4_FATE | C2_SAMPLE | feedback | S_budstate |
| R4_FATE | C5_QTOP | feedback | S_budstate |
| R4_FATE | C3_BASI | feedback | S_budstate |
| R4_FATE | R1_CARBON | feedback | S_reserve, S_budstate |
| R4_FATE | R4_FATE | feedback | S_reserve, S_budstate |
| R2_FORM | OBST | feedback | S_geom |
| R2_FORM | C2_LIGHT | feedback | S_budstate, S_geom |
| R2_FORM | O2_TAG | feedback | S_budstate, S_geom |
| R2_FORM | C2_SAMPLE | feedback | S_budstate, S_geom |
| R2_FORM | R5_SHADE | feedback | S_geom |
| R2_FORM | C5_QTOP | feedback | S_budstate |
| R2_FORM | C3_BASI | feedback | S_budstate, S_geom |
| R2_FORM | R1_CARBON | feedback | S_budstate, S_geom |
| R2_FORM | C3_ACRO | feedback | S_geom |
| R2_FORM | R4_FATE | feedback | S_budstate |
| R2_FORM | R2_FORM | feedback | S_budstate, S_geom |
| C4_DIR | OBST | feedback | S_geom |
| C4_DIR | C2_LIGHT | feedback | S_geom |
| C4_DIR | O2_TAG | feedback | S_geom |
| C4_DIR | C2_SAMPLE | feedback | S_geom |
| C4_DIR | R5_SHADE | feedback | S_geom |
| C4_DIR | C3_BASI | feedback | S_geom |
| C4_DIR | R1_CARBON | feedback | S_geom |
| C4_DIR | C3_ACRO | feedback | S_geom |
| C4_DIR | R2_FORM | feedback | S_geom |
| C4_DIR | C4_DIR | feedback | S_geom |
| C1_SHOOT | OBST | feedback | S_geom |
| C1_SHOOT | C2_LIGHT | feedback | S_budstate, S_geom |
| C1_SHOOT | O2_TAG | feedback | S_budstate, S_geom |
| C1_SHOOT | C2_SAMPLE | feedback | S_budstate, S_geom |
| C1_SHOOT | R5_SHADE | feedback | S_geom |
| C1_SHOOT | C5_QTOP | feedback | S_budstate |
| C1_SHOOT | C3_BASI | feedback | S_budstate, S_geom |
| C1_SHOOT | R1_CARBON | feedback | S_budstate, S_geom |
| C1_SHOOT | C3_ACRO | feedback | S_geom |
| C1_SHOOT | R4_FATE | feedback | S_budstate |
| C1_SHOOT | R2_FORM | feedback | S_budstate, S_geom, S_radius |
| C1_SHOOT | C4_DIR | feedback | S_geom |
| C1_SHOOT | C1_SHOOT | feedback | S_budstate, S_geom |
| R6_REST | C2_LIGHT | feedback | S_budstate |
| R6_REST | O2_TAG | feedback | S_budstate |
| R6_REST | C2_SAMPLE | feedback | S_budstate |
| R6_REST | C5_QTOP | feedback | S_budstate |
| R6_REST | C3_BASI | feedback | S_budstate |
| R6_REST | R1_CARBON | feedback | S_budstate |
| R6_REST | R4_FATE | feedback | S_budstate, S_budage |
| R6_REST | R2_FORM | feedback | S_budstate |
| R6_REST | C1_SHOOT | feedback | S_budstate |
| R6_REST | R6_REST | feedback | S_budstate, S_budage |
| C5_SHED | OBST | feedback | S_geom |
| C5_SHED | C2_LIGHT | feedback | S_budstate, S_geom |
| C5_SHED | O2_TAG | feedback | S_budstate, S_geom |
| C5_SHED | C2_SAMPLE | feedback | S_budstate, S_geom |
| C5_SHED | R5_SHADE | feedback | S_geom |
| C5_SHED | C5_QTOP | feedback | S_budstate |
| C5_SHED | C3_BASI | feedback | S_budstate, S_geom |
| C5_SHED | R1_CARBON | feedback | S_budstate, S_geom |
| C5_SHED | C3_ACRO | feedback | S_geom |
| C5_SHED | R4_FATE | feedback | S_budstate |
| C5_SHED | R2_FORM | feedback | S_budstate, S_geom |
| C5_SHED | C4_DIR | feedback | S_geom |
| C5_SHED | C1_SHOOT | feedback | S_budstate, S_geom |
| C5_SHED | R6_REST | feedback | S_budstate, S_geom |
| C5_SHED | C5_SHED | feedback | S_geom, S_deficit |
| C6_GIRTH | R2_FORM | feedback | S_radius |
| C6_GIRTH | C5_SHED | feedback | S_radius |
| C6_GIRTH | C6_GIRTH | feedback | S_radius |
| R3_MECH | OBST | feedback | S_geom |
| R3_MECH | C2_LIGHT | feedback | S_budstate, S_geom, S_alive |
| R3_MECH | O2_TAG | feedback | S_budstate, S_geom |
| R3_MECH | C2_SAMPLE | feedback | S_budstate, S_geom |
| R3_MECH | R5_SHADE | feedback | S_geom |
| R3_MECH | C5_QTOP | feedback | S_budstate |
| R3_MECH | C3_BASI | feedback | S_budstate, S_geom |
| R3_MECH | R1_CARBON | feedback | S_budstate, S_geom |
| R3_MECH | C3_ACRO | feedback | S_geom |
| R3_MECH | R4_FATE | feedback | S_budstate |
| R3_MECH | R2_FORM | feedback | S_budstate, S_geom, S_radius |
| R3_MECH | C4_DIR | feedback | S_geom |
| R3_MECH | C1_SHOOT | feedback | S_budstate, S_geom, S_alive |
| R3_MECH | R6_REST | feedback | S_budstate, S_geom |
| R3_MECH | C5_SHED | feedback | S_geom, S_radius, S_stress |
| R3_MECH | C6_GIRTH | feedback | S_geom, S_radius, S_stress |
| R3_MECH | R3_MECH | feedback | S_budstate, S_geom, S_radius, S_stress |
| COMMIT | C2_LIGHT | feedback | S_budstate |
| COMMIT | O2_TAG | feedback | S_budstate |
| COMMIT | C2_SAMPLE | feedback | S_budstate |
| COMMIT | C5_QTOP | feedback | S_budstate |
| COMMIT | C3_BASI | feedback | S_budstate |
| COMMIT | R1_CARBON | feedback | S_budstate, S_age |
| COMMIT | C3_ACRO | feedback | S_age |
| COMMIT | R4_FATE | feedback | S_budstate |
| COMMIT | R2_FORM | feedback | S_budstate, S_age |
| COMMIT | C1_SHOOT | feedback | S_budstate |
| COMMIT | R6_REST | feedback | S_budstate |
| COMMIT | R3_MECH | feedback | S_budstate |
| COMMIT | COMMIT | feedback | S_budstate |
| O2_ABRADE | C2_LIGHT | feedback | S_budstate |
| O2_ABRADE | O2_TAG | feedback | S_budstate |
| O2_ABRADE | C2_SAMPLE | feedback | S_budstate |
| O2_ABRADE | C5_QTOP | feedback | S_budstate |
| O2_ABRADE | C3_BASI | feedback | S_budstate |
| O2_ABRADE | R1_CARBON | feedback | S_budstate |
| O2_ABRADE | R4_FATE | feedback | S_budstate |
| O2_ABRADE | R2_FORM | feedback | S_budstate |
| O2_ABRADE | C1_SHOOT | feedback | S_budstate |
| O2_ABRADE | R6_REST | feedback | S_budstate |
| O2_ABRADE | R3_MECH | feedback | S_budstate |
| O2_ABRADE | COMMIT | feedback | S_budstate |
| O2_ABRADE | O2_ABRADE | feedback | S_budstate |
| R1_STARVE | C2_LIGHT | feedback | S_alive |
| R1_STARVE | C1_SHOOT | feedback | S_alive |
| O4_STAND | C2_LIGHT | feedback | S_alive |
| O4_STAND | C1_SHOOT | feedback | S_alive |
| O4_STAND | O4_STAND | feedback | S_seedpool, S_alive, S_trees |
| OBST | C2_LIGHT | feeds | S_budstate, S_geom, S_alive |
| OBST | O2_TAG | feeds | S_budstate, S_geom |
| OBST | C2_SAMPLE | feeds | S_budstate, S_geom |
| OBST | R5_SHADE | feeds | S_geom |
| OBST | C5_QTOP | feeds | S_budstate |
| OBST | C3_BASI | feeds | S_budstate, S_geom |
| OBST | R1_CARBON | feeds | S_budstate, S_geom |
| OBST | C3_ACRO | feeds | S_geom |
| OBST | R4_FATE | feeds | S_budstate |
| OBST | R2_FORM | feeds | S_budstate, S_geom |
| OBST | C4_DIR | feeds | S_geom |
| OBST | C1_SHOOT | feeds | S_budstate, S_geom, S_alive |
| OBST | R6_REST | feeds | S_budstate, S_geom |
| OBST | C5_SHED | feeds | S_geom |
| OBST | C6_GIRTH | feeds | S_geom, S_scars |
| OBST | R3_MECH | feeds | S_budstate, S_geom |
| OBST | COMMIT | feeds | S_budstate |
| OBST | O2_ABRADE | feeds | S_budstate, S_geom |
| OBST | O4_STAND | feeds | S_geom, S_alive |
| STORM | R3_MECH | feeds | S_storm |
| C2_LIGHT | C2_SAMPLE | feeds | S_light |
| C2_LIGHT | R5_SHADE | feeds | S_light |
| C2_LIGHT | O4_STAND | feeds | S_light |
| O2_TAG | R5_SHADE | feeds | S_owner |
| O2_TAG | O2_ABRADE | feeds | S_owner |
| C2_SAMPLE | C5_QTOP | feeds | S_budq |
| C2_SAMPLE | C3_BASI | feeds | S_budq |
| C2_SAMPLE | R1_CARBON | feeds | S_budq |
| C2_SAMPLE | R4_FATE | feeds | S_budq |
| C2_SAMPLE | R2_FORM | feeds | S_budq |
| C2_SAMPLE | C4_DIR | feeds | S_budq |
| C2_SAMPLE | R6_REST | feeds | S_budq |
| C2_SAMPLE | O2_ABRADE | feeds | S_budq |
| R5_SHADE | R2_CROWD | feeds | S_shade |
| R5_SHADE | C3_ACRO | feeds | S_shade |
| R5_SHADE | R4_FATE | feeds | S_shade |
| R5_SHADE | C4_DIR | feeds | S_shade |
| R5_SHADE | C1_SHOOT | feeds | S_shade |
| R2_CROWD | R2_FORM | feeds | S_crowd |
| C5_QTOP | C5_SHED | feeds | S_qtop |
| C3_BASI | C3_ACRO | feeds | S_qsum |
| C3_BASI | C5_SHED | feeds | S_qsum |
| R1_CARBON | C3_ACRO | feeds | S_vbase |
| R1_CARBON | R4_FATE | feeds | S_reserve |
| R1_CARBON | R2_FORM | feeds | S_vbase |
| R1_CARBON | C5_SHED | feeds | S_PM, S_vbase |
| R1_CARBON | R1_STARVE | feeds | S_starved |
| R1_CARBON | O4_STAND | feeds | S_seedpool |
| C3_ACRO | R4_FATE | feeds | S_vin |
| C3_ACRO | R2_FORM | feeds | S_vin |
| C3_ACRO | C1_SHOOT | feeds | S_vin |
| R4_FATE | R2_FORM | feeds | S_budstate |
| R4_FATE | C1_SHOOT | feeds | S_budstate |
| R4_FATE | R6_REST | feeds | S_budstate |
| R4_FATE | R3_MECH | feeds | S_budstate |
| R4_FATE | COMMIT | feeds | S_budstate |
| R4_FATE | O2_ABRADE | feeds | S_budstate |
| R2_FORM | C4_DIR | feeds | S_setpoint, S_geom |
| R2_FORM | C1_SHOOT | feeds | S_budstate, S_geom |
| R2_FORM | R6_REST | feeds | S_budstate, S_geom |
| R2_FORM | C5_SHED | feeds | S_geom |
| R2_FORM | C6_GIRTH | feeds | S_geom |
| R2_FORM | R3_MECH | feeds | S_setpoint, S_budstate, S_geom |
| R2_FORM | COMMIT | feeds | S_budstate |
| R2_FORM | O2_ABRADE | feeds | S_budstate, S_geom |
| R2_FORM | O4_STAND | feeds | S_geom |
| C4_DIR | C1_SHOOT | feeds | S_geom |
| C4_DIR | R6_REST | feeds | S_geom |
| C4_DIR | C5_SHED | feeds | S_geom |
| C4_DIR | C6_GIRTH | feeds | S_geom |
| C4_DIR | R3_MECH | feeds | S_geom |
| C4_DIR | O2_ABRADE | feeds | S_geom |
| C4_DIR | O4_STAND | feeds | S_geom |
| C1_SHOOT | R6_REST | feeds | S_budstate, S_geom |
| C1_SHOOT | C5_SHED | feeds | S_geom, S_radius |
| C1_SHOOT | C6_GIRTH | feeds | S_geom, S_radius |
| C1_SHOOT | R3_MECH | feeds | S_budstate, S_geom, S_radius |
| C1_SHOOT | COMMIT | feeds | S_budstate |
| C1_SHOOT | O2_ABRADE | feeds | S_budstate, S_geom, S_radius |
| C1_SHOOT | O4_STAND | feeds | S_geom |
| R6_REST | R3_MECH | feeds | S_budstate |
| R6_REST | COMMIT | feeds | S_budstate |
| R6_REST | O2_ABRADE | feeds | S_budstate |
| C5_SHED | C6_GIRTH | feeds | S_geom, S_scars |
| C5_SHED | R3_MECH | feeds | S_budstate, S_geom |
| C5_SHED | COMMIT | feeds | S_budstate |
| C5_SHED | O2_ABRADE | feeds | S_budstate, S_geom |
| C5_SHED | O4_STAND | feeds | S_geom |
| C6_GIRTH | R3_MECH | feeds | S_radius |
| C6_GIRTH | O2_ABRADE | feeds | S_radius |
| R3_MECH | COMMIT | feeds | S_budstate |
| R3_MECH | O2_ABRADE | feeds | S_budstate, S_geom, S_radius |
| R3_MECH | O4_STAND | feeds | S_geom, S_alive |
| COMMIT | O2_ABRADE | feeds | S_budstate |
| R1_STARVE | O4_STAND | feeds | S_alive |
