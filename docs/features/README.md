# Feature playbook

One page per **Form feature** or **World effect** (GLOSSARY). Each page gives the decided mechanism, the cheap diagnostic, and the exemplar species with their expressions, ready to hand off to `/implement-principle`. The pages came out of the wayfinder map [Wayfinder: a feature playbook for crowns, boles and the garden](https://github.com/epabarker/tree-simulation/issues/73), which planned this work but did not build it. The map's research and probe notes are in `docs/research/` and `docs/experiments/` (dated 2026-11-08).

| Page | Kind | Status |
|---|---|---|
| [Stand density and demography](stand-density-and-demography.md) | World effect | Decided ([ADR 0063](../decisions/0063-garden-demography.md)) |
| [Rounded crown](rounded-crown.md) | Form feature | Decided for the oak (exploratory); maple's part deferred |
| [Bare bole](bare-bole.md) | Form feature | Proposed: its probe needs the 0063 garden |

Light entry ([ADR 0062](../decisions/0062-light-entry.md)) is a World effect with an ADR but no page.

## Handoff

Decided in [How does the feature playbook hand off to implementation, and in what order?](https://github.com/epabarker/tree-simulation/issues/95). Builds merge into `3d-port`. Nothing in this playbook touches `main`, a release or the phone soak.

### Build order

Each build changes the goldens, so the builds merge **one after another**:

| Build | What | Source | Judged on |
|---|---|---|---|
| (a) | The open-grown lone-tree box: τ = 1 on all four sides, a square box grown from the crown | ADR 0062 | The lone tree in the lab |
| (b) | The garden: periodic depth, and demography (canopy and suppression mortality, seeding over the whole depth, ≈ 400/ha planted saplings, a display threshold) | ADR 0062, ADR 0063, the stand-density page | The garden, seasons 100–300 |
| (c) | Rounded crown, **oak only**: the early λ fall (`r2.dLambda` 0.12 from `r2.aC` 13.5) | The rounded-crown page | The lone tree in (a), then the garden guard in (b) |
| (d) | Bare bole: C5's relative test re-anchored, with `c5.kRel` | The bare-bole page | The (b) garden |

Lone-tree work on (c) may start once (a) is in, but (c) merges after (b). Build (d) starts with the bole probe as its first acceptance check, which used to be the map's ticket [Does a re-anchored, accumulating T_rel clear beech and hornbeam in a closed stand while holly stays clothed?](https://github.com/epabarker/tree-simulation/issues/88). Diagnostic 2 comes first: are the lowest limbs darker than the mid-crown ones in the new stand? In HEAD's garden they are not ([advisory early look](../experiments/2026-11-08-bole-probe.md)).

### One PR per build

Each build is one `/implement-principle` PR with its own issue and its own `spec-reviewer` pass. A PR has two steps:

1. **The mechanism, default off.** The commit is bit-identical: `tests/golden.json` and `tests/regressions.json` are unchanged, and `npm run check:stamp` is green. Build (c) has no new rule, so it skips this step.
2. **The preset switched on.** One `npm run golden:update` and one `npm run regressions -- --update`, each with its reason in the devlog. The commit carries ≥ 20 seeds of evidence on the page's cheap diagnostic, with a stated pass rate (AGENTS.md), and names every regression that gets worse (for example `phoneSeed3`).

The step8 gates (G-forest/B1, the budget "at unchanged density") stay frozen with step8. From (b) on, the gate is the page's diagnostic plus `npm run regressions`, because (b) changes the density on purpose.

### Cost

Build (a) accepts the open box's cost in the lab, measured at ≈ 0.9 s/season and 530–700 MB in WASM ([open-box note](../experiments/2026-11-08-open-box.md)). The PR reports the cost per season. There is no cheaper lab mode. The garden doesn't use this box, and phone performance is a separate issue.

### Probe code

The probe branches (`wayfinder/*`) are never merged. A build re-implements its mechanism through `/implement-principle` and may cherry-pick from its probe branch: `c5.kRel` from `wayfinder/bole-probe`. The oak's `r2.dLambda` and `r2.aC` already exist, so (c) only changes the species entry. The probe-only switches (`r2.relayOvertop`, the metamer cap and `c3.sink`) are not merged. The feature-probe tool (`wayfinder/feature-probe`) merges with build (a), as the instrument every later build uses.

### After the builds

These need the built garden. Each becomes an issue when its build lands:

- after (b): R1's path discount `d(L)` beside the stand's height plateau; crown shyness and interpenetration in the closed stand, which now meets across the periodic wrap;
- after (c), waiting for the combined run: maple's length cap (`c3.sink: "turgorLength"`): s* 0.5 against 0.25, the friction/gravity split, birch's runaway leaders under gravity-heavy settings, and `phoneSeed3`'s lost canopy tree;
- after (d): how C5's and R1's shedding reconcile (one rule or two, with the leafless-twig path), and a combined run of the length cap with the re-anchored T_rel.

Separate future efforts: species expressions beyond the exemplars, beech posture (ADR 0045), masting, and dead stubs with their fall lag (a beauty item, opened only on a measured or visual mismatch).
