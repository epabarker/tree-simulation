# Devlog

Newest first. One entry per session or milestone: what changed, why, surprises, and any golden-hash updates with their reason.

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
