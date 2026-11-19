# 0074: Level shoots extend with a chance that falls with the tree's height (`c1.extentLimit: "height"`); built off by default

- **Status:** proposed (#135, 2026-11-19). Built as a principle, off by default; no species and no preset turns it on. Adopting it for any species is the user's call, on [the floored height rule's probe](../experiments/2026-11-19-floored-height-rule.md).
- **Spec:** §C1 item 1 ("bud fate … depends only on local signals"), §C1 (bud fate), §6 (staging: L read as the phase begins), §8 (the ablation is the mode `off`), §R4 (dormancy and L_dorm), §R6 (short shoots). ADRs 0002 (keyed randomness), 0055 (the apex exempt from a refusal), 0067 (the lone triad).
- **Tickets:** [#135](https://github.com/epabarker/tree-simulation/issues/135), step 5 of [#129](https://github.com/epabarker/tree-simulation/issues/129)'s chain.
- **Evidence:** [the crown-extent probe](../experiments/2026-11-13-crown-extent-probe.md) (§1 the rule, §3 `H40k2f`, §8 its defects), [the crown-extent research note](../research/2026-11-11-crown-extent-and-canopy-density.md) (Choi et al. 2001), [the beech λ₀ confirmation](../experiments/2026-11-16-beech-lam0-confirm.md) §4.2 (the late edge rate on 20 seeds).

## Context
- **Real crowns slow with size; the model's do not.** Choi et al. (2001, *For. Ecol. Manage.* 152: 235–258) fit the crown-radial increment of exposed sugar-maple margins best on tree height: about 15 cm/yr at 10 m tall, under 5 above 20 m, a floor of 2.3–3 cm/yr at 150–250 years. That is a fivefold decline to a floor.
- **The lone beech's late edge rate is 13–17 cm a season** at HEAD and under every λ₀ arm of #134 (20 seeds, none at or under 3). No constant λ gives a fivefold decline: λ acts from the first season, the decline is with size.
- **Local size signals were tried and do little.** A node's path length (`P60k2f`, the crown-extent probe) leaves the crowns as wide as HEAD's; the reach limit (`R16k8`) imposes a radius and was run only as a yardstick.
- **The crown-extent probe left three defects** (its §8): (1) a barred active bud rests as one below its threshold does, so it can turn dormant, take R4's higher break threshold, age and abort past L_dorm, the stall ADR 0055 exempted the apex from; (2) with R6 on, a barred lit tip becomes a short shoot, which carries `r6.leafArea` where an active bud carries 1, so the barred edge holds more leaf, the thing a chance was chosen to avoid; (3) sparing reads the bud's stored heading, not the direction the shoot then takes.

## Decision
1. **The rule** (code: `rust/core/src/principles/extent.rs`; the bud phase, `season::grow_buds`). With `c1.extentLimit` `"height"`, a live bud extends this season with a chance p, drawn once per bud and season [RNG: extentLimit, purpose 21, keyed by the tree, the bud's birthId and the season]:
   - g(H) = max(g_min, 1 / (1 + (H / L_x)^k)), H the tree's height above its stem base as the phase began, the same for every bud of the tree;
   - with `c1.extentSpare`, p = u² + (1 − u²)·g, u the upward part of the bud's heading (0 for a level or drooping bud): an upright shoot, the leader whatever its order, is spared, and a level one takes g in full. Without, p = g.
2. **Its calibration, `H40k2f`:** L_x 40 cells (10 m), k 2, g_min 0.1, sparing on. Choi's exposed-margin rates then give g 0.5, 0.2 and 0.1 at 10, 20 and 30 m. These are the probe's values, not defaults: the params' absent values stay the probe param's (L_x 60, k 2, g_min 0).
3. **A held bud keeps its state** (defects 1 and 2). The rule acts only on a bud that would otherwise have extended (its resource at or over its threshold, and through a stochastic break if `c1.budBreak` is on). Such a bud, once barred, is *held*: an active bud stays active, so it neither turns dormant, ages toward L_dorm, meets R4's higher break threshold, nor becomes an R6 short shoot. Its leaf stays an active bud's. A bud that would not have extended anyway rests as it did before, so the rule changes no fate the season would not have changed. A held dormant bud rests and ages as any dormant bud does (it rested), and it is not light-released that season. Recorded, not changed (the spec reviewer's questions):
   - a barred R6 short shoot rests as a short shoot does, so R6 may turn it dormant in the dark, as it would below its threshold;
   - "would have extended" is read as passing the threshold and the break; with `r4.vCont` under 1 (no preset sets it) a bud with v in [vCont, 1) grows nothing yet passes, so a barred one is held where it would have rested;
   - a held bud's v goes to R1's unspent bank (`r1.unspent`, off by default), as any bud's that grows nothing;
   - the draw is made for every live bud with p < 1; it is keyed, so a draw that decides nothing changes nothing.
4. **Defect 3 is accepted.** The bud's heading is its state as the phase began (§6's staging); the direction the shoot takes is drawn by C4 inside the shoot, after the decision. A leader 20° off vertical keeps 0.88 + 0.12·g, so the error is small where sparing matters, and reading the drawn direction first would reorder C4's draws.
5. **The §C1 item 1 exception, owned here.** H is a whole-tree signal: a bud's fate then depends on something it cannot sense locally. It is allowed because the field relation is with tree size (Choi's best single predictor is height), because the local stand-ins tried do not slow the crown (path length) or impose a shape (reach), and because a tree's height is a reading of the tree's hydraulic and mechanical state that no local signal of the model carries. The rule reads nothing else of the tree, keeps no state, and is one pass over the metamers as the phase begins.
6. **The other modes stay as comparisons, outside this ADR:** `"reach"` (an imposed crown radius, #121's yardstick) and `"path"` (local). Neither is a candidate for adoption.
7. **Off by default** (absent or `"off"`): no pass, no draw, and every golden, regression vector, preset and checkpoint byte is unchanged. No state is stored, so the checkpoint layout is unchanged with it on.

## Divergence from the spec
§C1 item 1 says bud fate depends only on local signals. With the rule on, the chance of extension reads the tree's height. The spec's text changes only if a species adopts the rule; until then this ADR is the divergence's record.

## Alternatives
- **A shorter internode instead of a chance:** a shoot is one metamer from season ≈ 30, and shorter internodes keep their leaf and buds, which floods a shade-tolerant crown (the path-length note §2).
- **A barred bud rests as before** (the probe's form): defects 1 and 2.
- **A refit of λ and the set points alone** (#134): narrows the crown at every size, but its late edge rate stays at 13–17 cm a season.
- **A node's height or path length:** local, and either tracks the tree's height in the crown's top or does nothing to width (`P60k2f`).

## Consequences
- **Now:** nothing changes by default.
- **If adopted for a species:** that species' goldens, Level 0 fit, R3 fit, the open-grown evidence and the named regressions move, and #126's bare-bole probe is repeated. Holly and birch need their own values or an exemption (the crown-extent probe §8). The spec's §C1 item 1 names the exception.
