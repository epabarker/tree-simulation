# 0073: O4 reads a running mean of light (`o4.lightMemory`); built off by default

- **Status:** accepted as a build (the user, 2026-11-16, in chat: "Yes, add light memory"); off by default. Adopting a τ for the garden is the user's call, on [the light-memory probe](../experiments/2026-11-16-light-memory-probe.md). No τ passed its pre-registered bars: every arm missed M2, the phone's cap no worse than s3d's (11 → 14.5–17.5 seasons). Each cut churn to 5–10% of s3d's and ran the phone's season cheaper than head's. τ 2.5 is the probe's pick if M2's miss is accepted.
- **Spec:** §O4.4 (establishment "if ground Q > Q_est"), §O4.11 (stubs), §C2 item 8 (the garden's rotating sky), §6 (staging). ADRs 0065, 0068, 0072.
- **Tickets:** [#137](https://github.com/epabarker/tree-simulation/issues/137), [#132](https://github.com/epabarker/tree-simulation/issues/132).
- **Evidence:** [the churn note](../experiments/2026-11-16-stub-churn-and-hornbeam-ceiling.md), B.1 and its recommendation 2.

## Context
- Under a closed canopy the garden's 16-direction sky, rotated each season (§C2's streak fix), makes each ground cell's light a fresh draw: the rank correlation between consecutive seasons is 0.02 (0.83 with `c2.rotate: false`).
- Every O4 rule that reads one season's light reads that lottery: HEAD's establishment at q_est, ADR 0072's promotion (brightest first) and demotion (Q_top/C), and ADR 0068's `topLight` ramp. Under s3d 98% of promoted stubs are demoted, most at the first season demotion reads them; none of the stateless fixes passed (the churn note, B.4).
- A seedling's survival and growth answer to light integrated over years, not one season's (below).

## Decision
1. **One param, the world's:** `o4.lightMemory` τ_L, in seasons. Absent or 0: off, and HEAD, every golden, regression vector and checkpoint byte is unchanged.
2. **Two running means**, updated at the start of O4's stand dynamics (phase 3) from the start-of-season light field, as m ← m + a·(x − m) with a = 1 − e^(−1/τ) (a reading's weight falls by e every τ seasons):
   - **per ground cell** (x and z floored, ADR 0072's cells; ⌈W⌉ × ⌈D⌉ plain `Vec<f64>` in `World::ground_light`), of Q/C at the cell's centre at `o4.stubLightY` (0.5); cells start from their first season's light;
   - **per live tree** (`Tree::light_mean`), of Q_top/C (C5's crown-top light, phase 2); a tree with no mean starts from its root cell's mean as it stood before this season's fold (else from its first reading) and folds this season's in. An O4 seedling or promoted stub has none until next season, and no rule reads it before then (deaths and demotion need age ≥ 1); a tree planted by `trees` or a `plantTree` event is age 1 by its first phase 3, so it takes its cell's mean then.
3. **What reads them.** The cell's mean (sampled at `stubLightY`, so with the memory on that param moves the non-stub q_est test too): the establishment test (q_est, and stubLight with stubs on, for local seeds and rain alike) and stub promotion (its order and its threshold). The tree's mean: stub demotion, and the `topLight` suppression signal, ADR 0068's ramp included. `principles::memory::top` is the accessor #132's ramp reads.
4. **No randomness, no maps, no sorts.** The garden's WASM stays within its budget (ADR 0014).
5. **Checkpoints keep their bytes:** a world keeping no mean writes version 4 (or 5 with stubs) exactly; one that keeps a mean writes **version 6**, version 5 plus the header's `lightMemory` {cells: [mean per cell], trees: [mean or null per tree, in order]}. Versions 1–5 load with no memory. The state hash folds the means in only when one is kept.
6. **Turning it off** by a params patch freezes the means (kept, hashed, saved; no rule reads them); turning it on again resumes them. A params patch that changes the width or depth restarts the cells' means (the trees' keep theirs).

## τ's source
- **SORTIE** (Kobe et al. 1995, *Ecol. Appl.* 5: 517–532; Pacala et al. 1996, *Ecol. Monogr.* 66: 1–43; spec §O4.2 cites SORTIE): sapling mortality is a function of recent growth, measured as radial growth over the previous several (five) years: a boxcar whose readings have a mean age of about 2 seasons, which an exponential matches at τ ≈ 2.5. (The abstracts fetched for this ADR state the growth dependence but not the window; the five years are as the SORTIE papers are usually read, to be checked against the full text before adoption.)
- **Wyckoff & Clark (2002)**, *J. Ecol.* 90: 604–615: before death, growth declines over 6 years (tulip tree) to more than 12 (red oak), so the carbon state a death answers to integrates of order 5–10 years.
- **Myers & Kitajima (2007)**, *J. Ecol.* 95: 383–395: stored carbohydrate predicts seedling survival in deep shade over the first year and beyond; reserves buffer a seedling through dark spells, the mechanism behind a memory longer than a season.
- Hence the probe's τ 2.5, 5 and 10. A calibration, not a fit: one season is a garden year (spec §6).

## Divergence from the spec
§O4.4 reads one season's ground light against Q_est, and §C2's rotating sky is what makes it noisy under a canopy. With the memory on the test reads a running mean instead. The spec's text is changed only if a τ is adopted; until then this ADR is the divergence's record.

## Alternatives
- **A sky that does not rotate for O4** (the churn note's other option): O4's reads would keep the streaks §C2 rotates away, and ground light would become a fixed map of the 16 directions' gaps.
- **A per-tree counter of dark seasons:** under a memoryless floor it behaves as the age gate (the churn note, recommendation 2).
- **A boxcar mean over k seasons:** k values per cell and tree, against one.
- **a = 1/τ:** τ 1 would then be no memory at all; 1 − e^(−1/τ) is the time constant read literally.

## Consequences
- **Now:** nothing changes by default.
- **If adopted:** `forestParams` gains `lightMemory` (with s3d's params, ADR 0072); the garden goldens and phoneSeed3's regression vector are re-baselined with a devlog reason; spec §O4.4 and §O4.11 name the mean; a page that saves a garden writes version 6, so a host must ship the matching core; the phone is looked at in the browser.
