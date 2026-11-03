# 0050: Level 0 is blocked by height, not by girth; no core change now

- **Status:** proposed (2026-11-03), for the user.
- **Spec:** §R1 (sapwood cost), §C6 (pipe girth with memory), §R3 (stress wood). ADR 0027 (girth in 3D), 0049 (reference
  fidelity; the principle line), the plan's §k (Level 0).
- **Evidence:** [the findings note](../experiments/2026-11-03-level0-trunk.md); probes in
  `docs/experiments/fits/level0-trunk/`.

## Context
In the beech and oak Level 0 fits every out-of-band Tallo residual is positive (H and CR too large for DBH), and z_H rises
with age. The working hypothesis was: trunks are too thin, and c6.r0 cannot thicken them because R1 charges maintenance on
π·r²·l including scar sums, so a thicker trunk starves late growth (lateShare collapses).

## Evidence, by step
1. **r0 alone** (hand, ×1/×1.5/×2, seeds 1–5, beech, oak, birch): a larger r0 gives a *thinner* trunk at 100 and 150 and a
   shorter tree in all three species. z_H falls only where H falls. lateShare collapses in beech (1.32 → 1.18), not in oak.
2. **lateShare** is H100/H60. Beech (1.43 ± 0.06) and oak (1.31 ± 0.06) are measured (NW-FVA yield tables); birch (1.12) is
   "described", an estimate (`analysis/fit/targets/*.toml:116–122`).
3. **The code refutes the premise.** Maintenance is m_w·π·r_live²·l with r_live from the live tips only
   (`rust/core/src/principles/r1.rs:69–90`). Scars, C6's memory and stress wood are excluded, and the test
   `heartwood_costs_nothing` (`r1.rs:281–289`) pins it. r0 enters the cost as m_w·r0² (ADR 0027 §2): r0 ×2 is ×4 sapwood cost.
   C6 (`c6.rs:19–36`) sums children's stored pipe radii plus scars, never shrinks, and adds R3's stress wood. Shedding is
   area-neutral (`c5.rs:117–122`). So pipe area at 1.3 m grows only with new shoot ends above it, and DBH after closure
   grows only through those and through R3's moment. At the DBH cylinder, stress wood is 43–66% of the radius and the
   live pipes 5–15% of the pipe area (shipped params). Oak's DBH gains 1 cm over 100–150 while H gains 7 m.
4. **Rivals:** absolute height survives (Tallo's median H peaks at 38.9 m for beech and 19.5 m for oak within the support;
   hand beech at 100/150 and every oak candidate are taller than that at any DBH). The target conflict survives for oak
   (a tree on the yield table scores z_H +0.64 to +0.98 against T 0.84). CR's definition survives for oak (CR 6.5–7.2 m
   against a 5.25 m spacing). The pipe exponent, the DBH reading, a late-growing height rule and density are excluded or
   argued out. Stress wood off is degenerate (R3 is load-bearing). σ_target ×0.7 thickens the most (beech +34% DBH at 150)
   and leaves z_H at +1.3 to +1.5.
5. **The direct test fails the hypothesis.** At r0 ×2 and ×3, relieving m_w brings lateShare back, and z_H rises back
   with the height. With m_w·r0² held, r0 ×2 adds only 11–24% DBH in beech and *thins* oak. z_H stays above T at 100 and
   150 in every cell.

## The surviving mechanism
**Height.** The trees are taller than Tallo's trees at any DBH. Girth levers cannot reach the band while H stays, and the
only candidates inside the band reached it by lowering H (the beech fit: r1.Lh 109 → 68, H at 150 48 → 29 m, with a thinner
trunk than the hand params'). Under that is a smaller, real trunk effect: DBH increment after canopy closure tracks shoot
initiation and the bending moment, not production. The beech fit's DBH gains 14% from 60 to 100 where a yield-table beech
gains ≈ 65% (D*_H/DBH 1.6–1.85).

## Options
**A. No core change now (recommended).**
- Night 1 goes on as it is. Birch resumes from its checkpoint at gen 4 (the run stopped at 22:08 on 2026-11-03,
  with no error in its log).
- The post-sweep session reads the gate as planned. Beech's height is within the current knobs' reach, as the fit shows.
- Two rulings for the user, both affecting oak, before oak's gate is read:
  1. **Tallo against the yield tables.** Accept that a yield-table oak sits at the gate's edge, or choose between the two anchors.
  2. **CR's definition** (§k): the extreme reach of a live bud in each direction, wider than the stand's spacing.
- Goldens, 1d-ii and phase 3 are unaffected.
- Cost: oak may fail Level 0 for reasons that are the targets', recorded as such.

**B. Parameter-only workaround.** Add `r1.mw` to `[level0] knobs` and widen c6.r0's bound (2×–3× the top).
- Files: `analysis/fit/targets/*.toml` only. No goldens change.
- Re-run night 1 (≈ 8.6 h). Nights 2–3 change too. Phases 1d-ii and 3 wait on the new fits.
- Against it:
  - m_w ÷2 alone kills 45% of the beech stand by 100.
  - At held cost, r0 buys 11–24% DBH (beech), and oak's trunk thins.
  - No probed cell brings z_H in band without lowering H.
  - A knob added because a fit asks for it is on the wrong side of ADR 0049's line.

**C. A C6 rule change, as a candidate for its own probe session (not adopted here).** The annual pipe model: each season a
node's pipe area gains its live pipe area divided by the sapwood's ring count τ_s (Shinozaki et al. 1964's renewal of disused
pipes, as in LIGNUM). Retired sapwood becomes heartwood, free in R1 as now. This ties girth to the living crown's years rather
than to shoot initiation, and leaves R1's cost unchanged.
- Files: `rust/core/src/principles/c6.rs` (`update_girth`), `rust/core/src/params.rs` and `src/core/params.ts` (a
  `c6.sapwoodRings`), checkpoints (a new column with a version, or a documented reuse of `scarSumN`), and C6's unit tests.
- Every golden changes. The night-1 fits are void and the sweep re-runs. 1d-ii and phase 3 wait. R3's calibration (ADR 0027:
  σ_break, the windthrow ramp) needs re-checking, because heavier trunks change H/D.
- It is a local physiological rule inside ADR 0049's line only if τ_s is **measured** per species (sapwood ring counts),
  never fitted. Fitted, it is a knob added to serve a fit.
- It does not address the binding trait, absolute height.

## Recommendation
A. Every probe says height, not girth, keeps z_H above T. The rule the hypothesis proposed is already the code. B's knob
loses trees and buys little. C is worth a probe session after Level 0's gate, and only if the trunk still lags once height
is in band.

## Consequences (if A is accepted)
- No code, goldens or params change. The night-1 sweep and the post-sweep session proceed per §k.
- The post-sweep session reports, per species, the share of z_H from H (D* in the note), so a trunk lag is visible.
- Open: oak's thinner trunk at held cost (r0 ×2, m_w ÷4).
