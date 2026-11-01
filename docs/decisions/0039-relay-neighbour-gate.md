# 0039: The relay's neighbour gate (r2.relayCrowd)

- **Status:** proposed (the fresh-look beech round, 2026-11-01; not accepted, not adopted)
- **Date:** 2026-11-01
- **Spec:** §R2 (relay, ADR 0033), §R5 (neighbour shade)
- **Round:** [the ledger](../experiments/code/2026-11-01-fresh-look-beech/notes.md), Proposal A and Solver decision; [the review](../experiments/2026-11-01-fresh-look-beech-review.md)

## Context
ADR 0033's relay ends a pa-0 apex from `relayAge` with probability `relayPTerm`. It fires by age alone, and in a closed stand the leader's light cannot tell a lone tree from a stand tree: Proposal A measured the top bud's Q at 1.0 in both at ages 0–60. So any relay setting that stops the open-grown leader also stops the stand's: the accepted beech picks lose 3–4 of the stand's 12 trees by 100 and its boles go crooked.

## Decision (proposed)
With `r2.relayCrowd` = k, the relay's termination probability for a pa-0 apex is `relayPTerm`·max(0, 1 − k·s̄), where s̄ is the tree's mean R5 neighbour shade over its metamers this season (computed in phase 2, `phase_sample`, after `sample_nodes`; read when a terminal bud forms in growth). A tree with no neighbours has s̄ = 0 and relays as ADR 0033 says; a tree among neighbours keeps its leader while s̄ ≥ 1/k. It needs R5 on with its neighbour signal; with R5 off, s̄ = 0. Absent: off, and the core is bit-identical (the gate is not computed).

**Botanical basis, and how far it goes.** Nicolini & Caraglio 1994 [r on the identity card]: beech forks "at both extremes of growth rate", with "une structure aérienne bien hiérarchisée" in between; vertical laterals are more frequent in full light. Pfisterer 2000 on Troll [r]: "young trees may develop a leader, aged crowns usually are polyarchic". That neighbours *keep* the leader is the shade-avoidance syndrome (strengthened apical dominance under neighbours), which R5 already encodes as dλ; it is physiology the card does not cite [u]. The gate is a coupling of two existing rules, not a new observation.

Beech's proposed values: k 10, with relay 2, relayAge 15, relayPTerm 0.15.

## Consequences
- **Generic:** any species with the relay can set k.
- **The signal is R5's,** so it moves when R5's dA, its window or its signal mode change. A tree at a wood edge or in a gap gets 0 < s̄ < the stand's and so a partial relay; this is untested in the garden (the review's garden check is the first look).
- **In the stand** s̄ falls to 0.05–0.10 after season 50 (measured, Proposal A), so with k 10 the relay opens partly on old dominant trees: the forked stand tops and, the solver reports, part of the higher LAI (7.4–8.5 on seeds 1–3).
- **Tests:** `the_relay_gate_keeps_the_leader_of_a_tree_among_neighbours` (the gate), `the_relay_gates_signal_is_zero_alone_and_positive_among_neighbours` (s̄ in a world).
- **Revisit** if the garden's edge beeches read as half-forked in a way that looks wrong, or if R5 changes.
