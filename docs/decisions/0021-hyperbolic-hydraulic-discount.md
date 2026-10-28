# 0021: A hyperbolic hydraulic discount, so tall trees keep growing

- **Status:** accepted
- **Date:** 2026-10-28
- **Spec:** §R1 (local rule, emergent signature); amends ADR 0010; used by ADR 0020's fits

## Context
- **The height curve is wrong.** Every calibrated species grows at about its maximum rate and then stalls. In the lone-tree trial, height at 30 seasons is 0.63–1.03 of height at 60; yield tables give 0.42–0.73 (M27 note, [height curves](../experiments/2026-10-28-m27-height-curves.md)).
  - **Oak:** after season 30 the model grows about 3× too slowly (0.36 cells a year against the yield table's 1.05).
  - **Willow:** its lone tree even loses height. Its top sags once growth stops, because posture control needs girth growth.
- **§R1.10 names the target signature** as "sigmoidal height growth, plateau"; the model gave a ramp and an early plateau instead.
- **The cause is the discount's form.**
  - §R1 discounts each leaf's production by exp(−L_path/L_h). The foliage farthest along the path, at the top, falls to a few per cent of its potential within a few L_h, so the tree stops gaining height.
  - Raising L_h to the fit's upper bound (100) barely changes the shape (oak 0.82 → 0.80). Raising it further makes the trees too tall before the shape is right.
  - Stand-grown trees behave the same way, so this is not about lone trees.
- **The user's aim is realism,** and they asked for the model to change.

## Evidence
- **A path's hydraulic resistance grows in proportion to its length** (the Hagen–Poiseuille analogue used in hydraulic-limitation models; Ryan & Yoder 1997; Koch et al. 2004).
  - For a fixed water-potential difference, the flux, and so the stomatal opening the leaf can afford, falls as 1/(r_0 + r·L), not exponentially.
  - Hence d(L) = 1/(1 + L/L_h), with L_h = r_0/r the path length at which the path's resistance equals the leaf's.
- **The prototype matches the yield tables** (stand top height, m, at ages 30, 60 and 100; 3 seeds):

  | Species | exp (ADR 0010) | 1/(1 + L/L_h) | Yield table |
  |---|---|---|---|
  | Hornbeam, L_h 100 | 12.1, 16.2, 17.4 | 14.7, 21.5, 26.7 | 14.2, 21.2, 26.0 (Lockow & Lockow 2009, SI 26) |
  | Pine, L_h 100 | 14.0, 17.8, 18.8 | 17.0, 24.9, 30.7 | 13.8, 22.8, 29.0 (NW-FVA class 1) |
  | Oak, L_h 70 | 16.1, 20.1, 21.5 | 17.2, 23.2, 27.5 | 13.1, 21.0, 27.0 (NW-FVA class 1) |
  | Willow, L_h 40 | 12.3, 11.9, 11.7 | 15.3, 21.1, 23.2 | 13.9, 18.0, 18.9 (Paramonov et al. 2021, class I) |

  Beech was already close and stays so. The lone willow no longer shrinks.

## Decision
- **A new switch:**
  - `r1.hydraulic: "exp" | "hyperbolic"` selects the discount: exp(−L_path/L_h), or 1/(1 + L_path/L_h).
  - The default stays `"exp"`, so every preset, the home forest, the hand-tuned species and the golden hashes are unchanged.
  - L_h = 0 still switches the path-length cause off in either form.
- **The M27 fits use the hyperbolic form.**
  - Each targets file carries a `[fixed]` table (`"r1.hydraulic" = "hyperbolic"`), applied to every candidate and written into the fitted patch.
  - L_h is searched over 10–200 on a log scale for every species. The hyperbolic form needs larger L_h for the same height.
  - The hand-tuned patch, measured beside each fit, keeps the exponential form.
- **Adoption stays the user's** (ADR 0020). A fitted patch brings the hyperbolic form with it; the home forest changes only when the user adopts fitted patches.

## Consequences
- **Height keeps rising slowly** for decades, as in yield tables. A species' height is set by L_h and its curve's tail by the form.
- **Juvenile growth is still too fast** for oak and fir: every species reaches ≈ 7.7 m by season 10, because a seedling's shoots are cap-limited from the first year.
  - The fits may slow it through α, λ or m_f. If they cannot, a slower juvenile phase is the next model change, for its own decision.
  - Fir's table is a mountain table, with 10–20 years to breast height, so its curve target may be too harsh.
- **Two discount forms now coexist.** Comparing a hand-tuned species with a fitted one compares both their parameters and their form.
- **Revisit** if the fitted species are adopted, when the exponential form could be retired from the woodland presets, or if the fits show the tail is now too long (trees still gaining height at season 200).
