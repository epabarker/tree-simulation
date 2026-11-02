# The blind naming test, v3: one scale (round 2's baseline, 2026-11-02)

Round 2's measure ([brief](../plans/2026-11-02-beech-round2.md), "The measure" and Part 1's
baseline): [v2](https://github.com/epabarker/tree-simulation/blob/claude/blind-v2/docs/experiments/2026-11-02-blind-test-v2.md)'s
protocol, with every plate drawn at one scale. A measurement only: no species, preset or core
change. Seeds 1–3 are development seeds; any claim waits for fresh namers at seeds 4–6.

**In one line:** at one scale, the accepted beech's lone tree still passes without own-crown pruning
(17 of 18), but both beech stands are now named silver birch on all 18 plates. Oak leaves hawthorn
(27 → 3 first guesses), but the lone oak becomes hazel or goat willow for its "many brown stems
fanning from ground level", while the oak stand is named oak 6 of 9. Silver fir is now a conifer
(Norway spruce, 12 of 27) but never fir. Hornbeam and birch pass. The addendum's `clearBole` (no
rosettes on a trunk below its limb crown base) removes the "dark bands" the namers named, but the
stand stays silver birch (8 of 9) for its pale, slender, wavy stems with small high crowns.

![Contact sheet](figures/2026-11-02-blind-test-v3-sheet.jpg)

_Rows: source; columns: lone 60, lone 100, stand 100, seeds 1–3. Each panel is the plate the namers
saw, every one shrunk by the same factor, so the sheet keeps the one scale: a lone plate is the
240-cell field, a stand plate one lap of the 84-cell ring, and the plate's height is the world's 200
cells (50 m)._

## Method

- **Build:** `claude/foliage` with `origin/3d-port` merged in (fae02a4: PR #40's accepted beech),
  plus the lab's `&frame=height` (add5db6). Against v2's build (`claude/blind-v2`, 2b6e6a4) the core
  differs in comments only, the hornbeam, oak, birch and fir entries are identical, and beech's entry
  differs only in `c5.Tvig` (0.25 in v2, absent now: own-crown pruning is rejected, ADR 0043). So
  today's beech and the four decoys are the same trees as in v2, seed for seed, and for them the
  scale is the only change.
- **One scale** (`&frame=height`, `Scene.frame = "height"`): the camera is fixed by the world's
  height and centred on the world, never fitted to the trees. It is the garden's world frame with
  its tallest crown at the world's top: 200 × 1.05 cells and a leaf fill the plate between the
  ground margin and the headroom, as on the garden's phone plate once the woods reach their top.
  Every trial's world is 200 cells high, so every plate is drawn at 2.7704 px a cell (a cell is
  0.25 m: 0.090 m a pixel). Off by default; goldens unchanged.
- **Renders** ([`shots.mjs`](code/2026-11-02-blind-test-v3/shots.mjs)): v2's, with the option on,
  and two changes to make the scale hold:
  - The lab's chart row is pinned so every trial's canvas is 1120 × 654. The charts grow with a
    stand's 12 trees, and they shrank the stand's canvas to 415 px and its scale to 1.64 px a cell
    in a first try.
  - Each shot is cropped to the world's width: the lone tree's field is 666 × 654 px, the stand's lap
    234 × 654.

  Headless Chromium 1248 on the laptop's GPU, 23–66 s a render, none timed out. All 54 plates logged
  2.7704 px a cell.
- **Sources and trials:** v2's. The accepted beech (rust/presets.json's entry, no `c5.Tvig`);
  today's beech (that entry with `r2.relay 0`, `forkAt 0`, `vigourShare 0`, `lightSetPoint null`,
  `c5.Tvig 0`, `levels.0.curve 0`); hornbeam, oak, birch, silver fir. The lone tree in a 240-wide
  world at 60 and 100; the closed stand at 100 (84 wide, periodic, 12 trees in three rows). Seeds 1–3.
- **Blinding** ([`shuffle.py`](code/2026-11-02-blind-test-v3/shuffle.py)): one folder per namer
  outside the repo (`~/blind-plates-v3/namer-N`), each its own shuffle, seeded apart from v2's. The
  key, species named: [`key.json`](code/2026-11-02-blind-test-v3/key.json).
- **Namers:** three fresh general-purpose sub-agents of this session, run in parallel. Each was
  given only its folder and [the prompt](code/2026-11-02-blind-test-v3/prompt.md): blind-test.md's
  question verbatim, v2's reply format and its sentence about several trees, and one added sentence,
  "All the images are drawn at the same scale." Without it a namer has no reason to compare sizes
  across plates; on v2's fitted plates it would have been false. Replies verbatim:
  [`namer-1.md`](code/2026-11-02-blind-test-v3/namer-1.md),
  [`namer-2.md`](code/2026-11-02-blind-test-v3/namer-2.md),
  [`namer-3.md`](code/2026-11-02-blind-test-v3/namer-3.md).
- **Scoring** ([`tally.py`](code/2026-11-02-blind-test-v3/tally.py), output
  [`tally.md`](code/2026-11-02-blind-test-v3/tally.md)): v2's normalisation and pass rule,
  unchanged, on first guesses. Per namer, a source passes when it is named on ≥ 2 of 3 seeds in lone
  60, lone 100 and stand 100. Pooled, a seed counts when ≥ 2 of 3 namers name it. tally.py reads v2's
  key and replies (from `claude/blind-v2`) for the tables beside v2.

## Results

### Beside v2: first guesses naming the source, of 9 per trial (v2 → v3)

| source | lone 60 | lone 100 | stand 100 | namers passing, v2 → v3 | pooled, v2 → v3 |
|---|---|---|---|---|---|
| beech (v2: with `Tvig`; v3: accepted) | 9 → 9 | 9 → 8 | 3 → 0 | 1 → 0 of 3 | fail → fail (stand) |
| beech (today) | 3 → 1 | 6 → 0 | 3 → 0 | 1 → 0 of 3 | fail → fail |
| hornbeam | 9 → 8 | 9 → 9 | 3 → 6 | 1 → 2 of 3 | fail → **pass** |
| oak | 0 → 0 | 0 → 0 | 0 → 6 | 0 → 0 of 3 | fail → fail |
| birch | 9 → 9 | 9 → 9 | 9 → 9 | 3 → 3 of 3 | pass → pass |
| silver fir | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 of 3 | fail → fail |

### Per namer: seeds named (of 3), first guess (v3)

| source | n1 lone60 | n1 lone100 | n1 stand | n2 lone60 | n2 lone100 | n2 stand | n3 lone60 | n3 lone100 | n3 stand | pass (n1, n2, n3) |
|---|---|---|---|---|---|---|---|---|---|---|
| beech (accepted) | 3 | 2 | 0 | 3 | 3 | 0 | 3 | 3 | 0 | fail, fail, fail |
| beech (today) | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | fail, fail, fail |
| hornbeam | 2 | 3 | 3 | 3 | 3 | 0 | 3 | 3 | 3 | **pass**, fail, **pass** |
| oak | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 3 | fail, fail, fail |
| birch | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | **pass**, **pass**, **pass** |
| silver fir | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | fail, fail, fail |

### What each was called, first guesses of 9 (v2 | v3)

| source | trial | v2 | v3 |
|---|---|---|---|
| beech | lone 60 | beech 9 | beech 9 |
| beech | lone 100 | beech 9 | beech 8, goat willow 1 |
| beech | stand 100 | lime 3, beech 3, aspen 2, alder 1 | **silver birch 9** |
| beech (today) | lone 60 | lime 3, beech 3, alder 3 | alder 6, larch 2, beech 1 |
| beech (today) | lone 100 | beech 6, poplar 3 | Norway spruce 3, larch 3, "no close match (nearest alder)" 3 |
| beech (today) | stand 100 | lime 3, beech 3, alder 3 | **silver birch 9** |
| hornbeam | lone 60 | hornbeam 9 | hornbeam 8, field maple 1 |
| hornbeam | lone 100 | hornbeam 9 | hornbeam 9 |
| hornbeam | stand 100 | beech 3, oak 3, hornbeam 3 | hornbeam 6, oak 3 |
| oak | lone 60 | hawthorn 9 | hazel 6, goat willow 3 |
| oak | lone 100 | hawthorn 9 | goat willow 5, hazel 3, beech 1 |
| oak | stand 100 | hawthorn 9 | oak 6, hawthorn 3 |
| birch | all three | birch 27 | birch 27 |
| silver fir | lone 60 | holly 6, alder 3 | holly 9 |
| silver fir | lone 100 | holly 6, yew 3 | Norway spruce 6, holly 3 |
| silver fir | stand 100 | alder 3, yew 3, holly 3 | Norway spruce 6, alder 3 |

### Agreement

- Pairs agree on 34, 39 and 33 of 54 plates; all three agree on 28. Fleiss' kappa 0.60 (observed
  0.65, chance 0.14; 13 names), against v2's 0.55.
- A namer gave the same first guess on all three seeds of a cell in 50 of 54 namer × cell
  combinations (v2: 53 of 54; v2's note says 54, but n3 called the branch beech's stand aspen twice
  and alder once). The seeds still carry little information: each cell is close to one judgment per
  namer.
- **A probable transposition:** namer 1's rows 29 (oak, lone 100, seed 1: "beech … a wide, spreading,
  domed crown … on smooth grey limbs") and 30 (accepted beech, lone 100, seed 3: "goat willow … an
  open vase of dark-brown limbs from a short stem") each describe the other plate. They are scored as
  given. Swapped, the beech's lone 100 would be 9 of 9 and oak's single "beech" would be goat willow.
  No pass changes either way.

## Reading (measurement, not a decision)

1. **The accepted beech's lone tree still passes without own-crown pruning.** It is named beech on
   9 of 9 plates at 60 and 8 of 9 at 100 (9 of 9 with namer 1's likely swap undone). Every namer names
   it on ≥ 2 of 3 seeds in both lone trials: "a broad, dense dome of horizontal foliage tiers sits on
   smooth grey limbs that start low" (n3). The full pass fails on the stand alone. One scale also
   separates the builds more sharply than v2 did: today's narrow, tiered column is now a conifer
   (Norway spruce, larch) or alder, beech on 1 of 18.
2. **The beech stand reads as silver birch at one scale, both builds, all 18 plates.** That is the
   earlier tests' signal (review §9.4), back now that the stand is drawn at its true size. The
   namers name the marks on the boles:
   - "Whitish slender stems with dark lenticel-like marks hold small high crowns" (n1);
   - "Pale, slender, scarred trunks hold pointed light-green crowns high above a bare understorey" (n2);
   - "Slender white stems ringed with dark bands carry small, light crowns only at the top" (n3).

   At 2.77 px a cell the trunk's R6 rosettes draw as short dark dashes on a pale stem: v2's "leafy
   sprouts" (lime) have become birch's dark bands. The addendum below tests that directly.
3. **One scale alone moves oak off hawthorn, but not onto oak where it stands alone.** Hawthorn falls
   from 27 first guesses to 3 (all namer 2's, on the stand). The lone oak is now a multi-stemmed shrub:
   - "Many straight brown stems fan from ground level into a rounded bush" (n3, hazel);
   - "A rounded clump of brown stems radiating from a single base" (n2, hazel);
   - "Dark-brown limbs splay upward from a very short base into a rounded, bushy vase" (n1, goat
     willow).

   These trees are drawn 27–28 m tall at 60 and 43–44 m at 100, taller than the lone beech (22–25 m,
   then 29–34 m; crown tops measured on the plates), yet they are named hazel and goat willow, shrubs
   and small trees of about 10 m at most. The namers decide on the scaffold, the low vase from the ground, not on the
   size. The stand, whose trees have clear dark boles under the zigzag crowns, is named oak 6 of 9:
   "dark brown, crooked, zigzagging limbs make dense ascending crowns in a stand" (n1). So the bark's
   darkness and the zigzag read as oak once the scale is true and the scaffold sits on a bole. The
   lone tree's failure is its form, which the brief says goes to the user as a finding, not a fit.
   Oak's bark, leaf and twig changes (Part 1, step 1) have not been made, so this is not yet the
   brief's stop condition.
4. **Silver fir becomes a conifer, but not fir.** At 100 years, lone or in the stand, it is Norway
   spruce on 12 of 18 plates ("a very tall, narrow, dark-green spire with a tufted tip on a single
   leader"); at 60 it is still holly, 9 of 9 ("a dense, dark blue-green cone that looks evergreen").
   None names fir. The height of the spire is a cue the fitted plates hid.
5. **Hornbeam does not regress:** lone 17 of 18, and the stand rises from 3 to 6 of 9 ("smooth grey
   clear stems twist into sinuous limbs under a flat, parasol-like shared canopy", n1). It now
   passes pooled. **Birch** is named on all 27 plates, as in v2.

## The addendum: `clearBole` (no rosettes on a trunk below its limb crown base)

Track E relayed the user's choice of "both" for the stand's leafy boles: the growth-side fix
(`r6.lifespan`, ADR 0044, proposed; measured in the cloud, not used here) and a renderer rule.
The rule is drawn here with the same protocol, after the baseline.

- **The rule** (07de9dd; `ViewOptions.clearBole`, the lab's `&clearBole`, `garden.html?clearBole`):
  the leaf layout draws no short-shoot rosette on an order-0 metamer whose base is below its tree's
  `limbBase`. The snapshot already carries each metamer's `order` and `y0` and each tree's `limbBase`
  (`metrics`), so there is no core change. It is a drawing choice: the model still counts that leaf
  in its light ([stand diagnosis](https://github.com/epabarker/tree-simulation/blob/claude/c1-calibration-ustbkz/docs/experiments/2026-11-02-beech-round2-stand-diagnosis.md):
  97% of the leaf below the stand's limb crown base is on short shoots, 55–63% on the trunk's own
  nodes). It is a global view knob beside I3's `leafOpacity` and `leafMinPx`, not a species style,
  because a style field would turn it on by default for beech. Off by default; goldens unchanged;
  a unit test checks that exactly two cards go per such short shoot and nothing else changes.
- **Plates:** the accepted beech's nine (lone 60, lone 100, stand 100, seeds 1–3) re-drawn with
  `&clearBole`, at the same one scale. The stand's boles lose their dark dashes (3.0–3.8% of a
  stand plate's pixels change). The lone trees show no visible change at this size: their trunks
  carry no rosettes below the crown base, as the diagnosis found (0% on order-0 nodes). Their
  0.2–5% of changed pixels is the sway between frames.

![Beech, baseline and clearBole](figures/2026-11-02-blind-test-v3-clearbole.jpg)

- **Naming:** a second full set of 54 plates, the baseline's 45 non-beech plates with the nine
  `clearBole` beech plates in place of the accepted beech's. Three fresh namers, each with its own
  shuffle (`~/blind-plates-v3b/namer-N`), the same prompt. Key and replies in
  [`clearbole/`](code/2026-11-02-blind-test-v3/clearbole/).

### Addendum results: the clearBole set beside the baseline (first guesses of 9)

| source | lone 60 | lone 100 | stand 100 | namers passing | pooled |
|---|---|---|---|---|---|
| **beech, accepted → with `clearBole`** | 9 → 9 | 8 → 9 | 0 → 1 | 0 → 0 of 3 | fail → fail (stand) |
| beech (today), same plates | 1 → 3 | 0 → 6 | 0 → 0 | 0 → 0 | fail → fail |
| hornbeam, same plates | 8 → 9 | 9 → 9 | 6 → 6 | 2 → 2 | pass → pass |
| oak, same plates | 0 → 0 | 0 → 0 | 6 → 6 | 0 → 0 | fail → fail |
| birch, same plates | 9 → 9 | 9 → 9 | 9 → 9 | 3 → 3 | pass → pass |
| silver fir, same plates | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | fail → fail |

Agreement: Fleiss' kappa 0.60 (observed 0.67, chance 0.16); a namer named all three seeds of a cell
alike in 52 of 54 namer × cell combinations.

**The bands go, the birch stays.** With `clearBole` the stand is silver birch on 8 of 9 plates and
beech on 1. The dark marks drop out of the descriptions:
- "Thin, smooth, pale, wavy stems carry compact light-green crowns at the very top" (n1, birch);
- "Slender, wavy, pale trunks bare to small high crowns, though with fewer dark bands than a typical
  birch" (n2, birch);
- "Smooth pale grey poles whose forked grey branches spread into broad tops" (n3, beech, seed 2).

So the trunk's rosettes were the cue the baseline's namers named first, but not the whole of it.
What is left is the stems' pale tone, their slenderness and waviness, and a small crown held only at
the top. The diagnosis measured a limb crown ratio of 0.26 and bole sweeps of about 2%. Those cues
belong to bark colour and to form. Beech's bark token is `#a9a8a0`, a light grey, and the stand's
drawn stems measure about (165, 164, 156) against a lower sky near luminance 234, so they read pale
(track C). The form side is Part 2's wavy boles and crown base. They are leads, not findings.

**The other 45 plates replicate the baseline with fresh namers.**
- Hornbeam, oak, birch and fir are named nearly as before. The oak stand is oak 6 of 9 again. The lone
  oak is goat willow and hazel, with hawthorn 3 from one namer at 100. The fir is holly or Norway
  spruce, never fir.
- Today's beech is the exception: beech 3 of 9 at 60 and 6 of 9 at 100, against 1 and 0. Its narrow,
  tiered column is ambiguous, beech to one namer and a conifer to another.

The spread between sets of namers on one source is as large as some of the effects measured here.
That is a reason for fresh namers on the judging seeds, and a sign that three namers is a thin
sample.

## Caveats

- **The namers are three runs of one model,** not three people, and each answers all 54 plates in
  one pass, which may make it name similar plates alike. They are sub-agents of this session. The
  harness may give sub-agents the repo's CLAUDE.md, which names the project's species; v2 had the
  same exposure. Their answers range well outside that list (hazel, Norway spruce, larch, alder, field
  maple), but the exposure cannot be ruled out.
- **The prompt's added sentence** ("All the images are drawn at the same scale") is the one change
  to what the namers were told. Scale and that sentence are not separated here.
- **The scale is the garden's once the woods reach their top.** A young garden whose tallest crown
  is under about 60 cells is drawn larger on the phone (its frame's least height is half the
  130-cell plate). The world's height is 200 for every trial, so the plates share one scale exactly.
- **The question asks for a British species,** which may still keep the fir from being named.
- **Not done:** leaf-off plates, the judging seeds 4–6, and the user's look on the phone, which stays
  the final gate. Oak's and fir's leaf styles are untouched, as the brief asks.

## Reproduce

```
git worktree add ../tree-simulation-foliage claude/foliage && cd ../tree-simulation-foliage
npm ci && npm run build:wasm && npm run dev -- --port 5181
# playwright-core 1.64.1 in any scratch folder; PW_FROM points node's require at it
PW_FROM=<scratch>/pw/x.js node docs/experiments/code/2026-11-02-blind-test-v3/shots.mjs http://localhost:5181/ <renders> 3
python3 docs/experiments/code/2026-11-02-blind-test-v3/shuffle.py <renders> ~/blind-plates-v3
# v2's key.json and namer-N.md: git show origin/claude/blind-v2:docs/experiments/code/2026-11-02-blind-test-v2/<file>
python3 docs/experiments/code/2026-11-02-blind-test-v3/tally.py docs/experiments/code/2026-11-02-blind-test-v3 <v2-dir>
uv run --project analysis python docs/experiments/code/2026-11-02-blind-test-v3/sheet.py <renders> docs/experiments/figures/2026-11-02-blind-test-v3-sheet.jpg
# the addendum
CLEARBOLE=1 PW_FROM=<scratch>/pw/x.js node docs/experiments/code/2026-11-02-blind-test-v3/shots.mjs http://localhost:5181/ <renders-clearbole> 3
# <set2> = <renders>/*.png with <renders-clearbole>/beech-*.png copied over them
python3 docs/experiments/code/2026-11-02-blind-test-v3/shuffle.py <set2> ~/blind-plates-v3b clearbole "beech (accepted build, clearBole)"
python3 docs/experiments/code/2026-11-02-blind-test-v3/tally.py docs/experiments/code/2026-11-02-blind-test-v3/clearbole docs/experiments/code/2026-11-02-blind-test-v3
```

The trees are deterministic in the core (the seeds and patches fix them); the plates' pixels depend
on the GPU and the moment of the shot. The namers' replies are not reproducible.
