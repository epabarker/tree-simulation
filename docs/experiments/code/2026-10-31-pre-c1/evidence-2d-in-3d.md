# The 2D evidence against the 3D core, after the pre-C1 harness fixes

`npm run evidence:2d` on this branch (the woods' top at 200), Node 24, the 4-core VM. The species file's birch ontogeny test, which still trapped in this run, was rerun alone after its lone trees were freed (`rerun`). Every test now runs to an assertion: none trap.

**39 of 78 pass, 39 fail.**

| File | Test | Outcome | First error | s |
|---|---|---|---|---|
| ablation.test.ts | ξ = 0: shoots stop turning to the light, though the crown still leans by allocation | threshold | AssertionError: expected 2.286976014783865 to be less than 2.1947922867964906 | 32 |
| ablation.test.ts | R1 off: no height plateau, no death in the shade, no self-thinning | unregulated | Error: unregulated growth: 1501275 live metamers at season 84 | 173 |
| ablation.test.ts | pooled light instead of directional shade: sizes even out and nothing is suppressed | threshold | AssertionError: expected false to be true // Object.is equality | 24 |
| c4-direction.test.ts | leans away from a wall (5 seeds, §7 M3) | threshold | AssertionError: expected 0 to be greater than 0.35893310225156794 | 16 |
| carbon.test.ts | levels height off below the world's top (a plateau, not the ceiling) | threshold | AssertionError: expected 111.14930623601013 to be less than 99 | 0 |
| carbon.test.ts | starves a seedling under the closed canopy within 25 seasons (5 seeds) | threshold | AssertionError: expected -1 to be greater than 20 | 0 |
| carbon.test.ts | raises the crown base after the canopy closes | threshold | AssertionError: expected 0.9999999985796898 to be greater than 15 | 0 |
| flora.test.ts | orders shade tolerance birch < oak < beech in a shade house | threshold | AssertionError: expected 0.15174041665159166 to be less than 0.15 | 5 |
| flora.test.ts | grows slender stands whose floors darken from birch to oak to beech | threshold | AssertionError: expected 16.989173766600544 to be greater than 60 | 311 |
| flora.test.ts | throws slender stand trees in storms far more often than a squat open oak | threshold | AssertionError: expected 0 to be greater than 0 | 131 |
| flora.test.ts | orders shade tolerance pine < willow < rowan < maple < holly, hornbeam | threshold | AssertionError: expected 3 to be +0 // Object.is equality | 7 |
| flora.test.ts | casts deep shade under hornbeam and holly, light shade under pine and willow | threshold | AssertionError: expected 0.12490247590920554 to be less than 0.05 | 136 |
| flora.test.ts | grows a broad willow, a round maple, a conical holly, all smaller than beech | threshold | AssertionError: expected 1.1409818834551861 to be greater than 1.2 | 39 |
| flora.test.ts | lets the mixed wood's pioneers give way to beech, with holly and hornbeam beneath | unregulated | Error: unregulated growth: 1599212 live metamers at season 388 | 284 |
| flora.test.ts | brings goat willow back to a clearing only through seed rain (ADR 0018) | threshold | AssertionError: expected 1 to be +0 // Object.is equality | 919 |
| forest.test.ts | thins a dense stand along a log–log line; size inequality rises with density | threshold | AssertionError: expected 60 to be less than 24 | 284 |
| forest.test.ts | removes the open-edge effect: edge trees no longer lean out (periodic sides) | threshold | AssertionError: expected 1.475360977045254 to be greater than 1.5 | 107 |
| mechanics.test.ts | bends old limbs down and turns their tips up (open-grown tree) | threshold | AssertionError: expected 0 to be greater than 10 | 0 |
| mechanics.test.ts | weeps: most twigs hang below −30°, against a quarter without R3 | threshold | AssertionError: expected 0.7182901706886404 to be less than 0.35 | 79 |
| mechanics.test.ts | straightens a plagiotropic leader into an upright trunk (Troll), and sprawls without posture | threshold | AssertionError: expected 55.63234246817537 to be greater than 60 | 26 |
| mechanics.test.ts | raises the Leonardo exponent above 2 where heavy laterals carry stress wood | threshold | AssertionError: expected 6 to be greater than 20 | 0 |
| mechanics.test.ts | rights a seedling planted at 40° within a few seasons, overshooting a little (§10, Bastien et al. 2013) | threshold | AssertionError: expected 14.218107411876213 to be greater than 30 | 15 |
| mixed.test.ts | lets a lone tree grow squat, while a stand still grows slender (3 seeds) | threshold | AssertionError: expected 11.408213962497285 to be greater than 12.13839816988523 | 69 |
| r2-physiological-age.test.ts | grows whorls at the start of each growth unit on a Massart trunk | threshold | AssertionError: expected 4 to be 2 // Object.is equality | 0 |
| r2-physiological-age.test.ts | slows a young tree's height growth, most while it is small | threshold | AssertionError: expected 86.08133160603226 to be greater than 95.9878014819603 | 14 |
| release.test.ts | flushes epicormic shoots on the neighbours' trunks after a tree is felled | threshold | AssertionError: expected 26 to be greater than 40 | 99 |
| release.test.ts | makes stand trees slenderer (H/D in the 60–80 target), open-grown ones stay squat | threshold | AssertionError: expected 20.002141623511417 to be greater than 60 | 141 |
| sky.test.ts | lifts the crown base in a stand but not on an open-grown tree (§8 single vs multi) | threshold | AssertionError: expected 1 to be greater than 15 | 22 |
| sky.test.ts | grows stand trees with realistic slenderness, open-grown trees squatter (§10, M6c) | threshold | AssertionError: expected 11.91590486875624 to be greater than 50 | 0 |
| sky.test.ts | lets an overtopped tree keep a deeper crown than the absolute rule does (Sprugel 2002) | threshold | AssertionError: expected 12.876808338405338 to be greater than 26.281533464762123 | 74 |
| sky.test.ts | measures full light on bare ground and less under a crown | threshold | AssertionError: expected 0.751901968382299 to be greater than 0.8 | 1 |
| sky.test.ts | lets 2–10% of open-sky light reach the floor under a closed stand (5 seeds) | threshold | AssertionError: expected 0.1518144052266265 to be less than 0.1 | 0 |
| species.test.ts | grows conifer stands as narrow spires on clear boles with realistic H/D | threshold | AssertionError: expected 0.023749294136318384 to be greater than 0.4 | 57 |
| species.test.ts | lifts the crown of a light-demanding birch stand faster than a shade-tolerant one | threshold | AssertionError: expected 0.007617028135918874 to be greater than 0.023749294136318384 | 105 |
| species.test.ts | grows the tropical tree as a pagoda of flat tiers, widest at the base (Aubréville) | threshold | AssertionError: expected 54.31338616488235 to be greater than 60 | 0 |
| world.test.ts | alternates lateral sides along each axis (distichous, §C1) | threshold | AssertionError: expected 1 not to be 1 // Object.is equality | 0 |
| world.test.ts | frees dead trees' rows without changing any live tree, and never replants them | threshold | AssertionError: expected 0 to be greater than 5 | 95 |
| world.test.ts | grows far less than unchecked growth, and stops being exponential | unregulated | Error: unregulated growth: 1823399 live metamers at season 20 | 5 |
| world.test.ts | leaves most interior buds dormant | unregulated | Error: unregulated growth: 1823399 live metamers at season 20 | 4 |
| ablation.test.ts | C3 → equal sharing: a low, broad crown, and a tree that loses to its neighbour | passes |  | 42 |
| ablation.test.ts | R6 off: foliage only on the young shoots, none on older wood | passes |  | 51 |
| ablation.test.ts | R4 off: no bud bank to release, though gaps still refill by ordinary growth | passes |  | 58 |
| c3-allocation.test.ts | conserves resource: Σ v at buds = v_base = α·Q_base | passes |  | 1 |
| c3-allocation.test.ts | gives every live bud the same share in the 'equal' ablation (§8) | passes |  | 0 |
| c3-allocation.test.ts | makes a stronger leader at λ = 0.56 than at 0.46 (5 seeds, §7 M2) | passes |  | 7 |
| c4-direction.test.ts | spreads wider when tropism points down than up (5 seeds, §7 M3) | passes |  | 14 |
| carbon.test.ts | spends a plausible share of production on maintenance | passes |  | 0 |
| carbon.test.ts | keeps the M6 sky patterns: edge trees lean out | passes |  | 0 |
| carbon.test.ts | leaves pre-R1 presets on α·Q_base (R1 off: no costs, no deaths) | passes |  | 6 |
| flora.test.ts | grows an open oak broad and squat, with wider limbs than a birch's | passes |  | 84 |
| flora.test.ts | replaces birch pioneers with beech over a few centuries (3 seeds) | passes |  | 575 |
| flora.test.ts | breaks an open oak into big limbs through acrotony (§R2.4, 5 seeds) | passes |  | 142 |
| forest.test.ts | refills a felled canopy tree's gap from seed | passes |  | 264 |
| mechanics.test.ts | keeps trunks upright only with posture control (§8 ablation: sag without posture) | passes |  | 34 |
| mixed.test.ts | gives a tree without a species the world's own params, so nothing changes | passes |  | 15 |
| mixed.test.ts | grows each tree by its own species in a shared stand (5 seeds) | passes |  | 40 |
| mixed.test.ts | resolves a species, and again after a params event | passes |  | 0 |
| mixed.test.ts | passes a species to recruits and to a visitor's seedling | passes |  | 47 |
| r2-physiological-age.test.ts | builds sympodial modules: no branch axis outlives its season (Aubréville) | passes |  | 3 |
| sky.test.ts | makes edge trees lean outward, toward the open sky (5 seeds) | passes |  | 0 |
| sky.test.ts | lets neighbours lean into the gap left by a felled tree (5 seeds, M6 configuration) | passes |  | 231 |
| sky.test.ts | still fills gaps with relative shedding and short shoots on (5 seeds, M6d) | passes |  | 177 |
| sky.test.ts | grows crowns toward an oblique sun (§C2.6) | passes |  | 44 |
| sky.test.ts | does not depend on the order trees are processed in | passes |  | 1 |
| sky.test.ts | puts a large share of a stand's leaf area on short shoots (Millan et al. 2022) | passes |  | 72 |
| sky.test.ts | gives the same stand at K = 7 as at K = 15 (sampling convergence, 5 seeds) | passes |  | 34 |
| species.test.ts | grows the conifer as a cone of near-horizontal tiers (Massart) | passes |  | 0 |
| species.test.ts | grows the birch with steep fine branches and broadens it with age (ontogeny) | passes |  | rerun |
| stand.test.ts | grow crowns away from each other (5 seeds, §7 M5) | passes |  | 10 |
| stand.test.ts | suppress a tree planted late between them (≥ 15 of seeds 1–20 per measure, §7 M5) | passes |  | 75 |
| stand.test.ts | lean into the gap when a neighbour is removed (≥ 15 of seeds 1–20, §8 kill one tree) | passes |  | 96 |
| stand.test.ts | does not depend on the order trees are processed in (one shared snapshot, §6) | passes |  | 1 |
| storms.test.ts | lets weeping limbs sink below the ground without it, and rest on it with it (3 seeds) | passes |  | 34 |
| storms.test.ts | break limbs and throw trees only in storm seasons, and never without storms (3 seeds) | passes |  | 298 |
| world.test.ts | keeps the structural invariants every season | passes |  | 0 |
| world.test.ts | explodes exponentially when every bud grows (Borchert–Slade) | passes |  | 0 |
| world.test.ts | is deterministic and replays exactly from its record | passes |  | 0 |
| world.test.ts | reports metrics consistent with the structure | passes |  | 0 |
