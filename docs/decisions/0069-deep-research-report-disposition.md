# 0069: The bird's-eye report: identity stays in R2 and is gated by the stand; no compiled structure; a reported basin check

- **Status:** accepted (user, 2026-11-15, answering four questions put after a review of an outside "bird's-eye" report against `3d-port` at 7d51c5d). Amended the same day, before any run, on the user's three refinements (a diagnostic pilot, the gate's definition and stopping rule, the basin report's content); the amendment was shown and approved. No code, golden, preset or regression changes. Decision 5's experiment is proposed, not run.
- **Spec:** §R2 (physiological age, ontogeny), §C3 (λ), §C2 (light), §10. ADRs 0009, 0031, 0033, 0039, 0040, 0041, 0055, 0057, 0065, 0067.
- **Tickets:** [#124](https://github.com/epabarker/tree-simulation/issues/124) (the oak's rounded crown), [#129](https://github.com/epabarker/tree-simulation/issues/129) and its chain (#133, #134), map [#73](https://github.com/epabarker/tree-simulation/issues/73).
- **Evidence:** the repository's own notes, read against the report. No new simulation.

## Context
The report (a deep-research review of the repository, not committed) makes three claims that would change the project's direction:
1. **Species identity needs an explicit developmental programme:** a new per-axis class in R2 (leader, scaffold, …) with transitions, with Borchert–Honda's λ demoted to choosing among the axes the programme permits.
2. **Performance needs compiled structure:** old wood frozen into multiscale aggregates, for a ≥ 2× saving once mature trees dominate.
3. **A species setting should sit in a basin:** nearby parameter values must still pass its gates.

What the repository had already established, which the report does not cite:
- **R2 is already an axis-class table with transitions.** pa = min(order − paShift, levels − 1) picks a row (λ, set points, generator, p_term); the relay (ADR 0033), the fork and arm hold (ADR 0040), elbows (ADR 0037) and posture by age (ADR 0038) are its transitions, and ADR 0039 gates one of them by the stand. In this model λ is a row of that table, so the report's split between "architecture" and "λ" does not map onto the code.
- **The report's first experiment has been run for the oak, twice, and failed** (exploratory, seeds 1–3):
  - per-level shares (#92): the oak's leader above 0.5 H is a pa-1 lateral, the same level as its low limbs, so sparing the limbs spares the leader;
  - the overtop relay (#94, `r2.relayOvertop`): it puts the leader on pa 0, but the stalled trunk's laterals cascade up with it, the young spire is lost, and beech and birch change. A rule limited to the tree's one leader would not be local.
- **The oak's form is not the open problem; its stand is.** `d16a13` passes the open-grown bars on seeds 1–20 and 21–40 (at the bar), and the user approved its form. It fails the garden guard on all three criteria: the planted oak peaks at a median 14 m against 26–30 m and dies about 60 seasons earlier ([the evidence note](../experiments/2026-11-10-oak-rounded-crown-evidence.md)). `lambda_at` lowers λ by the tree's age alone; beech's and hornbeam's leader loss is gated by neighbour shade (`relayCrowd` 10), the oak's fall is not.
- **The cost of a season is the light field.** Light is 65–75% of a native season in the bench's stands (`runs/bench/5888210-dirty.json`, 2 Nov) and 658 of 739 ms for the open-grown oak (devlog, 8 Nov), and it scales with the grid, not with old metamers. Allocation, growth, shedding and girth together are under 10%. Shed wood is already removed by `compact`. The bench files predate the 0062/0063 garden.
- **Crown extent has moved on from the report's reading.** "1.4–4.2× too wide" was partly two diameters and two crown measures (ADR 0067); the lever that worked (`H4k8`) acts on shoot extension by the bud's heading, not on λ; #133 and #134 own what is left.
- **Cliffs are documented, with no rule about them:** `forkAt` (ADR 0040), λ under the vigour drop (ADR 0041), hornbeam's `dLambda` within ± 0.01 (ADR 0055), and `d16a13` passing by one seed.

## Decision
1. **Species identity stays in R2's table; no new axis-class state.** Where a transition in that table breaks a species in the stand, the first move is to gate the transition by the environment with a signal the tree already holds, as ADR 0039 does. A new per-axis class is reopened only if decision 5's experiment fails. A failed gate does not by itself justify one: that question returns to the user with the evidence.
2. **Compiled structure (active-frontier compression) is not pursued.** With light at two thirds or more of a season, removing every other phase entirely could not reach the report's own 2× bar. Reopen it only if a bench on the current garden shows the phases that walk the tables (sample, allocate, grow, shed, girth, mechanics) above half of a season; one fresh per-phase bench on that garden is enough to settle it. Rendering detail remains the renderer's business (the lean snapshot; twig and leaf units), with no change here.
3. **The next experiment may run beside the #129 chain,** on its own branch and worktree, accepting that the garden it is judged in may change under it. The chain's order (#133, then #134) is unchanged.
4. **A basin check is reported, not gated.** From #134 on, every species adoption's evidence evaluates one meaningful step either side of each parameter it changes, on the same seeds, and reports beside the verdict (as ADR 0065 reports its targets):
   - which acceptance gates pass and fail at each step;
   - the margin to each threshold, not only pass or fail;
   - any discontinuous change of form or development;
   - a stated reading: robust, or near a knife edge.
   - **The step** is the knob's fitted resolution or the smallest increment the note tried.
   - **A fragile adoption is named as one and justified** in its ADR; it is not recorded as a comfortable pass.
   - **No new framework:** the existing evidence and adoption scripts run the neighbours. It becomes a bar only by a later ADR.
5. **The experiment that tests decision 1** (proposed; bars fixed here, before any run):
   - **Hypothesis:** `d16a13` fails in the garden because the oak's fall of λ is triggered by age whether or not the tree is crowded. Scaled by ADR 0039's gate, max(0, 1 − k·s̄) with s̄ the tree's mean R5 neighbour shade, the planted oak keeps its leader through the race for height and passes the guard, while the lone oak is unchanged.
   - **The rule:** a per-species `r2.dLambdaCrowd` k, absent = off and bit-identical. With g = max(0, 1 − k·s̄), it scales the fall, not λ: λ = level.lambda − share·Δλ·t·g in `lambda_at` (read only by C3's allocation). At s̄ = 0 the behaviour is today's. No new state, checkpoint field or RNG purpose. One arm: k 10, beech's and hornbeam's `relayCrowd`; at k 10 the fall is fully off at s̄ ≥ 0.1. The s̄ the oaks meet is reported, not assumed to transfer from those species.
   - **The signal:** `tree.relay_crowd`, the mean of R5's neighbour shade over all of the tree's metamers, set in phase 2 from the start-of-season light and read by C3 in phase 3 of the same season. The fall is re-evaluated every season from `aC` (full at `aC` + `ramp`); neither it nor the gate latches.
   - **Bar A (identity):** the lone oak under `d16a13` + k 10 is hash-identical to `d16a13` alone on seeds 1–20 at season 100, so the open-grown evidence and the user's approval carry over. Birch, beech and hornbeam, seeds 1–3, hash-identical to HEAD.
   - **Bar B (the guard, unchanged):** `npm run evidence:oak-garden-guard`, seeds 1–20, 160 and 66 cells, HEAD re-run on the same build. All three of #124's criteria: live oak and seeding oak at 150 each ≥ HEAD − 2; every judged bare-bole cell; `phoneSeed3` and `forestRegeneration` no worse.
   - **Step 0, a read-only probe before any core change:** seeds 1–3 at both widths, HEAD and `d16a13`, to season 150. For each planted oak and season: the season and the tree's age, s̄ as the gate would read it, t, the ungated fall and the fall at k 10, the height, the trunk's top, the axis that carries the highest tip (its switches), and whether the tree lives.
   - **Step 0's futility test:** an oak's divergence season is the first in which its `d16a13` height is ≥ 10% below the same tree's under HEAD. The gate can act if s̄ ≥ 0.05 (g ≤ 0.5) in at least one season from `aC` to the divergence, in more than half of the planted oaks. If not, stop: the mechanism cannot address this failure as implemented, and no core change is made.
   - **The pilot** (only after step 0 passes): HEAD, `d16a13` and `d16a13` + k 10 on the same seeds and widths, with step 0's log repeated under the gate. It is read on f = (the arm's median peak height − `d16a13`'s) ÷ (HEAD's − `d16a13`'s) over the planted oaks:
     - f ≤ 0: stop; reported as evidence against this intervention;
     - 0 < f < 0.5: reported, and the user decides whether the 20-seed run is still informative; the threshold is not moved;
     - f ≥ 0.5: the 20-seed guard is proposed to the user.
   - **What a pilot can say:** futility or direction on three seeds, never a refutation of the wider question of the oak's identity against its plasticity.
   - **Fixed throughout:** one arm, no second k after a result, no bar moved; k 5 and 20 are reported on the pilot's seeds only (decision 4).
   - **If it passes:** #124's adoption goes to the user with a new ADR. **If it fails:** the result is recorded and decision 1's new axis class is reopened as a question for the user.

## Alternatives
- **A new axis-class state now** (the report's seam): a per-axis column, a checkpoint version and a non-local leader rule, against #94's evidence and before the cheaper gate has been tried.
- **A fresh bench before declining compression:** it would sharpen the number, not the conclusion; decision 2 names the reading that reopens it.
- **Wait for #134 before any experiment:** #134 refits the knobs whose ownership the experiment tests, so its result is more useful before the overnight fits than after.
- **A hard basin gate:** about three times the cost of each adoption, and it could block a setting on a cliff that is real biology (forks at the extremes of vigour, ADR 0040).
- **The report's other proposals** (the species swap, the render comparison): not taken up. The swap is undefined until each parameter is assigned to a side, and λ sits on both.

## Consequences
- **No code or golden changes from this ADR.** The experiment's rule needs `/implement-principle` and the `spec-reviewer`; it must not touch `rust/` on a checkout with #133's sweep queued (STATUS, gotchas).
- **#134's acceptance criteria gain decision 4's report.**
- **Risk to the hypothesis:** the fall starts at age 13.5 and the garden's canopy closes at seasons 17–49, so a planted oak may read s̄ ≈ 0 for long enough to divide before it is crowded. The pilot's peak heights show this first.
- **The signal is computed only where `relayCrowd` is set** (`season.rs`, phase 2), so the rule widens that condition; for the oak it reads 0 today.
- **R5 already raises λ at a shaded node** (`r5.dLambda`·s): a second, weaker route from shade to λ, beside the gate.
- **Risk to decision 2:** the bench numbers are from before the 0062/0063 garden; they are the latest the repository holds.
