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

_(after the runs)_
