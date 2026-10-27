# 0007: Shedding threshold relative to the tree's best light (correlative inhibition)

- **Status:** accepted (user, 2026-10-27)
- **Date:** 2026-10-27
- **Spec:** §C5.2–C5.6, §4, §8

## Context
C5 sheds a lateral when its light per metamer is below a fixed T. Experiments show branch death depends on light relative to the rest of the tree: branches on suppressed trees survive where branches on dominant trees die (Sprugel 2002), singly shaded branches die where wholly shaded trees keep theirs (Henriksson 2001), and the light at the crown base rises with the light at the crown top (Kothari et al. 2025). The M6 sky sweep also showed suppressed decurrent trees losing almost their whole crown in one season. See `docs/research/2026-10-27-literature-review.md` §2.2.

## Decision
T_eff = max(T, T_rel·Q_top), where Q_top is the `c5.topQuantile` (default 0.9) quantile of the tree's live-bud Q this season, computed once per tree after sampling. New params `c5.Trel` (default 0, the baseline rule) and `c5.topQuantile`.

## Consequences
Goldens are unchanged at the default. A tree with a bright top prunes its shaded laterals sooner; a suppressed tree keeps a deeper crown. T keeps its role as a floor and becomes a shade-tolerance knob (≈ 0.1 light-demanding, 0.02–0.05 tolerant). Revisit if R1's per-branch carbon balance replaces the threshold.
