# The override pass after the judging (2026-11-02)

The shipping order: a species that reads wrong on the phone gets an override judged on a sheet, never a round. The user's pass is [`reviews/2026-11-02-judging-pass.md`](../reviews/2026-11-02-judging-pass.md). Four of the eight were covered by track B's accepted picks, which had never been adopted (devlog, 2026-11-02); the oak's zigzag has [its own note](2026-11-02-oak-zigzag.md). This note is the three without a pick: holly, rowan, hornbeam. Script [`code/2026-11-02-overrides/species-overrides.py`](code/2026-11-02-overrides/species-overrides.py): the fresh-look harness's lone tree (240 wide) and closed stand (84 wide, 12 trees), seeds 4–6, dotted assignments over the species' patch; numbers are medians over seeds; dots sheets at seed 4 in `figures/2026-11-02-overrides-<sp>.png`. The user judges the candidates in the real renderer (track C's sheets).

## Holly: "spire too narrow with a pointed tip; holly broadens with age" (lone 100)

| at 100 | lone: H, W/H | lone: fork height | stand: H, LAI, alive |
|---|---|---|---|
| today | 108, 0.45 | 1.0 (no fork) | 90, 7.9, 12 |
| **fork40**: beech's fork rules, relay from age 40 at p 0.3 (relay 2, relayCrowd 10, forkAt 1.3, forkAngle 45, vigour gate 3000–10000) | **74, 0.69** | 0.79 | 72, 7.9, 12 |
| level-1 η 0.9 (longer limbs) | 108, 0.45 | 1.0 | 89, 7.7, 12 |
| a late loss of apical control (aC 40, dLambda 0.08 over 20) | 115, 0.51, a spire on top | 1.0 | 90, 7.0, 12 |
| level-1 set point 75 (flatter limbs) | 108, 0.50 | 1.0 | 90, 7.7, 12 |

The late fork is the only one that changes the kind of tree: the leader ends from 40 and the top becomes a rounded head, a bush rather than a cone, which is what an old holly in the open is. The stand loses some height (72 against 90) with its LAI and survival unchanged. **Candidate: fork40.**

## Rowan: "stacked lumpy tiers with a flat cap leaning off to one side" (lone 100); "stand stems snake from the base like coppice"

Rowan's first-order λ is 0.4917, below 0.5 from birth, so its limbs lose their apex to a lateral at every node (the oak's fault, one level down), and its posture control c is 0.028, a quarter of the others', the lean. κ (acrotony) is 1.45.

| at 100 | lone: H, W/H | lone: thick-path kinks | stand: H, LAI, H/D | stand: kinks |
|---|---|---|---|---|
| today | 118, 0.54 | 19 | 84, 5.0, 77 | 13 |
| level-1 λ 0.53 | 116, 0.67 | 23 | 85, 4.8, 73 | 10 |
| λ 0.53 + posture c 0.06 | 125, 0.59 | 11 | 102, 4.9, 122 | 10.5 |
| λ 0.53 + dLambda 0 | 175, 0.46, a spire | 1 | 105, 4.2, 91 | 1 |
| **kappa1**: λ 0.53 + κ 1.0 | **119, 0.68** | **1** | 89, 5.0, 71 | 11.5 |
| **kappa1-dl01**: + dLambda 0.01 | 144, 0.54 | 2 | 89, 4.8, 75 | **1** |

Cutting acrotony to 1 with the limbs' λ held gives an oval crown on a straight stem (the tiers and the lean go); the stand's stems still snake because the trunk's own λ (0.534 − 0.0275) sits at the cliff. Holding the trunk too (dLambda 0.01) straightens the stand and makes the lone tree taller and narrower (144 cells, 36 m: too tall for a rowan). **Candidates: kappa1 (the lone tree), kappa1-dl01 (the stand); the user chooses.**

## Hornbeam: "crown is a V that runs to the ground, no trunk shown" (lone); "stand crowns too thin for the stem girth"

| at 100 | lone: H, W/H, fork height | stand: H, LAI, alive |
|---|---|---|
| today | 152, 0.99, 0.25 | 131, 8.6, 8 |
| hJ 30 (a taller juvenile cap) | 140, 1.20, 0.03 | 129, 8.7, 5 |
| hJ 30 + dLambda 0.05 | 203, 0.42, 0.89, a column | 134, 5.8, 12 |
| hJ 30 + level-1 set point 55 | 140, 1.21, 0.08 | 122, 9.1, 7 |
| hJ 40 + dLambda 0.05 + set point 55 | 203, 0.43, 0.91, a column | 145, 5.5, 12 |

The fork stays at the base whatever the juvenile height (hJ caps the shoot, it does not bare the trunk), and holding apical control turns the parasol into a column. A clear trunk under a hornbeam's crown needs the lower limbs shed or a fork rule with few heavy arms: form, after shipping. **No override; hornbeam ships as it is** (its stand passed the blind test 6 of 9 at seeds 1–3; 3 of 15 at 4–6).
