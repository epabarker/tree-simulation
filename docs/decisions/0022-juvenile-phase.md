# 0022: A juvenile phase: shoots start short and lengthen as the tree grows

- **Status:** accepted
- **Date:** 2026-10-28
- **Spec:** §R2.4 (ontogeny), §C3.4 (shoot size), §R1.10 (sigmoidal height growth); follows ADR 0021

## Context
- **Young trees grow at the full rate from their first season.**
  - C3.4 caps a shoot at `c1.maxMetamersPerShoot` (3) metamers' worth of resource.
  - A seedling's few buds each receive far more resource than that, so every shoot is at the cap from the start.
  - Every species is about 7.7 m tall by season 10, whatever its biology.
- **Yield tables start slowly and accelerate:** a sigmoid.
  - Fir: 7.8 m at 30 (Tirol tables, site index 31).
  - Oak: 13.1 m at 30 (NW-FVA class 1).
  - Pine: 13.8 m at 30 (NW-FVA class 1).
- **ADR 0021's hyperbolic discount fixed the tail but not the start.** The M27 fits then bought a slower start with odd parameters: pine's α went to its lower bound. Fir stayed 0.57 against its target of 0.42 in H30/H60.
- **The user asked for the change** after the M27 hold-out (2026-10-28).

## Evidence
- **Ontogenetic gradient:** in tree architecture, the shoots a meristem makes grow from small in the seedling to their full size over the establishment phase, then decline with age (Barthélémy & Caraglio 2007). §R2 already models the decline (λ after a_c). This is the rise.
- **Size, not age:** juvenile growth is limited by a small plant's carbon and root system. R1 already uses size, not age, for maturity, so the ramp follows height.
- **A prototype:** stand top height (m) at ages 10, 30, 60 and 100, hyperbolic L_h 70, 3 seeds:

  | Species | No juvenile phase | h_j 80 | Yield table |
  |---|---|---|---|
  | Pine | 7.2, 15.7, 22.7, 26.1 | 3.1, 11.3, 19.5, 24.6 | –, 13.8, 22.8, 29.0 |
  | Oak | 7.7, 17.2, 23.2, 27.5 | 3.1, 10.5, 19.3, 25.2 | –, 13.1, 21.0, 27.0 |
  | Fir | 7.7, 17.8, 27.4, 36.7 | 3.1, 11.5, 23.4, 34.5 | –, 7.8, 20.4, 31.0 |
  | Hornbeam | 6.4, 13.8, 19.8, 24.8 | 3.1, 10.5, 17.4, 22.6 | 5.5, 14.2, 21.2, 26.0 |

  - **Shape error** (H/H60 against the table): pine 0.12 → 0.02, oak 0.12 → 0.08, fir 0.27 → 0.11.
  - **Hornbeam** matches best with a small h_j.
  - **Levels:** absolute heights are L_h's to set.

## Decision
- **The rule:** `r2.hJ` (h_j, cells) caps every shoot of a tree at

  cap = 1 + (c1.maxMetamersPerShoot − 1) · min(1, H / h_j) metamers' worth of resource,

  with H the tree's height at the start of the season (`juvenileCap`, `c1-buds.ts`). A fractional cap gives one longer metamer, by C3.4's rule (n = ⌊v'⌋, l = v'/n).
- **Off by default:** 0 or absent, as for κ. It needs R2 enabled. Presets, the home forest, the hand-tuned species and the golden hashes are unchanged.
- **Fitted per species in M27:** h_j is free on 2–150 cells, log scale, beside ADR 0021's L_h. A small h_j is effectively off.

## Consequences
- **Height curves get a sigmoidal start:** height growth accelerates while the tree is below h_j, then follows R1.
- **Seedlings in shade are not affected** beyond what R1 already does: their shoots are carbon-limited, below the cap.
- **Crowns of young trees are also smaller,** since the cap applies to every shoot, not just the leader. That is realistic, but the M27 form targets are measured at seasons 30 and 60, so the fits weigh it.
- **Revisit** if the fits push h_j to a bound, or if a per-axis rule (a shoot's size bounded by its parent shoot's, a vigour memory) proves necessary. That rule would need a new metamer column.
