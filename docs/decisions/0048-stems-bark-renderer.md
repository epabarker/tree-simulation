# 0048: Stems and bark: the backdrop beyond a closed stand stays an option; nothing becomes default

- **Status:** proposed (2026-11-03). Adopting any flag as the default is the user's decision.
- **Date:** 2026-11-03
- **Spec:** §10 (a closed stand's floor gets 2–10% of open light); C2 (the light field); ADR 0027 (girth in 3D)
- **Plan:** [stems and bark](../plans/2026-11-03-stems-bark.md); [the note](../experiments/2026-11-03-stems-bark.md); after the [blind test v3](../experiments/2026-11-02-blind-test-v3.md)

## Context
At one scale the beech stand reads as silver birch, and the lone beech reads as oak under the
measured bark. The brief asked for at most three renderer changes, each general and grounded in
light, girth, age or the bark card, switchable and off by default:
- **Bark by light** was already measured not to separate stand boles from lone limbs (set 5). An
  open-grown dome is dark inside.
- **Bark by girth** is contradicted by the only measurement (Pilarski et al. 2008: 18% reflectance on
  1-year stems, 10% at 10 years, 15% on trunks).
- **Root flare** has no sourced numbers.
- **The backdrop beyond a closed stand** (`ViewOptions.interior`; `&interior` in the lab,
  `garden.html?interior`) was built.
  - At each height it mixes the sky toward `--interior` by how closed the wood is there. Closure is
    the light on the row's brightest tenth: closed at ≤ 10% of open light (§10), open from 20%.
  - A lone tree in a field gets none by construction: 0 on every lone plate.
- **Girth** (`&girth`, existing) was named at k 1.2 and 1.45.

## Decision
1. **Keep `interior` as a view option, off by default.**
   - It is general (the model's own field), sourced (§10's floor light) and a token (`--interior`,
     light and dark).
   - It changes no plate of an open-grown tree. It does not change what the namers call the stand
     (silver birch or aspen, 9 of 9, every condition).
2. **Make nothing default on identity grounds.**
   - No condition passed on the dev seeds. The measured bark (2026-11-02) stays beech's default.
   - `girth` stays off. It did not move the beech stand, and its effect on hornbeam is inside the
     namers' noise.
3. **Record what was ruled out** (bark by light, bark by girth, root flare) so a later round starts
   past it.
4. **The beech stand's identity goes to the form list (core, after shipping).** Its crown ratio is
   0.21 against a real stand's 0.47–0.50, and its H/D 117 against ≈ 73. The namers name both
   ("slender stems with small crowns held high").

## What the user must judge by eye
- On the judging sheet (`docs/experiments/figures/2026-11-03-stems-bark-judging.jpg`) and on the
  phone (`garden.html?interior&bark=pale` against `garden.html`): is the dim interior between the
  boles more beautiful, and truer to a wood seen from inside, than open sky? If yes, `interior` can be
  the garden's default on beauty grounds, since it does not cost identity.
- Whether the pale bark (TSO's "pale grey") or the measured grey reads better at phone scale. The
  namers split it only on the lone tree at 60 (pale 6 of 9, measured 4).

## Consequences
- **A known flaw before any default:** the backdrop follows the model's leaf-on field, so in the
  garden's winter it stays under bare crowns (the judging sheet's winter pair). It would need to
  fade with the deciduous leaf-fall (`Scene.tau`) first.
- The garden asks for the light field only with `?interior`. As a default it would add one W × H
  float array to each snapshot, to be measured at the phone soak (ADR 0026's budget).
- Oak's 0 of 27 (wild cherry) under these namers is recorded in the note. It needs the next blind
  test to say whether it is the 2026-11-02 overrides or the namer model.
- **Revisit** when the core's crown base and girth change, since a renderer lever can then be
  re-named on the same protocol.
