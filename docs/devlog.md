# Devlog

Newest first. One entry per session or milestone: what changed, why, surprises, and any golden-hash updates with their reason.

## 2026-10-29: 3D port, the faces' transmission τ; ADR 0024 held open

- **User:** the 3D stands read as hedges. They argued that this is structural: open faces light the lower crown, and nothing prunes lit foliage. They asked for a face transmission τ, the R6 set at D = 48 and 64 for τ ∈ {1, 0.5, 0.2, 0}, and a 42-cell planting, all on the proto page. ADR 0024 is held at accepted-in-principle with D and τ open.
- **τ** (`cli/slab-light.ts`, default 1, so the bench is unchanged): the padded line beyond each z face carries depth −ln τ / k_ext. It is set per face (front, back), and τ = 1 reproduces the prototype's stands exactly.
- **Added, not asked:**
  - a wood edge (1 in front, 0 or 0.2 behind), since a symmetric τ cannot make one;
  - the "below half" share on today's full 2D model, as an anchor;
  - a picture-cover measure, because the share did not separate the 3D stands from the garden.
- **Measured** ([note](experiments/2026-10-29-face-transmission.md)):
  - **The lower crown follows τ:** τ 1 keeps 12–16% of each tree's leaves below half height and covers 26–33% of the picture's lower half; τ 0.5 7–9% and 14–19%; τ ≤ 0.2 0–2%. The edge gives 4–7%, on the viewer's side.
  - **At τ < 1** crowns stop short of the faces and nothing piles, and m falls 12–38%.
  - **The 42-cell planting** gives separate domes, as leafy low as the closed row.
- **Surprise: today's 2D garden is as leafy below half height** (`forest`, `mixedWood` 13–15%; `oakOpen` 36%), but it covers 1–3% of the picture there. The 3D stands put 10–20× the leaves on the same picture at every τ. **The hedge is half faces, half density,** and the density is calibration's.
- **Review §2d:** per look, hedgerow 1, 1 at D 64 (≈ 75 ms on the phone); wood edge 1, 0.2 at D 64 (≈ 71); wood interior 0.2, 0.2 at D 48 (≈ 56) or 64 (≈ 69). One D for all looks, 64, since τ is a world parameter the garden can expose and D is fixed per world.
- **Site:** `preview-3d` carries 24 more stands (108 MB in all), with τ, edge and spacing controls on `proto.html`.
- **Nothing in `src/`, the goldens or the default light model changed.**

## 2026-10-29: 3D port, G1 passed; a throwaway 3D prototype; ADR 0024 accepted

- **G1 (user, on a Pixel 8a and an X1 Carbon):**
  - 4-lane WASM SIMD light at D = 32 takes 32 ms on the phone (rule: 150) and 13 ms on the laptop; D = 64 takes 43 and 32 ms.
  - Single-threaded the phone is within 15% of the laptop, so M15's 2.7× is replaced.
  - Lane scaling: phone 1.5–2.0×, laptop 2.3–3.2×.
  - The results are in the open-slab note's addendum.
- **Prototype** ([note](experiments/2026-10-29-proto3d.md)): throwaway, outside `src/`.
  - **What it reuses:** the core's `Tree`, its tables widened at run time by 3D columns, and its dimension-free passes by import (C3, R1, C5, C6, R6).
  - **What is new:** C1 laterals by divergence angle, C4 as a vector, and the slab sweep, open z with face clipping and an optional 3-cell fade.
  - **The stand:** `forest`'s planting for 100 seasons at D = 32, 48 and 64.
- **Surprise: the requested rules stunt the trees.** Under C1–C6 and R1 alone, 2D and 3D both stop at height 48 by season 40, because dormant buds keep leaves and their cost. With R6 (no new code) the trees reach 85–90, so a second set runs with R6, labelled.
- **Measured:**
  - **m:** 13–26 while growing, about 8 at a plateau, nearly independent of D.
  - **Passes:** 1.1–1.8× a 2D metamer's cost, up to 2.7× in the fastest growth.
  - **Crowns:** free crowns about 0.8 × height deep.
  - **Faces, with R6:** foliage stacks at them. At D = 32 the fade moves the pile but does not cure it; at D = 48 it cures it; at D = 64 crowns taper of their own accord.
- **Re-projected** (review §2): `forest` on the phone at season 40 costs ≈ 61–75 ms at D = 32–64 under SIMD and lanes, and single-threaded SIMD fits the intro too. D is chosen by the crowns: **D = 64 with the 3-cell fade**.
- **The page:** `proto.html` on the site preview draws the 3D stands orthographically beside today's view of the same planting grown in 2D. They are uncalibrated and read as hedges (open-z side light keeps lower crowns leafy).
- **ADR 0024 accepted,** with D and the fade filled in, for the user to confirm before G2.
- **Nothing in `src/`, the goldens or the default light model changed.**

## 2026-10-29: 3D port, re-costed at the open slab; G1 at three depths

- **User:** G0.5 revealed a misunderstanding.
  - **The aim:** the port is for trees that grow in 3D (branches toward and away from the viewer, crowns as volumes), drawn as today's orthographic frontal illustration in z order, with no perspective, darkening or second rank.
  - **The world:** open in z, the faces clipping growth but not light.
  - **D:** deferred to I2.
  - **Gates:** G0.5 is not a gate; the visual check is after I2.
- **Measured** ([note](experiments/2026-10-29-open-slab-cost.md)): light at D = 32 / 48 / 64, open z, K = 16, Float32.
  - **TypeScript:** `forest` 241 / 362 / 472 ms, `panorama` 826 / 1291 / 1613.
  - **WASM SIMD, 1 lane:** `forest` 54–111 ms.
  - **4 lanes** (desktop browser, the updated G1 page): `forest` 23 / 28 / 43 ms.
  - **Light in 2× cells at D = 64:** 1/8 of fine.
- **Crowns:**
  - Home-wood species grown alone are 45–137 cells wide at season 100. The faces clip beech, hornbeam and oak at every D.
  - Side-lit crowns carry 0.8–2.4× a closed stand's leaf area per column.
- **Re-costed** (review §2): under Rust, SIMD and 4 lanes the phone's `forest` intro holds at D = 32 (≈ 197 ms), not at 48 (≈ 273) or 64 (≈ 358). At D ≥ 48 the estimated tree passes dominate, so coarser light cells don't buy the same result.
- **Disagreements, written into the review:**
  - face clipping piles foliage at the faces and shifts allocation, so D shapes the crowns and V should see two values of D;
  - a throwaway 3D prototype (about two sessions) could give a first look before the Rust work.
- **Pages:**
  - the G1 page runs all three depths and the coarse lattice, with the stop rule at D = 32;
  - the G0.5 page carries a "superseded" banner.
- **ADR 0024 restated,** still proposed.
- **Nothing in `src/`, the goldens or the default light model changed.**

## 2026-10-29: 3D port, G0.5: a frontal slab preview, and the review amended

- **User:** the measurement and review are accepted. Before G1 and before the ADR leaves *proposed*, they asked for:
  - G0.5, a frontal preview judged by eye on their phone, with both z boundaries, on a COOP/COEP preview deploy;
  - four amendments: the z boundary left open, the pyramid on equal terms, the WASM gate argued, and the 2D freeze in sessions.
- **Merged `claude/gallant-brown-5k4g33`** (garden-v0.14.0, M26–M27b) into this branch. Reasons:
  - the preview's "today" panel and stands must be the live garden's code and species;
  - that branch already has ADRs 0019–0023, so this port's ADR is renumbered **0024**.
- **G0.5** ([note](experiments/2026-10-29-g05-slab-preview.md)):
  - **Stands:** grown home woods at 66 and 520 cells (seeds 9, 10, 12; seasons 60, 100).
  - **Depth:** per-limb golden-ratio targets, each limb continuous in depth.
  - **Drawing:** the garden's WebGL2 renderer with only its draw call replaced at run time (perspective about the trunks' line, depth darkening, far-to-near slices).
  - **Panels:** today, open z (a hedgerow), and periodic z (with the clone rank drawn behind).
  - **Where:** deployed on the site's `preview-3d` branch with global COOP/COEP (never to merge).
  - **COEP check:** locally, with the same headers, every page is cross-origin isolated with no failed request. The site has nothing cross-origin.
  - **Not verified:** the deployed URL; the container cannot reach the site.
- **G1 page** on the same deploy: WASM SIMD in 4 lanes, each a worker with its own instance, takes 22 ms in desktop Chromium (1 lane 70, TypeScript 335).
- **Surprise: the pyramid on equal terms.** In Rust, with a precomputed 40-cell cone, it costs 33–35 ms single-threaded against the sweep's 63–153, and about the same threaded. The TS-only rejection was unequal. The sweep is kept on behaviour (side light through open faces, the light-weighted V, the M6–M27 calibrations), and the pyramid becomes the fallback.
- **Surprise: the clone under periodic z** is not only a calibration matter. Tap-to-fell would fell every rank at once.
- **Bundle:** `src/core` is 19 kB of the garden's 55.5 kB gzipped. The scratch WASM is 28–32 kB (mostly std) and compiles in 0.3 ms. 3D first-paint *data* (MB-sized checkpoints) outweighs any code gate.
- **Review and ADR 0024 amended**, still proposed:
  - the z boundary is the user's, with both options' consequences set out (Qz);
  - the pyramid is compared on equal terms;
  - the WASM moves after first paint, with ADR 0014's 60 kB kept;
  - the 2D freeze is costed at 5–8 sessions, narrowable to I1's 3–5;
  - I1 is described as an end state on its own;
  - no calibration before the user has seen I2.

## 2026-10-29: Should the model go 3D? The measurement, and a go/no-go review

- **User:** review a 3D port (a slab one crown deep, seen from the front; threads allowed on edbarker.dev), measuring before judging. Do not start the port.
- **Measured** ([note](experiments/2026-10-29-3d-light-cost.md)):
  - **The bench:** `cli/bench.ts --slab model:D:K:precision[:periodic]` times a scratch 3D light model (`cli/slab-light.ts`) on the real run's deposits. Behaviour, goldens and bench hashes are unchanged.
  - **D:** canopy crowns are 20–30 cells wide, so D = 32.
  - **The 3D row march:** 24–28 ns per cell–direction update in TS (2D: 18–24), linear in D·K. At D = 32, K = 16: `forest` 250–290 ms, `panorama` ≈ 700, about 100× the 2D light.
  - **The pyramid:** its deposit is cheap, but the V cone search takes 21 µs a sample, which makes it dearer than the sweep at 3D bud counts.
  - **The kernel in Rust:** scalar WASM 2.0×, SIMD f32 5.2× (24 kB gzipped); 4 native threads a further 2.6–3.0×, but only with a private partial field per thread (reductions cap it at 1.5–2×).
- **Surprise:** Float64 WASM gave bit-identical Q to the TS kernel, `exp` included, so a bit-identical Rust port of the 2D goldens looks attainable.
- **Surprise:** foliage per ground column is the same in every 2D stand (Beer–Lambert sets it), so a closed slab carries D × closure ≈ 22–32× the metamers, more than the brief's 5–20×.
- **Review** ([review](reviews/2026-10-29-3d-port-review.md)):
  - per-season projections for TS, scalar WASM, SIMD, and SIMD with threads;
  - answers to the brief's open questions;
  - about 8 calibration milestones, about 14 in all.
  - **Recommendation:** go with a reduced scope, through cheap gates, starting with G1 (the kernel on the user's phone).
- **ADR 0024 (numbered after the 0019–0023 of M26–M27)** is proposed and awaits the user. Nothing in `src/` changed.
- **Scratch code:** in `docs/experiments/code/2026-10-29-3d-port/` (Rust crate and harnesses), outside lint and typecheck.
## 2026-10-28: M27b, the fitted species adopted (ADR 0023)

- **User:** fit the rest by hand and put the fits on the site.
- **Hand adjustments** (`analysis/fit/hand-overrides.toml`, with reasons; [note](experiments/2026-10-28-m27-fits.md), M27b):
  - holly: Q_ss 0.013, m_f 0.025, Q_est 0.01, h_j 20; it had starved out of the mixed wood under the fitted beech's measured 1.3–1.5% floor;
  - rowan: Q_ss 0.06;
  - pine: Q_ss 0.2 and L_h 30, bounding its height after season 100.
- **Adopted:** `FLORA` = `FITTED_FLORA` (`flora-fitted.ts`, generated by `m27_adopt.py`); the hand-tuned species are kept as `HAND_FLORA`.
- **Mixed wood:** all species present through season 200; by 400 beech and hornbeam dominate, oak is gone, and holly, rowan and willow are thin (0.3–0.7 a run).
- **Tests:**
  - 7 species expectations updated from measured values (e.g. oak's seedlings now need ≈ 13% light);
  - the acrotony and posture tests pinned to `HAND_FLORA.oak`;
  - goldens unchanged.
- **Surprises:**
  - storms and slenderness were not what removed holly; starvation was;
  - `c5.enabled: false` does not stop R1's carbon shedding.

## 2026-10-28: M27 round 2

- **Run in session** (the user away): `--start round1 --restarts 2,0 --generations 50 --seeds 3`, 79 minutes for all ten ([note](experiments/2026-10-28-m27-fits.md), round 2).
- **Fits:** every measured target is within one band for every species. Losses range from 0.82 (birch) to 7.81 (beech); only described crown traits remain.
  - Fir: 11.3 → 4.5, with the largest h_j (87).
  - h_j orders the species sensibly: large for fir, beech and holly; small for willow, birch and pine.
- **Hold-out:**
  - survival 7 of 10 in band, Spearman −0.91;
  - holly (8.5%) is still out, and rowan and pine are too tolerant;
  - in the mixed wood, fitted beech dominates (3.3 a run) and holly, rowan and willow are gone by season 400;
  - fitted pine is 31 m at 100 (table 29 m) but still reaches the world's top by 200.

## 2026-10-28: M27 round 1, and the juvenile phase (ADR 0022)

- **Round 1** ([note](experiments/2026-10-28-m27-fits.md)): the user ran all ten fits (1 h 51 min).
  - Nine beat their hand-tuned patch, most by 5–80×. Holly tied (2.43 against 2.30); fir stayed high (11.3).
  - **The hold-out:**
    - shade tolerance drifted (Spearman −0.98 → −0.90; holly 8.5% against 2–5%);
    - the fitted mixed wood lost willow and rowan, and holly and oak were down to 0.17 trees a run;
    - fitted fir and pine reached the world's top (160 cells) by season 150.
  - **Kept** in `docs/experiments/fits/round1/` with `round1` figures.
- **User:** move shade survival into the fit for the four measured species, and do the juvenile-phase model change now.
- **Juvenile phase** (`r2.hJ`, default off, goldens unchanged; spec §R2.4; ADR 0022):
  - the shoot cap rises from 1 metamer to `c1.maxMetamersPerShoot` as the tree grows to h_j (`juvenileCap`);
  - with h_j 80, pine's curve error against its table falls from 0.12 to 0.02, oak's from 0.12 to 0.08 and fir's from 0.27 to 0.11;
  - three unit tests in `r2-physiological-age.test.ts`.
- **Fit changes** (ADR 0020 addendum):
  - `shade.survivalLight` is fitted for birch (21%), oak (11.4%), beech (3.4%) and hornbeam (3.3%);
  - `stand.lateShare` (H100/H60) for every species, with `runStand(…, late)` and fit-eval's `stand100`;
  - fir's H30/H60 goes to half weight;
  - `r2.hJ` is free on 2–150 (log).
  - Smoke fit of all ten passes. A candidate costs about 1.6× as much.
- **Faster refits:** `m27_fit.py --start round1` starts warm restarts from an earlier round's fits; parameters new since start mid-range. A candidate's time is ≈ 70% the 100-season stand (≈ 0.3 s a seed), so round 2 runs 2 warm restarts, 50 generations and 3 seeds, an estimated 4–5× faster.
- **Fixed:** the round-1 note of a fitted "oak needs 6.3%" was a shade-leaf value; saplings need 11.4%.

## 2026-10-28: M27, a hyperbolic hydraulic discount (ADR 0021)

- **User:** adjust the model so species stop levelling off early, aiming at realism; leave the home forest unchanged until fitted patches are adopted.
- **The switch:** `r1.hydraulic: "exp" | "hyperbolic"` (default `exp`, goldens unchanged). The hyperbolic form discounts production by 1/(1 + L_path/L_h), a resistance growing linearly with path length.
  - Unit test in `r1-carbon.test.ts`.
  - Spec §R1 amended; ADR 0021.
- **The comparison** ([note](experiments/2026-10-28-m27-height-curves.md), addendum; table 4 of `cli/height-diagnosis.ts`):
  - with the hyperbolic form, stand top heights follow the yield tables after season 30, hornbeam and beech to within about a metre;
  - the lone willow no longer shrinks;
  - juvenile growth is still too fast (oak, pine, fir).
- **Fits:**
  - Each targets file gains `[fixed] "r1.hydraulic" = "hyperbolic"`, applied to every candidate and written into the fitted patch.
  - L_h is searched over 10–200 on a log scale for all species.
  - The hand-tuned comparison keeps `exp`.
  - Smoke fits of all ten and the hold-out pass (hold-out ρ hand −0.98, smoke-fitted −0.94).

## 2026-10-28: M27, diagnosis: the shrinking willow and the early height plateau

- **User:** find out why the lone willow's height falls after season 30, before running the fits.
- **Willow** ([note](experiments/2026-10-28-m27-height-curves.md); `node cli/height-diagnosis.ts`): sag after a plateau. Not dieback, not shedding.
  - **The plateau:** R1's path discount with willow's short L_h (30) stops height at about season 25. The leader passes from lateral to lateral, so the path to the top is 1.56 times the height.
  - **The loss:** R3's posture correction is capped by relative girth growth (c · Δr / r), so once growth stalls, loaded limbs settle by up to 12 cells.
  - Willow's c is the default 0.05 (as for birch, rowan, fir and pine; 0.15 for the others).
  - **Within the fit's bounds:** L_h 60 gives H30/H60 0.78, and L_h 45 with c 0.3 gives 0.87, with no seed shrinking.
- **Surprise:** `c5.enabled: false` does not stop shedding under R1's `carbon` mode (by design, season.ts); ablate it with `r1.shed: "c5"` too.
- **Every species:**
  - The early plateau is structural. L_h at its upper bound (100) moves H30/H60 by 0.01–0.06; L_h 200 nears the yield tables but overshoots height by 25–100%.
  - Stand top heights level off as early as lone trees.
  - The fits will show whether α, λ or m_f can slow the juvenile ramp. If not, a slower juvenile phase is a model change for its own decision.

## 2026-10-28: M27, willow's yield table and estimated floors for the rest

- **User supplied** (`analysis/fit/sources/`):
  - `minor_species_growth_curves.csv`: willow from the Arkhangelsk tree-willow yield tables (Paramonov et al. 2021), and fitted estimates for rowan and holly;
  - `floor_light_targets.csv`: floors for fir, maple, holly, rowan and willow, regressed on tolerance score from Hagemeier & Leuschner's five species.
- **Willow:** H30/H60 is 0.73 ± 0.06, now measured (was 0.9 from horticultural profiles). Stand height is 52 ± 14 cells, between British field guides and taiga stands (16.6–18 m).
- **Rowan and holly:** fitted-curve estimates at half weight. Rowan is 60 cells with ratio 0.74; holly 41 cells with ratio 0.63, for open or edge growth.
- **Floors** (estimates, half weight): fir 1.3% (was 4%), maple 4.5%, holly 2%, rowan 7.5% (was 12%), willow 12%.
  - **A caveat:** they come from the tolerance score that the hold-out tests against.
- **Held-out survival bands:** rowan 8–14% and maple 5–10%.
- **Hand-tuned misses:**
  - willow's lone tree shrinks after season 30 (H30/H60 1.03, 5.1 bands);
  - fir's floor is 6% against 1.3% (5.9 bands at half weight).

## 2026-10-28: M27, hornbeam's yield table and Hagemeier & Leuschner's full numbers

- **User supplied:**
  - Lockow & Lockow 2009's hornbeam yield table, extracted to CSV (`analysis/fit/sources/`);
  - Hagemeier & Leuschner 2019's full-text values, gathered by their research agent;
  - Dobrowolska 2008 on light under pine.
- **Hornbeam:** stand height 84 ± 13 cells (20.3–22.0 m at 60, site index 25–27) and H30/H60 0.67 ± 0.05, both measured. The field-guide guess (68) was low.
- **Floors (overcast PAR):**
  - hornbeam 1.5% ± 0.8;
  - pilot birch 15% ± 5 (was 18%);
  - pilot beech 1.5% ± 0.8 (was 3%, from M19's 2–5%);
  - pine 17% (described), scaled from birch by Dobrowolska's ratio.
- **Held-out survival bands** from the saplings' minimum light demand: birch 15–25%, oak 8–14%, beech and hornbeam 2.5–4.5%. Pine and willow move up to stay in score order.
  - **Correction:** the previous entry quoted shade-leaf values (oak 6.3%, hornbeam 2.5%) as if they were the saplings'.
- **Generator bug fixed:** survival bands were printed to two decimals, rounding 0.015 and 0.045 to the wrong edges.
- **Hand-tuned misses:**
  - beech's floor (3.3%) is now 2.2 bands too light;
  - hornbeam's stands are short (63 cells against 84) and its curve levels off early (0.81 against 0.67);
  - birch's seedlings survive 13%, where saplings need 21% (a hold-out).

## 2026-10-28: M27, measured targets for the eight newer species

- **User:** find measured canopy transmittance and height-growth curves, and tighten the targets.
- **Found** ([research note](research/2026-10-28-species-traits.md), "Sources found"):
  - **Yield tables** for oak and pine: the NW-FVA tables, read from the data in CRAN `et.nwfva`.
  - **Fir:** the Tirol fir tables (from Baden-Württemberg's).
  - **Field maple:** heights from the 2012 national forest inventory (LWF Wissen 77).
  - **Transmittance:** oak (median 8.4%) and hornbeam (1–3%), from Hagemeier & Leuschner 2019.
- **Now measured at weight 1:**
  - **Heights:** oak 78, fir 80, maple 64 and pine 84 cells, with narrower bands.
  - **H30/H60:** oak 0.62, fir 0.42 and pine 0.60.
  - **Floors:** oak 8.4% and hornbeam 2%.
- **Described curve shapes revised** from growth descriptions: willow 0.9, rowan 0.78, maple 0.7.
- **Checks on the held-out survival bands:** saplings' minimum light demand is oak 6.3% and hornbeam 2.5%, both in band. Birch's is 21%, above its 10–15% band (pilot, unchanged).
- **Surprise:** with measured curves, the early height plateau is the largest miss. Hand-tuned oak, fir and pine sit 3.6–4.1 bands above their H30/H60.
- **Not found:** curves for hornbeam, rowan, willow and holly; per-species transmittance for maple, holly, rowan, willow and fir. MDPI blocks automated downloads, so only the abstracts and excerpts of Hagemeier & Leuschner were read.

## 2026-10-28: M27, targets and fitting for all ten species

- **User:** fit all ten species, not only the pilot. Fir and pine keep their level-1 η at about 1.5–2.
- **Targets** for oak, fir, hornbeam, field maple, holly, rowan, goat willow and Scots pine (`analysis/fit/targets/*.toml`; [research note](research/2026-10-28-species-traits.md)):
  - heights from yield models or field-guide mature heights, converted to age 60, and H/D from MacFarlane and Watt, at weight 1;
  - floors, growth-curve shape and form described, at weight 0.5;
  - survival-light bands and Niinemets & Valladares scores held out.
  - The literature searches returned abstracts only, with no per-species transmittance numbers, so the floors are bands set by the M25 ordering.
- **`m27_fit.py`:**
  - `--species all` writes each species' result as it finishes;
  - `--skip-done` resumes an interrupted run;
  - `--budget quick` (`FitSettings.budget`) runs one warm and one random restart, 50 generations, 4 seeds.
- **`m27_holdout.py`** checks every species with a results file:
  - the Spearman ρ of survival light against the tolerance scores;
  - the mixed wood with all fitted patches at once;
  - fir and pine in `firWood` and `pineWood` (200 seasons);
  - progress and silhouette panels for every species.
  - **Fixed:** the "open" lab links planted `oakOpen`'s oak, not the fitted species.
- **Smoke:** all ten species fit in 27 s and the hold-out takes 27 s, on 16 cores. Hand-tuned ρ = −0.98.
- **Surprise:** every hand-tuned species' height at 30 over height at 60 is 0.64–1.03, above every target (pilot included). Height growth levels off too early everywhere, through R1's plateau.
- **Handed to the user:** the fits, `m27_fit.py --species all --skip-done` (20–40 minutes per species, full budget).

## 2026-10-28: M27 machinery: fitting species to literature traits

- **Targets** ([research note](research/2026-10-28-species-traits.md)): 13 traits each for birch and beech in `analysis/fit/targets/*.toml`, 17 free parameters with bounds. Heights from site-index studies (as commonly reported ranges; the searches returned abstracts only); shape and angles are descriptions turned into wide bands at half weight.
- **Trials** (`src/core/trials.ts`): lone, stand, shade house and a felled-gap release, M25's settings, now shared with `flora.test.ts` (unchanged results). Candidates are dotted-path assignments (`amendSpecies`), applied over the species' effective params.
- **Evaluator** (`cli/fit-eval.ts`): a long-lived JSON-lines process per core; ≈ 0.6 s per tree-run here.
- **Driver** (`analysis/treesim/fit.py`, `m27_fit.py`): CMA-ES (`cmaes` 0.13) in a unit cube, common random seeds per generation, three warm and two random restarts, finalists re-measured on 10 fixed seeds beside the hand-tuned patch.
- **Hold-out** (`m27_holdout.py`): shade survival and its order across the ten species, Δ and the M26 slopes, release, the mixed wood over 400 seasons, plausibility (bounds, restart spread), crown silhouettes and lab links.
- **Smoke runs** pass end to end (6 s and 10 s). The hand-tuned birch scores 8.1 (stand height 69 against 95, open H/D 63 against 48); beech 7.8.
- **Handed to the user:** the two full fits (≈ 20–40 minutes each on 12 cores).

## 2026-10-28: M26, measurements, polish and the loupe

- **User:** agreed M26 and M27 (plan reviewed in session): polish with small fixes, shareable lab links and the loupe; retire the old species presets; crown-shape targets from literature numbers; fitted values reported, not adopted; long computations handed to the user.
- **Form metrics** (`src/core/form.ts`, CLI `form.csv` at snapshot seasons):
  - the crown's width profile in 10 bands, widest band, centre and fullness;
  - apical control (fork height, leader dominance), order-2 angles, limb droop and upturn;
  - median Δ, the length–diameter slope and the leaf–section slope.
  - They separate the species as field guides do (fir and holly cones; oak and willow fork low).
- **§10 validation** ([note](experiments/2026-10-28-m26-validation.md), 230 runs, 77 s):
  - neighbour response and gravitropic recovery match; Δ trivially;
  - **misses:** the l–d slope is ≈ 1, not 2/3 (limbs are geometrically, not elastically, similar), and the leaf–section slope is 0.46–0.75 (total section area includes heartwood);
  - crown shyness has no link to slenderness (O2 off, as expected);
  - birch's open crown is an hourglass and beech's is bottom-heavy: targets for M27.
- **New knobs:** `trees[].lean` (a tilted seedling); `patchSpecies` and CLI `--species-patch`. **Surprise:** a `species` entry in a params patch *replaces* that species' whole patch (`mergeParams` merges two levels), so the first lean runs silently grew every species with default params.
- **Polish:**
  - The lab frames a ring whole and draws the copies either side, so crowns wrap at the seam.
  - `skyTree` is 160 cells tall (golden-safe: nothing differs until the tree nears the old top).
  - No R3 preset sinks limbs below the ground by season 100, so `r3.ground` stays as it was.
  - `npm test` and `golden:update` stop under Node < 24 (`cli/require-node.mjs`).
- **Retired presets** (ADR 0019): `conifer`, `coniferStand`, `birch`, `birchStand`, `tropical`, `weeping` and `troll` moved to `src/core/fixtures.ts`. Goldens keep their keys and hashes; the CLI still runs them; the benches use `firWood` (new baseline `runs/bench/efb3bbd.json`).
- **Shareable lab links:** `?preset&seed&p`, `p` a base64url `diffParams` patch; a Copy link button; a broken link falls back with a notice.
- **The loupe** (`render/loupe.ts`): hold 450 ms to open a glass at 4× with true-scale leaves; a hold is never a tap and stops panning and scrolling. **Surprise:** the glass first cost ≈ 130 ms a frame in headless Chromium, drawing the whole forest off-screen; Canvas 2D now culls to the view (≈ 5 ms). It shows whatever the adaptive quality, since it is drawn only while held.
- **Checks:** 232 tests pass; goldens unchanged; garden 56.1 kB gzip (gate 60). Seen headless in the lab (ring seam, link round trip, loupe) and in `garden.html` at desktop and phone sizes.

## 2026-10-28: garden-v0.12.0 live

- **Release:**
  - PR #19 merged with CI green.
  - The session's tag push was refused again (403), so the user pushed `garden-v0.12.0`.
  - The release was byte-identical to the site branch's local build.
  - Site PR #6 merged to production.

## 2026-10-28: M25 follow-ups: maple's shade and seed rain

- **User:** do the three M25 follow-ups, and agreed to extend O4 with seed rain.
- **Field maple:**
  - its floor was as dark as beech's (3.4%), and it was as common in the canopy as hornbeam;
  - it now has a lighter crown (a_ss 1.5), cheaper leaves (m_f 0.04) and thicker tips (r₀ 0.024);
  - its floor is 4.0%, between oak's and beech's; shade survival (5%) and the round crown are kept;
  - in the mixed wood it holds 0.2–1 canopy trees.
  - **Surprise:** a lower α alone did not lighten the floor.
- **Seed rain** (ADR 0018, spec §O4 amended):
  - `o4.rain` gives seeds per 100 cells a season from beyond the world, per species, establishing by the usual rule;
  - it has a new RNG purpose, `seedRain` (13), keyed by an FNV hash of the species name;
  - it is off by default, so goldens are unchanged;
  - values: willow 1, birch 0.2;
  - a 60-cell clearing at season 300 gets 1–2 willows in every seed, against none without rain;
  - the closed wood is almost unchanged.
  - **Surprise:** birch at 0.5 kept birch in the canopy past season 350.
  - The lab's O4 folder has a slider for it.
- **Tolerance scores:** checked against Appendix A (the user supplied it). Pine, rowan, maple and hornbeam matched.
  - **Goat willow** scores 2.16, a shade above birch's 2.03, where the model had it below. Its Q_ss is now birch's (0.12), and it survives 13%.
  - **Beech against hornbeam:** that let hornbeam outgrow beech in the mixed wood. Hornbeam's leaves now cost a little more than beech's (m_f 0.045), as its lower score (3.97 against 4.56) suggests, and beech leads again.
- **Checks:**
  - The daily seeds 9, 10 and 12 still look right.
  - Garden: 55.5 kB gzip. Tests: 219 pass (a seed-rain unit test and the clearing test are new); goldens unchanged.
  - **Six-seed totals:** the mixed-wood and clearing tests now sum over six seeds, since single seeds vary too widely (one grows no beech). The suite takes 77 s, against 51 s.

## 2026-10-28: garden-v0.11.0 live

- **User:** previewed M25 and gave the go-ahead.
- **Release:**
  - PR #18 merged with CI green.
  - The session's `git push` of the tag was refused (HTTP 403), so the user pushed `garden-v0.11.0` and the workflow built the release.
  - The release was byte-identical to the site branch's local build.
  - Site PR #5 merged to production.

## 2026-10-28: garden-v0.10.0 live; M25, six new species and the mixed wood

- **Release:** `garden-v0.10.0` had already been built by the workflow when PR #17 merged. Here the site's `claude/m24-plate` was re-synced from that release (only gzip headers and source maps differed from the local build), and site PR #4 was merged to production.
- **User:** release 0.10.0 and go on to M25, the new species.
- **Species** (`flora.ts`; [note](experiments/2026-10-28-m25-species.md)):
  - **Hornbeam:** Troll's model like beech, but slower and smaller.
  - **Field maple:** round, with stiff, ascending limbs.
  - **Holly:** an evergreen cone that keeps its shaded limbs.
  - **Rowan:** steep limbs.
  - **Goat willow:** broad, low and short-lived.
  - **Scots pine** (lab): whorls and a high crown in a stand.
  - **Shade survival:** willow and pine 19%, rowan 8%, maple 5%, hornbeam and holly 3%, the expected order.
  - **The small trees mature small** (`r1.maturity` 20–30), so they seed.
- **Presets:** `mixedWood`, the new home forest (`forestParams`): nine species around the ring, with three birch and a willow pioneering. `pineWood` for the lab. `succession` stays as M19 left it.
- **The mixed wood over 400 seasons:**
  - birch leads for a century and is gone by 400;
  - willow dies out by about 225;
  - beech rises to the most canopy trees, with hornbeam beside it;
  - holly, rowan, maple and oak persist.
- **Page:**
  - leaf styles and palettes for the six (palmate maple, spiny evergreen holly, pinnate rowan, ovate hornbeam, a broad willow leaf, long pine needles), with light, dark and autumn tokens in `scene.css`;
  - the lab's leaf menu lists every species;
  - the daily seeds are re-chosen by eye for the new mix: 9, 10, 12.
- **Surprises:**
  - **Opposite buds on every axis** gave maple a floor darker than beech's. Maple is decussate, so only every other pair lies in the plane; it now uses distichous buds.
  - **Holly overran the wood** at a seed cost of 4. It is dioecious, so a doubled cost now stands in for its fruitless males.
  - **The lone willow and pine were lollipops** at birch's T_rel 0.4; they now use 0.25 and 0.3.
  - **This container's Node is 22,** and the goldens fail under it (they pass on 24, as in CI). Node 24 was installed from npm into the scratchpad.
- **Not done:**
  - the new species' tolerance scores are approximate (esapubs.org is unreachable from the session);
  - maple's shade is a little dark;
  - willow does not return after its first generation.
- **Tests:** 217 pass (4 new species tests, 1 leaf-style test); goldens unchanged. Garden 55.3 kB gzip (main 54.0).

## 2026-10-28: garden-v0.9.0 live; M24, the wide plate and leaf studies

- **Release:** PR #16 merged and `garden-v0.9.0` released; site PR #3 merged and deployed. The live time-lapse grows from seed 6.
- **User:** on a 2880 × 1800 laptop the content takes about 40% of the screen. Is that expected and best practice? Could leaves be both true to life and visible?
- **Answer:** the text column (768 px) keeps a 65–70 character measure, which is right for reading. Figures commonly break out wider.
- **Site:** on screens of 64rem or wider, the plate breaks out to min(1200 px, viewport − 4rem), with the caption and hint at the text measure.
- **Garden:**
  - **The plate's scale is set by the world's width,** so a wider plate alone would only add trees. `plateWidth` now gives landscape plates 0.7 of the aspect's width: on a 1200 × 624 plate, 175 cells at 6.85 px a cell, against 3.2 before.
  - **Leaf studies:** `leafStudy(tree)` gives the card the species' leaf as an SVG path with its real length (`LeafStyle.cm`). Outlines now live in `leaf-styles.ts` (`leafOutline`).
- **The limit stays:** true-scale leaves over a whole forest are 1–2 px. Painters and field guides draw leaf masses for trees and single leaves apart, and so does the site now.
- **Tests:** 212 pass, goldens unchanged.

## 2026-10-28: M23, leaves and the intro

- **User:**
  - leaves looked large, and each species' leaf should be its own and correct;
  - the growth at the start looked nice, so bring it back.
- **Spec §8 amended** (ADR 0017): the ξ, R4 and pooled-light rows follow M22.
- **Leaves:**
  - **One outline per species,** drawn by both renderers from one width profile: birch deltoid and toothed, oak lobed, beech oval and wavy-edged, needles thin. Palmate, spiny and pinnate outlines are ready for M24's maple, holly and rowan.
  - **Lengths** follow real leaf sizes (birch 0.5, beech 0.7, oak 0.85 cells, against 0.85–1.05 before).
  - **The minimum on-screen size** drops from 5 to 3.5 CSS px, which is what had made every leaf look large at plate scale.
  - **More leaves a shoot** (5–8), chosen by eye, keep the crowns full.
  - **Cost:** the CPU frame cost for the forest rises from 0.10 to 0.14 ms.
- **The intro is back.** The home forest grows from one of the chosen seeds a day (`seeds`). Grown forests are for reduced motion only (`first.when`).
- **Surprises:**
  - **The size floor.** At plate scale every leaf was held at the 5 px minimum, so the leaf length hardly mattered; the floor set the look.
  - **`half` is a reserved word** in GLSL ES 3.0.
- **Not done:** drawn density is matched to each species' simulated leaf area by eye, not exactly.
- **Tests:** 211 pass; goldens unchanged.

## 2026-10-28: M22, the §8 ablations

- **User:** a plan for all the remaining ablation tests and pooled light, plus new species. The suite may take longer.
- **Core:** `c2.model: "pooled"` (`light/pooled.ts`). Every leaf gets one homogeneous canopy's mean light, C·(1 − e^(−kL))/(kL), so competition is size-symmetric. It is in the lab's light menu too.
- **Tests:** `ablation.test.ts`, six ablations over 5 seeds. The suite has 209 tests and takes 17.7 s, against 13 s before; files run in parallel.
- **Findings** ([note](experiments/2026-10-28-m22-ablations.md)):
  - **As predicted:** C3 equal sharing (a low, broad crown that loses to its neighbour), R1 off (no plateau, no starvation, no self-thinning), R6 off (no foliage on old wood), and pooled light (size CV 0.3 → 0.03–0.11, no deaths).
  - **ξ = 0 departs:** crowns still lean into gaps through allocation and shedding; ξ is about a fifth of the lean under an oblique sun.
  - **R4 off departs:** the baseline lets any bud with v ≥ 1 grow, so gaps refill no slower. What R4 adds is the dormant bank and its release.
- **Surprises:** both departures. The spec's §8 table assumed phototropism and reiteration were the only routes; the model has more.
- **Goldens:** unchanged.

## 2026-10-28: garden-v0.8.0 live

- **Releases:**
  - PR #14 merged; `garden-v0.8.0` released.
  - The site synced from it; site PR #2 merged and deployed.
- **Determinism check:** the release's grown forests decompress bit-identical to the local build's. Only the gzip bytes differ, since CI's zlib packs about 3% looser, so the simulation is deterministic across machines.
- **Smoke test on edbarker.dev:** the grown forest shows 0.6 s after navigation on desktop, and phones get the 66-cell portrait forest.

## 2026-10-28: M21 step 2, art pass and first paint on the site

- **User choices:**
  - open on a grown forest;
  - no poster image;
  - Lighthouse through the installed Chrome (a Flatpak, so not on PATH);
  - art pass on phone composition, the choice of grown forests, and the night scene.
- **Grown forests:**
  - **Chosen by eye** from twelve seeds: 6, 9 and 10.
  - **At 40 seasons, not 60.** At 60 the stand has self-thinned into tall poles with small crowns: true, but not handsome.
  - **Widths** 66, 100, 160 and 220; 300 is dropped, since the site's plate never wants it.
- **Phone:** `plateWidth` gives a portrait plate two thirds of its aspect's width: about three trees, drawn large, filling the plate's height instead of its lower half.
- **Site** (branch `claude/m21-launch`):
  - the garden opens on the release's grown forests (`first`, read from the manifest at build time);
  - plate labels that would overlap, or be cut off at the edge, are dropped;
  - species inks in the Field guide's palette: the species tokens had fallen back to the garden's bright defaults;
  - **a moonlit night:** cool sky, silvered foliage, grey-brown bark, muted autumn.
- **Measured** (local build):
  - the grown forest shows 0.26 s after `load`;
  - Lighthouse mobile 100/100/100/100, largest paint 1.4 s, layout shift 0.001;
  - reduced motion shows the grown forest still.
  - Production scored 99/100/96/92 (before M21); the deductions were Cloudflare's: its analytics beacon refused in headless Chrome, and its managed robots.txt `Content-Signal` line.

## 2026-10-28: M21 step 1, checkpoints and grown forests

- **Core:**
  - `core/checkpoint.ts`: `saveWorld` and `loadWorld`. Restoring at N and running k seasons hashes exactly as N + k, with a fell and a sown seed still queued.
  - `World.restoreState` and `World.queued`.
  - `forestParams` and `specimenParams` moved to `presets.ts`, so the CLI can grow the home forest.
- **CLI:** `--checkpoint-at N`, and `cli/first-paint.ts` (run by `build:garden`), which writes 12 grown forests: 4 widths × 3 seeds, 60 seasons, 40–210 kB each, 1.3 MB in all.
- **Worker:** `restore(bytes)`.
- **Garden:**
  - option `first`: it opens on a grown forest nearest its width, with one seed a day, and falls back to growing from seed;
  - `seed` is now a getter;
  - reduced motion doesn't regrow a grown forest;
  - `garden.html?first`.
- **Measured:** the grown forest shows 173 ms after `load` (Firefox, local preview).
- **Surprises:**
  - **Double unzip.** Vite's preview server sends `.gz` with `Content-Encoding: gzip`, so the browser had already unzipped it. The worker now unzips only bytes that start with gzip's magic number.
  - **No text codec.** The core has no `TextEncoder`, so the header is ASCII JSON with \uXXXX escapes.
- **Tests:** 201 pass, goldens unchanged.

## 2026-10-28: garden-v0.7.0 live

- **Releases:**
  - PR #13 merged here; `garden-v0.7.0` released by the workflow.
  - The site synced from the release; the only difference from the local build is that source maps are left out.
  - edbarker-dev PR #1 merged; Workers Builds deployed it to production.
- **Smoke test on edbarker.dev** (Firefox, headless):
  - a species card ("Silver birch, *Betula pendula*");
  - Plate II's oak caption;
  - the forest resumes on return.
  - The only console errors are Cloudflare's analytics beacon, which headless Firefox blocks.
- **Surprise:** `git tag` needs `-a -m` in this repo's config.

## 2026-10-28: M19–M20 realism pass

- **User:** the first species release had lost realism. The fix was M18 first, then this pass, then one release.
- **Core:**
  - **Acrotony,** a new R2 rule (§R2.4): `r2.kappa`. A lateral's light counts exp(κ(pos − 1)) where its node splits, pos its place in the season's shoot. It is off by default, so goldens are unchanged without it. Oak has κ = 3, so the open oak's trunk divides into big limbs: 30 big limbs against 24 over 5 seeds.
  - **Windthrow scales with slenderness:** (H/D − 40)/30, clamped to [0, 2]. A squat open oak is rarely thrown (1 in 5 under frequent storms, against 21 of 50 stand oaks). The forest loses a tree about every 4 storms, against 2–3 before. The `forest` and `clearing` goldens change.
- **Species** (under the M18 light; [note](experiments/2026-10-27-m19-species.md)):
  - **Shade-survival bands:** all match the literature, at fir 2%, beech 3%, oak 8% and birch 13%.
  - **Birch:** relative shedding is down from 0.6 to 0.4, so a lone birch keeps branches down its stem (W/H 0.46, against 0.24–0.36 before), and its limbs settle to 70°. Its stand crown ratio is 0.43, against beech's 0.47.
- **Surprises:**
  - **Bare birch.** `Trel` 0.6 stripped even a birch standing in the open: the relative threshold doesn't know whether the shade comes from neighbours or from the tree itself.
  - **`c5.T` does nothing** under R1's carbon shedding; only `Trel` and P_b < M_b decide.
  - **The light reading.** The shade house read the light under the seedling's own crown. It now uses the exact light under a uniform roof.
- **Page:** the home forest's crowns are rounder and fuller than at step 4 (garden view checked).
- **Tests:** two new species tests (acrotony, windthrow by slenderness). 198 pass.

## 2026-10-28: M18, the row-marched light sweep

- **User:** do M18 before releasing the species, then one realism pass, then one release.
- **Core:**
  - The sky sweep marches every ray one row at a time and integrates the exact segment it crosses from each row's prefix sums (`c2.sweep: "rows"`, the default; ADR 0005 addendum). The M6 sweep stays as `"columns"`.
  - A periodic shallow ray needs one pass, not laps.
  - The light phase is about twice as fast on rings. The 520 × 140 panorama (55 trees) costs 7.6 ms a season, so the garden's ring may be up to 520 cells wide (`forestParams`).
- **Evidence** ([note](experiments/2026-10-28-m18-light.md)):
  - 20–30% less error than the M6 sweep against an exact ray trace.
  - Crown ratio, width, edge lean and ground light within noise over 10 seeds.
  - Stand trees are fuller, with H/D 75 → 66.
- **Goldens:** updated on purpose. The 13 sky-model goldens change because the light field changes; the triangle ones do not.
- **Surprises:**
  - **A near-vertical NaN.** cos 90° is 6e-17, so the vertical ray's segment had zero width and gave 0/0. It is now guarded.
  - **Slower at first.** The first row march was slower than the laps it replaced: per-cell floors and modulos. Padding each row once fixed it.
  - **A lost leader.** Two open-grown `skyTree` seeds now lose their first leader to a lateral, which reads as a 71° "trunk" tilt along the order-0 axis. The mechanics test now follows the main stem (the thickest child).
  - **Phantom mismatch.** I chased a discrepancy between my script and a test for a while: the M6 tests run with `PRE_R1`.
- **Tests:** the M6–M7 evidence tests pin the M6 sweep (`M6_LIGHT`), and three current-model tests are re-measured (the note lists them). There are three new sweep unit tests. 196 pass.

## 2026-10-28: M19–M20 step 4, species on the page

- **Page:**
  - Each tree is drawn as its species. There are new `oak` and `beech` leaf styles, palettes and tokens (light and dark).
  - Each species keeps its own calendar: birch flushes first and turns yellow first; oak flushes late and turns russet late; young beeches keep their copper leaves through the winter (marcescence).
  - Both renderers colour each leaf from its own palette.
- **The home forest** (`forestParams`) is now the `succession` woodland. Birch, oak, birch and beech are planted around the ring, turned by the seed.
- **Plate II:**
  - `mountGarden({ specimen: "oak" })` grows a lone open-grown oak for the specimen focus, with a new seed each time.
  - The worker's new `swap` keeps the forest aside meanwhile, so it resumes where it stood (checked in Firefox: season 31 → oak → back at 33).
  - `garden.html` takes `?specimen`.
- **Site** (branch `claude/m19-species` in edbarker-dev, local garden 0.7.0):
  - cards give the common and Latin names, and a Standing row;
  - labels read "No. 4, silver birch";
  - Plate II's caption names the oak.
- **Surprises:**
  - **Birch hoops.** In the garden view, birch leaders bent into hoops. The thin young tips sagged under the hanging twigs, and a no-R3 render showed straight leaders. Lighter leaves, less permanent sag and firmer posture control fixed it, at the cost of a narrower lone birch.
  - **Storms.** The woodland's harder storms (8% of seasons at load 2) snapped the young forest's tops, so it uses the forest's storms again. Succession still emerges.
  - **Leafier birch.** It is now leafier (Q_ss 0.12), which puts its survival light at 7%, slightly below the intolerant band. The note records it.
- **Size:** `garden.js` plus worker is 51.5 kB gzip (gate 60). **Tests:** 193 pass, goldens unchanged.

## 2026-10-27: M19–M20 step 3, calibrated species

- **User:** birch → beech and oak in the home forest; conifer a lab species; Plate II an open-grown oak; field-guide names; "as close to a botanical simulation as possible" (the species-calibrated route).
- **Core** (golden-safe: no golden changed):
  - `src/core/flora.ts`: `FLORA`, calibrated patches for silver birch, pedunculate oak, beech and silver fir, with common and Latin names and leaf styles.
  - Presets: `oakOpen` (Plate II), `birchWood`, `oakWood`, `beechWood`, `firWood` and `succession`, on a `WOODLAND` base: the forest's principles, R5's neighbour signal and storms at 0.08/2.
  - `metrics.csv` gains a `species` column.
- **Calibration** ([note](experiments/2026-10-27-m19-species.md)):
  - Shade survival is fir 1%, beech 2%, oak 5% and birch 11%, matching the Niinemets & Valladares scores.
  - Floors darken from birch (15–20%) to oak (5%) to beech (3%).
  - Stands have H/D 70–80. Open oak is broad (W/H 1.4) and squat.
  - Birch → beech succession emerges in all 5 seeds; oak dwindles under beech.
- **Surprises:**
  - **The survival threshold is Q_ss.** A seedling whose one bud rests below `r6.qMin` holds no leaves and starves, while `r1.mf` barely moved survival.
  - **Epicormic shoots in birch stands.** Light under birch woke epicormic shoots all down the trunks, so crowns never lifted. Birch needs a high release light (`r4.qRel` 0.3).
  - **Drooping oak.** The first open oak drooped like a willow; stiffer wood and posture control fixed it.
  - **Lone oaks were windthrown.** Windthrow scales with height only, so `oakOpen` has no storms or recruits.
  - **I misquoted birch's score.** From memory I had birch's shade score as 1.85, which is its drought score; the table says 2.03.
- **Tests:** `flora.test.ts` covers the shade-house order, stand floors and slenderness, the open oak's form, and succession. 192 pass.

## 2026-10-27: M17, seasons

- **User:** slower years with four seasons, and a few pace options.
- **Page only** (no simulation or golden changes):
  - Once a year lasts at least 3 s, a visual year τ runs over it.
  - Growth unfolds over spring (the first 30%), then summer, autumn and winter.
  - Deciduous leaf styles flush, turn and fall; shaded leaves turn first, through autumn colour ramps. A third of the leaves drift down on the wind and lie as litter until the year turns. Needles stay.
  - `yearSeconds` (default 16), `setYearSeconds` and `seasonName`.
- **Site:** "Seasons: brisk · gentle · slow" (8, 16 and 32 s), remembered in local storage; the caption names the season; autumn inks for day and night.
- **Surprises:**
  - Leaves falling at a fixed speed in seconds were still in the air at Brisk when the new year cleared them, and would fall in a blink at Slow. They now fall in year-time: a canopy's height in a tenth of a year.
  - A leaf crossing its fall time still has full size in that frame, so the drop check must come before the size skip.
- **Tests:** 183 pass.

## 2026-10-27: M16, motion

- **User choices:**
  - Sagging limbs rest on the ground.
  - Storms are rare and random; the pointer's wind stays visual.
  - The cursor acts as wind (the user's idea).
- **Core:**
  - `r3.ground` makes a limb rest on the ground instead of sinking. It is opt-in, because turning it on everywhere failed 9 tests where M9's calibrations assume the old behaviour (willow twigs hanging, hand-built limbs at ground level). It is on in `forest`.
  - Storms: `o2.stormP`, `stormLoad`, under `Purpose.wind`, with snapshots carrying `storm`.
  - Windthrow at first used the trunk base's stress and almost never fired, because pipe-model bases are thick. It now uses the wind's moment, which goes with height², at a chance of 0.06·load·(H/100)².
  - [Calibration](experiments/2026-10-27-m16-storms.md): σ_break 4500 and load 1.5 take about 137 metamers per storm and throw a tree every two or three storms. Calm seasons break nothing.
- **Page:**
  - Wind: a travelling breeze, a gale in storms, and pointer puffs (`wind.ts`, tested).
  - Hierarchical sway from compliance gain/(r/r_tip)², and leaf flutter.
  - Falling bodies built from the wood that disappears between snapshots: whole trees topple about their base, branches fall and land, then fade. On by default, off with reduced motion.
  - Sampling the wind per metamer roughly tripled a frame's cost. An 8-cell grid sampled once a frame brings it back to forest 0.20 ms and 10k stand 0.93 ms.
- **Tests:** 179 pass. Goldens `forest` and `clearing` changed (storms and ground contact are on in those presets); no other hash changed.

## 2026-10-27: D3, building the Field guide

- **Shipped** (user's go-ahead): PR #10 merged, `garden-v0.4.0` released, the site re-synced from it, and `d3-field-guide` merged. edbarker.dev is the Field guide.
- **Plate II** now frames the broadest crown among the taller trees, at the user's request. In a closed forest that is still slender; an open-grown specimen waits for species.

- **Direction:** the user chose the Field guide and agreed ten changes (brief: edbarker-dev `docs/design-brief.md`). One condition: the CV must stay at least as clear for a recruiter as a plain CV.
- **Garden** (`claude/d3-garden`):
  - **Ink plate:** `--ground-hatch: 1` draws the ground as an ink line with hatching (both renderers).
  - **Specimen plates:** focus `"specimen"` frames one tree (Scene frame `"tree"`) and draws it alone (`Scene.solo`), with its shed branches only; `setFocus` eases between forest and specimen.
  - **Labels:** `anchors()` gives each tree's crown top for labels.
  - **Sown trees:** visitor-sown trees carry `sown`.
- **Site** (`d3-field-guide`):
  - **Look:** ink tokens; night pages with a moon; EB Garamond (three self-hosted cuts, ≈ 74 kB).
  - **Plates:** Home shows the forest (Plate I), the CV a specimen (Plate II).
  - **Plate furniture:** labels on the tallest and sown trees; specimen cards with the planting year; the card as a strip on phones; a session tally of seeds.
  - **Writing:** margin notes, and CV roles as entries with dates in the margin.
- **Surprises:**
  - A wide, short plate framed on one tree's height still showed the whole forest. A botanical plate draws one specimen alone, hence `solo`.
  - Astro ate the space before an inline `<span>`, again.
  - The paper's white highlight turned into grey haze at night, so it became a token.

## 2026-10-27: D1 and D2, designing the site around the forest

- **A new phase** (user): the site was getting too little design attention, and the simulation should be its core style. Design phase D1–D3 comes before M16; M21's art direction moves into it.
  - User choices: playful and exploratory; the forest on every page; page elements as obstacles that are solid with no shade.
- **D1, shipped as garden-v0.3.0 (PR #9):**
  - While playing, each season's tween is linear and fills its whole interval, so growth flows instead of easing to a stop four times a second.
  - The intro slows geometrically into the ambient pace.
  - A portrait phone gets a ring of two or three large trees.
  - On the site, the bio folds behind "About me" on phones.
- **D2 foundation** (`claude/d2-obstacles`):
  - Obstacles (ADR 0015): shoots stop before entering one, and branches inside are shed at the start of a season and again after R3 mechanics (a sagging limb could otherwise sit inside for a season). Off by default, so the goldens are unchanged; the `clearing` preset and its golden were added.
  - `World.plantTree` is a replayable event.
  - The garden turns `[data-garden-obstacle]` elements into obstacles through the camera, and gains `onTreeTap`, `onEmptyTap`, `fell`, `plant` and `seed`.
  - Species per tree moves to ADR 0016.
- **Surprises:**
  - A tree beneath a wide obstacle can't reach round it, so it flattens into a mat under it. Content low in the forest reads as a shelf the forest holds up, so placement is a design lever.
  - A one-line `sed` for the ADR renumbering also caught the obstacle code. It was caught and fixed.
- **Site prototypes**, both with the forest persisting across pages through Astro's client router (`transition:persist`):
  - **Clearings:** paper cards the forest grows around; navigating prunes and regrows it.
  - **Field guide:** a notebook with the forest as a plate, specimen cards on tap, sowing on the ground, and Regrow and Share.

## 2026-10-27: M15, a cheaper frame

- **Shipped first** (user's go-ahead): PR #7 merged and `garden-v0.1.0` released; the site's `garden-home` previewed and then merged.
  - edbarker.dev is live with the garden home page, a CV page and `/lab/`.
  - The text comes from the user's website brief, with `TODO(Ed)` comments where the brief said to confirm something.
- **Measured first:**
  - The page's `?bench` mode samples every animated frame. Firefox rounds `performance.now()` to a millisecond, so `node src/web/render/scene.bench.ts` times the Scene's per-frame work in Node instead.
  - Leaves were 1.78 ms of a 10k-metamer stand's 2.45 ms a frame (`atan2`, `cos`, `sin`, a hash and `hypot` per leaf), and the per-limb projections a further 0.31 ms. Both depend only on the snapshot.
- **Scene:**
  - The projections, colour indices and leaf layout are now computed once per snapshot. A leaf's direction is stored as a fixed rotation of its shoot's direction, and a frame only applies it.
  - Geometry arrays are pooled.
  - CPU per frame: forest 0.39 → 0.07 ms, the 10k stand 2.45 → 0.52 ms.
  - The old and new Scene agree to 6·10⁻⁸ in 96 checks across presets, views and tween times.
- **WebGL2:** buffers grow by capacity and frames use `bufferSubData`. The shade overlay is built only while shown.
- **Pipelining:** the worker computes season s+1 while the page tweens s. Pausing shows the waiting season, so taps while paused still fell at once (checked headless).
- **Adaptive quality** (`render/quality.ts`, 5 tests): the pixel ratio drops 2 → 1.5 → 1, then the back leaves go; ten good windows step back up. The lab's Stats shows the level.
- **Also:** the lab takes `?preset=` and exposes `window.garden`; its charts keep 300 seasons.
- **Surprises:**
  - Vitest 5 has no `bench` export, so the Scene benchmark is a plain Node script.
  - The intro's "2.75 seasons/s" reported at M14 was my measurement's fault: its window ran past season 40 into the ambient pace. Measured season by season, the intro runs every 250–267 ms.
- **Not done:**
  - A real phone measurement, which needs a garden release.
  - The GPU-side tween, which isn't needed unless the phone says otherwise.
- **Goldens:** unchanged (168 tests).
- **Closed** (user's go-ahead):
  - PR #8 merged; `garden-v0.2.0` released, synced into edbarker-dev and live.
  - On the user's phone the 10k-metamer `coniferStand` bench ran at frame p95 16.8 ms (60 fps), with the worker at 18.15 ms a season.

## 2026-10-27: M14, the garden and a home page

- **Merged** PR #6 (M12, M13) at the user's request.
- **`mountGarden(host, options)`** (`src/web/garden.ts`, ADR 0014) owns the worker, renderer, pull loop, input and observers. The lab (`main.ts`) is now a garden with the panel, charts and HUD around it.
- **Home-page defaults:**
  - the `forest` preset on a ring shaped to the host, from 90 cells on a phone to 320, with a new seed per visit;
  - a 40-season intro at 4 seasons/s, then 0.5 seasons/s with long tweens;
  - tap to fell, with no pan, zoom or scroll capture;
  - lean snapshots;
  - with reduced motion, the forest after the intro, held still.
- **Scene and renderers:**
  - a "world" frame;
  - `headroom` for text above the crowns;
  - on a ring, crowns drawn across the seam at both edges (fixes that known issue for this view), with picking wrapped to match;
  - `transparent` and `maxDpr` options.
- **Input:** a tap-only mode. In the lab a tap now waits out the double-tap window, so a double-tap no longer fells a tree.
- **Colours:**
  - The scene's tokens moved to `render/scene.css`, inside a cascade layer the garden injects first, so a host page overrides them.
  - `theme.ts` converts any CSS colour to hex; an `oklch()` token used to draw as black.
- **Memory:** a forest left running piles up dead trees, about 20 MB of tables per 1000 seasons with a flat 5 ms a season. `World.discardDead` frees them, and the worker calls it each season. A test shows live trees stay bit-identical and dead planted trees are never replanted (its mutant fails the test).
- **Shipping:**
  - `npm run build:garden` produces 42.7 kB gzipped, under a 60 kB gate that CI runs.
  - `.github/workflows/release.yml` runs on `garden-v*` tags.
  - `garden.html` demos the home-page view in this repo.
- **Site** (epabarker/edbarker-dev, branch `garden-home`, not pushed):
  - `scripts/sync-garden.mjs` vendors a release into `public/garden/<version>/` and `public/lab/`.
  - `Garden.astro` loads it after first paint and keeps the crowns below the text as it reflows.
  - `BaseLayout` gains a `bleed` prop; the page and the garden share one sky gradient.
  - `_headers` adds immutable caching; AGENTS.md now says Astro 7.
- **Surprises:**
  - The review's claim that `theme.ts` reads from `:root` was wrong; it reads from the canvas.
  - Astro bundles an inline `<script>` with Vite's preload helper and leaves `__VITE_PRELOAD__` undefined, so the loader is an `is:inline` module.
  - Astro's HTML compression drops a line break next to an inline tag, which glued "lab" and "or" together; the fix is to break lines inside tags instead.
  - The vendored release is ≈ 0.8 MB unpacked (the lab's Plot chunk), not ≈ 0.2 MB; ADR 0014 is corrected.
- **Seen** in headless Firefox:
  - the lab, unchanged;
  - `garden.html` and the site at 1440 × 900 and 390 × 844, with no console errors, 60 fps and draws of 1–2 ms;
  - the intro at 2.75 seasons/s, then 0.5;
  - a tap fells the largest tree;
  - reduced motion holds at season 40;
  - opening the explainer moves the crowns down.
- **Goldens:** unchanged (163 tests).
- **Shipped** (user's go-ahead):
  - PR #7 merged, and `garden-v0.1.0` released (252 kB tarball). The site's re-sync from the Release was byte-identical to the local build.
  - `garden-home` pushed. Cloudflare Workers Builds built a preview (https://garden-home-edbarker-dev.edbarker.workers.dev) where the home page and `/lab/` run without errors and versioned files are served immutable.
  - Production edbarker.dev is unchanged until the branch merges.

## 2026-10-27: M13, a benchmark and golden-safe speed-ups

- **Benchmark** (`npm run bench`, `cli/bench.ts`):
  - It runs six cases as the worker does (a season, then a snapshot) for 100 seasons, best of 3.
  - It reports ms by phase and stores each case's final hash, so `--compare` shows whether a change kept behaviour bit-identical.
  - `runSeason` takes an optional `PhaseMark`. `--snapshot lean` measures snapshots as the home page will ask for them.
- **Speed-ups**, all bit-identical:
  - The sky sweep stops at the highest leafy row, skips `exp` at zero depth, stops periodic laps at their fixed point, and wraps columns without modulo.
  - Junction exponents use Newton's method instead of 60-step bisection.
  - Snapshot options (`setSnapshotOptions`), and `snapshotMs` counted in the HUD.
  - Tables cache their column list and reuse their compaction map; `crownTopLight` sorts a typed scratch array.
- **Results** ([note](experiments/2026-10-27-m13-perf.md)):
  - Rings: 12.4 → 3.8 ms a season (light 10.2 → 2.7).
  - Double-width ring: 19.0 → 7.2 ms. Conifer stand: 8.5 → 5.2 ms.
  - A lean snapshot costs 0.1–0.3 ms.
- **Surprises:**
  - The quoted 25–40 ms for the rings included metrics and CSV; the season itself took 12.4 ms.
  - The 15° periodic sweep reaches an exact fixed point after 5 of its 8 laps.
  - Several hot spots predicted from reading the code (`isRemoved`, O4's seed check, `tipX`) did not show in the profile, so they were left alone.
  - A stale-row mutant in the new sweep failed only 1 of 26 goldens. A unit test now covers it.
- **Tests:** a reused sweep forgets a taller season (open and periodic); Newton recovers known Δ with two and three children. 162 tests.
- **Goldens:** unchanged.
- **Seen** in headless Firefox: `skyStand` autoplays to season 41 with charts, the Δ histogram peaks at 2, and the console shows no errors.

## 2026-10-27: M12, the review and a plan beyond the build order

- **Scope.**
  - The user took this planning session as M12, aimed at three goals: performance, realism and a home page for edbarker.dev.
  - Three read-only surveys covered:
    - the hot paths (season loop, light, worker, renderer);
    - realism (spec, ADRs, experiments, known issues);
    - the page and its deployment.
  - The line-by-line audit of correctness and test strength that the old M12 row asked for is folded into M13 and M19. [Review](reviews/2026-10-27-m12-review.md).
- **Decisions (user):**
  - The simulation *is* the home page.
  - The site is the private Astro repo `epabarker/edbarker-dev` on Cloudflare, and it receives the garden as a versioned GitHub Release that it vendors (ADR 0014).
  - Realism means botanical form, motion and physics, and seasons, all still in 2D.
  - The home world is a mixed forest with succession, which needs species per tree (ADR 0016, at M19).
- **Roadmap:** M13–M21 added. "Later" items folded in: species onto R1–R5, oak, willow, beech, ground contact, far-red, embedding.
- **Surprises** from reading the hot paths:
  - Periodic sides cost ≈ 27 grid sweeps a season, not 7.
  - `junctionExponents` runs 60 bisection steps per junction for every snapshot, even with the charts closed.
  - The worker sits idle while the page tweens.
- No code changed, so the goldens are unchanged.

## 2026-10-27: M11, a forest without edges

- **Merged** the M10 PR (epabarker/tree-simulation#4) at the user's request.
- **Periodic sides** (`world.sides: "periodic"`, ADR 0013): the sky sweep wraps deposits, samples and rays.
  - Shallow rays are swept ⌈3H/(rise·W)⌉ + 1 laps around the ring. With only enough laps for a ray to climb out, the interpolation's diffusion left a 2·10⁻⁵ seam error; three times as many make the field translation invariant.
  - On a 210-cell ring, edge trees lean 1.5 cells instead of 4.1, floor light falls to 3.4%, and crown base rises to 45. Light costs ≈ 2.5× (23 against 9 ms a season).
- **O4** (`principles/o4-stand.ts`), in Phase 3:
  - background mortality m₀;
  - a seed pool fed by R1's reproductive sink, one seed per c_seed;
  - Laplace dispersal;
  - establishment where start-of-season ground light ≥ Q_est, with p_est, no trunk within a cell, and at most `maxTrees`.
  - Recruits are appended to `world.trees`.
- **O2** (`principles/o2-shyness.ts`): an owner grid from the light deposits; a leafy bud swaying k·Q·h/r into another tree's foliage dies with p_abr. The girth bonus is not built. Off in every preset.
- **Metrics:** `rootX`, `woodVolume`, `abraded`, `seeds`. **Presets:** `forest` (ring, f_rep 0.1 above 40 cells, O4) and `thinning` (60 seedlings 3.5 cells apart). **Page:** O2 and O4 folders.
- **Results** ([note](experiments/2026-10-27-m11-stand-dynamics.md)):
  - Self-thinning emerges from R1 starvation alone: every planting density converges on 15–17 trees, and dense stands follow slope −2.8 to −3.1, §10's hypothesis for 3D cylinder mass.
  - Peak CV rises with density (0.61 against 0.30).
  - Bimodality is marginal (0.54–0.86 at its peak, unimodal at the end).
  - The forest holds a 7–8-tree canopy for 300 seasons, half the planted trees die, and a felled tree's gap draws 3× the recruits.
- **Surprises.**
  - Crown shyness needs no abrasion here: neighbouring crowns touch in only ≈ 3% of canopy rows, so O2 has little to do.
  - The fitted slope steepens for sparse plantings, which reach the line late while still growing.
  - A bimodality peak of 1.70 in every run turned out to be the first seasons' near-identical seedlings; it is measured over the thinning phase only.
  - The CLI's metrics `season` starts at 1, which an empty first table revealed.
- **Tests:** periodic tests in `sky-sweep.test.ts` (3), `principles/o2-o4.test.ts` (8), `forest.test.ts` (3; the slow ones have 90 s timeouts).
- **Goldens:** `forest` and `thinning` added. No existing hash changed (sides default to open; O2 and O4 are off).
- **Seen** on the page in headless Chromium: both presets run, with recruits in the understory, the thinned stand, and growing tree counts in the charts. No console errors.

## 2026-10-27: M10, dormancy, release and shade avoidance

- **Merged** the M9 PR (epabarker/tree-simulation#3) at the user's request.
- **R4** (`principles/r4-dormancy.ts`, ADR 0012):
  - hysteresis: active buds and short shoots continue at v_cont; dormant buds need v_break·(1 + δ·age)·(1 + δ_b·s);
  - dormant buds abort after L_dorm seasons;
  - reiteration: a released bud's shoot takes a younger pa, stored as a metamer column `paShift`, and every R2 lookup now reads order − paShift.
- **Decision (user):** as specified, R4 released no dormant bud at all. Bare boles carried 0–2 buds, and BH gives a lone bole bud v ≤ 0.4 even after a neighbour falls. Two additions, recorded in the spec and ADR 0012:
  - a **bud bank**: a shed or broken branch leaves a dormant bud in its slot (`removeBranches`, `budAngle`);
  - a **light trigger**: Q ≥ Q_rel·(1 + δ·age) releases a dormant bud, whose first metamer is paid from the R1 reserve.
- **R5** (`principles/r5-shade.ts`): with s = 1 − Q/C,
  - internodes l0·(1 + e_s·s);
  - λ + δλ·s at shaded nodes (node shade sampled per metamer, `sampleNodes`);
  - v_break·(1 + δ_b·s) on R4's sugar route;
  - A_set·(1 − δ_A·s).
- **R3 breakage** (σ_break, deferred from M9) is built through `removeBranches`, but stays off: no break happens because stress wood holds σ at or below σ_target.
- **Metrics:** `released`, `epicormic` (from trunk wood ≥ 10 seasons old), `aborted`, `broken`. **Page:** R4 and R5 folders, σ_break in R3.
- **Results** ([note](experiments/2026-10-27-m10-release-shade.md), 5 seeds):
  - Felling a tree at season 50 leaves its neighbours with 64 trunk shoots by season 56, against 22 in the kept stand. R4 alone gives 60 against 1.
  - With no bank, or the sugar route only, there are none.
  - Stand H/D rises from 61 to 72 (open-grown 41 → 47), almost all from δλ. The stand still levels off (≈ 83 cells), no tree dies, and edge trees lean out as before.
- **Surprises.**
  - Elongation barely changes slenderness.
  - Measured as all dormant releases, the flush is invisible (≈ 3 a tree each season inside crowns); only releases on old trunk wood show it.
  - With δ_b also scaling the light trigger, shade cancelled the flush: the trigger already reads the light, so δ_b now scales only the sugar route.
  - R5 lifts the open tree to `skyTree`'s 100-cell ceiling by season 100.
- **Tests:** `r4-r5.test.ts` (8), a breakage test in `r3-mechanics.test.ts`, `release.test.ts` (2). `mechanics.test.ts` now pins `PRE_R4`.
- **Goldens:** the five sky goldens and `weeping` and `troll` changed (R4, R5 on). With both off, all seven reproduce their M9 hashes exactly.
- **Seen** on the page in headless Chromium (WebGL2): the R4 and R5 folders, tapping fells a tree and opens the gap. No console errors.

## 2026-10-27: M9, mechanics

- **Merged** the M8 PR (epabarker/tree-simulation#2) at the user's request; M9 starts from it.
- **R3** (`principles/r3-mechanics.ts`, ADR 0011). After C6 girth:
  - a basipetal pass gives each metamer's weight W, first moment S and base moment M = S − W·x_base (wood at its midpoint, leaves at its tip);
  - stress-driven girth adds local wood where σ = 4|M|/(πr³) > σ_target, never past it (`stressWood`, out of C6's pipe sums);
  - sag −φ·(M − M_prev)/(E·πr⁴/4)·l, from last season's stored `moment`;
  - posture −β_g·sin(A − A_set) − γ·kink, clamped to ±c·Δr/r;
  - all turns come from the start-of-pass geometry and accumulate acropetally; buds turn with their metamer.
  - `PaLevel.postureSetPoint` lets an axis set to a different angle than it grows at.
  - Page: an R3 folder and a "stress σ/σ_target" colour; snapshots carry `stress`; metamers.csv carries `stressWood`.
- **Decision (user):** sag comes from the load *increment* (Fournier's growth rings; Alméras & Fournier 2009), not from the whole load each season as §R3.4 first said. The spec's creep stays as `r3.sag: "creep"`. Spec §R3.4 amended.
- **Presets:** the sky presets enable R3. New `weeping` (willow-like) and `troll` (beech-like) demonstrations. The species presets stay pre-R3 with pre-R1.
- **Results** ([note](experiments/2026-10-27-m9-mechanics.md), 5 seeds):
  - Open-grown limbs droop 22° with tips up 15°, and the crown widens 63 → 80.
  - Without posture, trunks tilt 34°.
  - `weeping`: 59% of young twigs hang, against 25% without R3.
  - `troll`: the trunk grows at 70° yet stands within 1° of vertical; without posture it sprawls at 95°.
  - Δ 2.08 at reinforced junctions, 2.00 elsewhere.
  - In the stand, R3 straightens trunks (5° → 1.4°) and raises H/D 58 → 65. Cost is within noise (≈ 7 ms a season).
- **Surprises.**
  - Creep collapses trees: limbs keep sinking after R1's plateau, and open trees lie on the ground by season 100.
  - With posture set to vertical for every axis and fast reaction wood (c 1), crowns closed up like brooms. c is the knob that sets droop.
  - Low E for a whole tree buckles slender trunks, because each season's lean raises the next season's moment. The weeping preset needs E 2·10⁶, r0 0.03 and c 0.3, with pendulous *posture* set-points rather than floppy wood.
  - Twigs that grow straight down sit in their own crown's shade and are shed; arching scaffolds with hanging ends survive.
- **Tests:** `r3-mechanics.test.ts` (7) and `mechanics.test.ts` (5).
- **Goldens:** `skyStand`, `skyTree`, `obliqueSun`, `skyLate` and `overcast` changed (R3 on). `weeping` and `troll` added. With R3 off, all five reproduce their M8 hashes exactly; the new columns are hashed only when non-zero.
- **Seen** on the page in headless Chromium (WebGL2): weeping curtains, the Troll staircase trunk, arching limbs in stress colour. No console errors.

## 2026-10-27: M8, carbon balance

- **R1** (`principles/r1-carbon.ts`, ADR 0010). After the basipetal light pass:
  - production P = α·Σ a·Q·exp(−L_path/L_h) over live buds' leaf area;
  - maintenance M = m_w·Σ π r_live²·l over live-pipe sapwood, plus m_f·Σ a over foliage;
  - the net is split into reserve (capped at 2 seasons of M), reproduction (above a maturity height, off by default) and v_base;
  - deficits drain the reserve, and a tree empty for k_starve seasons dies in Phase 3.
  - `r1.shed: "carbon"` sheds a lateral that can't pay for itself, or that is below T_rel·Q_top.
  - New metrics: production, maintenance, reserve, reproduction, starved. Page: an R1 folder.
- **Research settled the open choices** at the user's request (ADR 0010):
  - Stem respiration follows sapwood and is 5–13% of assimilation.
  - Rising wood respiration does not cause the growth plateau, so the plateau comes from L_h (or reproduction).
  - Shade death comes from foliage costs against light (compensation point).
  - Branch death follows the branch's own carbon budget, modified by correlative inhibition.
- **Calibration** ([note](experiments/2026-10-27-m8-carbon.md)): m_w 1, m_f 0.06, L_h 60, α 3 (with R1). The stand levels off at ≈ 78 cells (it used to hit the 110 top), a seedling under the closed canopy dies within 5 seasons, crown bases rise 25 → 31, and M/P is 19%.
- **Surprises.**
  - Charging live sapwood alone let shaded trees shrink rather than starve. Charging the whole stem killed half a stand, but only at a ~100% wood cost.
  - Leafless dormant buds first counted as producers.
  - The seed reserve outlived any deficit.
  - At α 2 the lowered resource erased apical dominance and trees forked low.
  - Carrying unused bud resource over to the next season (tried, reverted) did not unfreeze the plateau.
  - The species presets don't plateau under R1, so they stay pre-R1 (follow-up).
- **Presets:** the sky presets enable R1 with α 3. The species presets pin the pre-R1 settings (`SPECIES_PRE_R1`), and M6–M7 tests pin `PRE_R1`.
- **Goldens:** `skyStand`, `skyTree`, `obliqueSun`, `skyLate` and `overcast` changed (R1 on). Species and triangle goldens are unchanged, and R1 off reproduces the old hashes exactly.
- **Tests:** `r1-carbon.test.ts` (6) and `carbon.test.ts` (6). Vitest's per-test timeout is raised to 30 s, because a 10-stand M7 check took 5.4 s under load.
- **Seen** on the page (headless Chromium, WebGL2): the stand levels off well below the top by season 80, with no console errors. Crowns look sparser than before.

## 2026-10-27: Per-species leaf styles; M12 review milestone

- **Leaf styles** (user's choice over going straight to M8), page only (`render/leaf-styles.ts`):
  - broadleaf (the M6c lens);
  - needle: thin dark blue-green needles, 6 per spray, kept 8 seasons;
  - small: birch-like, light, broad;
  - large: Terminalia-like, glossy, crowded at shoot tips.
  - Species presets name theirs in `Preset.leaf`; picking a preset sets View → leaf style and leaf age, and both can be overridden. Both renderers read `Scene.leafStyle`; the WebGL2 leaf uniform and palette come from it. New colour tokens in light and dark.
- **Seen** in headless Chromium (WebGL2 light and dark, Canvas 2D): the fir reads as a conifer, the birch as small-leaved and open, the Terminalia as tiers of big leaves at branch ends. No console errors.
- **Tests:** `scene.test.ts` checks the needle spray counts in both views and that every preset's `leaf` names a known style.
- **M12** (user): after M11, an independent review of the whole project by a fresh agent, triaged with the user before any post-build-order work (ROADMAP, spec §7).
- No simulation or golden changes.

## 2026-10-27: M7, physiological age and three species

- **Species** chosen by the user (ADR 0009): a fir-like conifer (Massart), a birch-like pioneer (in place of §7's Rauh broadleaf) and a *Terminalia*-like tropical tree (Aubréville). Names are generic with a real example. The oak-like, willow and beech presets wait for R3 (ROADMAP "Later").
- **R2** (`r2-physiological-age.ts`, ADR 0009):
  - pa = min(order, levels − 1);
  - per-pa λ, A_set, η, β, generator (distichous, opposite, whorled with an optional `tierEvery`, none) and p_term;
  - ontogeny: λ falls by Δλ over `ramp` seasons from age a_c.
  - It hooks into C1 (`formAxillaryBuds`, `formTerminalBud`), C3 (λ per node) and C4 (`directionParams`). Acrotony is deferred. R2 off: every existing golden unchanged.
- **Presets:** `conifer`, `coniferStand`, `birch`, `birchStand`, `tropical`, with 160-cell-tall worlds (the species' leaders reach a 110-cell ceiling by season 40). Species light knobs: k_ext 0.6/0.35/0.6, T 0.02/0.08/0.03, conifer r0 0.035. Page: an R2 folder (enable, a_c, Δλ, ramp).
- **Results** ([note](experiments/2026-10-27-m7-species.md)): conifer tiers at 77° from vertical, cone 1.6× wider below than above, stand H/D 78 with bole 64% of height; birch branches 25°, its λ decline broadens the crown from 0.54 to 0.80 of its height, its stand crowns lift to 80%; tropical pagoda tiers at 69°, widest at the base.
- **Surprises.**
  - Plagiotropic tiers need η ≈ 2: at η 0.4 the light term ξ·V tilts the branches 45° upward.
  - Whorls carry few tips, so the pipe model makes conifer trunks thin (stand H/D 136 at r0 0.02).
  - Sympodial relays at β 75° zigzag; β 20° with a strong η keeps the tiers flat.
  - The seedling's first node is a tier node whose continuation shares its season, so the whorl test exempts it.
- **Tests:** `r2-physiological-age.test.ts` (6) and `species.test.ts` (5). **Goldens:** `conifer`, `birch` and `tropical` added; no existing hash changed.
- Checked on the page (headless Chromium, WebGL2): tiers and the pagoda read well. Every species uses the same broad leaves, so the conifer looks like a tiered broadleaf; needles are a follow-up.

## 2026-10-27: M6e, light calibration

- **Session setup.** This is a cloud session: Node 24 installed with nvm (`/opt/nvm`; the image's default is Node 22), then `npm ci`. The user parked the two open questions (Pages domain, pCloud copies).
- **`groundLight` metric** (`metrics.ts`, `metrics.csv`): mean Q/C in the bottom row of cells across a tree's crown, from the start-of-season field. `treeMetrics(tree, world?)` takes the world for it; without one it is NaN.
- **`c2.rotate`** (off by default): the K directions sit one per equal stratum at (k + f)/K of the sky, and f advances by φ − 1 each season. `LightModel.compute` now takes the season. Page: a "rotate directions" checkbox in C2; the K slider goes up to 31; the panel accepts boolean fields.
- **`overcast` preset** (stand, p = 1.5). CLI `--light` writes `light.csv` (per-cell shade at the snapshot seasons).
- **Calibration** ([note](experiments/2026-10-27-m6e-light-calibration.md)). Defaults kept: k_ext 0.5, K 7, rotate off.
  - Floor light under interior crowns is 5.8% (3.5–3.8% under the central trees).
  - Surprise: floor light is nearly independent of k_ext (5.8–8% from 0.25 to 1), because crowns carry less leaf area when k_ext is larger. So k_ext is a leaf-area knob, not a floor-light knob.
  - Second surprise: much of the light reaching a stand's floor, and the stand's growth, comes through the world's open sides. Closing them with walls gives 1% floor light and trees 22% shorter at season 50. The ROADMAP M11 row now asks for a forest-like boundary first.
  - K = 7 matches K = 31 on every pattern except crown base, which is about 7 cells lower (≈ 2 SE). Rotation hides the zenith streaks in the field but changes no pattern.
- **Tests.** `sky-sweep.test.ts` gained a rotate test. `sky.test.ts` gained the M6e block: the ground-light metric, the 2–10% floor target, and K 7 vs 15 convergence.
- **Goldens:** `overcast:seed1:s30` added. No existing hash changed (rotate off reproduces the M6 grid exactly).
- Checked on the page in headless Chromium: the rotate checkbox toggles live, the overcast preset loads, no console errors.

## 2026-10-27: M6d, relative shedding and short shoots

- **C5 relative threshold** (ADR 0007): `c5.Trel`, `c5.topQuantile`; Q_top computed per tree after sampling (`crownTopLight`).
- **R6 short shoots** (ADR 0006): `BudState.shortShoot` (5, appended); `r6-short-shoots.ts`; deposits by shoot type (`LightModel.deposit` gained an `area`); short shoots' Q weighted by a_ss in `gatherLight`. Page: rosettes on older wood, panel sections, `shortShoots` metric.
- **Calibration** ([note](experiments/2026-10-27-m6d-shedding-short-shoots.md)). Surprise: max(T, T_rel·Q_top) only raises thresholds in an even-aged stand (Q_top ≈ 1 everywhere); it needs a low floor. Chosen for sky presets: T 0.03, T_rel 0.12, Q_ss 0.1, a_ss 2. Overtopped late tree: 51 vs 11 metamers, crown 8.4 vs 2.2 deep, 5/5 survive.
- **Tests.** The M6 gap test is pinned to the M6 configuration; a new M6d check requires every neighbour to lean into the gap with median shift > 2 (the strict M6 threshold failed one seed at +0.8). New `skyLate` preset and golden.
- **Goldens:** `skyStand`, `skyTree`, `obliqueSun` changed (sky presets now enable relative C5 and R6); `skyLate` added; triangle presets unchanged.

## 2026-10-27: M6c, the pseudo-depth view and r0 = 0.02

- **r0 = 0.02** (was 0.08). Radius scales linearly with r0 under the pipe rule, and the new value gives interior `skyStand` trees H/D 62–72, edge trees 54–57 and open-grown `skyTree` 41–43 (5 seeds, season 45), against 60–80 for real stand-grown trees. **Goldens regenerated:** every case's hash changed because radius enters the state hash; growth itself does not read r0 until R1/R3.
- **Slenderness metric** `slenderness = height / (2·trunkRadius)` in `metrics.ts` and `metrics.csv`; `sky.test.ts` checks interior trees are 50–90 and open-grown trees below 0.8× the stand median.
- **Pseudo-depth natural view** (ADR 0008), page only. Each first-order limb is turned out of the plane about the trunk by a hashed azimuth; each leafy metamer draws three leaves around its shoot; leaves behind the plane are darkened and drawn behind the wood (WebGL2 has a second leaf batch; Canvas 2D draws two passes). View → "depth (off = x-ray)" restores the simulated geometry. [Figure](experiments/figures/2026-10-27-m6c-depth-view.png).
- **Surprises.** Applying the projected-spiral squeeze at every branching order compounded (0.64⁵ by order 5) and collapsed crowns onto their trunks; it is now applied once per first-order limb, which is also the exact projection of a limb rotated about a vertical trunk. Fully random azimuths then narrowed crowns by about a third and split the stand's closed canopy into lollipops, so the squeeze is softened to 0.55 + 0.45·|sin φ|. The inner crown is still bare, as the model says; R6 addresses it.
- Picking uses the drawn geometry (a tap hits what you see), not the simulated one as first planned.
- Seen in headless Firefox (WebGL2 and Canvas 2D); not yet on a phone.

## 2026-10-27: Literature review and the M6c–M6e plan

- **Review** ([note](research/2026-10-27-literature-review.md)), using Consensus, alphaXiv and web search. The core holds. Gaps: shedding should be relative to the tree's best light (correlative inhibition), and short shoots carry most leaf area in many species. The 2D "x-ray" look is the correct cross-section of a hollow crown shell; real trees look full because the shell is seen in projection.
- **Decisions** (user): R6 short shoots (ADR 0006), relative C5 with `c5.Trel` defaulting to the baseline (ADR 0007), a page-only pseudo-depth natural view (ADR 0008), and r0 = 0.02.
- **Spec amended:** C4 (GSA mechanism), C5 (T_eff), C6 (laser-scan evidence), R1 (two switchable plateau causes, keyed on size), R5 (fewer bud breaks and upright A_set in shade), new R6, O4/§10 (self-thinning slopes are hypotheses; slenderness, extinction, self-pruning and short-shoot targets), §11.8, references.
- **Plan:** M6c (view + r0), M6d (C5 + R6), M6e (light calibration) before M7. ROADMAP calibration table now carries literature anchors and targets; the triangle's a, b, C are frozen.
- **Measured** while reviewing: at r0 = 0.08, `skyStand` trees have H/D 14–19 and `skyTree` 10, against 60–80 in real stands. Trees grow ≈ 2 cells a season, so a cell is ≈ 0.2–0.3 m.
- No code or golden changes.

## 2026-10-27: M6b, the WebGL2 renderer

- **Shared scene.** Split `render/scene.ts` (`Scene`) out of the Canvas 2D renderer. It holds the tween, camera, fitting, picking, colour indices and leaf layout, shared by both renderers behind a small `Renderer` interface. `create.ts` picks WebGL2 and falls back to Canvas 2D on a fresh canvas; `?renderer=canvas` forces the fallback.
- **`WebGL2Renderer`** (twgl.js 7, whose API matches what ADR 0001 assumed):
  - instanced uneven-capsule branches, shaded with signed-distance antialiasing;
  - vesica leaves; instanced buds and walls;
  - a shade texture and gradient backdrops, with premultiplied blending;
  - context-loss recovery.
- **Taper.** Branches now taper toward their thickest child. Tapering toward the continuation left knobs where a thicker lateral leaves a limb, which is common in decurrent crowns.
- **Performance** (headless Firefox, desktop):
  - First pass: 2.3 ms against Canvas 2D's 17 ms per draw on a stand; the 55k-metamer explosion ran at 26 fps.
  - Second pass removed per-leaf and per-bud allocations and made instance data camera-independent: zoom minimums moved into the shaders, and ghosts, walls and buds got their own buffers, so camera-only frames reuse uploads. Panning a paused 55k scene now costs 0.35 ms at 60 fps.
  - During playback: stand of about 4k metamers 2.3 ms against 19 ms; 28k metamers 5.8 ms.
- **Stats** gained renderer, fps and draw-ms monitors.
- **Tests.** New `web/render/scene.test.ts`. The root tsconfig gained the DOM lib for page-side tests (src/core keeps its DOM-free tsconfig).
- **Bundle.** First paint grew from 39 kB to 60 kB gzipped (twgl.js).
- **Open.** Not yet measured on a real phone.

## 2026-10-26: M6, the Beer–Lambert sky sweep

- Polish bundles (shareable links, diagnostic overlays) dropped at the user's request; the half-done groundwork was reverted.
- `SkySweep` implements §C2.4: leaf area per cell from buds, K sky directions, optical depth swept from the sky side with linear interpolation, Q = Σ w_k e^(−k_ext T_k), V the light-weighted sky direction. Light models gained `compute()` (end of Phase 1). Three open details decided in ADR 0005: own cell does not shade its buds; rays from beyond the sides are open sky; w ∝ sin(elevation)^p · (1 + tilt·cos θ).
- Sky is the new default model; the M1–M5 presets pin the triangle, and every existing golden is unchanged (checked against a pre-change regeneration). New presets `skyStand` (page default), `skyGrove` (phones), `skyTree`, `obliqueSun`.
- Results ([note](experiments/2026-10-26-m6-sky-sweep.md)): edge trees lean out 7.6 cells (median), stand crown bases lift to 51 cells while open-grown trees keep branches to the ground, neighbours lean 1.6–6.7 cells into a felled tree's gap, oblique sun leans crowns 8–14 cells; no seedling stalls at k_ext 0.5. About 3 ms per season for 10 trees.
- Surprise: a suppressed decurrent stand tree can lose almost its whole crown to C5 in one season (its tall fork is a lateral). Spec-conformant; looks like the onset of self-thinning.
- Fixed `treesim.load_run` CSV type inference (a column can start as whole numbers).
- The WebGL2 renderer, also slated for M6 in ADR 0001, is split out as M6b.

## 2026-10-26: Polish, natural look and page experience

- **Scope.** You chose two polish bundles: natural look and page experience. Shareable links and diagnostic overlays are deferred.
- **Natural view, now the default.**
  - Bark is coloured on a ramp by age.
  - Lens-shaped leaves sit on metamers up to 5 seasons old, coloured by light. They are a view only; buds still cast the shade.
  - Sky and ground are drawn as gradients.
  - Buds and the shadow heatmap are off by default.
  - Light and dark palettes are CSS tokens. The canvas follows both the system scheme and `<html data-theme>`.
- **Page.**
  - Autoplay, unless the visitor has `prefers-reduced-motion` set.
  - An eased camera that keeps the ground pinned and leaves room for the header.
  - A season counter.
  - A four-tree `grove` preset as the default on phones (≤ 700 px).
  - Tweakpane themed from the same tokens.
- **Visual checks** in headless Firefox: desktop light and dark, a single tree close up, phone width. At stand scale leaves first read as specks, so they now have a 5 px minimum and the default leaf age went from 3 to 5.
- **No simulation change.** Goldens are untouched.

## 2026-10-26: Shoot size settled by research (ADR 0004)

- **Question:** what does §C3.4's "n = ⌊v⌋ (capped), l = v/n" cap?
- **What the sources do:**
  - Palubicki 2009 and a C++ implementation have no cap.
  - The LPFG SOT example caps the bud's *resource* (`min(v, MAXGROW)`), then sizes the shoot by Palubicki's rule.
  - None caps n alone.
- **Change.** `shootSize` now follows the SOT form: v' = min(v, cap), n = ⌊v'⌋, l = v'/n. Capped shoots now have internodes of exactly l0. Goldens regenerated (intended); all 51 tests pass unchanged.
- **pcloud-sync filters** (dotfiles, uncommitted): `/tree-simulation/runs/**` and `/tree-simulation/dist/**` are excluded, anchored to this project. Earlier copies (about 5 MB) stay on pCloud until removed.

## 2026-10-26: M5, stands; prototype M0–M5 complete

- **Stands.** New presets `pair`, `late` (a seedling at season 12 between two trees) and `stand` (10 trees, now the default). All trees deposit into one shadow grid before any tree samples it, so a test confirms results don't depend on processing order.
- **Page.** Tapping a tree fells it (`pickTree` hit-tests the drawn segments). A per-tree Q_base bar chart was added. Charts name the series explicitly to silence a Plot warning, and drop dead trees.
- **Tests (5 seeds each).** Crowns of a pair lean apart. The late tree is suppressed (< 0.6 × height, < 0.3 × metamers and Q_base). After a neighbour is removed, the survivor's centroid moves > 2 cells into the gap.
- **Calibration.** a moves 0.2 → 0.15: at 0.2 the seedling trap stalled 5 of 40 trees in stands, and at 0.15 none. The M3 tropism test now uses η ±0.5, where every seed separates (at ±0.3 the means differed by only 1.16 ×).
- **Finding: crown bases do not lift in stands either.** The shadow triangle reaches only qMax = 6 layers below a bud, so a stand's understory is lit. §C2 calls the triangle "a coarse estimate" and recommends the Beer–Lambert sky sweep, which is M6.
- **Performance.** A 10-tree stand runs at about 7–17 ms per season in the worker (12k metamers by season 57). Canvas 2D is still fine on desktop.
- **Visual checks.** The stand reads as a small forest. Felling a tree works. At phone width (390 px) there is no horizontal scroll, the charts stack, and the controls collapse into a bottom bar.

## 2026-10-26: M4, shedding and pipe girth

- **C5** (`shedBranches`). A lateral subtree is shed when Q_b/n_b < T once it is g seasons old. Its base radius becomes a scar (r^n) on the parent node, and the metamer and bud tables are compacted with indices remapped.
- **C6** (`updateGirth`). Tips have radius r0; r^n sums basipetally, including scars; radii never decrease. `junctionExponents` fits Δ at each junction. The snapshot carries the Δ values, and the page charts them as a histogram with fixed 0.1-wide bins (auto-binning collapsed when every Δ was exactly 2).
- **Recalibration** ([note](experiments/2026-10-26-m4-calibration.md), 540 runs). b moves 2 → 1.5 and T moves 0.3 → 0.1.
- **Seedling starvation trap.** Four buds sharing one cell, with α = 2 and a = 0.2, all get v < 1 and the tree stalls for ever. About 0.6% of runs at a = 0.2. Seen with seed 1 at λ 0.52/0.54, so the `pruned` preset uses λ = 0.5. A real fix needs R1 reserves or R4 release.
- **Isolated trees keep low branches.** Their bole stays at 1–6 cells, because the shadow triangle can't shade laterals that reach past the crown edge. The bole is retested in stands at M5 and with the sky sweep at M6.
- **Visual check.** The first tree that looks like a tree: a tapered trunk and limbs, a cleared interior, a low decurrent fork. Charts now wrap, three across.
- **Goldens** were regenerated because the default b and T changed and new presets were added (intended).

## 2026-10-26: M3, C4 shoot direction

- **Rule.** `shootDirection` implements d = normalize(w_d·d_prev + ξ·V + η·t(A_set) + ε·u), with u = d_prev rotated by N(0, σ²) drawn from `Purpose.directionNoise`, keyed by the new metamer's birthId and the season. The tropism vector t points at A_set from vertical, on the side the shoot already heads. ε was added as an explicit param, because the §C4 formula has it.
- **Walls.** Walls are drawn on the page (snapshots carry them). New presets: `direction`, now the default, and `wall`.
- **Tests.** The wall shifts the mean crown centroid by more than 1 cell away from it over 5 seeds. Downward tropism (η −0.3) spreads crowns more than 1.2 × wider than upward (η +0.3).
- **Surprise.** With strong upward tropism (η 0.4), one seed's seedling starved for good. Its buds bunched into the same cells, so each got v < 1, and nothing can break the stall until R4 (bud release).
- **Visual check.** Curved, light-seeking branches. The wall crown hugs the wall and extends away from it.

## 2026-10-26: M2, Borchert–Honda allocation

- **Modes.** `c3.mode: "bh"` implements the §C3 split: v_base = α·Q_base flows acropetally, and each node gives its main slot v·λQ_m / (λQ_m + (1 − λ)Q_l). Lateral slots share the rest in proportion to their light. `equal` is the §8 ablation (Takenaka): α·Q_base split equally over live buds. Every mode now fills `vIn` for the "resource" colour, which changed the M0/M1 goldens (a diagnostic column, not growth). New presets: `bh`, `leader` (λ 0.56), `spreading` (λ 0.46).
- **Interpretation of an ambiguity, not a divergence.** Shoot length uses the *uncapped* ⌊v⌋: l = v/⌊v⌋·l0, n = min(⌊v⌋, cap). Capping n inside l = v/n produced 30-cell internodes, and the λ = 0.56 tree reached height 71 by season 20. Palubicki's l is always within [1, 2). Details in architecture.md; flagged to the user.
- **λ sweep** ([note](experiments/2026-10-26-m2-lambda-sweep.md)). Height shifts in a threshold-like way between λ 0.50 and 0.56 (41 → 80 at season 25), as §8 predicts, then saturates at the 3-metamer cap. Height/width stays near 1 without shedding, so it is not a dominance measure yet.
- **Visual check.** λ 0.46 gives a broad, multi-stemmed decurrent crown; λ 0.56 gives a single excurrent leader with a conifer-like outline.

## 2026-10-26: M1, the C2 shadow triangle

- **`ShadowTriangle`** implements the spec rule: deposits a·b^(−q) in a triangle below each bud; Q = max(C − s + a, 0); V points at the least-shaded cell in the wedge. Toggle it with `c2.enabled`; the panel has a C2 folder. Colouring by light now covers buds too.
- **Calibration** ([experiment note](experiments/2026-10-26-m1-shadow-calibration.md)). a = 1 stops all growth, because a node's two buds share a cell (Q = C − a). The new defaults are a = 0.2, b = 2, C = 1.
- **Decision (no ADR needed): the world is a closed box,** opaque outside on every side. The page showed shoots past the grid's edges growing exponentially in "open sky" (531k metamers by season 69). The M0 goldens were unchanged; shadow goldens were added.
- **Colour scaling.** Light and resource colours now use √(value / max), because a few bright tips otherwise make everything else dark.
- **Measurement.** A single tree filling the 100×70 box (about 13k metamers) takes about 6–13 ms per season in the worker.

## 2026-10-26: Repository skeleton and M0

- **Environment.** Moved from the VSCodium Flatpak (a sandbox with no Node) to native VS Code on Fedora, with Node 24, gh and uv via dnf (ADR 0003).
- **Repo layout and docs.**
  - Moved the spec to `docs/spec.md` and the stack brief to `docs/background/`.
  - Recorded ADRs 0001 (stack), 0002 (keyed-hash RNG) and 0003 (dev environment).
- **Core.** SoA `Table`; trees as metamer and bud tables with parent and slot topology (no child pointers); keyed-hash RNG with a Purpose registry; C1 distichous buds; the §6 season loop with the C3 basipetal pass and the `none` scaffold mode.
- **Page.** A Comlink worker, a Canvas 2D renderer (tweening, ghosts, colour modes, auto-fit), Tweakpane, and Observable Plot loaded after first paint.
- **CLI and analysis.** CLI writing CSV, and an analysis project (uv, polars, plotnine).
- **Shadow constants.** Palubicki et al. (2009) give no numbers for the shadow constants a, b and C, and Guerra (2026) gives none either. They are placeholders marked `calibrate` (ROADMAP).
- **Decision (no ADR needed): the ground is opaque in every light model.** Without that rule, M0 laterals of laterals grow underground. Goldens were regenerated before the first commit.
