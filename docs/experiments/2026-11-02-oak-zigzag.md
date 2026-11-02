# The oak's zigzag (2026-11-02)

The user's judging pass ([`reviews/2026-11-02-judging-pass.md`](../reviews/2026-11-02-judging-pass.md)): oak "no · hazel coppice · zigzag limbs fan upward from a low fork, tall and open, no broad dome or stout trunk"; in the garden at 100 its trunks "read as lightning bolts", and the user named it the single fix with the biggest payoff. Scripts: [`code/2026-11-02-overrides/oak-zigzag.py`](code/2026-11-02-overrides/oak-zigzag.py) (the lone tree), [`oak-stand.py`](code/2026-11-02-overrides/oak-stand.py) (the closed stand); the fresh-look harness's worlds, seeds 4–6 (the judging seeds), measured at 60 and 100. The variants ride on the oak's accepted pick (posture by age, adopted today).

## The cause: apical control lost once the ramp ends
R2's ontogenetic drop (`lambda_at`): λ = the level's λ − `dLambda`·t, t rising from 0 at age `aC` to 1 over `ramp`. Oak's fit has λ₀ 0.5631, dLambda 0.1154, aC 13.5, ramp 15, so from age 28 every node's λ is 0.448: below 0.5, the lateral at each node gets more than the main shoot (Borchert–Honda), takes over, and the stem a viewer reads as the trunk (the thickest child from the root up) turns by the lateral's angle at nearly every node.

| seed 4–6 medians, at 100 | lone: H, W/H | lone: thick path, kinks > 20° | stand: H, LAI, H/D | stand: kinks > 20° per tree |
|---|---|---|---|---|
| today (with the pick) | 161, 1.05 | 76 | 119, 2.5, 97 | 59 |
| branch angle 30° on the laterals | 164, 1.00 | 75 | 119, 2.5, 97 | 65 |
| dLambda 0.06 (λ → 0.503) | 162, 0.84 | 63 | 109, 3.6, 107 | 54 |
| **dLambda 0.04 (λ → 0.523)** | 180, 0.76 | **2** | 111, 2.7, 106 | **1** |
| dLambda 0.03 | 201, 0.75 | 1 | 116, 2.2, 101 | 1 |
| dLambda 0 | 173, 1.29 | 3 | 105, 1.1, 83 | 1 |

- **It is a cliff at λ 0.5.** 0.06 still zigzags (54–63 kinks), 0.04 does not (1–2). The lateral's branch angle does not matter: the kink is the takeover, not the angle the lateral left at.
- **Held apical control straightens the stem everywhere** (the stand's trunks go from 59 kinks to 1, the garden's bolts) **and costs the lone tree its breadth:** W/H 0.76 at 100, a tall cone (H 180 cells, 45 m), because the laterals the drop used to free are now subordinate and the crown is a leader's. Neither today's fan nor the cone is an oak; the cone is the lesser fault in the garden, where every oak is a stand tree.

## The fork (a form candidate, not an override)
Beech's accepted rules are generic: the vigour fork (ADR 0040) ends a leader grown at full vigour and makes its top laterals arms, under the relay (ADR 0033) with its neighbour gate (ADR 0039) and the vigour gate (ADR 0041), so a stand tree keeps its trunk. On the oak at dLambda 0.04 (`r2.relay` 2, `relayPTerm` 0.15, `relayCrowd` 10, `forkAt` 1.3, `vigourTreeLo/Hi` 3000/10000):

| at 100 | lone: H, W/H, fork height | lone: kinks | stand: H, LAI, H/D | stand: kinks |
|---|---|---|---|---|
| forkAngle 45, relayAge 15 | 135, 1.11, 0.26 H | 45 | 85, 3.8, 79 | 13.5 |
| forkAngle 60, relayAge 15 | 125, 1.23, 0.28 H | 21 | 75, 3.6, 73 | 6 |
| **forkAngle 45, relayAge 25** | 139, 1.02, 0.46 H | 52 | 117, 2.8, 97 | 1 |

- With relayAge 25 the stand is untouched (its trees are past the gate before the relay could act) and the lone oak gets a trunk to half its height and then arms: the right skeleton.
- But the arms keep forking as the relay fires (p 0.15 a season), so the thick path has about 50 kinks: beech's polyarchic dome, not an oak's few heavy sinuous limbs. Making the arms heavy and few, with the curve along them that beech's trunk has, is a form round with 20-seed evidence, not an override. It is the oak's item for after shipping, with the lone beech's rise-then-arch.

## For the user
Three oak variants are being rendered in the real renderer by track C (lone 60 and 100, stand 100; the garden at seed 10): today, held (dLambda 0.04), fork. The override on offer for shipping is **held**: it removes the garden's lightning bolts and the hazel-coppice fan, and leaves the lone oak a tall cone until the form round.

Figures (the native harness's dots): [`figures/2026-11-02-oak-zigzag-sweep.png`](figures/2026-11-02-oak-zigzag-sweep.png) (lone, leaf-off), [`figures/2026-11-02-oak-zigzag-stand.png`](figures/2026-11-02-oak-zigzag-stand.png) (stand, leaf-off).

## The held oak in the garden itself (storms on)

Track C's garden sheet (seed 10, the page's own plate) showed the held oak thrown by a storm at season 92 (H 119, H/D 84; ADR 0027's windthrow ramp starts at 80), where today's stood at H/D 47. [`code/2026-11-02-overrides/oak-garden.py`](code/2026-11-02-overrides/oak-garden.py) runs the garden's worlds natively (`garden-params.ts`, the phone's 66-cell plate, `stormP` 0.05 as the page has it) for the four seeds of 1–20 that plant an oak (1, 10, 11, 20), 100 seasons:

| planted oak at 100 | today | held (dLambda 0.04) | held, r0 ×1.5 | held, r0 ×2 |
|---|---|---|---|---|
| alive at 100 | 4 of 4 | 4 of 4 | 4 of 4 | 4 of 4 |
| H/D at 100 (the four seeds) | 60, 54, 49, 75 | 67, 74, 80, 58 | 59, 65, 97, 96 | 50, 71, 79, 69 |
| H/D, the maximum over the run | 134, 113, 151, 106 | the same four | 133, 105, 122, 101 | 125, 98, 121, 94 |

- **The held oak stood in all four worlds.** The page's throw at seed 10 was one realisation on a different plate; the exposure is real but not the rule.
- **The peak slenderness is identical for today and held** (it falls before age 28, when the two are the same tree): the garden's young oaks are slender at 106–151 whatever the override, and that is where the windthrow risk sits. At 100 the held oak is slenderer than today's (58–80 against 49–75), at the ramp's foot.
- **A thicker pipe radius does not reliably help** (r0 ×1.5 gave 96–97 on two seeds) and r0 is R1's carbon economy as well as girth (ADR 0027), so it is not an override.
- **So the offer stands as "held" alone:** straight stems in the garden at the same early exposure as today, a slenderer tree at 100, and a lone oak that reads as a cone until the form round.
