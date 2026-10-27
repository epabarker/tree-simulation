# 0009: Physiological age (R2) and the M7 species

- **Status:** accepted
- **Date:** 2026-10-27
- **Spec:** §R2, §C1.4 (generators), §C3.4 (λ), §C4 (A_set), §7 M7, §9

## Context
§7 asks M7 for "Massart conifer, Rauh broadleaf, Aubréville tiers from tables". §R2 gives the rule only in outline: "pa_child = pa_parent + Δpa(order, position, tree age); params = Table[pa]", with sympodial termination p_term(pa), acrotony v·exp(κ(pos − 1)) and λ declining after age a_c. Two of §9's six targets, the weeping willow and the Troll-model beech, need R3 mechanics (M9). The oak-like crown needs R3 for its heavy limbs.

## Decision
**Species (user, 2026-10-27).** M7 builds three presets: a fir-like conifer (Massart), a birch-like pioneer, and a *Terminalia*-like tropical tree (Aubréville). The birch replaces §7's "Rauh broadleaf". They are named as generic types with a real example in the description ("Conifer (fir-like)"), because the parameters are qualitative, not fitted to one species. The oak, willow and beech are revisited once their prerequisites exist: R3 at M9, and preferably after all main milestones (ROADMAP).

**R2 as built.**
- **Physiological age** pa = min(branching order, levels − 1), where `r2.levels` is the table of 2–4 rows. This is Δpa = +1 per lateral, capped. Sympodial relays keep their branch's pa once the cap is reached. Nothing is stored per row. A species that needs pa to differ from order (reiteration, position) would add a column later.
- **Each row** gives λ (C3, read at the node's own axis), A_set and η (C4, for shoots of that pa), β (C1, for laterals of that pa), the lateral generator of axes of that pa, and p_term.
- **Generators** (§C1.4), for the axillary buds of an axis:
  - `distichous` (default);
  - `opposite`: both sides at every node;
  - `whorled`: both sides at the upper node of each season's last metamer, which is the first node of the next growth unit, and none elsewhere. With `tierEvery` k > 0, both sides instead at every k-th node along the axis (the rhythm §9 gives for *Terminalia*);
  - `none`: no laterals.
- **Sympodial termination:** when a shoot ends, its terminal bud is formed `terminated` with probability p_term(pa) [RNG `sympodialTermination`, keyed by the last metamer's birthId and the season]. Laterals at the distal node take over, as relays.
- **Ontogeny:** after tree age a_c, every λ falls linearly by Δλ over `ramp` seasons. §R2 keys this on age, unlike R1's size threshold.
- **Acrotony (κ) is deferred.** None of the three species needs it.
- **Switch:** `r2.enabled` off leaves every golden unchanged.

## Consequences
- Species differ only by param patches, so the page and the CLI get them as presets.
- The capped-order pa cannot express a branch that regains trunk character (reiteration). That needs a stored pa column.
- Calibration of the species rows is qualitative (§9 silhouettes and the ROADMAP pattern targets: branch angle, width over height, lean). Revisit when R1, R3 or R5 change how a crown fills.
