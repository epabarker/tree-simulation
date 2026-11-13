# 0065: The garden's per-hectare targets are reported, not gated; canopy at half the top height

- **Status:** accepted (user, 2026-11-12). Amends [ADR 0063](0063-garden-demography.md) decisions 1–3. Implemented by #121.
- **Spec:** §O4 (the garden's demography). ADRs 0062, 0063, 0064.
- **Tickets:** [#121, the garden flip](https://github.com/epabarker/tree-simulation/issues/121) (its last comment is the decision); [#122, the 20-seed acceptance](https://github.com/epabarker/tree-simulation/issues/122) (its amended bars); [#129, crown extent and girth](https://github.com/epabarker/tree-simulation/issues/129) (the per-hectare gate moves there).
- **Playbook page:** [Stand density and demography](../features/stand-density-and-demography.md)
- **Evidence (all exploratory, seeds 1–3):** [the garden schedule](../experiments/2026-11-10-garden-schedule.md) (seven rounds of rates); [the suppression probe](../experiments/2026-11-10-garden-suppression-probe.md) and [the canopy levers](../experiments/2026-11-11-garden-canopy-levers.md); [crown occupancy](../experiments/2026-11-11-garden-crown-occupancy.md); [the path-length probe](../experiments/2026-11-11-garden-pathlength-probe.md); [the crown-extent research](../research/2026-11-11-crown-extent-and-canopy-density.md).

## Context
- **No schedule meets ADR 0063's bars.** Seven rounds of rates reached the cap in 45 of 48 runs. Hornbeam makes 0.2–0.6 million seeds a run, so cutting establishment 10–100× still fills the stand. The understorey sits at P/M 2–15, so the carbon signal never suppresses it.
- **Every further mechanism hits the same wall:** canopy 47–109/ha at 160 cells, against ≥ 120 needed. That held across the dark-top and growth signals, a 96- or 128-cell depth period, 800 saplings/ha, crown occupancy at every radius, and a reach limit.
- **The wall is form, not demography.** Lone crowns are 1.4–4.2× Pretzsch et al.'s open-grown edge at matched DBH. A stand hornbeam is 21.5 m across where a real one is 8–12 m, and stems are 2–3× too thick. ≥ 120 canopy trees/ha is the low end of real stands (the research note §2.2).
- **Two schedule levers work in part.** Hornbeam `o4.cSeed` 300 leaves the cap unreached in 3 of 6 runs. Adding the dark-top signal at θ_q 0.15 (**d1**) cuts hornbeam's share to 0.63.
- **"Canopy" was over half the single tallest tree.** One 40–45 m leader halved the canopy count for decades (the path-length note §5).
- **Small frames cannot meet a share bar.** With 3 drawn stems, one species is at least 33%; the 66-cell garden is nearly always at 1.00.
- **The phone plot holds one canopy crown** in 49 of 51 probe runs (66 cells, 16.5 × 16 m).

## Decision
1. **The per-hectare targets are reported, not gates.** 200–400 drawn stems/ha at seasons 100/200/300 and ≥ 60% of drawn stems in the canopy stay as ADR 0063's description of a mature high forest. #121 and #122 report them with counts. The gate on them, with ≥ 120 canopy trees/ha at the desktop width, moves to the Form ticket #129 (crown extent and girth).
2. **Reaching the cap is a reported count**, the seasons at the cap (`meta.capSeasons` in run.json; stand.csv's `capReached`), not a failure. The cap stays a compute guard: a 10⁴/ha seedling bank cannot exist under a 2,500/ha cap.
3. **A canopy stem is a drawn stem over half the top height:** forestry's top height, the mean height of the 100 tallest drawn stems per hectare (`stand::top_height`). The count is n = max(1, round(100 × plot ha)), from the world's width × depth: 6 at 160 cells, 3 at 66. With fewer than n drawn stems it is the mean of all of them. (Amended the same day: the first reading was the drawn stems' 90th-percentile height, rejected below.)
4. **"No species above 70%"** is read only in frames with at least 8 drawn stems.
5. **The suppression signal is an option of ADR 0063's decision 3:** `o4.suppressionSignal`, `carbon` (P/M, the default) | `topLight` (the dark top: Q_top/C against θ_q) | `growth` (the stalled leader: the height gained over k seasons against k·g). Each is scaled by shade tolerance as P/M is. **d1** (hornbeam `o4.cSeed` 300 + `topLight` θ_q 0.15) is a named patch, not adopted. #122 decides between round 6 and d1 on seeds 1–20, by the reported counts.
6. **The phone width's bar** (66 cells) is at least one canopy tree from season 100, beside the gate at both widths: a canopy tree at every season after 50.
7. **#121 lands the garden at round 6's rates:** periodic depth, 400 saplings/ha, `twoPart` mortality with m_c 0.003, the 1.3 m display threshold. Every other rate is at its default.

## Alternatives
- **Keep ADR 0063's bars as gates and tune on:** falsified by seven rounds of rates and four probes of mechanisms. The bars would stay red until crown form changes.
- **Lower the per-hectare targets, or plant denser to hit them:** lowering contradicts the research; 800/ha planting thinned to 3–9 canopy trees by season 100.
- **A reach limit in #121** (`c1.pathLimit`): 0 of 6 runs passed, it had five defects, and it imposes a limit rather than letting one emerge. It belongs to #129 with its own ADR.
- **Canopy over half the tallest tree** (ADR 0063's reading): one leader decides the count.
- **Canopy over half the drawn stems' 90th-percentile height** (this ADR's first reading, implemented and rejected the same day): a flood dilutes it. In a flooded frame the 90th percentile is itself a sapling's height, so the saplings count as canopy. Round 6, desktop seed 2, season 200 has 155 drawn stems (2,422/ha); there the canopy share went 0.03 → 0.84. The gate "a canopy tree every season after 50" would then pass exactly when it should fail. The tallest 100 per hectare are what a flood cannot dilute.

## Consequences
- Only the garden presets' golden (`mixedWood`) moved; `carbon` written out is bit-identical, and the canopy definition is not hashed.
- The named regressions moved (phoneSeed3); #123 re-baselines them.
- On a small plot the top height averages few stems (3 at 66 cells), so one tall leader still weighs on it there; a sparse stand with fewer than n drawn stems reads the mean of all of them.
- The dark-top signal kills light-demanders under shade. #124's guard already showed weaker oak regeneration, so the oak may fail #122's re-run under d1.
- #129 owns the per-hectare targets. A crown-extent rule there changes the stand, so #126's bare-bole probe may need repeating.
