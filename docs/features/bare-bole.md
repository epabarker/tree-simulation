# Bare bole

A **Form feature** (GLOSSARY): a trunk clear of living limbs for a large share of its height, as beech and hornbeam grow in a closed stand. Decided by the ticket [Which mechanism makes a bare bole?](https://github.com/epabarker/tree-simulation/issues/84). **Status: proposed.** The mechanism is marked decided only once the probe ticket "Does a re-anchored, accumulating T_rel clear beech and hornbeam in a closed stand while holly stays clothed?" passes. That probe is now the first acceptance check of build (d) in the [handoff](README.md), because it needs the ADR 0063 garden. Its [advisory early look](../experiments/2026-11-08-bole-probe.md) in HEAD's garden found the lowest limbs lit at 0.4–0.6 of Q_top, so the bole did not clear. The real run therefore checks first whether the new stand darkens them. The ADR is written then: it partly reverses ADR 0032's anchor for T_rel and re-reads ADR 0043's Tvig as a value inside the evidence range, with no vigour gate. Not yet implemented; hand off through `/implement-principle`.

## What it should look like

- **Measured as the live crown base** (GLOSSARY): the height of the lowest living first-order limb ÷ tree height, on stand trees ≥ 10 m. Dead stubs do not count; the model has none.
- **Beech and hornbeam: 0.3–0.45** in a closed stand. Real beech is 0.34–0.43 (1 − CR). Hornbeam has no data; the same band is an assumption.
- **Holly, the contrast: ≤ 0.1.** It keeps its lower limbs.
- **Judged in the garden.** The lone open-grown tree is a **guard** only: the mechanism must not strip it into a see-through umbrella, and it need not clear its bole. ADR 0043 found the lone beech's lowest limbs well lit and paying their way, so its short clear trunk (1/8–1/6 in the photograph note) is sapling history, not shedding.
- **Edge and gap trees keep deeper crowns** (Seidel 2016; Sherich 2007), though only within metres of the opening in dense broadleaves (Salek 2013).

## Today (HEAD, seeds 1–2 half-walled; seeds 1–3 open box)

From the [self-pruning note](../experiments/2026-11-08-self-pruning.md) and the [open-box note](../experiments/2026-11-08-open-box.md):

- **R1's carbon test (P < M, `kShed` 1) does nearly all shedding.** C5's relative test fired first for 6 of 339k branch roots: at the fitted T_rel (beech 0.008, hornbeam 0.025, holly 0.021, set from shade leaves by ADR 0032) it is dormant.
- **The lowest limb is the first lateral, at 0.25 m, for the whole run**, in lone and garden trees alike. It is lit at 0.11–0.61 of Q_top and pays for itself (P/M 2–17). Clear bole ÷ height is 0.006–0.04.
- **A static cut at 0.5·Q_top** (no regrowth) clears garden beech and hornbeam to 0.23–0.36 and leaves holly ≤ 0.05; in lone trees it strips limbs without raising the bole, because the lowest limbs are not the darkest (ADR 0043's umbrella cliff).
- **Shedding is instant;** there is no dead-limb state.

## Mechanism (proposed)

| Part | Decision |
|---|---|
| Rule | **C5's existing relative test**, recalibrated: a lateral is shed when its light per metamer is below T_rel·Q_top (Q_top the crown's 90th-percentile bud light). No new rule |
| Anchor | T_rel is re-read as a **branch-death** ratio (Henriksson 2001; Takenaka via Sprugel 2002: shoots at ≈ 5% die beside shoots at > 10%; the range 0.05–0.5), not a shade-leaf figure (ADR 0032) |
| Accumulation | A new counter: a limb is shed only after **k consecutive seasons** below the threshold; a season above resets it. Default k = 1, bit-identical (name provisional: `c5.kRel`) |
| With R1 | Either-or, as now: a limb goes if the relative test or R1's carbon test says so |
| Scope | Unchanged: every lateral branch root, not only first-order limbs. No positional rule |
| Side light | No term of its own. Light entry is a World effect (ADR 0062); a side-lit limb is not relatively dark, so the rank rule keeps it |
| World | The closed stand of ADR 0063 on the periodic depth of ADR 0062. The probe needs that garden; today's (≈ 2,000 stems/ha, τ faces) gives advisory looks only |

**Why calibration and not a new rule.** The research's strongest mechanism, a branch dying when it is darker than the rest of its crown, is the rule C5 already has, set one to two orders of magnitude too low to reach a lower limb. A second threshold beside T_rel (ADR 0043's Tvig, gated or not) would give one species two thresholds on one measure. Relying on the World effects alone is the probe's control arm, not the mechanism. A rank against neighbours or the crown median has no evidence over Q_top, which is already a rank-type reference.

**Left out.** **Dead stubs and fall lag:** oak keeps dead lower branches visibly longer than beech (Kint 2010), but no source dates the fall, and a dead-limb state is a new mechanism; it waits in the map's fog as a later beauty item. **A positional scope** (first-order or below-median limbs only): no source; if the lone guard fails, revisit T_rel and k instead.

## Species expressions

- **T_rel and k** are the species knobs.
- **Beech and hornbeam:** T_rel swept 0.1 / 0.25 / 0.4, k from about 3. Beech's leaves tolerate deep shade (0.008) while its branches die in relative shade: the two are different measures.
- **Holly, the contrast:** T_rel stays 0.021. Shade-tolerant and evergreen, it keeps its lower limbs.
- **Oak:** abrupt branch death (Kint 2010), so a low k when its expression is decided.
- **Every other species** keeps its fitted T_rel until its own expression is decided.

## Cheap diagnostic

Exploratory: the feature probe ([prototype](https://github.com/epabarker/tree-simulation/tree/wayfinder/feature-probe)) in the ADR 0062/0063 garden, seeds 1–3, seasons 50/100/150, HEAD against patch, sweeping T_rel × k. Run without the rounded crown's turgor patch, so each mechanism is judged alone. **The contact sheet decides**; the numbers explain:

1. **Live crown base** of stand trees ≥ 10 m: beech and hornbeam 0.3–0.45, holly ≤ 0.1.
2. **Lowest-limb light ratio** (light per metamer ÷ Q_top) against T_rel, as a histogram: the fingerprint that the rule is acting.
3. **Shed cause** (C5 relative, R1 carbon, both) for first-order limbs: C5 should now share the work.
4. **Lid and crown depth:** beech and hornbeam keep a full crown over the bole, with no pole and cap (ADR 0043's seed 13).
5. **Lone open-grown guard** (60 m box, season 100): leaf below H/6 and top-fifth leaf share within ±25% of HEAD, and no see-through umbrella on the sheet.
6. **Edge trees**, reported apart: they should keep deeper crowns.
7. **No re-clothing:** R4 sprouts from scars on the bole, counted.

Adoption needs the ≥ 20-seed rule with a stated pass rate.

## Evidence

- [Bare-bole research](../research/2026-11-08-bare-bole.md): the ranked mechanisms, the side-light sources, the open gaps.
- [Self-pruning measurements](../experiments/2026-11-08-self-pruning.md) and the [open-box re-measurement](../experiments/2026-11-08-open-box.md).
- ADR 0007 (relative shedding), ADR 0032 (T_rel from shade leaves), ADR 0043 (Tvig, rejected), ADR 0062 (light entry), ADR 0063 (demography).
