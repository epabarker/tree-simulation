# How other tree systems model a species, and what to take (track A, 2026-11-01)

Track A's second deliverable ([tracks plan](../plans/2026-11-01-tracks.md) §1, row A). For each system the survey covers:
- how a species is modelled;
- how its look is authored;
- what it costs;
- the one thing it does that this project should consider.

It ends with a ranked list of step-change candidates, and a map of the systems' descriptive parameters onto our rules. The project's frame throughout: a garden of British species, a 3D core, a frontal 2D picture on a phone.

**How it was read.**
- Full texts from author or mirror PDFs, unless marked: Weber & Penn (Duke course mirror), algorithmicbotany.org, the Purdue and Poznań (AMU) author pages, arXiv.
- The Grove's manual (thegrove3d.com/learn).
- SpeedTree's manual through its Unity mirror (docs.speedtree.com refused).
- Lintermann & Deussen 1999 for Xfrog (xfrog.net is a shop with no manual).
- Quotations came through a PDF-to-text step or the fetch tool, so check one before printing it.

## Summary
| system | a species is | the look is authored by | cost | take |
|---|---|---|---|---|
| Weber & Penn 1995 (Arbaro) | ≈ 80 geometric numbers per sheet, per level | eye, from photographs, level by level | 1–10 s, 1 MB a tree; author time not stated | **curvature along the limb** (Curve, CurveBack) and **splits** (BaseSplits, SegSplits) |
| ABOP ch. 2 (Honda; Aono & Kunii) | ratios, angles, a tropism vector | editing constants | trivial | the book's own verdict: generic trees, not species |
| Runions et al. 2007 | an envelope + attraction-point density | envelope, N, d_i, d_k | seconds–minutes | the landscaping descriptors map onto four parameters |
| Pałubicki et al. 2009 | λ (or priority weights), η, ξ, a shedding threshold, timing of apical-control loss | a few parameters + a sketching brush | 700k internodes in 82 s (2009 CPU) | **this project's own basis**; it gives no species sheets |
| Longay et al. 2012 (TreeSketch) | Pałubicki + a gravitropic set point θ + **gravimorphism** (epitony/hypotony) | brush and lasso on a tablet; a 2D preview of architecture widgets | instant on an iPad 2 | **position-dependent vigour** (gravimorphism) and n_max for wispy pendulous shoots |
| Pirk et al. 2012 (Plastic Trees) | an input mesh, inverted into ages, light history, tropism, per-branch pruning thresholds | the input model; scale tropism and pruning | 223 ms vs 61.8 s for a regrown 30-year tree | **calibrate shedding from a target shape** |
| Stava et al. 2014 | 24 developmental parameters (Table 2), with age factors | inversely, from an exemplar tree | 12–270 min per fit | the **three-slab crown descriptor**; apical control ≠ apical dominance |
| Makowski et al. 2019 | λ, determinacy D, their mature values, tropism angle α, shade tolerance, p_max; 9 module prototypes from Hallé's models | by hand from the literature | 218 plants at 7 ms a step; 468k plants at 18.8 s | **a phase change at maturity** (λ, D → λ_mature, D_mature) |
| The Grove | a JSON preset + a separate hand-modelled twig | presets tweaked by eye; pruning, React objects | "great results in minutes"; no LOD | **the twig is the species at a distance**; shade-dependent plagiotropism; Lateral Takeover |
| SpeedTree | a generator hierarchy with curves along the parent | procedural curves first, node edits last | $19/month indie; billboards and LOD for real time | **curves along the parent** as the description of form |
| Xfrog (Lintermann & Deussen 1999) | a cascade of Tree components, one per order | parameters with functions per interval | hours per species ("five hours" for a maple) | the authoring cost of geometric sheets |
| Li et al. 2021; DeepTree 2023; Tree-D Fusion 2024 | a class label that looks up a parameter set, plus a learned envelope | data | GPU hours; 20 min a tree | an envelope from data is what makes the outline match; not worth it here |

---

## Weber & Penn 1995, *Creation and rendering of realistic trees* (and Arbaro)
**A species.** A purely geometric, recursive description: no environment, no competition, no shedding.
- **Structure.** A stem is a curved, tapered tube of `nCurveRes` segments. It can split into "clones" (`nBaseSplits`, `nSegSplits`, `nSplitAngle`: dichotomous, same level) and spawn "children" (the next level). Most parameters exist per level (0–3), and most have a variation twin (`…V`).
- **Lengths and placement.** The first-level branch lengths follow a crown envelope: `Shape` 0–8, conical, spherical, hemispherical, … flame, inverse conical, or the pruning envelope. `BaseSize` is the bare bole. Children are placed by `nDownAngle`; a negative `nDownAngleV` makes it vary along the parent. `nRotate` is the divergence ("any number near 140 degrees works well"). `nBranches` is the count.
- **Curvature along a stem.** `nCurve` is the total bend over the stem's first half, `nCurveBack` the bend back over its second half, `nCurveV` a random wander.
- **Attraction.** `AttractionUp` (level ≥ 2) turns stems up, or with a negative value down (the weeping willow, −3).
- **Pruning envelope.** `PruneRatio`, `PruneWidth`, `PruneWidthPeak`, `PrunePowerLow/High`.
- **Radii.** `Ratio` and `RatioPower` set the radii.
- **Leaves.** `Leaves`, `LeafShape` (oval, triangle, 3-lobe oak, 3- and 5-lobe maple, 3 leaflets), `LeafScale`.

The appendix gives four sheets: quaking aspen, black tupelo, weeping willow, California black oak. The oak, for example, has:
- Shape 2 (hemispherical);
- 0BaseSplits 2;
- level-1 DownAngle 30 / V −30, Curve 40, CurveBack −70, CurveV 150;
- AttractionUp 0.8.

**The look.** Authored by hand from photographs, one level at a time: "We usually begin by deactivating the rendering of all levels but the first (the trunk). Once the trunk's appearance is acceptable, we activate and design the second level" (§3). The stated aim is a model "understandable by a common user with only a general knowledge of basic geometry, such as directly observable angles and lengths" (§1). The abstract is explicit: "Our emphasis is on the overall geometrical structure of the tree and not a strict adherence to botanical principles."

**Cost.**
- 5,000–100,000 facets and about 1 MB per tree, formed in 1–10 s.
- LOD by drawing stems as lines and leaves as points: "A 100,000 facet tree geometry may be rendered at 2 kilometers as about 30 lines and 1000 points."
- Arbaro (Java) implements the paper, one XML file per species.

**Consider.** **Curvature along the limb.** Two numbers per level (`Curve`, `CurveBack`) give birch's arch, beech's rise-and-arch and the oak's bend-out-then-up (40, then −70). That is the first gap on the identity table. The second is **splits** (`BaseSplits`, `SegSplits`): co-dominant leaders from a fork, which `pTerm` cannot make.

## Prusinkiewicz & Lindenmayer 1990, *The Algorithmic Beauty of Plants*, ch. 2
**A species.**
- **Honda's model:** contraction ratios r1, r2 and branching angles a1, a2, with the branch plane kept near horizontal.
- **Aono & Kunii's sympodial variant.**
- **A ternary tree with a tropism vector T and a susceptibility e:** after each segment the turtle turns toward T by e·|H×T|.
- **De Reffye's stochastic bud fates** on Hallé's 23 models are surveyed.

**The look.** By editing the constants (Tables 2.1–2.3).

**Cost.** Trivial.

**Consider.** The chapter's own conclusion: "the tree-like shapes created so far are rather generic …, and models of particular tree species, directly based on biological data, are yet to be developed" (p. 62). The tropism-by-susceptibility rule is what C4's η is.

## Runions, Lane & Prusinkiewicz 2007, *Modeling trees with a space colonization algorithm*
**A species.** An envelope (a surface of revolution) seeded with N attraction points. Each node grows toward the points within its radius of influence d_i, and a point dies when a node comes within d_k. Then a tropism bias g and the pipe model.
- **Density and wander:** lower N and larger d_k give sparser crowns; a small d_i makes tips meander.
- **Excurrent or decurrent:** a narrow envelope gives an excurrent tree, a wide one a decurrent tree. This emerges.
- **Hierarchy:** points added over time at shrinking spacing give a hierarchy of branch sizes.

**The look.** Through four parameters that map onto landscaping descriptors: "spreading or columnar crown shape, excurrent or decurrent branching habit, open or dense branch system, ascending or pendulous branch orientation". But: "we were not able to generate strongly pendulous, 'weeping' trees".

**Cost.** "Between a few seconds and a few minutes" on a 3 GHz desktop.

**Consider.** The claim that "the competition for space appears to play the dominant role" in temperate trees (§4) is the bet this project already makes. An envelope is the input here; for us it is an output to measure. A pendulous habit needs more than competition, in their system and in ours (identity table, row "twig posture").

## Pałubicki et al. 2009, *Self-organizing tree models for image synthesis*
**A species.** Metamers grown each season.
- **Light** from space colonisation (θ ≈ 90°, ρ = 2, r = 4–6 internodes) or from shadow propagation (Δs = a·b^(−q)).
- **Allocation** by the extended Borchert–Honda rule (λ) or by a priority model (w_max, w_min, κ), with apical control removable at chosen times.
- **Direction:** a weighted sum of the default direction, the environment (ξ) and the tropism (η).
- **Shedding:** light per internode below a threshold (after Takenaka).
- **Girth:** the pipe model.
- **Two key figures:** Fig. 7 runs λ from 0.46 to 0.54, from decurrent to excurrent. Fig. 12 gets gnarled decurrent forms from a strong downward η with a strong ξ.

**The look.** By a handful of parameters, the timing of apical-control loss, tropism by order or time, pruning and bending between steps, and a pressure-sensitive brush that adds markers. There are no species-named sheets: "Parameter λ provides a useful control of the decurrent vs. excurrent habit" (§4.2).

**Cost.** About 300 lines of L+C. A 700,000-internode tree took 82 s on a 2.4 GHz Pentium 4 (Table 1).

**Consider.** It is this project's basis (C1–C6), so the lesson is what it leaves out: species. Its forms differ by λ and the timing of apical-control loss. Identity at the scale of our cards (arching limbs, hanging twigs, kinks, bark) is not in its vocabulary either.

## Longay, Runions, Boudon & Prusinkiewicz 2012, *TreeSketch*
**A species.** Pałubicki's Borchert–Honda allocation plus space colonisation, with additions:
- **Light sensitivity:** Q = b·L^κ.
- **Shoot length scaled to the maximum vigour:** n = ⌊(v/v_max)·n_max⌋. A high n_max gives "wispy, pendulous shoots".
- **A shedding threshold:** Th.
- **A gravitropic set-point angle θ** (Digby & Firn 1995).
- **Gravimorphism:** b = cos²τ + d·sin²τ over a control ellipse (s_v, s_p, e_v). This sets epitony (vigour favours upper laterals), hypotony (lower laterals) and amphitony.
- **Direction:** H′ = αH + βT + γE.

**The look.** Brush strokes and a lasso (a silhouette inflated to an envelope) on an iPad. An Architecture panel puts widgets for θ, the gravimorphism ellipse, the angles and the α/β/γ triangle on **a live 2D preview tree**. Saved trees serve as templates for tree types.

**Cost.** "Trees were generated instantaneously while brushing" on an iPad 2. The defaults are in a supplementary table that is not online.

**Consider.** **Gravimorphism**: lateral vigour weighted by the bud's position (upper or lower side) on a near-horizontal parent. That is a cheap, local rule for the difference between hypotonic, skirted crowns (beech's low limbs, holly) and epitonic, ascending ones. Our R2 has acrotony (κ) along the shoot but nothing across it. Second, **the 2D preview of architecture widgets**: the form atlas (track B) is the same idea in sheets.

## Pirk et al. 2012, *Plastic Trees*
**A species.** No growth model. A static mesh is turned into a skeleton and leaf lobes, and the system estimates:
- each branch's age (equal tip completion);
- its light history (by "un-growing" the lobes);
- its pre-tropism direction;
- its own pruning threshold: light gathered over the length it supports, set at 0.8 × the 5th percentile of what survived.

New obstacles or neighbours then bend branches toward light and prune by those thresholds.

**The look.** The input model. The user scales tropism and pruning.

**Cost.** Two orders of magnitude faster than regrowth: 223 ms against 61.8 s for a 30-year tree of 9,134 nodes (Table 2). It cannot add branches, and the input must be a solitary tree.

**Consider.** **Calibrate shedding from a target form.** In a target photograph or QSM, the lowest living limb sits at the shedding threshold of the light it receives. Pirk's percentile rule turns that into a number. For D's targets this is a cross-check on C5's `T` and `Trel`. Pirk's foliage is a light-modulated lobe, not leaves; that is a route for C's foliage budget.

## Stava et al. 2014, *Inverse procedural modeling of trees*
**A species.** A developmental bud model after Pałubicki 2009, with 24 parameters (Table 2):
- **geometric:** apical angle variance, lateral bud count, branching angle mean/variance, roll angle, internode length and its age factor;
- **bud fate:** apical and lateral light factors, apical dominance (base, distance, age factors), apical control (base, age factor), bud death;
- **environmental:** phototropism, gravitropism, pruning factor, low-branch pruning height, gravity bending strength and angle factor.

The age factors are multipliers raised to the tree's age (ϕ^t), so the crown changes with age. The paper separates two ideas we merge: "Apical control influences the growth rate of a shoot, but apical dominance controls bud flushing" (§4.1).

**The look.** Inversely. A candidate is scored against an exemplar by three distances:
- **shape:** the crown cut into three horizontal slabs, each with height, r_min, r_max and leaf density, compared as 1 − exp(−Δ²/2σ²) with σ = min/5 and an L2.5 norm;
- **geometry:** per-branch statistics;
- **structure:** a tree edit distance.

The fit is simulated annealing, 7,500 iterations, scoring 8 stochastic trees per evaluation. On hand authoring, their own forward examples "[were] generated using a trial-and-error approach because the parameter space is large, and expressing the designer intention in this way is difficult" (§4.3). Limits: it was "unable to accurately capture the regular nature of some input trees" (§6.2).

**Cost.** 12–270 minutes per fit (Table 4).

**Consider.** **The three-slab crown descriptor** is a cheap shape score that reads a frontal outline directly, and close to what `lone100` and `[[report]]` measure. If D's shape score is ever re-done, this is the published form, scored over several seeds as they do. Second, the **split of apical control from apical dominance**: our λ does the first, and R4's dormancy does part of the second.

## Makowski et al. 2019, *Synthetic silviculture*
**A species.** Three scales.
- **Modules.** Plants are built from 9 module prototypes, "skeletal graphs … based on tree architectures discussed in Hallé et al. [1978]".
- **Vigour.** Borchert–Honda between modules: "Values of λ > 0.5 result in excurrent architectures, whereas λ ≤ 0.5 in decurrent".
- **Determinacy D** picks the next module from a (λ, D) morphospace: "High values of D result in monopodial (single trunk) forms, low values produce sympodial (multi trunk)".
- **Maturity.** At a flowering age, λ and D switch to λ_mature and D_mature (their baobab).
- **Tropism:** an angle α with a weight ω2.
- **Senescence:** after p_max, root vigour ramps to zero.
- **Shade tolerance:** Q_eff = lerp(s_tol, 1, Q).
- **Climate:** one Gaussian adaptation scalar.

Table 4 gives 16 plants by these columns.

**The look.** By hand, from the literature: "For finding these parameter values we rely on existing literature [Barthélémy and Caraglio 2007; Pałubicki et al. 2009]". And: "Finding an appropriate configuration to author specific plant shapes can be challenging … we did not conclusively explore this parameter space" (§8.1).

**Cost.** 218 plants (57k branches) at 7 ms a step; 468,199 plants at 18.8 s a step (i5, GTX 1050). Their stand checks: logistic biomass, the 3/2 self-thinning law, and H–D allometry against Eloy et al. 2017.

**Consider.** **A phase change at maturity.** A species carries a young and a mature value of its two architectural knobs, switched at an age. Our `aC`, `dLambda` and `ramp` do this for λ alone. Extending the switch to the set point, the generator and `pTerm` would give:
- the oak's leader loss at 40–80 y;
- the young cone to old dome of hornbeam and fir;
- birch's late weeping.

All of these come by data, not new mechanisms. Their **determinacy** is our `pTerm` given a name and a place on a map. Their stand checks are cheap evidence targets.

## The Grove (thegrove3d.com)
**A species.** A preset (a plain-text JSON file of parameters) plus a twig. "Twigs and presets are two completely separate things."
- **Growth** is a simulation: one flush per year ("grow in 8-year increments"). Light is ray traced over a phyllotactic sky sample, with "two small polygons" per tip standing in for its foliage. Bending uses Euler–Bernoulli beams. Since 2.0 the core is Rust, shipped as a Python module.
- **Vigour:** Favor Bright, "one of the strongest parameters", and Favor End (apical dominance).
- **Branching:** Add (Chance, Angle, Up, Horizontal, Regenerative).
- **Turning:** Turn (Up, **Horizontal, for shaded branches**, To Light, Twist).
- **Shedding:** Drop (Shaded, Obsolete).
- **Girth:** Thicken.
- **Bending:** Bend (Flexibility, Branch Ends), with Solidify and Fatigue.
- **Release 3** added Shade Avoidance, Gravitropism Shade Influence and Lateral Takeover.

**The look.** Start from a preset, tweak, grow. Then prune, draw, and add React objects (Block, Deflect, Shade, Attract). Twigs are hand-modelled meshes instanced at the branch ends (`_EndTwig`, `_SideTwig`, `_UpwardTwig`, `_DeadTwig`). They are sold per species (€9.69): *Quercus robur*, *Fagus sylvatica*, *Carpinus betulus*, *Acer campestre*, *Fraxinus*, *Crataegus*, among others. There is a paper birch twig but no European birch twig.

**Cost.** "Great results in minutes"; adaptive meshing; no LOD ("does not have game-specific tools like LOD generation").

**Consider.** It is the nearest system to ours: a self-organising growth simulation in Rust with presets as JSON. Its answer to species identity is **a separate twig per species**. The architecture comes from the simulation; the look at a distance comes from a hand-made unit instanced at every bud end. On a phone at 20 m, a per-species twig or leaf-cluster sprite is what track C's leaf style should grow into. Two more things in it:
- **Plagiotropism that depends on shade** (Turn > Horizontal). Nicolini finds the same in beech: weak axes are plagiotropic and bilateral.
- **Lateral Takeover:** a lateral replacing a lost leader, i.e. sympodial reiteration.

## SpeedTree
**A species.** A hierarchy of generators (trunk, branches, fronds, leaves). Each generator has properties:
- **Generation mode:** Interval, Phyllotaxy, Bifurcation.
- **Spine:** Start angle, Gravity ("positive values pull branches down"), Straightness, Parent Curl, Zigzag, Noise, Jink, Break.
- **Pruning:** Prune (Interior, Up, Down, Ground).
- **Seasons:** with gravity droop.

Each property is controlled by curves: "Parent curves govern the group as a whole while profile curves are applied the same to each member." "Growth" animates the final form along a timeline ("traced out into its final form"). SpeedTree 10's Shade Pruning removes interior leaves as a post-process. Library packs are per species; the European beech pack has nine models: three seasons, each at hero, desktop and mobile resolution.

**The look.** "The backbone of the modeling system is procedural": curves first, node edits last.

**Cost.** $19 a month (Indie) or $899 a year (Pro). LOD down to billboards, "just a picture of the tree", batched by the thousand.

**Consider.** **Curves along the parent** as the description of form: angle, length, curl and gravity as functions of position on the parent. We could report our emergent trees in that form (insertion angle and limb length against height in the crown). That would let a species' form be compared with a hand-authored one and with the cards, curve against curve. Its season and mobile variants say a species' look is several pictures, not one.

## Xfrog (Lintermann & Deussen 1999, *Interactive modeling of plants*)
**A species.** A "structure tree" of components:
- **Tree:** a stem multiplying its branches by distribution, scale and angle;
- **Horn:** stems on a curve;
- **Leaf:** an outline, curvatures and a material;
- **PhiBall, Hydra, Wreath:** further multiplying components;
- **World:** light and gravity fields;
- **FFD:** free-form deformation.

A tree is "a cascade of Tree components", one per branch order. Parameters can be functions over their interval.

**The look.** By hand. "An experienced user takes several hours to model a tree from scratch … the very complex maple tree … was modeled in five hours"; "The huge parameter space caused problems". The species library is sold.

**Cost.** Hours of an expert per species.

**Consider.** The cost of geometric species sheets. A garden of ten species at hours each is affordable, but the sheets would not grow, compete or respond to a stand. The tracks plan keeps physiology for behaviour and adds form rules; Xfrog is the case against replacing the core with sheets.

## Learned reconstructions
- **Li et al. 2021, *Learning to reconstruct botanical trees from single images*** (ACM TOG 40(6):231).
  - **How it works:** three CNNs give a mask, a species label (7 species, 94%) and a radial bounding volume. Space colonisation from the mask grows the scaffold, and Stava's model grows the crown inside the envelope.
  - **Species:** a lookup: "The species identifier is then used to look up a predefined set of parameters P for each individual species." No developmental parameter is inferred.
  - **Cost:** about 10 s a tree; 26.4k synthetic training images.
  - **Limits:** it "cannot meaningfully encode trees with disjoint horizontal branching structures".
- **DeepTree** (Zhou et al., arXiv 2305.05153).
  - **How it works:** it learns "developmental rules for branching structures instead of manually defining them" from trees generated by Stava's model (8 species, 500 trees each). Species enters as an integer.
  - **Cost:** 2.7 s against 23 s procedural for a beech; 10 GPU-hours of training.
  - **Limits:** "modifying the parameters of the intrinsic model is not possible"; no tree–tree interaction.
- **Tree-D Fusion** (Lee et al., arXiv 2407.10330).
  - **How it works:** a genus prompt to a fine-tuned diffusion model gives an envelope, filled by Rhizomorph's space-colonisation growth.
  - **Scale and cost:** 600k street trees, 20 minutes a tree on an RTX 3090.
- **Two more:** Rhizomorph (SIGGRAPH 2023) is procedural, a coupled shoot–root model. An autoregressive transformer over branch tokens (arXiv 2502.04762) learns growth from Rhizomorph output for 6 species.

**Consider.** In every learned system the species is a parameter set of a procedural teacher, and **the outline comes from an envelope** learned from data. A learned model reproduces its teacher, loses the knobs and drops interaction between trees. Nothing here is worth adopting. The one transferable fact: where these systems match a species' outline, they do it by constraining the envelope, not by better branching rules. Our outline is emergent and judged on the sheets; an envelope is at most a diagnostic.

---

## Step-change candidates, ranked by value for cost
Value is what it does for recognising the ten species at 15–30 m on a phone (the identity table's order). Cost is in this project's units: a rule in `rust/core` with an ADR, goldens unchanged by default, and the form atlas; or a renderer change; or an analysis.

| # | candidate | from | value | cost | owner |
|---|---|---|---|---|---|
| 1 | **Curvature along the limb**: a per-level bend that accumulates with distance from the parent, out then back (Curve, CurveBack), applied to the heading via the frame | Weber & Penn; SpeedTree's Parent Curl | high: birch's arch, beech's rise-and-arch, oak's bend-out-then-up, hornbeam's bow; four first lines on the cards | low: a C4/R2 term per level, two params; the frame carries it (ADR 0025) | B |
| 2 | **A species twig or leaf-cluster unit** instanced at bud ends, with the leaf style's clumping (strings, clots, rosettes, tufts, sprays) | The Grove's twigs; SpeedTree's leaves; Pirk's lobes | high: foliage is half the identity at phone scale; clumping cues are all [u] on the cards but obvious in photographs | low: renderer only, seconds to iterate | C |
| 3 | **Per-species bark** (white birch, orange upper pine, pale grey beech, fluted hornbeam) | every commercial tool (bark material per species) | high at 20 m, now all [r] on the cards | very low: CSS tokens per species | C |
| 4 | **Phase change at maturity**: young and mature values of set point, generator and `pTerm`, switched at an age (as `aC` already does for λ) | Makowski's λ_mature/D_mature; Stava's age factors | medium-high: oak's leader loss, hornbeam's and fir's cone → dome, fir's limbs erect → level → descending | low: data in R2's table, one switch | B |
| 5 | **Sympodial takeover and co-dominant splits**: a lateral takes the leader's place when its tip dies or weakens; *n* equal leaders from a fork | The Grove's Lateral Takeover; Makowski's determinacy; Weber–Penn's BaseSplits | high for oak, beech, hornbeam, willow, maple (decurrent crowns); ADR 0031's flat top | medium: R2 reiteration, already planned after shipping | B |
| 6 | **Pendulous shoots that hang without the limb**: a negative attraction at twig level, long weak shoots (n_max), or bending of thin shoots under their own load | Weber–Penn's AttractionUp < 0; TreeSketch's n_max; The Grove's Bend | high for birch, medium for beech's low limbs | medium: R3 per level, or a twig-level set point decoupled from the limb | B |
| 7 | **Gravimorphism**: lateral vigour by position on a near-horizontal parent (epitony vs hypotony) | TreeSketch | medium: skirted crowns (beech, holly), level sprays, ascending willow and rowan | low-medium: a weight in C3's allocation | B |
| 8 | **Shade-dependent plagiotropism**: weak, shaded axes turn level (Nicolini's bilateral beech shoots) | The Grove's Turn > Horizontal; Nicolini 2000 | medium: beech and hornbeam layers, Troll's model | low: η's set point as a function of Q | B |
| 9 | **The three-slab crown descriptor** as the shape score, over seeds | Stava et al. 2014 | medium: a published, frontal shape measure for D's report | low: analysis | D |
| 10 | **Shedding calibrated from a target form** (Pirk's percentile rule) | Pirk et al. 2012 | low-medium: a check on C5's `T`, `Trel` per species | low: analysis on QSMs or photos | D |
| 11 | **Stand checks**: logistic biomass, 3/2 self-thinning, H–D against Eloy 2017 | Makowski et al. 2019 | low-medium: cheap evidence for the wood | low | D |
| 12 | Crown envelopes as input (Shape, pruning envelope, RBV) | Weber–Penn; Runions; Li et al. | low: against the project's bet; as a diagnostic only | — | — |
| 13 | Learned models | DeepTree; Li et al.; Tree-D Fusion | none here | high | — |

Items 1–3 are cheap and each answers a first-line cue on several cards. Items 4–8 are the form vocabulary track B was set up for; 4 and 8 are mostly data and a dependency in existing rules. Item 5 is the one structural change, and it is already planned.

## The descriptive parameters, mapped onto our rules
"Home" means a rule and a param already express it (perhaps not per level, or not with age). "Partial" means part of it. "None" means no rule or field does.

| descriptive parameter (systems) | what it describes | our home | status |
|---|---|---|---|
| Borchert–Honda λ; Favor Bright; apical control (Stava AC) | excurrent vs decurrent; vigour shared or kept | C3 λ, R2 `levels[i].lambda` | **home** |
| λ_mature, D_mature, age factors ϕ^t (Makowski; Stava) | a crown that changes kind with age | R2 `aC`, `dLambda`, `ramp` (λ only) | **partial**: only λ changes with age |
| determinacy D; monopodial vs sympodial; Lateral Takeover | the leader persists or is replaced | R2 `pTerm` (kills the leader); R4 release | **partial**: no takeover by a lateral, no *n* co-dominant leaders |
| BaseSplits, SegSplits, SplitAngle (Weber–Penn); Bifurcation (SpeedTree) | the trunk or a limb forks into clones | — | **none** |
| DownAngle(V), branching angle BAM/BAV, Start angle, Add Angle | insertion angle per order, and its trend along the parent | C1 `branchAngle`, R2 `levels[i].branchAngle` | **home** per level; the trend along the parent emerges, it is not set |
| gravitropic set point θ (TreeSketch); tropism angle α (Makowski); Turn Up | the direction a shoot seeks | C4 `setPoint`, R2 `levels[i].setPoint`, `eta` | **home** |
| posture, Solidify, Fatigue, gravity bending GBS/GBA (Stava), Bend | wood holding or yielding under load | R3 (`postureSetPoint`, E, φ, `c`, sag, breakage) | **home**; one set point per level, none changing with the limb's age |
| Curve, CurveBack, CurveV (Weber–Penn); Parent Curl, Zigzag (SpeedTree); curvature (Xfrog) | bending along the length of a limb | C4 ε, σ (random wander only); R3 sag (load only) | **none** for an authored bend |
| AttractionUp < 0 (Weber–Penn); n_max wispy shoots (TreeSketch) | pendulous twigs | R2 `levels.2.setPoint` (collapses the crown above 80) | **partial**: no hanging twig level independent of its limb |
| Turn Horizontal for shaded branches (The Grove); plagiotropy | level growth of weak or shaded axes | C4 set point per level, not per light | **partial** |
| gravimorphism (epitony/hypotony) (TreeSketch) | vigour by position on a horizontal parent | R2 `kappa` (acrotony along the shoot only) | **none** across the shoot |
| apical dominance AD_* and bud flushing LF_* (Stava); Favor End | bud break inhibited by buds above | R4 (`vBreak`, `qRel`, dormancy, bank) | **home** |
| phototropism ξ; To Light; PT | lean toward light | C4 ξ | **home** |
| shedding threshold (Pałubicki); Drop Shaded; PF (Stava); pruning factor ψ (Pirk) | self-pruning of shaded limbs | C5 `T`, `Trel`, `g` | **home** |
| low-branch pruning LB_PF (Stava); Auto Prune Low; BaseSize | the bare bole | C5 (emergent in stands) | **home** as emergent; no direct knob |
| shade tolerance s_tol (Makowski) | how far a species tolerates shade | C5 `T`, R1 leaf cost (ADR 0032) | **home** |
| p_max, senescence (Makowski) | lifespan and old-age decline | O4 mortality `m0` | **partial**: no ramped senescence of vigour |
| pipe exponent n; Ratio, RatioPower (Weber–Penn); Thicken | girth | C6 `n`, R1, ADR 0027 | **home** |
| phyllotaxis, Rotate, Phyllotaxy style, whorled | bud placement | C1 `phyllotaxis`, `divergence`; R2 `generator`, `whorl`, `tierEvery` | **home** |
| internode length IBL, IL_AF; Grow Length | shoot length, and its decline with age | C1 `internodeLength`; R1 | **partial**: no decline with age |
| Shape envelope, PruneRatio/Width (Weber–Penn); RBV (Li); Sphere envelope (SpeedTree) | the outline imposed | — | **none, by design**: our outline emerges; use as a diagnostic |
| Leaves, LeafShape, LeafScale (Weber–Penn); Leaf (Xfrog); twig (The Grove) | leaf size, outline, density | leaf style `shape`, `cm`, `length`, `aspect`, `spread` | **home** |
| twig as an instanced unit (The Grove); leaf clusters (Pirk) | the foliage unit at a distance | leaf style (one leaf per young metamer) | **none**: no per-species cluster |
| seasonal variants, Season (SpeedTree) | flush, autumn, winter look | leaf style `flush`, `turn`, `palette`, `marcescent`, `deciduous` | **home** |
| bark material per species (all commercial tools) | bark colour and texture | one `--bark-young → --bark-old` ramp | **none** per species |
| Flare, Lobes (Weber–Penn) | trunk base and fluting | — | **none** (minor at 20 m) |

Of the descriptive parameters these systems share, the ones with no home are those that carry identity at a distance:
- an authored bend along the limb;
- splits into co-dominant leaders;
- a hanging twig level;
- gravimorphism;
- the twig unit;
- per-species bark.

The physiological ones (λ, set points, tropisms, shedding, girth, phyllotaxis) all have a home. Rows 1–8 of the ranking add the missing ones without replacing what has a home.

## Sources
- Weber & Penn 1995, *Creation and rendering of realistic trees*, SIGGRAPH '95, 119–128, https://courses.cs.duke.edu/fall02/cps124/resources/p119-weber.pdf. Arbaro, http://arbaro.sourceforge.net and https://github.com/wdiestel/arbaro.
- Prusinkiewicz & Lindenmayer 1990, *The Algorithmic Beauty of Plants*, ch. 2, https://algorithmicbotany.org/papers/abop/abop-ch2.pdf.
- Runions, Lane & Prusinkiewicz 2007, *Modeling trees with a space colonization algorithm*, Eurographics Workshop on Natural Phenomena, 63–70, https://algorithmicbotany.org/papers/colonization.egwnp2007.pdf.
- Pałubicki, Horel, Longay, Runions, Lane, Měch & Prusinkiewicz 2009, *Self-organizing tree models for image synthesis*, ACM TOG 28(3):58, https://algorithmicbotany.org/papers/selforg.sig2009.pdf.
- Longay, Runions, Boudon & Prusinkiewicz 2012, *TreeSketch: interactive procedural modeling of trees on a tablet*, SBIM 2012, https://algorithmicbotany.org/papers/TreeSketch.SBM2012.pdf.
- Pirk, Stava, Kratt, Said, Neubert, Měch, Benes & Deussen 2012, *Plastic trees: interactive self-adapting botanical tree models*, ACM TOG 31(4):50, https://cs.purdue.edu/homes/bbenes/papers/Pirk12ToG.pdf.
- Stava, Pirk, Kratt, Chen, Měch, Deussen & Benes 2014, *Inverse procedural modelling of trees*, CGF 33(6):118–131, https://cs.purdue.edu/homes/bbenes/papers/Stava14CGF.pdf.
- Makowski, Hädrich, Scheffczyk, Michels, Pirk & Pałubicki 2019, *Synthetic silviculture: multi-scale modeling of plant ecosystems*, ACM TOG 38(4):131, https://wp.faculty.wmi.amu.edu.pl/papers/Makowski.etal-2019-Synthetic-Silviculture.pdf. Pałubicki et al. 2022, *Ecoclimates*, ACM TOG 41(4):155, https://wp.faculty.wmi.amu.edu.pl/papers/Palubicki.etal-2022-Ecoclimates.pdf.
- Prusinkiewicz & Remphrey 2000, *Characterization of architectural tree models using L-systems and Petri nets*, https://algorithmicbotany.org/papers/catm.tree2000.pdf.
- The Grove, https://www.thegrove3d.com/learn/ and https://www.thegrove3d.com/twigs/.
- SpeedTree Modeler manual (mirror), https://docs.unity3d.com/speedtree-modeler/manual/; pricing, https://unity.com/products/speedtree.
- Lintermann & Deussen 1999, *Interactive modeling of plants*, IEEE CG&A 19(1):56–65; Lintermann & Deussen 1997, Graphics Interface, https://graphicsinterface.org/wp-content/uploads/gi1997-22.pdf.
- Li, Kałużny, Klein, Michels, Pałubicki, Benes & Pirk 2021, *Learning to reconstruct botanical trees from single images*, ACM TOG 40(6):231, https://cs.purdue.edu/homes/bbenes/papers/Li21ToG.pdf.
- Zhou, Li, Benes, Fei & Pirk 2023, *DeepTree: modeling trees with situated latents*, IEEE TVCG, https://arxiv.org/abs/2305.05153.
- Lee, Li, Beery, Huang, Fei, Yeh & Benes 2024, *Tree-D Fusion*, ECCV, https://arxiv.org/abs/2407.10330. Autoregressive trees, https://arxiv.org/abs/2502.04762.
- Nicolini 2000, Can. J. Bot. 78:77–87 (abstract), for plagiotropy by vigour; see the [identity cards](2026-11-01-species-identity.md).
