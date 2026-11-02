# 0043: Own-crown pruning: a vigorous tree sheds its own shaded laterals (c5.Tvig), a C5 shedding change

- **Status:** rejected (the user, 2026-11-02); proposed 2026-11-01. `c5.Tvig` stays in the core, off by default (absent or 0: bit-identical), and no species sets it. The boundary question below is moot.
- **Date:** 2026-11-01
- **Spec:** §C5 (shedding, T and T_rel; ADR 0007's relative shedding), §R2 (ADR 0041's vigour gate)
- **Round:** [the ledger](../experiments/code/2026-11-01-fresh-look-beech/notes.md), "The user's judgement" and Repair; [the review](../experiments/2026-11-01-fresh-look-beech-review.md)

## Context
The user observed, on every sheet: the lower branches always survive and the lower trunk never becomes bare. The photograph note has the open-grown beech's trunk clear for its lowest 1/8–1/6 before it divides. The task's brief held shedding (C5, R1) fixed for the ecology, because ADR 0032 put T_rel on measured values: **beech's T_rel is 0.008**, the light of its lowest shade leaves (Hagemeier & Leuschner 2019).

## Decision (proposed)
In `shed_branches`, a lateral is also shed when its light per metamer is below g·`Tvig`·Q_top, with g ADR 0041's vigour gate on the tree's v_base. It adds to C5's (or R1's carbon) test; it does not replace it. A tree under the gate's lower bound is untouched. Off when `Tvig` is 0 or absent; the core is then bit-identical.

Beech's proposed value: Tvig 0.25.

## The boundary question (for the user)
- **It is a C5 shedding change.** ADR 0032 fixed T_rel per species from measured shade leaves and took it out of the fit; the brief held shedding fixed. Tvig is a second relative threshold on the same measure (light per metamer against Q_top), **31 times beech's measured T_rel** (0.25 against 0.008), on open-grown trees only. On a vigorous tree it overrides the measured value: an open-grown beech sheds wood that the measurement says beech keeps in leaf.
- **The stand is untouched in the round's runs,** because the gate stays shut there (every stand tree's v_base stays under 3000; the review's 20-seed runs check this). So ADR 0032's stand numbers hold; what moves is the lone tree's and, through the absolute-unit gate, any edge or gap tree's.
- **It is a cliff:** Tvig 0.30–0.35 opens the crowns into see-through umbrellas (repair-q5, q7, q10).

## Botanical basis, checked in review
The repair cited it from memory, as relative-light shedding and branch autonomy: "Sprugel, Hinckley & Schaap 1991; Takenaka 1994".
- **Sprugel, D. G., Hinckley, T. M. & Schaap, W. (1991).** *The theory and practice of branch autonomy.* Annual Review of Ecology and Systematics 22: 309–334 (doi 10.1146/annurev.es.22.110191.001521). The citation exists [s: search results; JSTOR lists it]. Its full text could not be read from the review's container (the publisher, JSTOR, Crossref and Semantic Scholar were refused). By its abstract as summarised in search results, it is about branches' autonomy in carbon, water and nutrients; whether it says the shedding threshold is *relative to the rest of the crown* is **unverified**.
- **Takenaka, A. (1994).** *A simulation model of tree architecture development based on growth response to local light environment.* Journal of Plant Research 107: 321–330 (doi 10.1007/BF02344260). The citation exists [s]; a later paper describes the model as shedding undersupplied components. Its rule could not be read; **unverified**.
- **What neither supports:** that a *vigorous* tree should shed more than a weak one. Branch autonomy, if anything, says a branch's fate is its own carbon balance whatever the tree's; the gate by tree vigour is the round's device for keeping the stand unchanged, with no source.
- C5 already has relative shedding (ADR 0007's T_rel); the new part is only the vigour-gated second threshold.

## Consequences
- If accepted as it stands, beech's measured T_rel (ADR 0032) would hold in stands and be overridden in the open: the model would carry two shedding thresholds for one species with no source for the second.
- The alternatives within the existing rules: none found by the round (a lower pa-2 set point broke the stand). Outside it: R1's carbon shedding, which ADR 0032's acclimated leaf cost made more lenient on shaded limbs (whether that is why the skirt survives is a hypothesis to test, not a finding), or accepting the remnant skirt.
- **Test:** `a_vigorous_tree_sheds_its_own_shaded_limbs_and_a_weak_one_keeps_them`.

## Outcome (2026-11-02): rejected
- **In the open it overrides a measurement without a source.** The lone beech's lower limbs, the ones it clears, are well lit: their light per metamer is 14–80× T_rel·Q_top, and their production pays for their maintenance (P/M ≥ 1.5) ([overnight §1](../experiments/2026-11-02-beech-overnight.md)). An honest shedding rule should not clear them, so the bare lower trunk of an open-grown beech must come from something else: the sapling's history (grown up under cover, or browsed), or form, not C5.
- **In the garden it strips a side-shaded beech to a pole with a cap.** Seed 13's edge beech on the phone plate. With `Tvig` 0 its crown stays clothed under either vigour gate ([overnight §2b](../experiments/2026-11-02-beech-overnight.md)).
- **Dropping it costs the lone tree little:** at 20 seeds it is shorter and broader (120 cells against 137, W/H 1.50 against 1.31), and its leaf below H/6 rises from 5.6% to 8.4%, about a third of today's 23.5%. The stand is identical with and without it: under the resource gate it never acts there ([overnight §2c](../experiments/2026-11-02-beech-overnight.md)).
- **What changes:** beech's `"c5.Tvig" = 0.25` is removed from `analysis/fit/hand-overrides.toml` and `flora-fitted.ts`; golden `beechOpen:seed1:s40` befbed31 → 3525f9f7 (devlog, 2026-11-02). The code and its test stay, off by default, so the review's runs reproduce.
