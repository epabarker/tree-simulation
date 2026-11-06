# 0055: Within-tree irregularity: stochastic lateral break, shoot length, and per-axis angle offsets

- **Status:** proposed (the overnight run, 2026-11-06; the user rules on merge).
- **Spec:** §R4.4 ("optional stochastic break [RNG]"), §C1 (shoots and internodes), §C4 (the set point), §R2 (β).
  ADR 0002 (keyed randomness), 0053 (between-tree variation; deferred by the user), 0049 §b (the principle line).
- **Evidence:**
  - [the overseer's plan and log](../plans/2026-11-05-overseer.md);
  - [the overnight plan](../plans/2026-11-06-overnight.md), whose State block holds every gate's numbers;
  - [lone trees, 0.16.0 against the RC](../experiments/figures/2026-11-06-lone-016-vs-rc.jpg): hornbeam, beech, oak, birch, rowan at 40, 100 and 150, leaf on and off;
  - [hornbeam R0 against the milder setting 1](../experiments/figures/2026-11-06-hornbeam-irregularity.jpg), the regularity effect alone. **Setting 1 is not the adopted base.**

## Context
- **What the judge saw.** A blinded "which tree is real?" judge was calibrated: real against real 45%, gallery
  rejects caught 95%. It told every simulated broadleaf from laser-scanned trees 144 of 144 times. In 98% of its
  cues the simulated tree was "regular, symmetric, uniform": herringbone laterals, fans of forks, smooth
  straight limbs.
- **Why.** The model had no within-tree source of irregularity beyond C4's white noise, about 5° per metamer,
  which R3 pulls back.
  - Bud break was deterministic.
  - Internodes were 1–2 l0 (CV 0.19).
  - Every lateral of a level shared one β and one set point.
- **Existing params couldn't fix it.** C4's ε and σ, storms, and slower juvenile growth were all still caught
  100%, and the descriptors barely moved.
- **The measure** is four within-tree descriptors computed identically on coarsened simulated trees and on real
  QSMs: spacingCV, attachPerM, insertSD and elevSD. Their bands are widened by the scan noise from BioDiv's
  repeat reconstructions (curvPersist is noise-dominated and dropped). Real hornbeam: TreeML lone n 23, BioDiv
  stand n 38.

## Decision (proposed)
Four local rules, each off by default (goldens unchanged at off; test `golden.rs`), each drawing only from
`rng.rs`:

| rule | param | what it does | RNG purpose | keyed by |
|---|---|---|---|---|
| stochastic lateral break (§R4.4) | `c1.budBreak {mode: "stochastic", width}` | a lateral that would break breaks with p = logistic((v − θ)/w); a refused bud rests (a short shoot, or R4's bank). The apex is exempt, since refusing it would stall the leader through R4's hysteresis | BUD_BREAK 5 (registered, until now unused) | bud birthId, season |
| shoot length | `c1.shootLengthSD` | a per-shoot, mean-one lognormal factor on internode length | SHOOT_LENGTH 15 | bud birthId, season |
| per-axis set-point offset | `c4.axisSD` | N(0, s) degrees added to a non-trunk axis's set point, in C4 and in R3's posture, so the limb keeps its crook | AXIS_OFFSET 16 | the axis's first birthId |
| per-axis branch-angle offset | `c1.betaSD` | a new axis turns in its host's plane by N(0, s) degrees, so its angle to the host is β + offset; relays and fork arms take it too | BRANCH_ANGLE 17 | the axis's first birthId |

**Adopted values** (species params through the `[broadleaf]` table in `analysis/fit/hand-overrides.toml`; fir
and pine unchanged):
- **the generic base:** shootLengthSD 0.5, axisSD 50°, betaSD 60°, budBreak stochastic with width 1;
- **beech:** shootLengthSD 0.35, betaSD 70° (only if the per-species G-forest run passes);
- **oak:** shootLengthSD 0.3, axisSD 35°, betaSD 40° (the same condition).

These are within-tree draws. They are not ADR 0053's per-tree draw, which stays deferred.

## Consequences
- **Regularity (G-reg), hornbeam, seeds 101–108 and held-out 109–116:** the summed |z| falls 23 → about 5, and
  all four descriptors sit in the real bands, lone and stand.
- **Look** (the lone sheet, the overseer's reading):
  - **Clearly better:** hornbeam, a compact, rounded, irregular crown at 29 m (it was a flat-topped cone at 38–50 m), and rowan.
  - **Slightly better:** beech is fuller but still a flat "table" crown at 39 m.
  - **Still wrong:** oak is a spire-like leader over sprawling low limbs in both builds, and birch is a pale column at 45–49 m in both.
- **The garden's evidence** (`forestParams(160)`, 20 seeds, 300 seasons, against the base at d2c4f53):

  | check | adopted | base |
  |---|---|---|
  | floor | 2 | 2 |
  | planted H/D | 2 | 3 |
  | crown base | 10 | 11 |
  | plateau | 10 | 11 |
  | metamers | 1.04× | |
  | planted survival at 150 | 0.43 | 0.44 |

- **Costs and caveats:**
  - All-tree H/D in band falls 20 → 16 of 20.
  - The closed hornbeam stand keeps 26 of 32 alive at 70 (shipped: 32).
  - The garden's composition shifts from hornbeam toward beech (0.43 → 0.33, 0.25 → 0.33).
  - The milder setting (axisSD 40, betaSD 50) failed planted H/D (0 against 3) and was not adopted.
- **No visual gate.** A simulated-against-simulated judge was gated on the user's past picks against gallery
  rejects and passed only on lone trees (69% overall, 79% lone, 58% stand; the gate was 75%). Its verdicts are
  advisory only.
- **Purposes 15–17 are provisional** until merged. They are appended, never renumbered.

## Not decided here
- **The flat cap** (ADR 0031) is a size effect: lone hornbeam is a dome to about 20 m and flattens as k falls
  below about 0.8.
  - `r2.dLambdaTrunk` keeps a dome but reads as a tiered column and shifts the garden's composition, so it is
    not adopted.
  - L_h lowers height but starves the crown into a pole.
  - The next mechanism to try: λ's fall by level, with twigs keeping λ.
- **Mature height is adopted in a separate commit (7b105ae), revertible alone.** It uses an existing mechanism,
  R1's reproductive sink, as a ceiling: hornbeam `{"r1.fRep":0.8,"r1.maturity":115,"r2.dLambda":0.0725}` (29 m
  flat from 100, against 49 m at 150; 0.62× metamers; a rounded crown, D 0.34), rowan
  `{"r1.fRep":0.8,"r1.maturity":85}` (21.6 m), oak `{"r1.fRep":0.8,"r1.maturity":130}` (33.2 m).
  - The garden's evidence with it is at the margin (floor 1, planted H/D 1, crown base 12, plateau 13, against
    2/3/11/11).
  - The composition shifts: hornbeam 0.43 → 0.20, beech 0.25 → 0.37, oak 0.01 → 0.06.
  - Hornbeam's dLambda is fragile: the crown flips within ±0.01.
- **The review's open questions** (PR #49): relay leaders take axisSD; stochastic break can refuse a relay's
  lateral; about 6% of beech's laterals leave within 5° of their host; ADR 0049 §3–4.
- **`PLATE_MAX` 200 → 170:** the irregular broadleaves' 200-cell plate peaked at 247 MB with the specimen.
