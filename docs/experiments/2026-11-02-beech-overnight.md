# Beech overnight: the lower limbs, a unit-free gate, three namers (2026-11-02)

Three investigations the night after [the review of the fresh-look beech round](2026-11-01-fresh-look-beech-review.md), on `claude/beech-overnight` (from `claude/fresh-look-beech`). None decides anything: they inform the user's open decisions on own-crown pruning (ADR 0043), the vigour gate's units (ADR 0041–0043), and round 2. Scripts in `code/2026-11-01-fresh-look-beech/`.

## 1. Why the lone beech's lower limbs survive

`lower-limbs.py` reads every first-order limb leaving the trunk below H/6 in the 20-seed lone runs, against beech's two shedding tests: light per metamer below T_rel·Q_top (T_rel 0.008, ADR 0032), and R1's carbon test, production below upkeep.

| lone beech | season | low limbs, 20 seeds | light ÷ T_rel·Q_top, median (min) | P/M, median (min) | light, median |
|---|---|---|---|---|---|
| today (the round's rules absent) | 60 | 326 | 80 (14) | 4.5 (1.5) | 0.17 |
| today | 100 | 424 | 76 (20) | 3.9 (1.9) | 0.15 |
| the repair | 60 | 155 | 71 (45) | 4.9 (3.2) | 0.24 |
| the repair | 100 | 215 | 69 (41) | 4.7 (3.0) | 0.23 |

- **No low limb is near either threshold.** The dimmest is 14 times above beech's measured shade limit, and every one produces at least 1.5 times its upkeep.
- **They survive because they are well lit:** 15–24% of the open sky at the median. In the model's open world the sky reaches a lone tree's lower crown from the side.
- **So no shedding parameter clears them honestly.** A light or carbon rule that clears them would have to shed wood that is as well lit as a mid-crown limb. That is what `c5.Tvig` 0.25 does, at 31 times the measured T_rel.
- **What could make them dim** is the light model, not shedding: how much of the sky reaches low and sideways (C2's open question, ADR 0031–0032's notes). Whether real open-grown beeches clear their lower trunk by shade at all, rather than by browsing or limb drop, is a question for the sources, not answered here [u].

## 2. A unit-free vigour gate (prototype, not proposed)

`r2.vigourCrowd` = k makes the vigour gate clamp(1 − k·s̄), with s̄ the relay gate's signal (the tree's mean R5 neighbour shade), in place of the resource bounds 3,000–10,000. It drives the same three rules (the drop, light orthotropy, own-crown pruning). Absent, the core is bit-identical (goldens and the repair's hashes unchanged); a unit test covers it. Run on top of the repair's values, 20 seeds, and in the garden's worlds.

| 20 seeds | today | repair | unit-free, k 10 | unit-free, k 20 |
|---|---|---|---|---|
| guard: all four (alive, floor, LAI 6–8, H/D) | 6 | 8 | 5 | **11** |
| guard: floor 3–5% | 19 | 16 | 13 | 16 |
| guard: LAI 6–8 | 20 | 11 | 10 | 13 |
| guard: H/D 70–110 | 6 | 20 | 19 | 20 |
| lone 100: W/H 1.3–1.5 (photograph) | 0 | 9 | 13 | 13 |
| lone 60: W/H 1.3–1.5 | 0 | 8 | 1 | 1 |
| lone height at 60 / 100, median | 145 / 203 | 94 / 137 | 86 / 127 | 86 / 127 |
| stand height, median | 182 | 164 | 154 | 162 |
| stand limb crown ratio, median | 0.345 | 0.27 | 0.245 | 0.25 |

- **The lone tree is the same at k 10 and k 20,** since alone s̄ = 0 and the gate is fully open from the seedling. It is shorter and broader than the repair's: 127 cells at 100, W/H 1.44, too broad at 60 (1.61).
- **The stand at k 20 passes the whole guard on 11 of 20 seeds,** the best of the four. At k 10 the gate opens in the young stand before the crowns meet, and the stand moves further.
- **The garden is worse.** A garden row gives its beeches almost no neighbour shade, so the gate opens fully from the seedling. On the phone's plate both surviving beeches (seeds 12 and 13) become bare poles with a flat cap by 100, where the resource gate did that to one ([phone, k 20](figures/2026-11-01-fresh-look-beech-review-garden-phone-crowd20.png); [laptop, k 20](figures/2026-11-01-fresh-look-beech-review-garden-laptop-crowd20.png)).
- **So units were not the garden's problem.** The pole with a cap appears wherever the gate is open on a tree whose lower crown is shaded from the side. §2b shows the cause.

### 2b. The pole with a cap is own-crown pruning

The same garden worlds with `c5.Tvig` 0, under the resource gate and under the unit-free gate (k 20), `garden-gate.py --variant notvig` and `crowd20-notvig`:

| garden beech at 100, cells | rules off | repair | repair, Tvig 0 | k 20 | k 20, Tvig 0 |
|---|---|---|---|---|---|
| phone plate, seed 12 | 83 | 77 | 77 | 132 | 113 |
| phone plate, seed 13 | 171 | 114 | 114 | 134 | 123 |

- **Without own-crown pruning neither beech becomes a pole,** under either gate: the crown stays clothed down the stem, a broad head on a short clear trunk ([resource gate, Tvig 0](figures/2026-11-01-fresh-look-beech-review-garden-phone-notvig.png); [k 20, Tvig 0](figures/2026-11-01-fresh-look-beech-review-garden-phone-crowd20-notvig.png)).
- **The mechanism:** in a garden row the neighbours shade a beech's lower crown from the side; with the gate open, own-crown pruning sheds everything below 25% of the top's light, and the tree is left a stem under a cap. In the open (§1) the same rule clears only the lowest limbs, because nothing shades the rest.
- **The heights hardly move** without it; it is the lower crown, not the height, that the rule removes.

### 2c. Both gates without own-crown pruning, 20 seeds

| 20 seeds | today | repair | repair, Tvig 0 | k 20 | k 20, Tvig 0 |
|---|---|---|---|---|---|
| guard: all four (alive, floor, LAI 6–8, H/D) | 6 | 8 | 8 | 11 | 9 |
| guard: LAI 6–8 | 20 | 11 | 11 | 13 | 10 |
| guard: floor 3–5% | 19 | 16 | 16 | 16 | 17 |
| lone 100: W/H 1.3–1.5 (photograph) | 0 | 9 | 9 | 13 | 1 |
| lone 60: W/H 1.3–1.5 | 0 | 8 | 10 | 1 | 0 |
| lone 100: leaf below H/6 ≤ 7% | 0 | 16 | 5 | 19 | 4 |
| lone height at 100, median | 203 | 137 | 120 | 127 | 117 |
| lone W/H at 100, median | 0.43 | 1.31 | 1.50 | 1.44 | 1.60 |
| lone leaf below H/6 at 100, median | 23.5% | 5.6% | 8.4% | 4.9% | 8.1% |
| stand limb crown ratio, median | 0.345 | 0.27 | 0.27 | 0.25 | 0.30 |

- **Under the resource gate own-crown pruning never acts in the closed stand:** its stand is identical with and without it.
- **On the lone tree it costs little to drop:** the tree is shorter and broader (120 cells, W/H 1.50, the photograph's band at 60 on 10 of 20 seeds), and its leaf below H/6 rises from 5.6% to 8.4%, still about a third of today's 23.5%.
- **The unit-free gate's stand advantage was own-crown pruning acting on the young stand:** without it, 9 of 20 against the repair's 8, inside the noise. Its lone tree is then too broad (W/H 1.60; the photograph's band on 1 of 20).
- **So the best of the five is the repair without own-crown pruning:** the stand of the repair, a broader lone tree with most of the skirt still gone, and (§2b) clothed garden crowns.

## 3. Three namers, form-only

The previous tests had one namer each, and round 2's namer named the hornbeam decoy beech on 8 of 9 lone panels where round 1's named it hornbeam 9 of 9. This test repeats the protocol (`blind-test.md`) with **three independent namers** on the same 72 panels: beech as repaired, beech today, and decoys hornbeam, oak, birch and silver fir. All are drawn by the round's harness (`blind.py`: one colour for every species, leaves as dots), seeds 1–3, lone at 60 and 100 (leaf-on and leaf-off) and the stand at 100. The key names the species. Answers and key: `code/2026-11-01-fresh-look-beech/blind-round3/`. The namers were fresh agents of one model given only the image folder: independent in context, not in kind.

| source | first guesses, pooled over three namers (9 panels a cell, 3 per namer) |
|---|---|
| beech, repair: lone 60 | oak 8, cedar of Lebanon 1 |
| beech, repair: lone 100 leaf-on | beech 3, cedar 2, oak 2, Scots pine 2 |
| beech, repair: lone 100 leaf-off | oak 4, cedar 3, Scots pine 2 |
| beech, repair: stand 100 | birch 6, Scots pine 3 |
| beech, today: lone 60 / 100 | Norway spruce 26 of 27 |
| beech, today: stand 100 | Scots pine 6, birch 3 |
| hornbeam: lone 60 | field maple 7, hornbeam 2 |
| hornbeam: lone 100 (on, off) | hornbeam 13, beech 3, oak 1, wych elm 1 |
| hornbeam: stand 100 | Scots pine 9 |
| oak: lone 60 / 100 | hazel 20, English elm 6, hawthorn 1 |
| oak: stand 100 | hornbeam 6, ash 3 |
| birch: lone 60 / 100 | Norway spruce 21, larch 6 |
| birch: stand 100 | birch 5, ash 3, Scots pine 1 |
| silver fir: all | Norway spruce 23, western hemlock 6, others 7 |

- **The repaired beech is named beech on 1 of 12 panels by each namer** (3 of 36), all on the lone tree at 100, leaf-on. It fails the pass rule for every namer. It reads as oak, cedar or pine; its stand as birch or pine.
- **The hornbeam lead does not reproduce.** With three namers the hornbeam is named beech on 3 of 27 lone panels, the same rate as the repaired beech, and hornbeam on 15. Round 2's 8 of 9 was one namer.
- **Almost nothing is recognisable in this drawing.** Today's beech, the birch and the fir all read as Norway spruce; the oak as hazel or elm. Only the hornbeam is named itself more often than not on its lone panels. Form drawn in uniform dots is a weak instrument for every species, not only beech.
- **The namers agree on 41 of 72 panels.**

## 3b. Three namers, the real renderer (the laptop, `claude/blind-v2`)

The user started a session on the laptop that ran the same protocol in the lab's WebGL2 renderer on the GPU, with track C's per-species bark and foliage merged in (renderer only; no core change): 54 plates, leaf-on, the same six sources, lone at 60 and 100 (240 wide) and the stand at 100, seeds 1–3, three fresh namers each with its own shuffled folder. [Its note](https://github.com/epabarker/tree-simulation/blob/claude/blind-v2/docs/experiments/2026-11-02-blind-test-v2.md); key and replies in `code/2026-11-02-blind-test-v2/` on that branch. The tally below was recounted here from its key and replies and agrees with its note.

| source (3 plates a cell, one per seed) | lone 60 | lone 100 | stand 100 |
|---|---|---|---|
| beech, the round's rules (branch) | **beech** 3 / 3 / 3 | **beech** 3 / 3 / 3 | lime 3 / **beech** 3 / aspen 2, alder 1 |
| beech, today | lime 3 / **beech** 3 / alder 3 | **beech** 3 / **beech** 3 / poplar 3 | lime 3 / **beech** 3 / alder 3 |
| hornbeam | hornbeam ×3 for each namer | hornbeam ×3 for each namer | beech 3 / oak 3 / hornbeam 3 |
| oak | hawthorn, all 27 plates | | |
| birch | birch, all 27 plates | | |
| silver fir | holly, yew or alder, all 27 plates | | |

(Namers 1 / 2 / 3.)

- **In the garden's renderer the round's lone beech reads as beech:** 18 of 18 lone plates, all three namers, where today's is beech on 9 of 18. The form changes; the bark and foliage are the same in both; so the round's form is worth something once it is drawn as visitors see it.
- **The stand is what fails:** both beeches' stands are named beech by one namer only, on every seed. The others say lime, alder or aspen (no longer birch, as in the dot drawings).
- **The renderer's cues dominate:** every namer gave all three seeds of a cell the same name, birch passes on everything (its white bark), oak reads as hawthorn on all 27 plates and fir as holly or yew. Leaf style and bark colour, not form, decide most names.
- **Against §3:** the same sources drawn in the harness's uniform dots were named almost nothing correctly. The drawing, not the growth model, was most of what the earlier blind tests measured.
- **The plates were drawn with own-crown pruning on** (the branch's beech). §2b's case against it is the garden; whether the lone tree reads as well without it is untested in the renderer.

## 4. What this says for the open decisions

**Decided (the user, 2026-11-02): all three as recommended below.**
- ADR 0043 is rejected and `c5.Tvig` is removed from beech.
- ADRs 0039–0042 are accepted at the repair's values under the resource gate.
- The prototype gate is removed from the core.
- Round 2's brief is [`plans/2026-11-02-beech-round2.md`](../plans/2026-11-02-beech-round2.md).

1. **Own-crown pruning (ADR 0043):** reject it. In the open, the limbs it clears are well lit, so clearing them overrides the measurement (§1). In the garden, it strips any side-shaded beech to a pole with a cap (§2b). Without it, both gates give garden beeches clothed crowns.
2. **The vigour gate's units:** keep the resource gate for now (§2c). The unit-free gate's apparent advantage in the stand was own-crown pruning; without it the two are level in the stand and the unit-free one makes the lone tree too broad. The resource gate's absolute units remain a maintenance risk (ADR 0041) and should be revisited if α, R1's costs or the cell size change.
3. **Round 2:** the hornbeam is not a lead (§3, §3b). The instrument is now the garden's renderer with three namers (§3b); in it the round's lone beech already passes, and what fails is the stand (thin poles under small high crowns, read as lime, alder or aspen) and two decoys that read wrong whatever their form (oak as hawthorn, fir as holly or yew: leaf style and colour). A round 2 on the beech stand, and the oak's and fir's leaf styles in the renderer, would follow the evidence.
