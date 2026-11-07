# Can we draw the growth model as a DAG, and does it tell us what twisting a knob does?

**Yes, we can draw it.** One season is a DAG: light, sampling, allocation, growth, shedding, girth, mechanics and deaths run in a fixed order. The links from one season to the next (light and foliage, cost of size, reserve, age clocks: nine loops) become feedback edges (`dag.png`).

**What it tells us for certain is which knobs cannot matter.** A knob is dead when every path from it is closed by another setting.
- `c5.T` does nothing in any species: carbon shedding never reads it. The sweep agrees: bit-identical runs in all five species swept so far.
- Holly's `vigourTreeLo` has no reader.
- R5's shade knobs are dead for a lone tree.

**What it cannot tell us is the size or even the direction of an effect.** Over the seasons, the light loop connects every live knob to every outcome, so "it can reach" separates nothing. Thresholds (λ near 0.5, the hJ cap, maturity) mean small changes can flip a crown. Hornbeam's trunk λ +10% added 18 m.

**"Deterministic" means reproducible, not predictable.** Randomness is keyed by birth id, so a knob that changes how many shoots grow reshuffles every later draw and gives a new realisation. In the ±10% sweep, the change from −10% to +10% kept one sign of D on all 3 seeds in only 40 of 138 cases. Noise alone gives about 1 in 4.

**A practical knob tool:**
1. The DAG prunes the dead knobs.
2. The sweep (`sweep_effects.csv`) gives the local sign and size against the base's seed spread, and flags band crossings.
3. Where the −10% and +10% effects disagree, or a band is crossed, rerun with 20 or more seeds before believing it.
