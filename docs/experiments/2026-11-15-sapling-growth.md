# Why do understorey saplings with a carbon surplus not grow? (2026-11-15)

**Ticket:** [#138](https://github.com/epabarker/tree-simulation/issues/138), a side finding of #132's design ([ADR 0068](../decisions/0068-understorey-signal-design.md)). **Exploratory: seeds 1–3, HEAD's garden at 160 cells (`forestParams`), seasons 40–199.** Read-only: a probe example and two scripts; no core code, preset, species or golden changes. Branch `probe/138-sapling-growth`, cut from `3d-port` 7d51c5d.

## Answer

**The reviewer's suspicion holds: the saplings are frozen, not starved. Their surplus is split among the buds in shares below one metamer, and what a bud cannot spend is lost that season.**

- **The surplus is real but small in the units growth is paid in.** A 1–5 m sapling's median surplus N = P − M is 4.9 units for hornbeam (P/M 5.8), and one unit of v is one metamer. P/M is high because M is tiny, not because N is large.
- **C3 spreads it thin.** v_base (0.9·N; the rest is the reserve's s_r) goes to a median 15 live buds by the Borchert–Honda split: 0.27 a bud, the largest bud's 0.70, the top bud's 0.16, against a threshold of 1 (`r4.vCont`; spec §C3.4: "v < 1 → none").
- **Nothing reaches the threshold in most seasons.** 61% of hornbeam sapling-seasons add no metamer (beech 59%, holly 63%, maple 67%); the median count of buds at their threshold is 0 in every species.
- **The unspent resource is discarded.** v_base is computed anew each season, and nothing returns a bud's unspent v to the reserve (the only other writers of `reserve` are R4's release cost). Over all sapling-seasons with a surplus, **64% of the summed surplus sat at buds below their threshold and was lost**; each metamer grown cost 5.5 units of v_base.
- **The reserve cannot bank it either.** It takes s_r = 0.1 of the surplus and is capped at `r1.store`·M = 2·M, which a sapling's small M makes small: it sits at its cap in 40–71% of sapling-seasons by P/M band.
- **It is not peculiar to small saplings.** Trees 5–10 m tall lose more: 79% of their surplus, at 8.7 units a metamer (190 buds sharing a median v_base of 33).

So this is **neither a coding defect nor a calibration.** The code does what spec §C3.4 and [ADR 0004](../decisions/0004-shoot-size.md) say. ADR 0004 accepted that resource a bud cannot use is lost, and named its own revisit: "if R1 (carbon balance) makes the discarded resource matter, e.g. by storing it as reserve." It now matters: that clause is met. **Whether the outcome is realistic is the user's call** (below); the growth it gives is a median 0.05 m a decade for a hornbeam sapling, with none at all in 28% of decades.

## The numbers

`code/2026-11-15-sapling-growth/summary.py runs/sapling-138`: 15,599 sapling tree-seasons (1–5 m), 341 trees.

| species | tree-seasons | P/M | surplus N | v_base | live buds | v_base a bud | largest bud's v | top bud's v | seasons with no growth |
|---|---|---|---|---|---|---|---|---|---|
| hornbeam | 13,253 | 5.84 | 4.92 | 4.43 | 15 | 0.27 | 0.70 | 0.16 | 0.61 |
| maple | 1,734 | 14.78 | 3.46 | 3.11 | 16 | 0.19 | 0.58 | 0.13 | 0.67 |
| holly | 432 | 17.32 | 2.16 | 1.95 | 6 | 0.33 | 0.58 | 0.13 | 0.63 |
| beech | 180 | 3.60 | 5.99 | 5.39 | 35 | 0.12 | 0.47 | 0.07 | 0.59 |

Medians; the threshold is 1.00 for the top bud in every species. Birch and oak have too few saplings to read (< 30 tree-seasons).

By P/M, all species:

| P/M | tree-seasons | no growth | median v_base | largest bud's v, median (P90) | reserve at its cap |
|---|---|---|---|---|---|
| < 1 | 632 | 1.00 | 0.00 | 0.00 (0.00) | 0.00 |
| 1–2 | 813 | 0.99 | 0.14 | 0.05 (0.13) | 0.39 |
| 2–4 | 2,639 | 0.91 | 0.96 | 0.28 (0.59) | 0.40 |
| 4–6 | 3,370 | 0.77 | 3.66 | 0.59 (0.97) | 0.47 |
| ≥ 6 | 8,145 | 0.40 | 8.95 | 0.96 (1.69) | 0.71 |

- **The ticket's sample sits in the 4–6 row:** P/M 4–5, three quarters of seasons without growth.
- **Of the saplings with a surplus that grew nothing** (9,051 tree-seasons), 68% had v_base ≥ 1 and 48% ≥ 2, shared among a median 10 buds: one metamer's worth or more was there and no bud held it.
- **The top bud is not favoured.** It gets less than the largest bud (0.16 against 0.70 for hornbeam): at λ ≈ 0.5 the split follows light, and R5's shade adds at most 0.02 to λ.
- **Height gain over the next 10 seasons, m** (median [P10–P90]; share with none): hornbeam 0.05 [−0.03–0.98], 0.28; beech 0.03 [−0.01–0.37], 0.30; holly 0.01 [−0.01–1.14], 0.40; maple 0.00 [−0.27–0.43], 0.49.

## What it means for the chain

- **#132's re-probe:** suppression rates tuned on this stand are tuned on saplings that cannot convert a surplus into height. [The cohort re-read](2026-11-13-understorey-probe.md) found this is not what limits the ramp (death before release is), and that stands. But release itself is slow for the same reason: a sapling climbs only once its largest bud's share passes 1 (P/M ≥ 6).
- **Plugging the leak is not a small change.** If the median hornbeam sapling's whole v_base reached one bud it would add about 4 metamers, 1 m, a season: fast for suppressed regeneration. The loss is part of what holds the understorey down today, so any change moves the garden's demography (ADR 0063, 0065) and #132's rates.
- **The same loss in 5–10 m trees** (79%) says the stand's growth as a whole leans on it; ADR 0068's "canopy and understorey add the same new shoots per bud" is the same thing seen from the other side.

## For the user to decide

1. **Is "frozen" acceptable as the model's suppressed regeneration?** No source was read for this note; real advance regeneration is described as growing slowly but growing (the ticket's wording), and 28–49% of decades with no height gain reads as too still. That is a judgement, with no measured target in the repository yet.
2. **If not, which rule changes?** Each is a spec change (§C3.4, ADR 0004) and needs its own probe and ADR:
   - **Bank it:** unspent v returns to the reserve (ADR 0004's own suggestion). It needs the reserve's cap and how a reserve is spent on growth looked at, since the cap is 2·M and the reserve today only covers deficits and R4's release.
   - **Carry it at the bud:** a bud keeps its unspent v until it reaches 1. Local, but it is new per-bud state in the checkpoint.
   - **Concentrate it:** stronger apical control in shade (R5's δλ), so the leader's share passes 1. A calibration of an existing knob, the cheapest to probe, and it does not stop the loss at the other buds.
3. **Or leave it,** record ADR 0004's revisit as considered, and close #138 as "as specified".

## Method

- **The probe** `rust/core/examples/sapling_probe.rs`: replays the params with `World::step` and, after each season from 40, writes a row per live tree 1–10 m tall: P, M, the reserve and its cap, v_base, and the buds' v (sum, largest, the top bud's), each bud's threshold from `r4::growth_threshold` with its node's shade, the buds at threshold, the v at buds below it, and the metamers born that season.
- **A caveat on the bud readings:** they are read after the season, so a bud that grew has been replaced and its v is not counted. For a tree that grew nothing the buds' v sums to v_base; for one that grew, `belowV` is still exactly the v left unspent at the buds that did not.
- **Runs:** `forestParams(160, seed)`, seeds 1–3, 200 seasons, about 75 s on 3 simulators. Seed 3 carries most of the saplings (14,728 of 19,659 rows).

## Reproduce

```
node docs/experiments/code/2026-11-15-sapling-growth/params.ts
cargo run --release --example sapling_probe -- runs/sapling-138/garden160-s1.json 200 40 4 40 > runs/sapling-138/s1.csv   # and s2, s3
python3 -I docs/experiments/code/2026-11-15-sapling-growth/summary.py runs/sapling-138
```

## Limits

Three seeds, one width, one build; hornbeam dominates the sample, and one garden most of it. No reference growth rate for suppressed saplings was looked up. The canopy trees (> 10 m) were not read. None of the three remedies was tried.
