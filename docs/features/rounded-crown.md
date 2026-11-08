# Rounded crown

A **Form feature** (GLOSSARY): a crown whose outline is full at the top while the tree is still growing taller. Decided by the ticket [Which mechanism rounds a crown?](https://github.com/epabarker/tree-simulation/issues/83). **Status: proposed.** The mechanism is marked decided only once the probe ticket "Does a water-status cap on extension round the open-grown oak and maple?" passes. The ADR that supersedes ADR 0031's Decision 4 is written then. Not yet implemented; hand off through `/implement-principle`.

## What it should look like

- **A full outline in the vigorous phase.** The crown's outline lies between a cone of the same W/H and an ellipse, and its leaf is spread down the crown rather than piled in a top layer.
- **After the stall, a flattening top is realistic.** Once height growth has stalled, a flattened top with thickened limbs is what old trees do (Ryan & Yoder 1997; Roloff's phases in beech, via Innes 1998).
- **The defect** is a flat cap or a spire on a tree that is still growing taller.
- **W/H rising with DBH** is a species expression, not the definition. Pretzsch 2015 has it for oak and lime only. Beech, hornbeam and sycamore keep broad crowns while their W/H falls slightly.
- Judged on a lone **open-grown** tree in the lab (ADR 0062). The garden is only a guard: no bare-bole species loses its lid or crown depth, and no named regression gets worse.

## Today (open-grown box, seeds 1–3, season 100)

From the [open-box note](https://github.com/epabarker/tree-simulation/blob/wayfinder/open-box/docs/experiments/2026-11-08-open-box.md):

- **Oak:** a spire over wide low limbs. The leader stalls at 33–34 m from about season 60. The upper flank is well lit (Q/Q90 1.0–1.3) but takes only 0.1–0.3% of new metamers; the low limbs take 45–59%.
- **Maple:** a weak, seed-dependent flat cap.
- **Birch:** a broad dome (W/H 0.87–1.17), where real open-grown birch is an excurrent ovoid.
- **The cause:** C3 allocates by light alone, so long low limbs with many buds win.
- **R1's path-length discount `d(L)`** acts only on the tree's total budget and on shedding, not on any one shoot's extension.

## Mechanism (proposed)

| Part | Decision |
|---|---|
| Rule | A **sink limit** on each shoot's extension, from its water status: Ψ = −(g·height + r·path length) |
| Response | Lockhart-linear: the shoot's metamer count is scaled by max(0, (Ψ − Ψ_crit)/(0 − Ψ_crit)). It acts on extension only, not on leaf size or bud flushing |
| Allocation | C3 stays on light (Borchert–Honda). What a tip cannot use goes to R1's reserve up to its cap; beyond the cap it is not produced. It is never re-split to other shoots |
| Terms | Both terms. The g : r ratio is a param, because it decides whether the cap fills the oak's flank (friction penalises long low limbs) or only caps the top (gravity) |
| Switch | `c3.sink: "off" \| "turgor"`, off by default, goldens unchanged (names provisional) |
| R1's `d(L)` | Untouched by this feature |

**Why a sink limit and not a carbon weight.** The obvious alternative was to have C3 split on what a bud produces, Q·d(L). That is the carbon-supply reading, and it is rejected: NSC *rises* with height while shoot extension falls (Woodruff & Meinzer 2011). Turgor tracks elongation (Woodruff 2004; Meinzer 2008). See the [turgor addendum](../research/2026-11-08-turgor-sink-limit.md). The evidence is all from conifers.

**Fallback.** If the cap fills the flank but leaves the top flat, the next mechanism is **reiteration** (Troll's model; ADR 0031's Decision 4): ascending co-dominant limbs that arch at the tips, an R2 feature. **Leader dieback** is ruled out: it is sourced only in 100 m redwoods.

## Species expressions

- **Ψ_crit** is the species knob: a tree's tolerance of low water status.
- **Oak:** a dome, plus W/H rising with DBH. Its spire (the leader's stall over the low limbs) is part of this feature.
- **Maple (sycamore):** an outline dome. Its W/H need not rise (Pretzsch: α_cr − α_h = −0.05).
- **Birch, the contrast:** stays an excurrent ovoid, with W/H ≤ 0.7 at season 100. There is no birch-specific rule; if the cap alone leaves birch a dome, its expression is stronger apical control through the existing λ.
- **Beech posture** (level plates, ADR 0045) is not part of this feature.

## Cheap diagnostic

Exploratory: the feature probe ([prototype](https://github.com/epabarker/tree-simulation/tree/wayfinder/feature-probe)), a lone open-grown tree (60 m box), seeds 1–3, at seasons 30/60/100, HEAD against patch, run friction-heavy and gravity-heavy. **The contact sheet decides**; the numbers explain:

1. **Top-fifth leaf share** 0.15–0.30 (ADR 0031: 22–24% rounded, 38–46% cap).
2. **Upper-flank share of new metamers** ≥ 5% in oak and maple (oak: 0.1–0.3% today).
3. **Extension against path length and against height**: the fingerprint that the mechanism is acting, falling together at the leader and the long lateral tips.
4. **Leader extension rate**, to mark the vigorous phase against the stall.
5. **W/H against DBH**: rising for oak; ≤ 0.7 for birch at season 100.
6. **Outline fullness** between a same-W/H cone and the ellipse.
7. **The garden guard**: bare-bole species keep their lid, and the named regressions are no worse.

Adoption needs the ≥ 20-seed rule with a stated pass rate.
