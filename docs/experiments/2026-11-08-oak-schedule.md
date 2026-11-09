# Can the oak's top divide while it keeps its young spire and wide low limbs? (exploratory)

_2026-11-08. Wayfinder ticket [#92](https://github.com/epabarker/tree-simulation/issues/92), map [#73](https://github.com/epabarker/tree-simulation/issues/73). It follows [Does a falling λ (loss of apical control) fill the open-grown oak's flank?](https://github.com/epabarker/tree-simulation/issues/91) ([note](2026-11-08-oak-lambda.md)). Only parameters change, nothing in the core; the probe is #90's `flank_probe` (`wayfinder/oak-lambda` 7c65c58). **Exploratory: seeds 1–3, the lone oak in the 60 m open-grown box, 101 seasons, no length cap.** No adoption claim._

## Answer

**Not all three, and not by per-level shares.** The oak's upper leader sits on the same pa level as its low limbs (pa 1), so a share that spares the limbs spares the leader too, and the top stays one axis. Of the age levers, a slower fall (`ramp` 40 from `aC` 13.5, `a13r40`) comes closest. It keeps the young oak's height and form at 30, divides the top, and fills the flank on two seeds of three (the third gets 4.9%). It keeps most of the low reach (16–17 m against HEAD's 19.5–20). By season 100, though, every late or slow fall gives a **flat-topped, straight-sided box**, not a dome. Only the early fall (`d12a13`, #91) makes the dome, and that costs the spire and the limbs. The trade is real: the later the top divides, the flatter it ends.

| oak (min–max over seeds) | HEAD | d12a13 | d12a30 | a18 | a22 | **a13r40** | k101 | k001 | k110 |
|---|---|---|---|---|---|---|---|---|---|
| shares pa 0/1/2 | – | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 1/0/1 | 0/0/1 | 1/1/0 |
| height at 30, m (spire ≈ 20) | 20.3–20.7 | 15.2–16.3 | 20.6–22.6 | 16.8–17.8 | 19.3–20.2 | **19.6–20.2** | 19.7–21.3 | 20.1–20.9 | 15.8–16.5 |
| axis switches on the leader, 100 | 1–5 | 66–72 | 46–55 | 68–71 | 54–70 | 55–63 | 2–12 | 0–1 | 8 |
| flank, % of new metamers 60–100 (≥ 5) | 0–0.01 | 5.5–7.3 | 1.8–3.9 | 4.0–8.8 | 3.0–5.1 | **4.9–7.0** | 0–5.6 | 0–0.1 | 5.8–10.6 |
| seeds ≥ 5% | 0 | 3 | 0 | 2 | 2 | 2 | 1 | 0 | 3 |
| low half-width (leaf below 8 m), m | 19.5–20.1 | 11.9–14.2 | 17.4–19.2 | 12.4–18.4 | 15.0–15.8 | **16.4–17.4** | 23.2–26.4 | 17.8–20.3 | 12.2–14.5 |
| W/H | 0.96–1.17 | 0.87–0.89 | 1.05–1.13 | 0.86–1.10 | 0.92–1.08 | 0.93–1.08 | 1.23–1.50 | 0.81–0.97 | 0.89–1.12 |
| height at 100, m | 33.0–33.9 | 32.9–33.3 | 32.9–33.5 | 32.9–33.7 | 32.5–33.0 | 32.8–33.5 | 34.1–34.6 | 34.3–41.4 | 25.3–28.5 |
| w90 (outline, below) | 0.16–0.49 | 0.41–0.58 | 0.29–0.59 | 0.56–0.85 | 0.38–0.63 | 0.52–0.78 | 0.08–0.47 | 0.00–0.46 | 0.48–0.79 |
| top-fifth leaf (old band 0.15–0.30) | 0.03–0.05 | 0.05–0.07 | 0.02–0.03 | 0.03–0.08 | 0.03–0.05 | 0.03–0.07 | 0.02–0.05 | 0.00–0.05 | 0.10–0.15 |

`a18`/`a22`: `aC` 18/22, `dLambda` 0.12, ramp 15. `a13r40`: `aC` 13.5, ramp 40. `k…`: `dLambdaShare` per level at `aC` 13.5 (`k101a22`: k101 at `aC` 22, and `k001d20`: k001 at `dLambda` 0.20, behave as their parents; in `summary.txt`). HEAD, `d12a13` and `d12a30` are #91's runs, reused (same binary, same base).

- **Where the leader sits.** At HEAD the leader path is the trunk (pa 0) only in the lower half. Above 0.5 H, already at season 30 (seed 2 from the ground), it is a pa-1 lateral that took over, the same level as the low limbs. Once λ falls the leader wanders onto pa ≥ 2 wood (orders up to 70 by season 100), and that is where the top divides. So the shares meet a structural wall:
  - **`k101` (limbs keep λ):** the leader keeps λ 0.56 too, and the top stays one axis (2–12 switches). The flank stays empty on two seeds. The low limbs grow very wide (half-width 23–26 m, W/H 1.23–1.50): HEAD's spire over a broad skirt, exaggerated. In the pictures this is the most oak-like *young-to-middle-aged* form, but it does not round.
  - **`k001`, `k001d20` (only twigs fall):** the top is never reached (0–2 switches). The oak grows a runaway leader (to 39–41 m on two seeds) because the twigs spread while the axis does not.
  - **`k110` (twigs keep λ, ADR 0057's shape):** the top divides weakly (8 switches) and the flank fills (5.8–10.6%), but the oak loses 5–8 m of height (25–28 m) and is a squat, layered bush from youth.
- **The age levers keep the spire.** A later fall (`aC` 22) or a slower one (ramp 40) keeps height at 30 within 1 m of HEAD, and the pictures at 30 match HEAD's young crown. `aC` 18 does not (17–18 m).
- **But a late division ends flat.** In the pictures at 100, `a18`, `a22` and `a13r40` are broad, flat-topped boxes with nearly vertical sides on all three seeds ([seed 1](figures/2026-11-08-oak-schedule-s1.png), [seed 2](figures/2026-11-08-oak-schedule-s2.png), [seed 3](figures/2026-11-08-oak-schedule-s3.png)). They are full and leafy down the sides, not #91's thin lid over a hollow (`d12a30` seed 2), but they are not domes. The oak builds its height on one axis, then divides once tall, and the divided top spreads level. Only `d12a13`, dividing at 15 m, closes into a dome.
- **The wide low limbs** survive best where the fall is late or slow: half-width 16–19 m (`a13r40`, `d12a30`) against 12–14 (`d12a13`). Their share of the tree's leaf varies with the seed (0.16–0.81) in every falling-λ setting, so the "wide low limbs" are best judged by reach, not by leaf share.
- **The stall is unchanged:** 33 m by season 85–100 in every setting with all levels falling (R1's reproductive sink, #87).

## A top measure for a full-skirted crown

**The top-fifth band is partly the measure's fault.** It counts leaf above 0.8 H. With the crown reaching the ground, a uniformly filled ellipsoid puts 10.4% of its volume there, and a uniform shell over a sphere 20% (Archimedes). The band 0.15–0.30 came from maple (#89), whose crown base is raised. Every oak here, including the visible domes, scores 0.00–0.15, and the dome `d12a13` scores 0.05–0.07. That is below a filled dome's 0.10, so part of the shortfall is real: the low limbs carry a lot of leaf. But a band set above the geometric expectation can't be a gate for a full-skirted lone tree.

**Proposed in its place: w90,** the leafy width (2nd–98th percentile of x) of the slice at 0.9 of the crown's depth (leaf base to top), over its widest slice. An ellipse gives 0.6, a spire goes low and a flat top towards 1. On these runs it separates the undivided spires (HEAD and the `k…` shares: 0.00–0.49, mostly ≤ 0.3) from the divided crowns (0.38–0.85). It does **not** separate the dome from the box: `d12a13` 0.41–0.58 overlaps `a13r40` 0.52–0.78. Read as a band of about 0.35–0.65 for "rounded, not a spire", with the boxes reaching up to 0.85, it is a better gate than top-fifth but needs the eye for a flat top. A shoulder measure (how far the upper surface drops at half the half-width) was tried and separates nothing (0.26–0.52 for every divided crown); it stays in `summary.py` only as a record.

## What this settles, and what it leaves

- **Per-level `dLambdaShare` is not the lever for the oak** while its leader rides on pa 1. Sparing the limbs and dividing the top would need the leader and the limbs on different levels (for instance, a lateral that takes over the leader taking pa 0, as the relay does, ADR 0033). That is a rule change, not params.
- **The age schedule trades the dome against youth.** Early division gives a dome without a spire. Late or slow division gives the spire and most of the limbs, then a flat-topped box by 100. Whether that box is acceptable is a judgement on the oak's look: [How do real crowns become rounded?](https://github.com/epabarker/tree-simulation/issues/74) found that real old trees flatten (Ryan & Yoder). But [Which mechanism rounds a crown?](https://github.com/epabarker/tree-simulation/issues/83) allowed flattening only *after* the stall, and these oaks are still gaining height until season 85–100.

## Method

- **Params** `code/2026-11-08-oak-schedule/conditions.py` writes 24 files from #91's open-box base (`runs/oak-lambda/base`), changing only the oak's `r2`: `dLambda`, `aC`, `ramp` and per-level `dLambdaShare`.
- **Probe** `rust/core/examples/flank_probe.rs` (#90's, unchanged), 101 seasons, dumps every 10, 12 workers, ≈ 10 min, `runs/oak-schedule/` (git-ignored).
- **Analysis** `code/2026-11-08-oak-schedule/summary.py` (output in `summary.txt`): #91's flank measure unchanged, plus low half-width, limb leaf share, w90/w80 and the shoulder. `figure.py` draws the contact sheets at 30/60/100.

## Limits

Three seeds and one lone tree, seasons ≤ 100. The `aC`/ramp grid is coarse, and `a13r40` misses the flank bar on one seed by 0.1 point. w90 has been checked only against these crowns and #91's, by eye. No garden run.
