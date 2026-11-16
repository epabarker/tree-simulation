# #138's sapling-release probe: concentrate the unspent v, or bank it (2026-11-16)

_EXPLORATORY: seeds 1–3, nothing adopted on these runs. Issue [#138](https://github.com/epabarker/tree-simulation/issues/138); the trace is [2026-11-15-sapling-growth.md](2026-11-15-sapling-growth.md). Spec §C3.4, §R1.4, §R5; ADR 0004 (its revisit clause), ADR 0068. Everything down to "Cost" was committed before any arm ran. The results are under "Result" below._

## Question

The trace found HEAD's understorey saplings frozen, not starved: C3 splits a 1–5 m sapling's surplus over a median 15 buds, each below its threshold of v ≥ 1 (spec §C3.4, "v < 1 → none"), and the unspent v is lost (ADR 0004). R1's reserve takes only s_r = 0.1 of the surplus and is capped at `store`·M = 2·M. **Does either remedy make the saplings grow, without moving the lone trees or costing the garden its canopy?**

- **Concentrate it:** stronger apical control in shade (R5's δλ, `r5.dLambda`, an existing knob), so the leader's share passes 1.
- **Bank it:** a new rule (ADR 0004's own revisit, "storing it as reserve").

## The bank rule (`r1.unspent: "banked"`, built off by default)

- **At GROW:** the v of every live bud that grew no shoot from it this season (below its threshold, refused by the stochastic break, barred by the extent probe, too little for one metamer when `r4.vCont` < 1, or released by R4's light trigger, which the reserve pays for) is added to the reserve, up to its cap `store`·M on this season's M.
- **At CARBON, in a surplus season (N > 0):** after s_r·N is banked as today, the reserve above `keep`·M is moved into v_base, which C3 then splits as usual. A deficit season draws nothing into growth: the buffer of `keep` seasons of M is what covers it, and the reserve covers deficits as before.
- **Not in the seed's first season:** the draw skips age 0, so `reserve0` stays the seedling's store (ADR 0028).
- **Meaningless under `c3.mode` "none"** (every lit bud gets v = 1 whatever the carbon): not used there.
- **Not banked:** v above the shoot cap (`c1.maxMetamersPerShoot`, ADR 0004's other loss) stays lost; the trace did not find it to matter for saplings.
- **Params:** `r1.unspent` ("lost", absent, the default; "banked"), `r1.keep` (seasons of M held back; absent: 1). No new checkpoint state (the reserve is already saved), no RNG purpose.
- **Off is the build:** goldens, regressions and lone hashes must be unchanged at the defaults.

**Review before the runs:** `spec-reviewer` (run on opus: its Fable pin was rate-limited) found no divergences and verified the goldens; its two questions became the age-0 and vCont < 1 clauses above.

**Seams tested** (`rust/core/src/principles/r1.rs`'s tests): `carbon_balance` (no draw by default; the reserve above keep·M funds v_base in a surplus season; nothing is drawn in a deficit) and `bank_unspent` / `grow_buds` (a bud below its threshold banks its v, one that grows spends it, the bank stops at the cap).

**The spec's room:** §R1.4 caps the reserve "at a few seasons of M". `store` 4 is inside that wording; going further would need an ADR. So one arm relaxes the cap to 4·M; none goes further.

## Arms

Each arm is a patch in `cli/sapling-release-probe.ts` (`ARMS`).

| arm | patch | why |
|---|---|---|
| `head` | – | the reference |
| `dl0` | `r5.dLambda` 0 | the bracket below HEAD's 0.02 (no shade term) |
| `dl10` | `r5.dLambda` 0.10 | 5× HEAD's |
| `dl25` | `r5.dLambda` 0.25 | λ up to 0.75 in deep shade |
| `bank` | every species' `r1.unspent` "banked", `keep` 1 (store 2, HEAD's) | the rule at HEAD's cap |
| `bank4` | as `bank`, `store` 4 | the cap relaxed to the spec's "a few seasons" |

R5 is the world's (no species patch carries one); R1 is in every species' patch, so the bank is patched per species.

**Stages, per arm and seed (1–3):**
- the garden, `forestParams(width, seed)`, at 160 and 66 cells, to season 300 (snapshots 100 and 200 for DBH);
- the sapling probe (`rust/core/examples/sapling_probe.rs`, the trace's) on the same 160-cell params to 300, rows from season 40, 1–10 m;
- lone beech, hornbeam and oak (`loneTreeParams`) to season 100.

## Bars (fixed before the runs)

**The sapling class:** live trees 4–20 cells (1–5 m) at seasons 50–290 of the 160-cell gardens, seeds 1–3 pooled, all species.

1. **S1, seasons without growth:** the share of sapling-seasons with no metamer born at least 0.10 below HEAD's.
2. **S2, height gain per decade:** the median gain over the next 10 seasons (trees alive and under 10 m then) at least 2× HEAD's, the share of decades with no gain below HEAD's, and the median at most 3 m a decade. The ceiling is a judgement guard, not a sourced rate: the trace warned that a full plug gives about 1 m a season, which no suppressed regeneration does.
3. **Lone trees unchanged in form beyond noise:** for each of beech, hornbeam and oak, the arm's median over seeds 1–3 of height and of W/H at season 100 inside [0.9 × HEAD's lowest seed, 1.1 × HEAD's highest]. For the bank's off state (the build at the defaults) the stronger test: state hashes equal `origin/3d-port`'s.
4. **#122's gates:** at both widths a canopy tree every season after 50; at 66 cells one every season from 100; 3 of 3 seeds.
5. **Canopy trees/ha not below HEAD's:** the median over seeds of each run's median canopy trees/ha over seasons 100–300, at least HEAD's, at both widths.

An arm passes if it passes all five. **A pass is not adoption:** it goes to 20 seeds with stated pass rates (AGENTS.md), and adoption is the user's call with an ADR. No default changes in this PR.

**Reported, not gated:** per species, the no-growth share; the reserve at its cap in sapling-seasons (does the 2·M cap bind?); v_base per metamer grown; at both widths the seasons at the stand's cap (`capSeasons`), the seedling bank (live stems under 1.3 m) per frame, stems ≥ 7 cm/ha and their canopy share (ADR 0068).

**Regressions:** `npm run regressions` at the build: `forestRegeneration` must not move; `phoneSeed3` may move only with a devlog reason (no default changes, so neither should).

## Expected (written before the runs)

- **`dl*`:** a small effect. R5's shade signal at a sapling's nodes is partial, λ moves the split at every node, not only the leader's, and the laterals still lose their share. `dl25` may lower S1 a little; S2 unlikely. Lone trees barely move (neighbour shade is near zero alone).
- **`bank`:** the cap binds. A sapling's M is about 1 unit, so the bank carries at most ~1 unit a season (2·M less the 1·M kept), against ~4 units unspent: v_base 4.4 → ~5.4, short of what the largest bud needs (~6). Expect a modest S1 gain and the reserve at its cap most seasons.
- **`bank4`:** up to ~3 units carried, enough for the largest bud in many seasons: pulsed growth, S1 and S2 likely met. The risk is the lone trees (they lose 79% of their surplus too at 5–10 m) and the stand: faster saplings fill the subcanopy.

## Cost

| | runs | length | simulators |
|---|---|---|---|
| gardens | 6 arms × 3 seeds × 2 widths = 36 | 300 seasons | at most 6 |
| sapling probe | 6 × 3 = 18 | 300 seasons | (same pool) |
| lone | 6 × 3 species × 3 seeds = 54 | 100 seasons | (same pool) |

`rust/` is not edited while the runs are queued.

## Reproduce

```
node cli/sapling-release-probe.ts            # seeds 1–3, 6 simulators; runs/sapling-release-probe/
```

## Result

**No arm passes all five bars. `dl25` passes four and misses S1 by 0.01; the bank fails the lone trees at both caps. Nothing is adopted; the bank stays built and off.**

108 runs at 6af72f5 in 93.5 min on 6 simulators (`runs/sapling-release-probe/`, `summary.json`, `bars.json`; generated). The lone open-grown trees took about 6 min each, the 160-cell gardens about 5.

### The bars

| arm | S1: no growth (HEAD − 0.10 = 0.61) | S2: gain/decade, m (median; P90; share none) | lone form | #122 gates | canopy/ha, 160 / 66 (HEAD 156 / 76) | passes |
|---|---|---|---|---|---|---|
| `head` | 0.71 | 0.02; 0.85; 0.36 | – | 3/3, 3/3, 3/3 | 156 / 76 | – |
| `dl0` | 0.80 ✗ | 0.01; 0.50; 0.37 ✗ | ✓ (hash-identical) | ✓ | 94 ✗ / 76 | ✗ |
| `dl10` | 0.67 ✗ | 0.11; 1.94; 0.26 ✓ | ✓ (hash-identical) | ✓ | 172 / 76 ✓ | ✗ |
| `dl25` | **0.62** ✗ | **0.33**; 2.67; 0.17 ✓ | ✓ (hash-identical) | ✓ | 188 / 114 ✓ | ✗ (S1 by 0.01) |
| `bank` | 0.72 ✗ | 0.05; 0.81; 0.29 ✓ | ✗ | ✓ | 94 ✗ / 76 | ✗ |
| `bank4` | **0.59** ✓ | 0.12; 1.56; 0.27 ✓ | ✗ | ✓ | 94 ✗ / 76 | ✗ |

Sapling-seasons per arm 24,600–42,400 (356–561 trees). S2's ceiling (3 m a decade) holds everywhere.

**Lone trees at season 100** (H in cells; HEAD's seeds 1–3):

| arm | beech H | hornbeam H | oak H | W/H, beech / hornbeam / oak (median) |
|---|---|---|---|---|
| HEAD, `dl0`, `dl10`, `dl25` | 134–144 | 117 | 132–136 | 1.49 / 1.18 / 1.39 |
| `bank` | 166–179 ✗ | 137–152 ✗ | 126–133 | 1.43 / 1.32 / 1.53 |
| `bank4` | 194–200 ✗ | 167–182 ✗ | 132–137 | 1.30 / 1.29 / 1.70 ✗ |

- **The `dl*` arms leave the lone trees hash-identical** to HEAD's (all nine): R5's signal is neighbour shade, zero for a tree alone.
- **The bank grows the lone beech and hornbeam taller:** 15–30% at 2·M, 40–55% at 4·M, with 1.5–3× the metamers. Oak barely moves in height but widens at 4·M. Open-grown trees lose most of their surplus at buds below threshold too (the trace's 79% at 5–10 m), so banking it is a recalibration of every species' lone tree, not a sapling fix.
- **The bank's off state is the build:** HEAD's lone hashes at this branch are reported under "Off-state identity" below.

### Does the 2·M cap bind? Yes.

| arm | sapling-seasons with the reserve at its cap | v_base per metamer grown | median v_base |
|---|---|---|---|
| `head` | 0.46 | 6.1 | 2.2 |
| `bank` (2·M) | **0.92** | 6.7 | 3.0 |
| `bank4` (4·M) | 0.76 | 4.4 | 3.7 |

At HEAD's cap the bank fills the reserve in 92% of sapling-seasons and carries at most 1·M a season into growth (2·M less the 1·M kept): v_base rises from 2.2 to 3.0, still split over the same buds, and the no-growth share does not move (0.71 → 0.72). Doubling the cap (the spec's "a few seasons") is what makes the bank work on saplings (0.59), and it is also what makes the lone trees outgrow their calibration.

### Reported

| arm | ≥ 7 cm stems/ha, 160 (median frame; HEAD's band 200–400) | ≥ 7 cm canopy share, 160 / 66 | seedling bank (< 1.3 m) per frame, 160 / 66 | seasons at the stand's cap, 160 |
|---|---|---|---|---|
| `head` | 250 | 0.55 / 0.67 | 72 / 57 | 184, 230, 252 |
| `dl0` | 125 | 0.63 / 0.67 | 123 / 60 | 179, 241, 227 |
| `dl10` | 891 | 0.34 / 0.67 | 56 / 59 | 215, 239, 261 |
| `dl25` | 766 | 0.62 / 0.50 | 31 / 32 | 177, 249, 247 |
| `bank` | 234 | 0.47 / 0.50 | 84 / 49 | 235, 260, 188 |
| `bank4` | 734 | 0.26 / 0.50 | 39 / 32 | 252, 269, 207 |

No-growth share by species, ≥ 30 sapling-seasons: HEAD hornbeam 0.72, beech 0.75, maple 0.64, holly 0.75; `dl25` hornbeam 0.65, beech 0.61, maple 0.94; `bank4` hornbeam 0.58, beech 0.77, maple 0.86, holly 0.88.

### Off-state identity

HEAD's records replayed by `origin/3d-port`'s treesim (a1ac407, built from `git archive`) give the same state hashes as this branch's build at the defaults, in all nine lone runs (beech c9f55e42, 300c8d73, ee7b6037; hornbeam 859812b6, 66b88c89, f4a96f3e; oak 9d18cdbd, 175ce3f9, 66d455d6). The goldens pass (`npm run check:stamp` green) and `npm run regressions` reads `phoneSeed3` and `forestRegeneration` unchanged.

### Noise: three seeds do not settle these bars

- **Per seed, HEAD's no-growth share is 0.95, 0.62 and 0.73** (2,466, 9,340 and 18,727 sapling-seasons). Seed 3 carries most of the class in every arm, so S1 is close to one seed's reading. `dl25`'s 0.59 / 0.62 / 0.64 is tighter than HEAD's spread, and `dl0`, a near-null change, reads 0.80.
- **Canopy trees/ha per run at 160 cells:** HEAD 78, 156, 172; `dl0` 63, 94, 172; `bank` 63, 94, 109. A median of three reads one run. `dl0` failing bar 5 is noise as much as effect.
- **`dl25`'s seed 2 reads 781 canopy trees/ha** at 160 cells: the stand's top height fell, so "over half the top height" took in the subcanopy. Its median (188) does not rest on it.

## Conclusion

- **The cheapest remedy works best.** Concentrating v at shaded nodes (`dl25`, λ up to 0.75) multiplies the sapling's median height gain by about 16 (0.02 → 0.33 m a decade; decades with none 0.36 → 0.17), cuts the no-growth share 0.71 → 0.62, keeps the lone trees bit-identical, and keeps the gates and the canopy. It misses S1's margin by 0.01 on three seeds whose own spread is ±0.15.
- **Its cost is the ≥ 7 cm flood.** Released saplings reach 7 cm: 766/ha at 160 cells against HEAD's 250 and ADR 0068's band of 200–400. That moves #132's problem rather than solving it.
- **The bank does not fit as built.** At HEAD's cap it is capped out (92%); at 4·M it frees the saplings but outgrows the lone beech and hornbeam by 40–55%. It needs either a sapling-only scope (a size or light condition: a new design choice) or a lone refit.
- **What adoption of `dl25` would need:** seeds 1–20 on the same bars with stated pass rates (S1 judged on ≥ 15 of 20 seeds' own no-growth share against HEAD's same seed, rather than a pooled share dominated by one seed); `phoneSeed3` re-recorded with a devlog reason; an ADR on R5's δλ (0.02 → 0.25 is a calibration, not a spec change); and #132's rates re-tuned on the new stand, with the ≥ 7 cm flood read against ADR 0068's band.
