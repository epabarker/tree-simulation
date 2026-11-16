# The seed-supply probe: hornbeam's cost per seed against the cap (2026-11-16)

**Ticket:** [#137](https://github.com/epabarker/tree-simulation/issues/137) (ADR 0068, decision 4). Spec §O4 (seed production, establishment, the cap), §O4.11, §6, §10; ADRs 0063, 0065, 0068.

**Question.** Does cutting hornbeam's seed supply (a flora change, no new state) shorten the garden's seasons at its compute cap (`maxTrees`), without losing #122's canopy gates, the canopy's trees, or hornbeam from the canopy, and without handing the garden to another species? If not, #137's other option, §O4.11's seedling stubs outside `maxTrees`, is next.

**Script:** [`cli/seed-supply-probe.ts`](../../cli/seed-supply-probe.ts) (`node cli/seed-supply-probe.ts --seeds 1-3 -j 6` for the pilot, then `--arms head,<arms>` for seeds 1–20; resumable, so the full run reuses the pilot's runs).

## The knob

O4 turns R1's reproductive pool into ⌊pool / `o4.cSeed`⌋ seeds a season (`rust/core/src/principles/o4.rs`): **`cSeed` is the carbon cost of one seed, so supply × f is `cSeed` ÷ f.** A cut raises it. It is a species field (`flora.ts`: hornbeam 5), so each arm is a species patch (`patchSpecies`), not a world patch. Supply × f is not an exact seed count × f: the pool carries its remainder over, and the run's trees differ once the supply does.

## Bars, fixed before the runs

Written and committed before any run of this note. Nothing below this section changes them.

### Arms
- **head:** `forestParams(width, seed)` at this commit (r6's garden; `carbon` signal, no `topLight`).
- **h2, h4, h10:** hornbeam's supply ½, ¼, 1/10: `species.hornbeam.o4.cSeed` 10, 20, 50.
- **h60:** hornbeam's `cSeed` 300, d1's seed part alone (the acceptance note's d1 also had `topLight` at θ 0.15). A bracket, beyond the three asked for, so the probe can say whether any supply cut reaches the cap.
- **all4:** every garden species' supply ¼ (each species' `cSeed` × 4). A contrast, not a candidate: it says whether the cap is hornbeam's or the stand's.
- No other change. Widths 160 and 66, 300 seasons, natively, metamers kept at seasons 100, 200 and 300 (`--snapshots`) for DBH.
- **Pilot:** seeds 1–3, every arm (36 runs). **Then seeds 1–20** for head and every arm whose pilot looks like passing: gates 3 of 3 at both widths, cap seasons below head's in at least 2 of 3 runs at each width, and hornbeam in the canopy in at least 5 of 9 desktop frames. The bars are judged only on seeds 1–20. At most 6 simulators (the machine is shared).

### Definitions (as the understorey probe's)
- **A canopy tree:** stand.rs's (ADR 0065): drawn (≥ 1.3 m) and strictly over half the top height (stand.csv `topHeight100`) that season.
- **Seasons at the cap:** run.json `meta.capSeasons`.
- **Per hectare:** `Math.round(n / ha)`, ha = width × 64 × 0.0625 m² / 10⁴.
- **The bank:** live stems under 1.3 m at a frame. **DBH, the ≥ 7 cm band and its canopy share:** ADR 0068 decision 3, DBH by `cli/allometry.ts`.
- **A recruit:** a tree first seen after the planting season; **reaching 1.3 m:** a recruit that is ever drawn.
- **Frames:** seasons 100, 200 and 300 × 20 seeds = 60 per arm × width.

### Gates (#122; each ≥ 18 of seeds 1–20, per arm × width)
1. A canopy tree in every season after 50 (stand.csv `canopy` ≥ 1, seasons 51–300).
2. At 66 cells, a canopy tree in every season from 100.
3. A garden checkpoint (`forestParams(66, 1)`, 30 seasons) saved by this build loads, takes the arm's species patch by `setParams` (hornbeam's `cSeed` read back), and grows on 10 seasons alike twice; the frozen fixtures (v2, v3, garden 0.14.0) load.
4. Lone hornbeam (`loneTreeParams`), seeds 1–3, season 100, under the arm's patch: state hashes equal head's (O4 is off for the lone tree, so this holds by construction; it is the check).

### Adoption bars
An arm passes only if it passes every gate and all four:
1. **Seasons at the cap below head's** (the same seed and width) in **≥ 11 of 20** runs, **at each width**.
2. **Canopy trees/ha not below head's** at 160 cells: the median over runs of each run's median canopy trees/ha over seasons 100–300, at least head's.
3. **Hornbeam stays in the canopy:** a hornbeam canopy tree in **≥ 30 of 60** desktop frames.
4. **No hand-over:** desktop frames in which one species other than hornbeam holds over half the canopy trees, **at most head's + 6**.

If more than one arm passes, the recommendation is the one with the lowest median cap seasons at 160 cells. A pass recommends adoption; adopting it is the user's call, a new ADR and a flora change.

### Reported, not gated
At both widths: median cap seasons and cap-free runs; the bank (median per frame, by species); stems ≥ 7 cm per ha and their canopy share; drawn stems per ha; hornbeam's share of the canopy trees, of the recruits and of the recruits reaching 1.3 m; seeds made per run (all and hornbeam's); wall time.

### Regressions
`forestRegeneration` must not move. Its world (`forest`) has no species table, so a species patch cannot reach it, and the probe changes no default: `npm run regressions` at the end confirms it.

### Expected
At the cap 1,200–2,200 seeds arrive a season and 1–6 trees die (ADR 0068's Context), so any supply that still lands more establishing seeds than deaths keeps the garden at the cap. Hornbeam makes most of them, but beech (cSeed 10) and the rest make hundreds too. Expected: h2–h10 move cap seasons little; h60 and all4 move them more, h60 at the risk of bars 3 and 4.

## Pilot (seeds 1–3, dec3526)

36 runs in 20.9 min on 6 simulators, clean ([`pilot.txt`](code/2026-11-16-seed-supply-probe/pilot.txt)). By the pilot rule h4, h10, h60 and all4 went on to seeds 1–20; h2 did not (its cap seasons were below head's in 0 of 3 runs at both widths: 230 against 230 on the desktop).

## Results (seeds 1–20, dec3526)

**Every arm run to 20 seeds passes the pre-registered bars; by the rule, h60 is the pick.** But only h60 moves the cap by much, and no run of any arm is cap-free. The full output is [`output.txt`](code/2026-11-16-seed-supply-probe/output.txt), the bars [`bars.json`](code/2026-11-16-seed-supply-probe/bars.json). 200 runs (the pilot's 36 reused) in 90.6 min on 6 simulators.

### Gates and bars

| arm | gate 1, 160 / 66 | gate 2, 66 | 1. cap below head, 160 / 66 (of 20) | 2. canopy trees/ha, 160 | 3. hornbeam in canopy (of 60) | 4. other species > ½ canopy (of 60) |
|---|---|---|---|---|---|---|
| head | 20 / 20 | 20 | – | 109 | 60 | 4 |
| h4 | 20 / 19 | 19 | 15 / 11 ✓ | 109 ✓ | 60 ✓ | 4 ✓ |
| h10 | 20 / 20 | 20 | 16 / 15 ✓ | 109 ✓ | 60 ✓ | 3 ✓ |
| **h60** | 20 / 19 | 19 | **18 / 19** ✓ | 109 ✓ | 60 ✓ | 3 ✓ |
| all4 (contrast) | 20 / 20 | 20 | 16 / 16 ✓ | 117 ✓ | 60 ✓ | 1 ✓ |

Gates 3 and 4 pass in every arm, the pilot's h2 included: the checkpoint test reads hornbeam's `cSeed` back, the v2, v3 and garden 0.14.0 fixtures load, and lone hornbeam, seeds 1–3, keeps head's hashes (859812b6, 66b88c89, f4a96f3e; the acceptance note's).

### The cap

| arm | cap seasons, median 160 / 66 | pooled over 20 runs, 160 / 66 | paired change per run, median 160 / 66 | cap-free runs |
|---|---|---|---|---|
| head | 235 / 186.5 | 4,608 / 3,655 | – | 0 |
| h4 | 233.5 / 182.5 | 4,571 / 3,637 | −2 / −3 | 0 |
| h10 | 229 / 168.5 | 4,548 / 3,374 | −4 / −20 | 0 |
| h60 | **206 / 78.5** | **3,854 / 1,649** | **−31 / −96** | 0 |
| all4 | 221.5 / 186 | 4,274 / 3,402 | −11 / −13 | 0 |

- **Bar 1 is weaker than its intent.** It counts runs below head, not by how much, so h4's 1–6 seasons on the desktop pass it. Only h60 moves the cap by a visible amount: a sixth fewer seasons on the desktop, over half fewer on the phone.
- **The cap is fed by more than hornbeam.** At h60 hornbeam makes 5,947 seeds a desktop run against head's 336,481, but the garden still makes 35,312, mostly beech, maple and birch. Recruits fall only from 1,016 to 977 a run. Any seed that lands on lit, free ground refills a death slot, and the slots are few.

### Reported (160 cells; 66 in the output)

| arm | bank, median per frame (hornbeam, beech) | ≥ 7 cm/ha, median; canopy share | drawn/ha | seeds/run (hornbeam) | recruits/run (hornbeam's share) | reaching 1.3 m/run (hornbeam's share) | hornbeam's share of canopy trees, median |
|---|---|---|---|---|---|---|---|
| head | 68 (57, 20) | 266; 0.50 | 1,297 | 364,503 (336,481) | 1,016 (0.38) | 162 (0.69) | 0.33 |
| h4 | 65.5 (56, 20) | 266; 0.50 | 1,407 | 117,897 (88,479) | 1,010 (0.38) | 160 (0.68) | 0.33 |
| h10 | 60.5 (56, 19) | 281; 0.50 | 1,477 | 62,805 (34,220) | 962 (0.39) | 165 (0.67) | 0.33 |
| h60 | 60.5 (46, 23) | 274; 0.50 | 1,383 | 35,312 (5,947) | 977 (0.30) | 172 (0.58) | 0.33 |
| all4 | 46 (65, 8) | 281; 0.50 | 1,454 | 111,773 (104,279) | 713 (0.67) | 155 (0.82) | 0.33 |

(The bank's species columns are means per frame, its total a median, so they need not add up.)

- **Hornbeam keeps the canopy.** Every arm has a hornbeam canopy tree in all 60 desktop frames; its canopy tree-frames are 202–209 against head's 205.
- **h60 shifts recruitment towards beech, not over to it.** Beech's recruits reaching 1.3 m rise from 461 to 726 over 20 desktop runs, maple's from 386 to 446 and birch's from 37 to 106. Hornbeam's share of them falls from 0.69 to 0.58. Beech's canopy tree-frames stay at 86 against 83.
- **all4 is the other way round:** cutting every species at once leaves hornbeam's lead and makes it larger (0.82 of the recruits reaching 1.3 m). It lowers the bank (46) but barely the cap.
- **The understorey still floods.** Drawn stems per ha (1,383–1,477) are no lower than head's (1,297) in any arm. The supply does not reach the flood, which is #132's.
- The phone at h60: bank median 31 (head 55), drawn 227/ha (head 322). Gate 1 is 19 of 20 at h60 and h4 on the phone: seed 15 has no canopy tree in season 273 alone, in both arms.

### Regressions
`npm run regressions` at dec3526: phoneSeed3 and forestRegeneration unchanged. No default changed, so neither could move; under adoption forestRegeneration still cannot (its world has no species table).

## Conclusion

- **h60 (hornbeam's `cSeed` 300, its supply × 1/60) passes every pre-registered gate and bar and is the rule's pick.** It is d1's seed part without `topLight`. It cuts the desktop's cap seasons by a median 31 a run (235 → 206) and the phone's by 96 (186.5 → 78.5), and it keeps hornbeam in every desktop canopy frame and the canopy's trees per hectare.
- **The milder cuts asked for (½, ¼, 1/10) pass the bars but barely move the cap** (−2 to −20 seasons a run). h2 did not pass the pilot.
- **No arm ends the time at the cap.** No run of 100 is cap-free, and the desktop still spends over two thirds of its seasons there at h60, because the other species' seeds refill the slots. Supply can shorten the cap; it cannot remove it. That is the representation's job: spec §O4.11's stubs, which #137 lists as the other option.
- **Recommendation:** adopt h60 only if the user wants the phone's shorter cap now; the draft is [ADR 0070](../decisions/0070-hornbeam-seed-supply.md). Either way, the stubs are next for #137's question, and the supply's realism (300 carbon units a nutlet) is not checked against a seed-rain source here.

### What adoption needs
- `flora.ts`: hornbeam `o4.cSeed` 5 → 300 (and `flora-fitted.ts` if the fitted hornbeam is to match), then `node cli/export-presets.ts` for `rust/presets.json`.
- `npm run golden:update` for every golden whose world grows hornbeam with O4 on, and the reason in the devlog; `npm run regressions` (phoneSeed3 may move; forestRegeneration cannot, its world has no species table).
- The feature playbook's garden page and the acceptance figures re-read; the phone checked in the browser.
- A shipped garden checkpoint keeps loading (params are not in the checkpoint's layout; gate 3).
