| File | Test | Outcome | First error |
|---|---|---|---|
| ablation.test.ts | ξ = 0: shoots stop turning to the light, though the crown still leans by allocation | threshold | AssertionError: expected 2.286976014783865 to be less than 2.1947922867964906 |
| ablation.test.ts | R1 off: no height plateau, no death in the shade, no self-thinning | out of WASM memory | RuntimeError: unreachable |
| flora.test.ts | replaces birch pioneers with beech over a few centuries (3 seeds) | harness: a stand shared across tests was freed by the previous one | ? |
| flora.test.ts | breaks an open oak into big limbs through acrotony (§R2.4, 5 seeds) | harness: a stand shared across tests was freed by the previous one | ? |
| flora.test.ts | throws slender stand trees in storms far more often than a squat open oak | harness: a stand shared across tests was freed by the previous one | ? |
| flora.test.ts | casts deep shade under hornbeam and holly, light shade under pine and willow | harness: a stand shared across tests was freed by the previous one | ? |
| flora.test.ts | grows a broad willow, a round maple, a conical holly, all smaller than beech | harness: a stand shared across tests was freed by the previous one | Error: attempted to take ownership of Rust value while it was borrowed |
| species.test.ts | grows conifer stands as narrow spires on clear boles with realistic H/D | harness: a stand shared across tests was freed by the previous one | Error: attempted to take ownership of Rust value while it was borrowed |
| species.test.ts | lifts the crown of a light-demanding birch stand faster than a shade-tolerant one | harness: a stand shared across tests was freed by the previous one | Error: attempted to take ownership of Rust value while it was borrowed |
| world.test.ts | grows far less than unchecked growth, and stops being exponential | harness: a stand shared across tests was freed by the previous one | Error: attempted to take ownership of Rust value while it was borrowed |
| world.test.ts | leaves most interior buds dormant | harness: a stand shared across tests was freed by the previous one | Error: attempted to take ownership of Rust value while it was borrowed |
| ablation.test.ts | pooled light instead of directional shade: sizes even out and nothing is suppressed | threshold | AssertionError: expected false to be true // Object.is equality |
| c4-direction.test.ts | leans away from a wall (5 seeds, §7 M3) | threshold | AssertionError: expected 0 to be greater than 0.35893310225156794 |
| carbon.test.ts | levels height off below the world's top (a plateau, not the ceiling) | threshold | AssertionError: expected 111.14930623601013 to be less than 99 |
| carbon.test.ts | starves a seedling under the closed canopy within 25 seasons (5 seeds) | threshold | AssertionError: expected -1 to be greater than 20 |
| carbon.test.ts | raises the crown base after the canopy closes | threshold | AssertionError: expected 0.9999999985796898 to be greater than 15 |
| flora.test.ts | orders shade tolerance birch < oak < beech in a shade house | threshold | AssertionError: expected 0.15174041665159166 to be less than 0.15 |
| flora.test.ts | grows slender stands whose floors darken from birch to oak to beech | threshold | AssertionError: expected 16.989173766600544 to be greater than 60 |
| flora.test.ts | orders shade tolerance pine < willow < rowan < maple < holly, hornbeam | threshold | AssertionError: expected 3 to be +0 // Object.is equality |
| flora.test.ts | lets the mixed wood's pioneers give way to beech, with holly and hornbeam beneath | out of WASM memory | RuntimeError: unreachable |
| species.test.ts | grows the birch with steep fine branches and broadens it with age (ontogeny) | out of WASM memory | RuntimeError: unreachable |
| flora.test.ts | brings goat willow back to a clearing only through seed rain (ADR 0018) | out of WASM memory | RuntimeError: unreachable |
| forest.test.ts | thins a dense stand along a log–log line; size inequality rises with density | threshold | AssertionError: expected 60 to be less than 24 |
| forest.test.ts | refills a felled canopy tree's gap from seed | timed out | Error: Test timed out in 90000ms. |
| forest.test.ts | removes the open-edge effect: edge trees no longer lean out (periodic sides) | threshold | AssertionError: expected 1.475360977045254 to be greater than 1.5 |
| mechanics.test.ts | bends old limbs down and turns their tips up (open-grown tree) | threshold | AssertionError: expected 0 to be greater than 10 |
| mechanics.test.ts | weeps: most twigs hang below −30°, against a quarter without R3 | threshold | AssertionError: expected 0.7182901706886404 to be less than 0.35 |
| mechanics.test.ts | straightens a plagiotropic leader into an upright trunk (Troll), and sprawls without posture | threshold | AssertionError: expected 55.63234246817537 to be greater than 60 |
| mechanics.test.ts | raises the Leonardo exponent above 2 where heavy laterals carry stress wood | threshold | AssertionError: expected 6 to be greater than 20 |
| mechanics.test.ts | rights a seedling planted at 40° within a few seasons, overshooting a little (§10, Bastien et al. 2013) | threshold | AssertionError: expected 14.218107411876213 to be greater than 30 |
| mixed.test.ts | lets a lone tree grow squat, while a stand still grows slender (3 seeds) | threshold | AssertionError: expected 11.408213962497285 to be greater than 12.13839816988523 |
| r2-physiological-age.test.ts | grows whorls at the start of each growth unit on a Massart trunk | threshold | AssertionError: expected 4 to be 2 // Object.is equality |
| r2-physiological-age.test.ts | slows a young tree's height growth, most while it is small | threshold | AssertionError: expected 86.08133160603226 to be greater than 95.9878014819603 |
| release.test.ts | flushes epicormic shoots on the neighbours' trunks after a tree is felled | threshold | AssertionError: expected 26 to be greater than 40 |
| release.test.ts | makes stand trees slenderer (H/D in the 60–80 target), open-grown ones stay squat | threshold | AssertionError: expected 20.002141623511417 to be greater than 60 |
| sky.test.ts | lifts the crown base in a stand but not on an open-grown tree (§8 single vs multi) | threshold | AssertionError: expected 1 to be greater than 15 |
| sky.test.ts | grows stand trees with realistic slenderness, open-grown trees squatter (§10, M6c) | threshold | AssertionError: expected 11.91590486875624 to be greater than 50 |
| sky.test.ts | lets an overtopped tree keep a deeper crown than the absolute rule does (Sprugel 2002) | threshold | AssertionError: expected 12.876808338405338 to be greater than 26.281533464762123 |
| sky.test.ts | measures full light on bare ground and less under a crown | threshold | AssertionError: expected 0.751901968382299 to be greater than 0.8 |
| sky.test.ts | lets 2–10% of open-sky light reach the floor under a closed stand (5 seeds) | threshold | AssertionError: expected 0.1518144052266265 to be less than 0.1 |
| species.test.ts | grows the tropical tree as a pagoda of flat tiers, widest at the base (Aubréville) | threshold | AssertionError: expected 54.31338616488235 to be greater than 60 |
| world.test.ts | alternates lateral sides along each axis (distichous, §C1) | threshold | AssertionError: expected 1 not to be 1 // Object.is equality |
| world.test.ts | frees dead trees' rows without changing any live tree, and never replants them | threshold | AssertionError: expected 0 to be greater than 5 |
