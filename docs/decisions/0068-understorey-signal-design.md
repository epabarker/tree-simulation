# 0068: The understorey's suppression signal: the top's light against each species' survival light; the band counted from 7 cm DBH

- **Status:** accepted (user, 2026-11-13, accepting the agent's design for #132). It fixes the **design** #132's probe tests and the band's counting rule. Adopting the mechanism as the garden's default waits for the probe's 20-seed evidence and a new ADR. Amends [ADR 0065](0065-garden-demography-reported-targets.md) decision 1 (what the 200–400/ha band counts).
- **Spec:** §O4.4, §O4.6, §O4.11, §6, §10. ADRs 0063, 0065, 0067.
- **Tickets:** [#132](https://github.com/epabarker/tree-simulation/issues/132) (the understorey), [#129](https://github.com/epabarker/tree-simulation/issues/129) (its parent), [#122](https://github.com/epabarker/tree-simulation/issues/122) (the acceptance gates that must hold).
- **Evidence:** an offline reading of HEAD's garden runs (the crown-extent probe's `runs/probe/129-base-*/head/garden160-*`, seeds 1–3, seasons 100–300) and of the 20-seed acceptance runs (`runs/garden-acceptance/{r6,d1}`). No new simulation. Exploratory.

## Context
- **The understorey floods.** At HEAD the garden sits at its compute cap for a median 235 of 300 seasons, with a canopy share of 0.14 ([the acceptance note](../experiments/2026-11-12-garden-acceptance.md)).
- **O4's suppression is m_s·(1 − P/M)₊, which never acts:** P/M < 1 in 5% of understorey tree-seasons.
- **Growth against potential cannot separate the classes.** Canopy and understorey add the same new shoots per bud (medians 0.055 and 0.054 over 5 seasons) and the same height. Girth is C6's pipe sum, not a ring, so it carries no increment signal either.
- **A falling reserve flags the canopy more than the understorey** (k ≥ 3 seasons: 8% against 5%).
- **Light is the quantity that separates them.** The crown top's light, Q_top/C (C5's 0.9 bud-light quantile), has medians of 0.34 in the canopy, 0.13 in the understorey and 0.035 in the bank.
- **No threshold separates the saplings that later reach the canopy from those that never do.** At HEAD a sapling is released by a gap, not by its own light.
- **Mortality cannot clear the cap.** At the cap, 1,200–2,200 seeds arrive a season. Clearing the bank would need a death rate of at least 0.6 a season per sapling, while the tolerance-scaled maximum is 0.065 for hornbeam and 0.39 for birch.
- **The 200–400/ha band is a thinned stand** (Lockow's yield table), counted from a mean DBH of 5.5–6.9 cm. The garden counts every drawn stem from 1.3 m in height, most of which are under 7 cm: at HEAD the flood is sub-7 cm.

## Decision
1. **The signal is the top's light against the species' survival light**, an extension of ADR 0065 decision 5's `topLight`.
   - q = Q_top / C, as C5 sets it in phase 2 and O4 reads it in phase 3 (spec §6).
   - The deficit is a ramp: d = clamp((θ_hi − q) / (θ_hi − θ_sp), 0, 1), with θ_hi := max(θ_hi, θ_sp). It is 0 above one world ceiling θ_hi and 1 below the species' floor θ_sp.
   - θ_sp is the species' sapling survival light, from its target file's `shade.survivalLight` (Hagemeier & Leuschner 2019: birch 0.21, beech 0.034, hornbeam 0.033; others by score).
   - The rate is m_s · d · e^(−β_s(T − 1)), as `tolerance_scaled` scales it now, so it stays a rate and never a kill. Today's step (1 − q/θ)₊ is the special case θ_sp = θ_hi.
2. **Params, off by default and bit-identical:**
   - `o4.survivalLight` per species; absent, the step form, as now.
   - `o4.topLightThreshold` as θ_hi, read from the species' params where set.
   - The signal stays `o4.suppressionSignal: "topLight"`.
   - No new state, checkpoint field or RNG purpose. Q_top is computed only when C5's relative test is on (`season.rs`), so the probe must say whether every patched species has it on.
3. **The band counts stems ≥ 7 cm DBH** (DBH by `cli/allometry.ts`), and the canopy share is read on that set. Stems ≥ 1.3 m tall are still reported beside it, because the page draws from 1.3 m. Lockow's counting threshold is consistent with 7 cm; the German yield tables' 7 cm *Kluppschwelle* is outside knowledge, not verified here.
4. **Reaching the cap is not a #132 bar.** ADR 0065 decision 2 already reports cap seasons rather than gating on them, and mortality cannot clear a cap fed by this seed supply. The seedling bank's representation (spec §O4.11's stubs "until lit", outside `maxTrees`) or hornbeam's seed supply is [#137](https://github.com/epabarker/tree-simulation/issues/137).
5. **The probe**, with its bars fixed before the runs. They are copied into #132.
   - **Runs:** 160 and 66 cells, seeds 1–20, to season 300, with a pilot on seeds 1–3 first.
   - **Arms:** HEAD; θ_hi 0.10, 0.15 and 0.25 at m_s 1; θ_hi 0.15 at m_s 3 (a rate bracket).
   - **Gates** (#122; ≥ 18 of 20 at both widths):
     - a canopy tree in every season after 50;
     - on the phone width, at least one canopy tree from season 100;
     - a checkpoint from before the change loads;
     - lone oak and hornbeam, seeds 1–3, hash-identical to HEAD.
   - **Adoption bars** (160 cells, 60 frames):
     - stems ≥ 7 cm at 200–400/ha in ≥ 30 of 60 frames, and in more frames than HEAD;
     - a canopy share ≥ 0.6 on that set in ≥ 30 of 60, and in more frames than HEAD;
     - canopy trees/ha from season 100 not below HEAD's median per run (#129's target 1 is not bought);
     - O4 canopy deaths per run ≤ 1.5× HEAD's;
     - frames with a light-demanding species in the canopy ≥ HEAD's.
   - **Reported:** cap seasons; floor light; drawn stems ≥ 1.3 m per ha and their share; the top species' share; the bank's size and lifetimes by species; the phone's counts.
   - **Regressions:** `phoneSeed3` may move if the signal is adopted, re-baselined with a devlog reason. `forestRegeneration` must not move.

## Alternatives
- **P/M (today's default):** never acts on the understorey.
- **Growth against potential:** the stand is static, so it flags 42–52% of canopy tree-seasons along with the understorey.
- **A reserve falling over consecutive seasons** (ADR 0063 decision 3's third reading): flags the canopy more than the understorey.
- **Light relative to the stand's own canopy:** the canopy's Q_top is sky-limited (0.34–0.87), so dividing by it rescales without reordering, and makes one tree's death depend on which others live.
- **A uniform θ (d1's 0.15):** flags 20% of canopy tree-seasons and kills light-demanders under shade. The ramp keeps birch suppressed only below 0.21 and beech below 0.034.
- **Keep "no cap in ≥ 15 of 20" as a bar:** a mortality signal cannot reach it (Context).

## Consequences
- **Now:** no code, golden or regression changes. #132 carries the design and bars; the seedling bank is [#137](https://github.com/epabarker/tree-simulation/issues/137).
- **Robustness to crown change:** #133 and #134 will narrow crowns and brighten the floor (the triad note §4: a median 1.8×). The absolute ratio sees that, but the rates are re-tuned after either lands.
- **If adopted:**
  - spec §O4.4 and §O4.6;
  - ADR 0063 decision 3 amended (vigour is the top's light against the species' survival light; "reserve falling" retired);
  - ADR 0065 decision 5's default changed, and d1 superseded;
  - a new ADR;
  - the playbook page, `mixedWood`'s golden with its devlog reason, `cli/export-presets.ts`, and #124's oak guard re-checked.
- **Side finding, untraced:** understorey saplings carry a carbon surplus that buys no growth. One hornbeam grew from 1.1 to 1.3 m over 60 seasons at P/M 4–5. Whether C3's per-bud threshold freezes them is [#138](https://github.com/epabarker/tree-simulation/issues/138). A fix there would re-tune this signal's rates.
- **Risk:** on 20 seeds, d1 halved the seasons at the cap but lowered the band count (8 against 13 of 60 frames on the 1.3 m count). If crown width, not suppression, limits the canopy, the band will stay short until #134.
