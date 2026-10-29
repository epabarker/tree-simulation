# The milestone tests on the production build (before dropping parity)

## Question

Do the evidence tests' thresholds (`tests/evidence/`, set on the TypeScript core's runs) hold on the Rust core's production build? Which move, and by how much? This is the check before production becomes the only build (user, after I1).

## Setup

- `tests/evidence/rust.ts` and `cli/trials.ts` take the build from `TREE_BUILD` (default `parity`, so nothing else changes).
- `code/2026-10-30-production-thresholds/margins-setup.ts` logs every numeric comparison the tests make (`toBeGreaterThan`, `toBeLessThan`, the `OrEqual`s, `toBeCloseTo`): the source line, the actual value and the threshold. Each build ran with:

  ```
  TREE_BUILD=<build> MARGINS_OUT=runs/margins/<build>.jsonl npx vitest run -c docs/experiments/code/2026-10-30-production-thresholds/vitest.config.ts
  ```
- `margins.py` joins the two logs by line and reports each line's worst margin in each build: how far past its threshold, as a share of the threshold's size. Output: `code/2026-10-30-production-thresholds/margins.txt` (166 lines).
- `m5-seeds.ts` runs the two failing tests' measures for seeds 1–20 in both builds, without stopping at a failure. Output: `m5-seeds.txt`.

## Result

**88 of 90 tests pass on production; 2 fail, both in M5** (`stand.test.ts`):

| Test | Threshold | Parity, worst of seeds 1–5 | Production, worst of seeds 1–5 |
|---|---|---|---|
| A late tree between two is suppressed: its height < 0.6 × its neighbours' | 0.6 | 0.549 (seed 3) | **0.610 (seed 4)** |
| The left tree leans into the gap when its neighbour is felled: crown shift > 2 cells | 2 | 2.87 (seed 1) | **0.18 (seed 1)** |

**Neither threshold is set differently by the build; both tests fail at the same rate in either build over 20 seeds:**

| Measure (pass rule) | Parity, seeds 1–20 | Production, seeds 1–20 |
|---|---|---|
| late tree's height share (< 0.6) | 17 pass (fail: 8, 13, 20) | 16 pass (fail: 4, 8, 17, 20) |
| late tree's metamer share (< 0.3) | 20 | 20 |
| late tree's light share (< 0.3) | 19 (fail: 8) | 20 |
| gap shift (> 2 cells) | 18 (fail: 8, 14) | 18 (fail: 1, 8) |

Each test asks that all five seeds 1–5 pass. With a per-seed failure rate of 10–20% in both builds, that holds for some realisations and not others. The parity build's seeds 1–5 happen to pass; production's seeds 1 and 4 happen not to. Seed 8 fails both measures in both builds: there the late tree is not suppressed and the gap is not taken.

**Everything else holds.** Of the 166 comparison lines:
- 110 see identical values in both builds: runs that never meet an input where the libm crate and V8 differ are bit-identical (all of `species`, `trials` and `world`, and the binding cases of many others);
- 56 differ; apart from M5, the largest drops in worst margin are `flora.test.ts:256–257` (+1.25 → +0.75 and +1.33 → +1.08 of the threshold) and `stand.test.ts:15`, `:31` (M5's other measures: +1.31 → +0.35, +0.31 → +0.23);
- the thinnest lines are structural (`world.test.ts:12`, `:23`: ids ascend by one) or equal in both builds (`flora.test.ts:81`: 61.6 against 60).

## Conclusion

- Production does not hold the M5 tests as written, so I stopped before dropping parity, as asked, and did not widen either threshold.
- The failure is the tests' design, not the build: both are "every one of five fixed seeds" claims about a behaviour that fails on 10–20% of seeds in either build. Any change of realisation (a bit of Math, a new principle, I2's 3D growth) has a fair chance of breaking them.
- **Proposal, for the user to decide:** state M5 as a share over more seeds. For example, at least 15 of seeds 1–20 for each measure, a rule both builds meet (16–20 of 20). Alternatively, the median over seeds 1–20 against today's thresholds (both builds' medians are well inside: height share ≈ 0.5, shift ≈ 4.7). The thresholds stay as they are; only the number of seeds that must meet them changes. The other way out, choosing seeds that pass, would hide the behaviour.
