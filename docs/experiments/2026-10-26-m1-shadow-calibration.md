# M1: first calibration of the shadow constants a and b

## Question
Which shadow strength a and decay b (spec §C2; §2 table: "calibrate on an isolated tree") regulate density on an isolated 2D tree without stopping growth? Neither Palubicki et al. (2009) nor Guerra (2026) gives numbers.

## Setup
- Preset `shadow`: C2 on, C3 in `none` mode, so every bud with Q > 0 grows one metamer. World 100×70, seed 1, 40 seasons, C = 1.

```bash
for a in 0.1 0.2 0.3 0.5; do for b in 1.5 2 3; do
  echo "{\"c2\":{\"a\":$a,\"b\":$b,\"C\":1}}" | node cli/run.ts --preset shadow --seasons 40 --params - --out runs/m1-scan/a$a-b$b --quiet
done; done
```

## Result (season 40)

| a \ b | 1.5 | 2 | 3 |
|---|---|---|---|
| 0.1 | 5,695 metamers | 8,165 | 12,221 |
| 0.2 | 2,689 | **3,669** | 6,003 |
| 0.3 | 1,159 | 1,537 | 3,431 |
| 0.5 | 81 (only the leader grows) | 81 | 1,363 |

Height is 41 in every case, because the leader is always lit. An unchecked tree (M0) would have about 2^40 metamers.

**Self-shading of a node.** With a = C = 1, nothing grows at all. The terminal and axillary buds of a node share a cell, and each removes only its *own* deposit, so each bud sees the other's a: Q = C − a = 0. In general, a node with k buds is lit only if C > (k − 1)·a.

## Conclusion
- **Defaults:** a = 0.2, b = 2, C = 1 (still marked `calibrate`). Growth becomes roughly quadratic, as expected when 2D space grows as t² (§1), and the crown fills its space with a dense, lit shell over a dormant interior.
- **Follow-ups:**
  - **Recalibrate at M2.** Q then sets how much resource a branch gets, not just whether it grows.
  - **World box.** The run also exposed that the world must be a closed box (Q = 0 outside it). Without that, shoots that leave the grid see unshaded sky and explode (see architecture.md).
