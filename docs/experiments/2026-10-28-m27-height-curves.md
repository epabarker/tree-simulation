# M27: why the lone willow loses height, and why every species levels off early

## Question
- **Willow:** the hand-tuned lone willow is shorter at season 60 than at 30 (H30/H60 1.03, mean of 10 seeds), against 0.69–0.77 in the tree-willow yield tables. Is that dieback, shedding, sag or something else?
- **Can the fit fix it?** The answer decides whether the M27 fit can, within its bounds.
- **The other species:** every one levels off early too (H30/H60 0.63–0.82 against the yield tables' 0.42–0.67). Is that the same cause?

## Setup
```bash
node cli/height-diagnosis.ts     # about a minute
```

- **Trials:** M27's standard trials (`src/core/trials.ts`): a lone tree on 160 × 160, and a ten-tree stand.
- **Changes:** one or two of the species' parameters switched per variant, through `withAssign`.
- **Shedding, ablated properly:** under R1's `carbon` mode, branches are shed whatever `c5.enabled` says (season.ts). So "no shedding" also sets `r1.shed: "c5"`.

## Result

**1. The lone willow, 10 seeds**

| Variant | H30 | H60 | H30/H60 | Path / height | Seeds losing > 1 cell |
|---|---|---|---|---|---|
| Hand-tuned | 40.8 | 39.7 | 1.03 | 1.56 | 5 |
| No shedding at all | 37.5 | 35.9 | 1.04 | 1.30 | 4 |
| No mechanics (R3 off) | 48.6 | 65.1 | 0.75 | 1.33 | 0 |
| No shedding, no R3 | 42.1 | 59.9 | 0.70 | 1.35 | 0 |
| Posture rate c 0.3 | 41.6 | 43.5 | 0.96 | 1.60 | 2 |
| L_h 45 | 51.3 | 53.1 | 0.97 | 1.47 | 3 |
| L_h 45, c 0.3 | 49.5 | 57.1 | 0.87 | 1.71 | 0 |
| L_h 60 | 56.8 | 72.7 | 0.78 | 1.45 | 0 |
| L_h 0 (no path discount) | 78.2 | 142.7 | 0.55 | 1.20 | 0 |
| a_C 30 | 57.6 | 61.8 | 0.93 | 1.04 | 0 |

**2. The 20 highest metamers at each willow's peak, at season 60**
- In 8 of 10 seeds, at most one has been shed. The rest are still there, 0.7–11.6 cells lower.
- Shedding matters only in seeds 5 (5 shed) and 9 (9 shed).

**3. H30/H60 by L_h** (5 seeds; lone tree / the stand's tallest interior tree; lone H60 in brackets)

| Species | Own L_h | L_h 100 | L_h 200 | Yield tables |
|---|---|---|---|---|
| Birch | 0.81 / 0.87 (89) | 0.75 / 0.75 (113) | 0.64 / 0.68 (140) | ≈ 0.72 (pilot target) |
| Oak | 0.82 / 0.79 (75) | 0.80 / 0.76 (82) | 0.72 / 0.67 (102) | 0.59–0.65 |
| Beech | 0.65 / 0.65 (84) | 0.64 / 0.63 (97) | 0.60 / 0.61 (116) | 0.48–0.52 |
| Fir | 0.63 / 0.70 (110) | 0.61 / 0.66 (135) | 0.56 / 0.62 (161) | 0.35–0.47 |
| Hornbeam | 0.81 / 0.75 (61) | 0.77 / 0.71 (75) | 0.72 / 0.67 (90) | 0.60–0.68 |
| Pine | 0.78 / 0.79 (75) | 0.74 / 0.72 (90) | 0.67 / 0.66 (113) | 0.59–0.62 |
| Willow | 1.00 / 0.98 (40) | 0.70 / 0.68 (94) | 0.63 / 0.62 (121) | 0.69–0.77 |

## Conclusion

**The willow loses height to sag, after a plateau that R1's path discount sets. It is not dieback, and not shedding.**
- **The plateau:**
  - Production is discounted by exp(−path / L_h), and willow's L_h (30) is the shortest of the ten.
  - Its weak apical control (a_C 6) hands the lead from lateral to lateral, so the path to the top is 1.56 times the height: up to order 20–32 on seed 1, whose own trunk axis stops at season 12.
  - Height stops rising at about season 25.
- **The loss:**
  - R3 limits a metamer's posture correction each season to c · Δr / r, its relative girth growth (spec §R3).
  - Once the tree stops growing, girth growth slows, so posture control can no longer hold up limbs that keep gaining foliage and wood. They settle by up to 12 cells.
  - Willow's c is the default 0.05, as for birch, rowan, fir and pine, against 0.15 for oak, beech, hornbeam, maple and holly. Among those species it combines the lowest c with the shortest L_h and the weakest apical control.
- **The fit can fix willow** within its bounds (L_h 12–70, r3.c 0.01–0.3, a_C 0–40):
  - L_h 60 alone gives 0.78 and no shrinking;
  - L_h 45 with c 0.3 gives 0.87.
  - The tree gets taller too (57–73 cells against the target's 52 ± 14), so the fit must trade height against curve. Nothing in the model needs changing for willow.

**The early levelling-off in the other species is structural, and L_h cannot remove it.**
- **The stand behaves like the lone tree:** its tallest tree levels off just as early, so measuring the curve on a lone tree is not the problem.
- **L_h at the fit's upper bound (100):** H30/H60 moves by only 0.01–0.06 (oak 0.80 against 0.62, pine 0.74 against 0.60, fir 0.61 against 0.42).
- **L_h 200 (outside the bounds):** the curve comes closer, but the trees overshoot their heights by 25–100%.
- **Why:** the model's height curve is a ramp at about the maximum shoot extension, then a plateau, where yield-table curves rise more slowly and keep rising for decades.
- **What this check does not cover:** it tests one parameter. The fit moves 17 at once, and α, λ or m_f might slow the juvenile ramp. Whether they can is what the fits will show.

**Implications for the fits:**
- Expect the measured H30/H60 targets (weight 1, bands 0.05–0.06) to dominate the loss for oak, beech, fir, pine and hornbeam. Expect fits to push L_h towards 100 and trade the curve against height.
- Per ADR 0020, a target the model can't reach is a finding about the model. The candidate fix is a slower juvenile phase in the height curve, a model change that would need its own decision.
