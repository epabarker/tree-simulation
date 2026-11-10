# Rounded crown

A **Form feature** (GLOSSARY): a crown whose outline is full at the top while the tree is still growing taller. Decided by the ticket [Which mechanism rounds a crown?](https://github.com/epabarker/tree-simulation/issues/83). **Status: decided for the oak (exploratory, seeds 1–3); maple's part deferred.** The oak takes the early λ fall (the fallback named by [Which open-grown oak does the rounded-crown page take…](https://github.com/epabarker/tree-simulation/issues/93), taken when the relay failed in [Does treating a takeover as a relay…](https://github.com/epabarker/tree-simulation/issues/94)). The ADR that supersedes ADR 0031's Decision 4 is written when the oak's setting is adopted with ≥ 20 seeds. Not yet implemented; hand off through `/implement-principle`.

## What it should look like

- **A full outline in the vigorous phase.** The crown's outline lies between a cone of the same W/H and an ellipse, and its leaf is spread down the crown rather than piled in a top layer.
- **After the stall, a flattening top is realistic.** Once height growth has stalled, a flattened top with thickened limbs is what old trees do (Ryan & Yoder 1997; Roloff's phases in beech, via Innes 1998).
- **The defect** is a flat cap or a spire on a tree that is still growing taller.
- **W/H rising with DBH** is a species expression, not the definition. Pretzsch 2015 has it for oak and lime only. Beech, hornbeam and sycamore keep broad crowns while their W/H falls slightly.
- Judged on a lone **open-grown** tree in the lab (ADR 0062). That stage is built ([#115](https://github.com/epabarker/tree-simulation/issues/115)): `loneTreeParams`, `oakOpen` and `beechOpen` are a square 60 m box open on all four sides, which the feature probe reads ([light entry](light-entry.md)). The garden is only a guard: no bare-bole species loses its lid or crown depth, and no named regression gets worse.

## Today (open-grown box, seeds 1–3, season 100)

From the [open-box note](../experiments/2026-11-08-open-box.md):

- **Oak:** a spire over wide low limbs. The leader stalls at 33–34 m from about season 60. The upper flank is well lit (Q/Q90 1.0–1.3) but takes only 0.1–0.3% of new metamers; the low limbs take 45–59%.
- **Maple:** a weak, seed-dependent flat cap.
- **Birch:** a broad dome (W/H 0.87–1.17), where real open-grown birch is an excurrent ovoid.
- **The cause:** C3 allocates by light alone, so long low limbs with many buds win.
- **R1's path-length discount `d(L)`** acts only on the tree's total budget and on shedding, not on any one shoot's extension.

## Mechanism

| Part | Decision |
|---|---|
| Oak | **C3's λ falls with age** through the existing ontogenetic fall: `r2.dLambda` 0.12 from `r2.aC` 13.5 (`d12a13`; HEAD 0.04 from 13.51). A species expression, not a new rule. It divides the top (34–80 axis switches against 0–5) and fills the flank (5.5–7.3% on all three seeds): a rounded dome at 33 m by season 100 ([oak-λ note](../experiments/2026-11-08-oak-lambda.md)) |
| Its cost | A squat young bush (15–16 m at season 30, no spire) and a low reach of 12–14 m. Accepted: no setting kept the young spire and the wide low limbs while dividing the top ([oak-schedule note](../experiments/2026-11-08-oak-schedule.md), [oak-relay note](../experiments/2026-11-08-oak-relay.md)) |
| Maple (deferred) | A **sink limit on internode length** (`c3.sink: "turgorLength"`, probe only): Ψ = −(g·height + r·path length), Lockhart-linear to Ψ_crit; each shoot keeps its metamers, its internodes are s times as long, and (1 − s) of its share goes to R1's reserve. It fills maple's top (top-fifth leaf 0.08–0.24 against 0.03–0.11) at 18–24 m against 25–27 m ([turgor-length note](../experiments/2026-11-08-turgor-length.md)). Not yet in this page's mechanism: it waits for a combined run with the bare bole's re-anchored T_rel, with the friction/gravity split, birch's runaway leaders and `phoneSeed3`'s canopy loss still to settle |
| Allocation | C3 stays on light (Borchert–Honda) |
| R1's `d(L)` | Untouched by this feature |

**Rejected on the way.** A sink limit on the **metamer count** is a gate, not a graded limit, because from season ≈ 30 every shoot is one metamer ([turgor-cap note](../experiments/2026-11-08-turgor-cap.md)). A **relay on loss** (a lateral replacing a lost main bud takes the host's level) never fires, because the oak's takeovers outgrow a live main axis. An **overtop relay** (`r2.relayOvertop`) puts the leader on pa 0 but cascades the stalled trunk's laterals upward: no young spire, flank under 5%, and beech and birch change too. **Carbon-weighted allocation** (C3 splitting on Q·d(L)) is the carbon-supply reading, and NSC *rises* with height while shoot extension falls (Woodruff & Meinzer 2011); turgor tracks elongation (Woodruff 2004; Meinzer 2008). See the [turgor addendum](../research/2026-11-08-turgor-sink-limit.md). **Leader dieback** is sourced only in 100 m redwoods. **Reiteration** (Troll's model; ADR 0031's Decision 4) was never triggered: the λ fall fills the oak's flank without it.

## Species expressions

- **The oak's knobs** are `r2.dLambda` and `r2.aC`; **maple's** (deferred) is Ψ_crit, a tree's tolerance of low water status.
- **Oak:** a dome, plus W/H rising with DBH. Its young spire (the leader over the low limbs) and its wide low limbs were required by [Which open-grown oak does the rounded-crown page take…](https://github.com/epabarker/tree-simulation/issues/93), with the early dome as the fallback if no rule could keep them. The oak rounds through C3's λ, not the length cap: a falling λ (`r2.dLambda`) divides its top and fills its flank ([oak-λ note](../experiments/2026-11-08-oak-lambda.md)). No λ schedule alone keeps the spire and the limbs as well ([oak-schedule note](../experiments/2026-11-08-oak-schedule.md)), because the oak's leader above 0.5 H is a pa-1 lateral that took over, on the same level as the limbs.
  - **The early dome is taken** (`d12a13`: dLambda 0.12 from aC 13.5). The young spire and the wide low limbs were the target, but a takeover relay failed its probe ([oak-relay note](../experiments/2026-11-08-oak-relay.md)), so the page takes the dome at the cost of a squat young bush (15–16 m at 30) and a low reach of 12–14 m.
  - **The late-dividing box is a defect.** A λ fall that is late or slow (`a13r40`) keeps the young form but gives a flat-topped, straight-sided box by 100 while the tree is still growing taller. That is this page's defect, not the old-tree flattening, which comes only after the stall.
- **Maple (sycamore):** an outline dome. Its W/H need not rise (Pretzsch: α_cr − α_h = −0.05).
- **Birch, the contrast:** stays an excurrent ovoid, with W/H ≤ 0.7 at season 100. There is no birch-specific rule. The oak's λ fall leaves birch untouched (its twigs keep λ, ADR 0057); its broad open-grown dome (W/H 0.87–1.17) is a species question beyond this feature.
- **Beech posture** (level plates, ADR 0045) is not part of this feature.

## Cheap diagnostic

Exploratory: the feature probe ([prototype](https://github.com/epabarker/tree-simulation/tree/wayfinder/feature-probe)), a lone open-grown tree (60 m box), seeds 1–3, at seasons 30/60/100, HEAD against patch (for maple's cap, friction-heavy and gravity-heavy). **The contact sheet decides**; the numbers explain:

1. **w90**, the outline's width at 0.9 of the crown's depth over its widest width (an ellipse gives 0.6): a spire ≤ 0.49, a divided crown 0.38–0.85. It does not separate a dome from a box, so the season-100 contact sheet is checked by eye for a flat top and the verdict recorded. The **top-fifth leaf share** (0.15–0.30, ADR 0031) stays for maple only, whose crown is raised; a filled ellipsoid reaching the ground scores 0.10, so it fails a ground-reaching dome by construction.
2. **Upper-flank share of new metamers** ≥ 5% in oak and maple (oak: 0.1–0.3% today).
3. **Extension against path length and against height**: the fingerprint that the mechanism is acting, falling together at the leader and the long lateral tips.
4. **Leader extension rate**, to mark the vigorous phase against the stall.
5. **W/H against DBH**: rising for oak; ≤ 0.7 for birch at season 100.
6. **Outline fullness** between a same-W/H cone and the ellipse.
7. **The garden guard**: bare-bole species keep their lid, and the named regressions are no worse.

Adoption needs the ≥ 20-seed rule with a stated pass rate.
