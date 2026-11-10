# The light serves a limb resting on the ground: the fix, checked on 20 seeds

_2026-11-10. Issue [#104](https://github.com/epabarker/tree-simulation/issues/104), [ADR 0011](../decisions/0011-mechanics.md)'s addendum of this date. It follows build (a)'s [note](2026-11-09-open-box-build.md), which found the defect. Code: `code/2026-11-10-ground-rest-light/`._

## The defect and the fix
- **Defect.** With `r3.ground` on, R3 rests a limb on y = 0, but its tips are derived (base + length × heading) and land a rounding error below 0. The light counted anything below 0 as outside its box. So the limb's buds read Q = 0, its leaf area was never deposited, and R5's node shade read full shade.
- **Fix.** For a tree whose own params have `r3.enabled` and `r3.ground` (`R3::rests`), a tip below the ground is read, and deposits, at y = 0 (`light::rest_height`). It applies wherever the season loop takes a tip to the light: the deposit and owner tag, a bud's Q and V, and R5's node shade and neighbour share.
- **No threshold.** The tree's flags decide, not the residue's size. Without ground contact a sunk limb stays outside the light, as ADR 0011 intends.
- **Unchanged:** R3's geometry, `Light::sample` itself, and `budsOutside` (it already clamped y at 0).

## Method
- "Before" is the fix's parent, `ba004d1`, in a worktree with its own WASM build. "After" is the working tree. Both grow lone open-grown trees (`openLoneParams`) in WASM, seeds 1–20: holly in a 30 m box (120 cells) and beech and oak in the 60 m box (240 cells).
- `follow.ts`: each live bud found with its tip below 0 at a season's end is followed into the next season, where it samples before anything moves it. Its Q is compared with the bottom row's light at the place it rested. 40 seasons.
- `lowlimb.ts`: size, the probe's low-limb measures and the cumulative shed count, at seasons 20 and 40 (holly) or 30, 60 and 100 (beech, oak). `summary.py` pairs the two builds by seed.
- **The pairs are not the same tree.** The run's hash differs in 20 of 20 seeds for all three species, so each pair is two realisations. Read the medians and the counts of seeds that moved each way, not single pairs.

## Resting buds are lit (20 seeds each, 40 seasons)

| | seeds with resting buds | before: bud-seasons, dark over a lit floor | after: bud-seasons, equal to the bottom row |
|---|---|---|---|
| holly | 20 of 20 | 9,429, all 9,429 dark (20 of 20 seeds) | 17,842, all equal (20 of 20) |
| beech | 20 of 20 | 3,647, all dark (20 of 20) | 4,004, all equal (20 of 20) |
| oak | 17 of 20 | 281, all dark (17 of 17) | 382, all equal (17 of 17) |

- Before, no resting bud in any seed read the bottom row's light, and the floor was lit under every one of them.
- After, every one reads exactly the bottom row's Q, and none is dark over a lit floor.
- Limbs first rest at seasons 4–14 (holly), 6–11 (beech) and 6–34 (oak). Three oak seeds rest no limb in 40 seasons.
- The automated case is `tests/ground-rest.test.ts`: holly seed 1, 20 seasons. Before the fix it had 97 such bud-seasons, all dark; with it 207, all equal.

## What the fix moves in lone trees (medians over 20 seeds, before → after)

| | season | H (m) | width (m) | lowest live limb (m) | lowest limb / H | lowest leaf / H | metamers | shed so far |
|---|---|---|---|---|---|---|---|---|
| holly | 20 | 9.94 → 9.35 | 11.55 → 12.14 | 0.25 → 0.25 | 0.025 → 0.027 | 0.000 → 0.000 | 4,654 → 5,094 | 78 → 48 |
| holly | 40 | 15.03 → 14.86 | 16.75 → 19.03 | 0.25 → 0.25 | 0.017 → 0.017 | 0.001 → 0.000 | 13,446 → 15,273 | 1,310 → 1,234 |
| beech | 30 | 12.83 → 13.20 | 20.98 → 21.81 | 0.25 → 0.25 | 0.020 → 0.019 | 0.063 → 0.056 | 42,795 → 44,063 | 20,893 → 20,814 |
| beech | 60 | 24.15 → 24.57 | 37.06 → 38.65 | 0.25 → 0.25 | 0.010 → 0.010 | 0.118 → 0.115 | 146,910 → 149,108 | 164,510 → 162,968 |
| beech | 100 | 34.66 → 35.10 | 49.31 → 52.47 | 0.25 → 0.25 | 0.007 → 0.007 | 0.133 → 0.132 | 247,282 → 255,773 | 438,138 → 433,414 |
| oak | 30 | 19.80 → 19.77 | 28.09 → 27.90 | 0.25 → 0.25 | 0.013 → 0.013 | 0.108 → 0.112 | 28,982 → 28,859 | 13,618 → 13,618 |
| oak | 60 | 33.11 → 32.98 | 40.79 → 42.74 | 0.25 → 0.25 | 0.008 → 0.008 | 0.073 → 0.072 | 66,042 → 67,168 | 70,753 → 70,577 |
| oak | 100 | 33.28 → 33.26 | 41.64 → 44.42 | 0.25 → 0.25 | 0.008 → 0.008 | 0.062 → 0.064 | 79,658 → 80,724 | 165,560 → 166,330 |

- **The low limbs do not move.** The lowest live limb stays at 0.25 m, the first node, in the median of every species and season. Its seed range is 0.25–0.59 m before and after. The bare-bole finding (lowest limbs at 0.007–0.03 of H) is the same in both builds, so build (d)'s starting point is unchanged.
- **Self-pruning moves only in young holly.** At season 20 holly has shed fewer metamers in 19 of 20 seeds (median 78 → 48). By season 40 that is 13 of 20. Beech and oak split about evenly at every season: 7–11 of 20 each way (four oak seeds are unchanged at season 30).
- **Crowns are wider late.** At the last season the paired width is up in 15 of 20 beech (median of the paired differences +2.7 m), 16 of 20 oak (+1.3 m) and 12 of 20 holly (+0.4 m). The pairs range from −4.4 m to +13.5 m. Height does not move: the paired medians are +0.1 m (beech), −0.3 m (oak) and −0.2 m (holly).
- **Holly is bushier.** It has more metamers at season 20 in 17 of 20 seeds, and more buds in its lowest metre in 17 of 20.
- **Not measured:** why the crowns widen. The lit resting limbs are the obvious candidate, but no run here isolates them.

## Buds outside the 60 m box at season 100

| | before | after |
|---|---|---|
| beech | 2 of 20 seeds (s11: 10 buds, s15: 4) | 2 of 20 seeds (s14: 62, s18: 8) |
| oak | 0 of 20 | 1 of 20 (s15: 19) |
| holly (30 m box, season 40) | 0 of 20 | 0 of 20 |

- Build (a)'s hard check counted the same number of beech seeds, 18 of 20 clean at season 100, but they are different seeds. Oak goes from 20 to 19 of 20. Oak s15 already left the box in build (a), at season 81 only.
- These runs recorded seasons 30, 60 and 100 only, so "zero in every season" was not re-counted.
- With wider crowns the 30 m half-side is pressed slightly harder. That belongs to the box-size follow-up, #103.

## Goldens and regressions

| case | before | after |
|---|---|---|
| `mixedWood:seed1:s15` | 783b45ca | f091bb81 |
| `oakOpen:seed1:s15` | 5ff7c085 | 6011ec46 |
| `beechOpen:seed1:s40` | e7cb78a9 | 105d2e07 |
| `beechWood:seed1:s30` | 61dbb13c | 749ad4e1 |
| historical `beechOpen` under the off patch (`golden.rs`) | 200f5a55 | 228f23fd |

- **Unchanged, no ground contact:** `explosion`, `bh`, `wall`, `pair`, `skyTree`, `skyStand`, `obliqueSun`, `conifer`, `weeping`, `troll`, `thinning`.
- **Unchanged, ground contact on:** `forest:seed1:s20` (13b7bffc), and the historical walled oak under the off patch (0877b79b).
- **Regression `phoneSeed3`** (#54, `mixedWood`'s forest, seed 3): metamers 15,692 → 16,613 at season 50, 16,923 → 18,052 at 100 and 12,423 → 12,614 at 150. Live trees 23 → 24 and canopy trees 3 → 4 at season 100. Canopy trees 2 → 3 at 150.
- **Regression `forestRegeneration`** (#55, `forest` seed 1, 300 seasons): unchanged.

## Limits
- Lone trees only, three species. The garden's stands were not re-measured beyond the goldens and the two regression vectors.
- One season is not covered: when ground contact is switched on mid-run, a tip that sank while it was off is served in the bottom row for the one light phase before R3 rests it. This comes from reading the phase order; it was not run.
