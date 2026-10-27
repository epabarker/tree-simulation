# Self-Organizing Trees in a 2D World: A Principle-Level Specification for a Procedural Growth Simulator

The Palubicki et al. (2009) loop that Guerra implements is the right core and carries over to 2D with modest changes. The two most valuable additions close loops the baseline leaves open: a carbon budget that charges for built wood, and a per-season mechanics pass in which girth sets stiffness, so branches sag and reorient. Both are local, linear-time passes that turn girth from decoration into a cause.

**TL;DR**
- **Framing:** model a genuinely planar organism in a thin slab. Light, space, direction and competition live in the plane. Stems keep circular cross-sections, so pipe-model, mass and stiffness rules stay comparable with 3D data such as Leonardo exponents of 1.8–2.3 (Eloy 2011). Compensate for earlier crowding with sparser (distichous) buds and recalibrated shadow and shedding parameters.
- **Minimal core (6 principles):** metamer/bud structure, a shared 2D shadow grid, Borchert–Honda allocation (λ ≈ 0.46–0.56), weighted-vector shoot direction, light-per-metamer shedding, and pipe-model girth with memory. Multi-tree competition comes free, because all trees read and write one grid.
- **Highest-value refinements:** carbon balance with wood and hydraulic costs (height plateau, starvation death); physiological age per axis (Hallé–Oldeman architectures, sympodial branching, excurrent-to-decurrent transition); and mechanics with posture control (Moulia et al. 2006; Bastien et al. 2013), which makes weeping and Troll-type forms emergent. Stand dynamics are an optional extension; self-thinning should emerge, with a different slope in 2D than the 3D −3/2 rule.

---

## 1. Overview: the feedback loops behind self-organization

Palubicki et al. built on "the biological hypothesis that the form of a developing tree emerges from a self-organizing process dominated by the competition of buds and branches for light or space, and regulated by internal signaling mechanisms," following Sachs and Novoplansky (1995).\[1\]\[2\] Form emerges from five loops:

| Loop | Sign | Mechanism | In baseline? |
|---|---|---|---|
| A. Light–density | negative | Growth adds leaves → interior shaded → buds dormant or shed | Closed |
| B. Vigour–dominance | positive | Well-lit branches get more resource → grow more → more light | Closed (λ) |
| C. Size–cost | negative | Wood costs maintenance and lengthens hydraulic paths → growth slows, crown retreats, death | **Open** |
| D. Load–posture | mixed | Weight → sag → new light; reaction wood re-erects axes | **Open** (sag is post-process) |
| E. Between-tree | asymmetric | Taller crowns shade shorter → suppression, death, gaps, release | Partial (no mortality or release) |

Borchert and Slade (1981, cited by Palubicki et al.) explain why loop A is essential: with fixed-size internodes, element count grows exponentially with age but available volume only as age³, so density would rise without limit.\[2\] In 2D available space grows as age², so crowding arrives sooner.

---

## 2. The 2D framing decision

**Option S: silhouette of a 3D tree.** 3D rules and parameter values stay valid. But honest light competition needs 3D geometry (a 3D simulator drawn flat), overlapping branches in the picture do not actually compete, and neighbours in a projection may be metres apart in depth.

**Option P: genuinely planar organism.** What you see is exactly what competes, directions are one angle, moments are scalars, and a whole-sky light sweep is cheap. The cost is that 3D quantitative results (crowding rates, self-thinning exponents, phyllotaxis) no longer transfer directly.

**Recommendation: Option P with a "thin-slab, round-stem" convention.** Spatial rules (shadow grid, light direction, tropisms, occupancy, contact) are planar. Material rules use circular cross-sections: pipe model (r^n, n≈2), mass (πr²l), stiffness (I = πr⁴/4), maintenance cost. Conserving planar *width* (exponent 1) would make trunks absurdly thick and break comparability with Leonardo's rule and elastic similarity. Borrow spiral phyllotaxis from Option S only as a side-sequence generator (C1).

I found no study testing a vertical-plane tree model against 3D. Forestry reduces light competition to a *horizontal* plane (field-of-neighbourhood, iLand), a different simplification.\[3\] Your experiments will establish 2D validity (Section 11).

| Effect of losing a dimension | Why | Compensation |
|---|---|---|
| Crowding sooner | Space grows as t², bud number exponentially | One bud per node (distichous); slightly higher shedding threshold; lower α |
| Self-shading concentrated | Shadow triangle (2q+1 cells/layer) vs pyramid ((2q+1)²) | Lower shadow strength *a* or raise decay *b*; calibrate on an isolated tree |
| No growing "around" neighbours | Each tree has two neighbours across the whole crown face | Spacing ≈ 1/√ρ to mimic a 3D density ρ; expect stronger suppression |
| Lost out-of-plane noise/sway | One fewer degree of freedom | Slightly larger in-plane angular noise |
| Space-filling allometries change | E.g. self-thinning slope assumes mass ∝ L³, area ∝ L² | Derive 2D analogues (Section 10) |

---

## 3. The principles

**Tiering.** The **core** is the smallest set in which loops A and B close and competition through the grid emerges; removing any one breaks growth (C1–C4) or yields cluttered, boleless crowns (C5); C6 is needed once anything reads girth. **Refinements** each close a loop (C or D) or add a whole axis of species variety. **Optional** items are alternative mechanisms, phenomena with debated mechanisms, or population processes. **[RNG]** marks randomness.

### Tier 1: Minimal core

#### C1. Metamer structure, bud fate and 2D side sequence
1. **Statement.** A tree is a graph of metamers (internode, leaf, bud(s)); all growth happens at buds whose fate (grow, dormant, terminate/flower, abort) depends only on local signals.
2. **Biology.** Plants are hierarchical modular structures (Barthélémy & Caraglio 2007). Terminal buds extend axes, axillary buds start laterals; development may be proleptic or sylleptic, rhythmic or continuous, monopodial or sympodial. Most buds never become lasting branches.\[2\]
3. **Evidence.** Well established.
4. **Local rule.** Bud state ∈ {dormant(age), active, terminated, aborted}. New axillary buds get a side s ∈ {−1,+1}: *distichous* s_k = s₀(−1)^k **[RNG: s₀]**; *opposite* both sides each node; *whorled* both sides at the first node of each growth unit; *projected spiral* φ_k = 137.5°k, s_k = sign(sin φ_k), foreshortened angle β_eff = atan(tan β·|sin φ_k|). Reads parent direction/order; writes bud records.
5. **2D translation.** Reinterpreted: distichy is the only truly planar phyllotaxis, so it is the default.
6. **Parameters.** Buds/node (1–2); generator; branch angle β per order (Honda & Fisher 1978 found angles near effective-leaf-area optima in *Terminalia*); internode l₀ ≈ one grid cell (as in Palubicki et al.); metamers per shoot cap; prolepsis flag.\[4\]
7. **Feedback.** Substrate of every loop; bud count sets competition in A and B.
8. **Module boundary.** Required; generators swappable.
9. **Multi-tree.** No difference.
10. **Emergent signature.** Regular-but-irregular branching. Without node-anchored buds, growth is "quite disorganized" (Palubicki et al., Fig. 21a).\[2\]
11. **Cost.** O(1) per bud.
12. **Baseline.** In baseline (Guerra shows six patterns); side-sequence reinterpretation new.\[5\]

#### C2. Shared light field: the 2D shadow grid
1. **Statement.** Every bud/leaf deposits shadow into one grid shared by all trees; every bud reads light Q and direction V from it.
2. **Biology.** Shoot growth and survival respond to the local light environment (Takenaka 1994).\[6\] Light competition is "almost always size asymmetric" because light comes from above; Schwinning and Weiner (1998, Oecologia 113) define asymmetric competition as the case where "uptake of resources increases with size, and larger plants receive a disproportionate share."
3. **Evidence.** Light response well established; the pyramid is a graphics convenience ("a coarse estimate," Palubicki et al.).\[2\]
4. **Local rule.** Baseline: a bud in cell (I,J) adds a·b^(−q) to cells (I±p, J−q), q ≤ q_max, p ≤ q; Q = max(C − s + a, 0); V toward the least-shaded cell in a perception wedge.\[2\] **Recommended upgrade (sky sweep):** store leaf area density ℓ; for K sky directions with weights w_k, march from the top with I ← I·exp(−k_ext·ℓ·Δ); Q = Σ w_k I_k, V = normalize(Σ w_k I_k d_k). Beer–Lambert, captures side light at edges and gaps, cost independent of tree count.
5. **2D translation.** Pyramid → triangle; cost per bud (q_max+1)²; full-sky light becomes affordable.
6. **Parameters.** a, b > 1, q_max (Palubicki: 4–8 layers), C, cell size, wedge angle θ;\[2\] sky sweep K (5–9), k_ext, sky weighting (oblique sun gives asymmetric crowns).
7. **Feedback.** Closes loops A and E; V feeds C4.
8. **Module boundary.** Required; swappable behind `sample(pos, dir) → (Q, V)` (pyramid, sky sweep, O3).
9. **Multi-tree.** The only interaction channel; downward shadow makes competition size-asymmetric without special rules.
10. **Emergent signature.** Hollow interior, dense shell, lean toward gaps.
11. **Cost.** O(B·(q_max+1)²) or O(K·W·H).
12. **Baseline.** In baseline; sky sweep new.

#### C3. Basipetal light summation and acropetal Borchert–Honda allocation
1. **Statement.** Light sums tips-to-base; v = α·Q_base flows back up and splits at each node between axis and lateral by light, biased by λ.
2. **Biology.** Palubicki et al. note "it is not known whether apical control in nature is exerted through competition for resources, hormonal control, or both."\[2\] Since then, pea experiments showed "sugar demand, not auxin, is the initial regulator of apical dominance" (Mason et al. 2014). In rose and pea, bud outgrowth "quantitatively adjusts to the balance between sugar and auxin level," and "sugar supply inhibits strigolactone response to promote bud outgrowth" (Bertheloot et al. 2020, New Phytologist 225). Takenaka (1994) found a model tree sharing assimilates equally "was much disadvantaged in competition."\[6\]
3. **Evidence.** Supported but debated (BH is phenomenological; apical control well established).
4. **Local rule.** Basipetal: Q(node) = ΣQ(children). Base: v = α·Q_base (or R1 net carbon). Acropetal: v_m = v·λQ_m/(λQ_m + (1−λ)Q_l), v_l = v − v_m. Bud: n = ⌊v⌋ metamers (capped), length l = v/n; v < 1 → none. Alternative *priority model* (Palubicki et al.): per axis, v_i = v·Q_i w_i/ΣQ_j w_j with rank weights, terminal bud first for apical control.\[2\]
5. **2D translation.** Direct; distichous nodes give exactly the original bifurcating BH form.
6. **Parameters.** λ: Guerra shows 0.46 "a spreading crown," 0.56 "a dominant leader";\[5\] α = 2 (Palubicki Fig. 7); cap; priority weights w_max = 1, w_min = 0.006, κ = 0.35–0.5 (Fig. 9).\[2\]
7. **Feedback.** Loop B; modulated by R1, R2, R5.
8. **Module boundary.** Required; BH, priority, O1 swappable.
9. **Multi-tree.** Resource never crosses trees.
10. **Emergent signature.** Excurrent vs decurrent habit; without it, hemispherical crowns (Palubicki Fig. 21b).\[2\]
11. **Cost.** Two O(M) traversals.
12. **Baseline.** In baseline.

#### C4. Shoot direction as a weighted sum
1. **Statement.** New metamer direction = normalized weighted sum of previous direction, light direction V, a tropism vector and noise.
2. **Biology.** Photo- and gravitropism are well established. Bastien et al. (2013) showed across 11 taxa that the sine law is insufficient and curvature sensing (proprioception) is required; a dimensionless "bending number" B sets final shape and timing.\[7\]\[8\]\[9\] The set-point has a mechanism: lateral branches hold a gravitropic set-point angle (GSA) through an auxin-dependent "anti-gravitropic offset" balanced against gravitropism (Roychoudhry et al. 2013), and shade (low R:FR) shifts branches toward the vertical (Roychoudhry et al. 2017; review Yun et al. 2025).
3. **Evidence.** Tropisms well established; the vector sum is a graphics convenience.
4. **Local rule.** d = normalize(w_d·d_prev + ξ·V + η·t(A_set) + ε·u), u = d_prev rotated by N(0,σ²) **[RNG]**; t(A_set) points at the axis's set-point angle (0° orthotropic, ~90° plagiotropic, >90° pendulous).
5. **2D translation.** Direct and simpler (angles); raise σ slightly.
6. **Parameters.** ξ, η, A_set per physiological age, σ, w_d. Palubicki Fig. 12: strong downward tropism plus strong light-seeking "results in decurrent forms with highly gnarled branches."\[2\]
7. **Feedback.** Couples C2 to geometry; with R3 tropism acts on posture.
8. **Module boundary.** Required; each term can be zeroed.
9. **Multi-tree.** ξ·V makes crowns grow away from neighbours.
10. **Emergent signature.** Curvature, spread, tiers, light-seeking leans.
11. **Cost.** O(1).
12. **Baseline.** In baseline; set-point refines it.

#### C5. Self-pruning
1. **Statement.** A lateral whose light per metamer stays below a threshold after a grace period is shed.
2. **Biology.** Palubicki et al. adopt Takenaka's (1994) rule: a branch below threshold "is considered a liability for the tree and is shed."\[2\] Takenaka's model reproduced position-dependent crown shapes "in a similar way as observed in real forests."\[6\] Branch autonomy is only partial. Branches on suppressed trees survive at irradiances where branches on dominant trees die (Sprugel 2002); a singly shaded birch branch dies where a branch on a wholly shaded tree survives (Henriksson 2001); and the light at the crown base, the self-pruning threshold, is lower in shade-tolerant species and rises with the light at the crown top (Kothari et al. 2025). This is *correlative inhibition*: a branch is judged against the rest of its tree.
3. **Evidence.** Self-pruning well established; the carbon-liability criterion is supported but debated; correlative inhibition supported (counterpoint: Zahnd et al. 2026 find high carbon autonomy in shaded branches of open-canopy trees).
4. **Local rule.** If age ≥ g and Q_b/n_b < T_eff → remove subtree, record scar, where T_eff = max(T, T_rel·Q_top) and Q_top is the q-quantile (default 0.9) of the tree's live-bud Q this season. T_rel = 0 is the baseline rule (ADR 0007). Optional stochastic p_shed **[RNG]**. With R1: shed if production < maintenance for k seasons.
5. **2D translation.** Direct; recalibrate T.
6. **Parameters.** T (≈ 0.1 light-demanding, 0.02–0.05 shade-tolerant, from sapling survival thresholds of 10–15% and 1–2% of full light), T_rel, quantile, g, k.
7. **Feedback.** Closes loop A; amplifies asymmetric competition.
8. **Module boundary.** Switchable.
9. **Multi-tree.** Neighbour shade lifts the crown base.
10. **Emergent signature.** Shedding "is the key to the formation of tall boles" (Palubicki et al.).\[2\]
11. **Cost.** O(M), reusing C3 sums.
12. **Baseline.** In baseline; carbon variant via R1.

#### C6. Pipe-model girth with memory
1. **Statement.** r_parent^n = Σ r_child^n + Σ r_scar^n from tips (r₀) to root; radius never decreases.
2. **Biology.** The pipe model (Shinozaki et al. 1964) links stem area to supported leaves.\[10\] Measured Leonardo exponents lie in 1.8 < Δ < 2.3 (Eloy 2011). Explanations compete: hydraulic pipes, elastic similarity (McMahon & Kronauer 1976), wind-stress resistance (Eloy 2011).\[11\] A review finds "most of its properties are not valid as a general rule," yet it remains a useful "first approximation" (Lehnebach et al. 2018).\[12\]\[13\] Laser scans of 18,657 branching nodes on 603 trees are area-preserving (Δ ≈ 2) rather than WBE-like (Yang et al. 2024); deviations grow with heavy, wide-angled laterals, as stress models predict (Minamino & Tateno 2014).
3. **Evidence.** Supported but debated.
4. **Local rule.** r_i = (Σ r_c^n + Σ r_s^n)^(1/n); r_i ← max(r_i, r_prev).
5. **2D translation.** Use circular cross-sections; drawn width = 2r.
6. **Parameters.** n (Palubicki: 2–3; empirical 1.8–2.3); r₀.\[2\]\[11\]
7. **Feedback.** Output-only in baseline; causal via R1 and R3.
8. **Module boundary.** Switchable; R1/R3 need it.
9. **Multi-tree.** Suppressed trees stay slender.
10. **Emergent signature.** Taper and junction ratios; trunks never shrink after shedding.\[5\]
11. **Cost.** O(M).
12. **Baseline.** In baseline (memory rule from Palubicki et al.).\[2\]

### Tier 2: Important refinements

#### R1. Carbon balance with the cost of size
1. **Statement.** Distributed resource = production minus wood maintenance, with each bud's contribution discounted by hydraulic path length; sustained deficit kills branches, then trees.
2. **Biology.** Living sapwood respires. Koch et al. (2004), studying redwoods up to 112.7 m, concluded that "increasing leaf water stress due to gravity and path length resistance may ultimately limit leaf expansion and photosynthesis for further height growth."\[14\] LIGNUM couples structural units with a pipe-model carbon balance (Perttunen et al. 1996); GreenLab uses source–sink dynamics (Yan et al. 2004).\[15\]\[16\]
3. **Evidence.** Maintenance respiration well established; hydraulic height limitation supported but debated (Ryan & Yoder 1997; Koch & Sillett 2009).\[17\] Ryan et al. (2006) found hydraulic limitation "common, but not universal" and not sufficient to explain the decline in wood production. The decline is caused by size, not age (Mencuccini et al. 2005), and reverses after thinning (Martínez-Vilalta et al. 2006). Allocation to reproduction is a competing explanation of the plateau (Becker et al. 2000).
4. **Local rule.** P = α·Σ a_i·Q_i·exp(−L_path,i/L_h) over leaf area a_i (L_path accumulated acropetally); M = m_w·Σ π r_live²·l + m_f·Σ a_i, where r_live is the pipe-model radius of the pipes still serving foliage (sapwood; heartwood costs nothing) and m_f charges foliage and fine roots (compensation light Q_c = m_f/α) (ADR 0010); N = P − M. N > 0: v_base = (1−s_r−f_rep)N, reserve += s_r N (capped at a few seasons of M), and once the tree passes a *size* threshold (height or Q_base, never age) a reproductive sink takes f_rep·N (feeds O4 seeds). The two plateau causes, path length (L_h) and reproduction (f_rep), are separately switchable. N ≤ 0: draw reserve; empty for k_starve seasons → death (O4). Per-branch P_b < M_b → shed (replaces C5's absolute threshold; the relative T_rel·Q_top of ADR 0007 still applies).
5. **2D translation.** Circular volumes; lower m_w, since 2D trees carry fewer leaves per wood.
6. **Parameters.** m_w, m_f (shade tolerance), L_h (sets max height), s_r, f_rep, maturity size, k_starve; no species values, calibrate on an isolated tree. Evidence for the cost terms: stem maintenance follows sapwood volume and is 5–13% of assimilation (Ryan 1990; Ryan et al. 1995); rising wood respiration does not explain the growth decline (Ryan et al. 1997, 2004; Binkley et al. 2002).
7. **Feedback.** Closes loop C; makes C6 causal.
8. **Module boundary.** Switchable (off = baseline).
9. **Multi-tree.** Turns shade into suppression mortality and later self-thinning.
10. **Emergent signature.** Sigmoidal height growth, plateau, crown retreat, senescence.
11. **Cost.** O(M), folded into C3.
12. **Baseline.** New.

#### R2. Physiological age and axis differentiation
1. **Statement.** Each meristem carries a physiological age (pa); a lookup by pa gives orientation, set-point, branching, λ, rhythm and terminal-flowering probability.
2. **Biology.** Architecture is described by models, physiological age, ontogenetic stages and reiteration (Barthélémy & Caraglio 2007).\[18\] Hallé and Oldeman (1970; Hallé et al. 1978) grouped trees into 23 models from binary choices: monopodial/sympodial, rhythmic/continuous, orthotropic/plagiotropic, terminal/lateral flowering.\[19\]\[20\] Examples: Rauh (rhythmic, orthotropic; *Hevea*, *Pinus*); Massart (orthotropic trunk, tiers of plagiotropic branches; "*Abies* type"); Roux (Massart-like but continuous; *Coffea arabica*); Troll (plagiotropic axes straightening secondarily; "*Fagus* type").\[19\]\[21\] AMAPsim formalizes physiological age (Barczi et al. 2008).\[22\] Palubicki et al. show removing apical control turns an excurrent young tree decurrent.\[2\]
3. **Evidence.** Well established as description; mechanisms partial.
4. **Local rule.** pa_child = pa_parent + Δpa(order, position, tree age); params = Table[pa]. Sympodial: terminal bud terminates with p_term(pa) **[RNG]**; distal laterals take over. Acrotony: v × exp(κ(pos−1)). Ontogeny: λ declines after age a_c.
5. **2D translation.** Direct; orthotropic/plagiotropic = vertical/horizontal.
6. **Parameters.** pa table (2–4 levels), Δpa, κ, p_term, a_c.
7. **Feedback.** Modulates loops B and D.
8. **Module boundary.** Switchable (one level = baseline).
9. **Multi-tree.** Indirect.
10. **Emergent signature.** Species habit, tiers, sympodial forks, conical-young to rounded-old.
11. **Cost.** O(1) lookups.
12. **Baseline.** Generalizes Palubicki's timed apical-control removal.

#### R3. Mechanics: sag, posture control, stress-driven girth
1. **Statement.** Each season branches bend under carried weight with girth-set stiffness, and reaction wood counter-bends toward the set-point at a rate limited by new girth; next season sees the new geometry.
2. **Biology.** Plants adjust skeletal growth to loads and control posture with motors (differential growth, reaction wood) (Moulia et al. 2006).\[23\] Stability requires gravitropic correction to outpace weight-driven bending (Alméras & Fournier 2009).\[24\]\[25\] Palubicki et al. "ignored changes in branch position and orientation over time," noting they matter for Champagnat and Troll models.\[2\] Graphics follow-ups: Pirk et al. (2014), Li et al. (2025).\[26\]\[27\]
3. **Evidence.** Phenomena well established; the incremental rule is a modelling simplification.
4. **Local rule.** Basipetal: W_i = w_i + ΣW_c, S_i = w_i x_i + ΣS_c, moment M_i = S_i − W_i·x_base,i (exact, local). κ_e = M/(E·πr⁴/4). Permanent set θ += φ·Δκ_e·l, where Δκ_e = (M − M_prev)/(E·πr⁴/4) is the elastic curvature of this season's load increment, locked in by the new growth ring (Fournier's model; Alméras & Fournier 2009). The creep form θ += φ·κ_e·l, on the whole load, remains a switch; it keeps lowering limbs after growth stops (ADR 0011). Posture Δθ = clamp(−β_g sin(A − A_set) − γκ, ±c·Δr/r), with a posture set-point per physiological age that may differ from the growth set-point (Troll). Optional: break if 4|M|/(πr³) > σ_break; stress-driven girth Δr ∝ max(0, σ/σ_target − 1), local to the stressed metamer (not passed on in the pipe sums, so Δ > n there). Recompute positions acropetally.
5. **2D translation.** Scalar moments, no torsion.
6. **Parameters.** ρ_w, E, leaf mass, φ, β_g/γ (analogous to Bastien's B), c, σ_break, σ_target.
7. **Feedback.** Closes loop D.
8. **Module boundary.** Switchable.
9. **Multi-tree.** Sagging limbs invade neighbours' light; breakage opens gaps.
10. **Emergent signature.** Arching limbs with upturned tips, weeping, Troll staircases.
11. **Cost.** Two O(M) passes.
12. **Baseline.** New; closes the open sag loop.

#### R4. Dormancy, release and reiteration
1. **Statement.** Dormant buds have a finite lifespan and break if delivered resource exceeds a higher release threshold; active shoots continue at a lower one (hysteresis).
2. **Biology.** Reiteration is a core architectural concept (Barthélémy & Caraglio 2007).\[18\] Bud release in pea is driven by sugar supply (Mason et al. 2014).\[28\]\[29\] Auxin-canalization modelling predicts activation is "hysteretic, such that beyond a threshold it is difficult to reverse" (Prusinkiewicz et al. 2009, as summarized by Nahas et al. 2024).\[30\]
3. **Evidence.** Phenomenon well established; rule a modelling hypothesis.
4. **Local rule.** age++; abort if age > L_dorm; break if v ≥ v_break(1 + δ·age), or by a light trigger, Q ≥ Q_rel(1 + δ·age), whose first metamer is paid from the reserve (R1); continue if v ≥ v_cont < v_break; released buds get juvenile pa (stored as a per-axis shift, inherited by the subtree). A shed or broken branch leaves a dormant bud in its slot, a bud bank on old wood. Without the bank and the light trigger, BH gives a lone bud on a bole too little resource to break, and no epicormic shoots form (ADR 0012). Optional stochastic break **[RNG]**.
5. **2D translation.** Direct.
6. **Parameters.** L_dorm, v_break, v_cont, δ, Q_rel, juvenile Δpa; bud bank on/off.
7. **Feedback.** Reverses loop E: neighbour death → buds break.
8. **Module boundary.** Switchable.
9. **Multi-tree.** Essential for gap dynamics.
10. **Emergent signature.** Water sprouts, crown repair, epicormic shoots.
11. **Cost.** O(buds).
12. **Baseline.** New.

#### R5. Shade-avoidance elongation
1. **Statement.** Shoots in low light elongate, branch less and favour the leader.
2. **Biology.** Shade avoidance is well established: a "decrease in the ratio of red to far‐red wavelengths (low R : FR) … is detected by the phytochrome family of plant photoreceptors" (Franklin 2008, New Phytologist). Crowns are highly plastic: the perfect-plasticity approximation reproduced species- and size-dependent crown radius, depth and canopy status (Purves et al. 2007, 2008).\[31\]\[32\]
Low R:FR also suppresses bud outgrowth, through ABA in the bud (Schneider et al. 2019), and makes branches more upright (Roychoudhry et al. 2017). Forest-grown trees converge on spindly stems with slender, sparse branches; open-grown trees on squat stems with large crowns (MacFarlane et al. 2017).
3. **Evidence.** Phenomenon well established; mapping a hypothesis.
4. **Local rule.** With s = 1 − Q/C (or the far-red field F): elongation l = l₀(1 + e_s·s); leader bias λ_eff = λ + δλ·s; fewer bud breaks, v_break,eff = v_break(1 + δ_b·s) (R4's sugar route; the light trigger already reads the light); a more upright set-point, A_set,eff = A_set(1 − δ_A·s) (C4). Optional far-red field F = local horizontal foliage sum.
5. **2D translation.** F is a 1D neighbourhood sum.
6. **Parameters.** e_s, δλ, δ_b, δ_A, r_F.
7. **Feedback.** Strengthens the height race; slender stems interact with R3, O2.
8. **Module boundary.** Switchable.
9. **Multi-tree.** Stand trees taller and slenderer than open-grown.
10. **Emergent signature.** Higher height/diameter in dense stands.
11. **Cost.** O(1).
12. **Baseline.** New.

#### R6. Short shoots (long/short shoot dimorphism)
1. **Statement.** A bud too weak to extend but lit enough becomes a short shoot: it adds leaves each season without adding wood, so foliage persists along older branches and inside the crown.
2. **Biology.** Long shoots extend the crown; short shoots (spurs) display leaves. Across 30 woody species, leaves on short shoots made up most of the leaf area where short shoots exist, at 36% less biomass per leaf area, which lets trees keep foliage in self-shaded parts of the crown (Millan et al. 2022). The split is well documented in temperate trees (Yagi 2000; Jarčuška et al. 2012 for *Fagus*), and in *Populus* new leaf area and extension growth are largely uncoupled because short shoots carry many new leaves (Kull et al. 2002).
3. **Evidence.** Shoot dimorphism well established; the threshold rule is a modelling hypothesis.
4. **Local rule.** At bud fate, a live bud with n = 0 becomes a short shoot if Q ≥ Q_ss, else a leafless dormant bud. A short shoot that receives v ≥ 1 grows a long shoot (the long/short switch). With R6 on, foliage follows shoot type: active buds deposit one unit of leaf area, short shoots deposit a_ss, leafless dormant buds none; in the basipetal sum each bud's Q is weighted by its leaf area, while a dormant bud keeps its Q as an allocation signal (a simplification until R1 separates production from signal). Short shoots are shed with their branch (C5) (ADR 0006).
5. **2D translation.** Direct. It also aligns the drawn foliage with the simulated foliage: leaves are drawn where the model holds leaf area.
6. **Parameters.** Q_ss, a_ss; calibrate (target: short-shoot leaf share > 50% in species with spurs).
7. **Feedback.** Thickens the foliage shell from inside (loop A); raises production without wood cost (loop C, with R1).
8. **Module boundary.** Switchable (off = baseline: every live bud is one unit of leaf area).
9. **Multi-tree.** Shaded interiors lose short shoots first, so neighbour shade still lifts the crown base.
10. **Emergent signature.** Leafy older limbs; fuller crowns at the same metamer count.
11. **Cost.** O(buds).
12. **Baseline.** New (added after the 2026-10-27 literature review).

### Tier 3: Optional enrichments

#### O1. Hormonal bud activation (alternative to C3)
1. **Statement.** A bud activates only if it can establish auxin export into a stem whose transport capacity is shared with apices above.
2. **Biology.** The auxin transport switch model (Prusinkiewicz et al. 2009) generates basipetal activation cascades; sugar evidence shows auxin is not the sole controller.\[29\]\[33\]\[34\]
3. **Evidence.** Supported but debated.
4. **Local rule.** Stem flux F_i = Σ exports above; activate if p_bud > k·F_i/(F_max − F_i); activation relaxes the condition.
5. **2D translation.** Direct.
6. **Parameters.** a₀, F_max, k.
7. **Feedback.** Replaces loop B with endogenous competition (a₀ ∝ Q couples it to light).
8. **Module boundary.** Swappable with C3.
9. **Multi-tree.** None.
10. **Emergent signature.** Basipetal release after decapitation.
11. **Cost.** O(M).
12. **Baseline.** New. Recommendation: keep BH plus R4 hysteresis as default.

#### O2. Wind, thigmomorphogenesis and crown shyness
1. **Statement.** Exposed, slender branches sway; tips meeting another tree's foliage are damaged; wind load adds girth.
2. **Biology.** Crown shyness was quantified with a 3-D surface-complementarity metric on 14 laser-scanned trees and correlated with slenderness (R² = 0.484) (van der Zee et al. 2021);\[35\] mechanism debated.
3. **Evidence.** Supported but debated.
4. **Local rule.** Sway A_i ∝ exposure·h/r; if another tree's foliage lies within A_i, kill tip with p_abr **[RNG]**; girth bonus ∝ exposure. As built (ADR 0013), the bud's light Q stands for exposure and the girth bonus is left to R3's stress wood; light competition alone already keeps crowns apart.
5. **2D translation.** In-plane sway makes crown gaps visible channels.
6. **Parameters.** p_abr, sway coefficient, wind-event rate **[RNG]**.
7. **Feedback.** Negative feedback between neighbours.
8. **Module boundary.** Needs grid owner tags.
9. **Multi-tree.** Exists only with neighbours.
10. **Emergent signature.** Persistent inter-crown gaps.
11. **Cost.** O(tips × local cells).
12. **Baseline.** New.

#### O3. Space colonization
1. **Statement.** Buds compete for free-space markers in a perception wedge (Runions et al. 2007).\[2\]
2. **Biology.** No direct basis.
3. **Evidence.** Graphics convenience.
4. **Local rule.** Palubicki et al.: occupancy radius 2 internodes, perception 4–6, θ ≈ 90°; Q ∈ {0,1}.\[2\]
5. **2D translation.** 2D Poisson-disk markers.
6. **Parameters.** Radii, θ, marker density.
7. **Feedback.** Replaces loop A.
8. **Module boundary.** Swappable with C2, but binary Q breaks C5.\[2\]
9. **Multi-tree.** No height advantage, so wrong for stands.
10. **Emergent signature.** Envelope-controlled shapes.
11. **Cost.** About 3× slower than shadow propagation in Palubicki et al.\[2\]
12. **Baseline.** In baseline as alternative; use only for art direction.

#### O4. Stand dynamics (extension)
1. **Statement.** Surplus carbon produces seeds that disperse and establish where ground light suffices; trees die of starvation, breakage or background risk; self-thinning emerges.
2. **Biology/models.** JABOWA (Botkin et al. 1972) and SORTIE (Pacala et al. 1993, 1996) build forest dynamics from individual growth, light competition, recruitment and mortality.\[36\]\[37\] Self-thinning: w ∝ ρ^(−3/2) (Yoda et al. 1963), qualified by Westoby (1984).\[38\]\[39\] Asymmetric light competition raises size inequality with density (Weiner 1990; Weiner et al. 2001).\[40\]\[41\]\[42\] In individual-based models the slope ranges from −0.9 to −1.8 (Mrad et al. 2020) and depends mainly on the mode of competition (Ma et al. 2019); models should be judged on several patterns at once, not the line alone (Reynolds & Ford 2005). A minimal cellular crown model already reproduces self-thinning, gap filling and crown asymmetry (Loehle 2025).
3. **Evidence.** Individual-based modelling well established; −3/2 exponent debated.\[43\]
4. **Local rule.** Seeds = ⌊f_rep·N⁺/c_seed⌋; position ~ parent + Laplace(0,d) **[RNG]**; establish if ground Q > Q_est with p_est **[RNG]**; p_die = m₀ + starvation + breakage **[RNG]**.
5. **2D translation.** Ground is a line; density per metre. Stand experiments run on a ring (periodic world sides), so no tree has an open edge (ADR 0013). Establishment also needs no live trunk within one cell.
6. **Parameters.** f_rep, c_seed, maturity, d, Q_est, p_est, m₀.
7. **Feedback.** Population-scale loop E.
8. **Module boundary.** Separate; needs R1.
9. **Multi-tree.** Population-only.
10. **Emergent signature.** Thinning, gap regeneration, skewed then bimodal sizes.
11. **Cost.** O(trees); keep seedlings as stubs until lit.
12. **Baseline.** New (Makowski et al. 2019 grow 3D ecosystems up to 90K plants).\[44\]\[45\]

---

## 4. Summary table

| ID | Principle | Local rule | Key parameters | 2D treatment | Depends on | Tier |
|---|---|---|---|---|---|---|
| C1 | Metamers & buds | Bud fates; side sequence | buds/node, β, l₀, cap | Distichous default | — | Core |
| C2 | Light field | Shadow triangle or sky sweep → Q, V | a, b, q_max; K, k_ext | Triangle; cheap sky | C1 | Core |
| C3 | BH allocation | ΣQ down; split λQ_m:(1−λ)Q_l up; n = ⌊v⌋ | λ, α, cap | Unchanged | C1, C2 | Core |
| C4 | Direction | Weighted sum d, V, tropism, noise | ξ, η, A_set, σ | One angle | C2 | Core |
| C5 | Shedding | Q/n < max(T, T_rel·Q_top) after g | T, T_rel, g | Recalibrate T | C3 | Core |
| C6 | Pipe girth | r^n = Σr_c^n + scars, monotone | n, r₀ | Round section | C1 | Core |
| R1 | Carbon balance | P·e^(−L/L_h) − m_w·V; reserve; reproductive sink; starvation | m_w, L_h, f_rep | Lower m_w | C3, C6 | Refinement |
| R2 | Physiological age | Table by pa; p_term; acrotony; λ(age) | pa table, κ, a_c | Ortho/plagio | C1, C3, C4 | Refinement |
| R3 | Mechanics | M = S − W·x; κ = M/EI; posture ≤ c·Δr/r | E, φ, β_g/γ, c | Scalar moments | C6 | Refinement |
| R4 | Dormancy/release | Hysteretic thresholds; lifespan | v_break, v_cont, L_dorm | Unchanged | C3, R2 | Refinement |
| R5 | Shade avoidance | l, λ, v_break rise and A_set falls as Q falls | e_s, δλ, δ_b, δ_A | 1D far-red | C2, C3, C4, R4 | Refinement |
| R6 | Short shoots | n = 0 and Q ≥ Q_ss → leafy short shoot; foliage by shoot type | Q_ss, a_ss | Unchanged | C1, C2, C3 | Refinement |
| O1 | Auxin switch | Claim stem transport capacity | F_max, k | Unchanged | C1 | Optional |
| O2 | Wind & shyness | Abrade other-tree tips | p_abr | In-plane sway | C2, C6, R3 | Optional |
| O3 | Space colonization | Markers in wedge | radii, θ | 2D markers | C1 | Optional |
| O4 | Stand dynamics | Seeds, establishment, mortality | f_rep, d, Q_est, m₀ | 1D ground | R1 | Optional |

---

## 5. Core state and data structures

**Tree:** metamer arrays (structure-of-arrays) in topological order: parent, children, axis id, order, side, base position, angle, length, radius, previous radius, scars, physiological age, birth season, alive flags. Bud array: metamer id, kind, side, state, dormancy age, Q, V, v, pa. Scratch per pass: Q_sum, n, W, S, M, P_b, M_b, L_path. Tree scalars: id, root position, age, reserve, species parameters, RNG stream, alive.

Parents-before-children order makes the basipetal pass a reverse loop and the acropetal pass a forward loop, with no recursion.

**Shared 2D environment:** W×H grid, cell ≈ internode; shadow s or leaf area density ℓ; cached Q and V; occupancy count and owner tag; optional far-red field, markers, ground light profile.

**Global state:** season t; master seed with per-purpose streams hash(seed, tree_id, purpose), so enabling a principle never reshuffles another's numbers; species tables; principle flags; sky model; event queue; tree registry and seed bank; metrics log.

**Randomness entry points:** side s₀ (C1), direction noise (C4), stochastic shedding (C5), sympodial termination (R2), stochastic break (R4), abrasion and wind (O2), seeds, dispersal, establishment, mortality (O4), initial positions.

---

## 6. Per-season update loop (N trees)

```
SEASON(t):
  # Phase 1: environment from start-of-season snapshot (order-independent)
  ENV.clear()
  for tree in live_trees: for leaf in tree.foliage(): ENV.deposit(leaf)   # C2 (leaf area by shoot type, R6)
  ENV.compute_light(); ENV.compute_far_red()                             # C2, R5

  # Phase 2: per-tree passes (read ENV only; parallelizable)
  for tree in live_trees:
      for bud in tree.buds: (bud.Q, bud.V) = ENV.sample(bud.pos, bud.dir)
      BASIPETAL: Q_sum, n (C3,C5); W, S, M (R3); P_b, M_b (R1)
      CARBON: net = production(L_path) - maintenance; reserve; starvation flag (R1)
      ACROPETAL: L_path; BH split with lambda(pa, age, Q); acrotony (C3,R2,R5)
      BUD_FATE: break/continue/short shoot/dormant/terminate/abort (C1,R2,R4,R6) [RNG]
      GROW: n=floor(v), length, direction (C1,C4,R5) -> STAGING       [RNG]
      SHED (C5 or R1); GIRTH (C6, + R3/O2 bonus, monotone)
      MECHANICS: sag + posture limited by dr/r; breakage -> R4 (R3)
      tree.age += 1

  # Phase 3: multi-tree and population
  ABRASION (O2); STAND: mortality, seeds, establishment (O4)           [RNG]
  COMMIT_STAGING(); log metrics; t += 1
```

Ordering: (1) every tree reads the same snapshot, so iteration order cannot bias results; (2) girth before mechanics, so new wood both stiffens and pays for posture; (3) shedding after growth preserves grace periods; (4) deaths last, so a dead tree's shade vanishes next season and triggers R4 release nearby.

**Cost.** All phases are linear in metamers or cells. Palubicki et al. grew a 700,000-internode 3D tree in 82 s on a 2.4 GHz Pentium 4;\[2\] a 2D tree of the same height has far fewer metamers, so ten trees over 100 seasons in seconds is a plausible extrapolation, not a measurement.

---

## 7. Build order

| # | Milestone | Visible test |
|---|---|---|
| M0 | Metamer graph, distichous buds, all buds grow | Exponential bush (Borchert–Slade explosion) |
| M1 | C2 triangle shadow grid | Density regulated; shadow heatmap and bud-light overlay |
| M2 | C3 BH allocation | λ 0.46→0.56: spreading → leader |
| M3 | C4 direction | Lean away from a wall; tropism sign flips spread |
| M4 | C5 + C6 | Clear bole; junction-exponent histogram near n |
| M5 | N trees, one grid | Crowns asymmetric away from each other; short tree suppressed |
| M6 | Sky sweep | Edge trees lean outward; neighbours lean into a gap |
| M6c | Pseudo-depth view (page only); r0 calibrated | Crowns read as full discs; x-ray view shows the shell; realistic H/D |
| M6d | Relative C5; R6 | Suppressed trees keep deeper crowns; leafy older limbs |
| M6e | Light calibration (k_ext, K) | Ground light under a closed stand 2–10% of open sky |
| M7 | R2 | Massart conifer, birch-like pioneer, Aubréville tiers from tables (ADR 0009) |
| M8 | R1 | Height plateau; suppressed tree dies; crown base rises |
| M9 | R3 | Drooping limbs with upturned tips; willow; Troll straightening |
| M10 | R4 + R5 | Epicormic flush after neighbour removal; slender stand trees |
| M11 | O4, then O2 | Log–log thinning line; crown gaps |
| M12 | Independent review | A fresh agent's findings report, triaged with the user |

---

## 8. Experimentation guide

**Ablations**

| Switch off | Predicted change | Basis |
|---|---|---|
| C5 | Cluttered interior, no bole | Palubicki et al.; Guerra's on/off figure |
| C3 → equal sharing | Hemispherical crowns; tree loses in competition | Takenaka 1994; Palubicki Fig. 21b |
| ξ = 0 | Crowns ignore gaps and neighbours | Palubicki Fig. 12 |
| Constant λ (no apical-control decline) | Stays conical, no mature decurrent form | Palubicki Figs. 10–11 |
| R1 | No plateau, no suppression death, no self-thinning | Koch et al. 2004 (hypothesis) |
| R3 | Straight old limbs, no weeping or Troll forms | Moulia et al. 2006 |
| R3 posture only (sag without posture) | Progressive droop, possible collapse | Alméras & Fournier 2009 |
| R4 | Gaps refill slowly | Reiteration (Barthélémy & Caraglio 2007) |
| R6 | Foliage only at shoot tips; thin shell, bare older limbs | Millan et al. 2022 |
| C5 T_rel = 0 | Suppressed and dominant trees prune at the same local light | Sprugel 2002; Kothari et al. 2025 |
| Shared pooled light instead of directional shade | Size inequality drops, no bimodality | Weiner 1990; Schwinning & Weiner 1998 |

**Sweeps:** λ ∈ [0.44, 0.58] (look for a threshold-like shift in trunk dominance); n ∈ [1.8, 3]; shadow b and q_max (4–8); shedding T × spacing (crown-base height); L_h (asymptotic height); E × posture gain (stiff → weeping phase diagram); sky weighting (lean toward light).

**Single vs multi-tree:** (1) open- vs stand-grown, same seed: stand trees should have higher crown bases, narrower and more asymmetric crowns, consistent with crown plasticity (Purves et al. 2007) and Takenaka's position-dependent crowns;\[6\]\[46\] (2) two trees at varying spacing: lean and overlap vs distance, plus a shyness gap with O2; (3) even-aged row: in Weiner et al.'s (2001, American Naturalist) simulations, "in a uniform spatial pattern, size variation increased with density only when competition was size asymmetric," so size CV should rise with density here, possibly becoming bimodal; (4) kill one tree: neighbour lean and R4 release.

**Diagnostic visualisations:** C2 shadow/LAD heatmap, Q map, V quiver, ownership tint; C1/R4 bud states and release flashes; C3 Q_sum as line width and v as colour (Guerra-style), buds ≥1 unit marked; C4 per-shoot contribution arrows; C5 Q/n with threshold contour, shed ghosts; C6 junction-exponent histogram; R1 per-tree carbon stacked bars, L_path map; R2 physiological-age colouring; R3 σ/σ_break colour, sag vs posture per season; O4 size histograms and log–log density–mass trajectory.

---

## 9. Species character

| Target | Principle choices | Key parameters | 2D silhouette |
|---|---|---|---|
| Conical conifer (fir-like) | Massart ("*Abies* type"): monopodial trunk, rhythmic plagiotropic tiers | Trunk λ ≥ 0.56 sustained; whorl generator on trunk only; laterals A_set ≈ 90°, low λ; strong shedding in stands | Triangle of tiered horizontal layers; narrow spire with clear bole in stands |
| Spreading oak-like | Rauh-type branching, early loss of apical control, strong reiteration, mechanics on | λ < 0.5 after a_c; wide β; high ξ plus downward η on old limbs; stiff wood, high posture gain | Broad dome; heavy horizontal limbs with upturned tips; gnarled (Palubicki Fig. 12c) |
| Weeping willow | Pendulous higher-order axes (A_set > 120°); low stiffness, weak posture | Long internodes, strong downward η on order ≥ 2, low E, high φ | Upright scaffold with hanging curtains |
| Birch-like pioneer | Excurrent young; light-demanding; fine sparse laterals; pendulous old twigs | λ 0.53–0.56 declining; narrow β; small r₀; high T | Narrow, open, slender; fast crown lift in stands |
| Tropical *Terminalia catappa* (Aubréville's model) | Orthotropic trunk with rhythmic tiers of plagiotropic, sympodial branch modules\[47\] | Tier every k metamers; p_term ≈ 1 with two continuation buds; A_set ≈ 90° | Pagoda of flat tiers; Fisher and Honda (1979) analysed these near-planar tiers, making this the most naturally 2D architecture\[48\]\[49\] |
| Beech-like (Troll, "*Fagus* type") | All axes plagiotropic first; trunk straightens secondarily via R3 | Low initial A_set; trunk posture A_set = 0, gain ≤ c·Δr/r | Arching staircase straightening over years; impossible without R3 |

Monopodial vs sympodial (R2's p_term) is the most important *choice*; λ is the most important *parameter*; order-specific tropism and stiffness separate upright, spreading and weeping; shedding plus stand context separates open-grown from forest habit.

---

## 10. Validation targets

| Property | Measure | Expected | Source/status |
|---|---|---|---|
| Junction rule | Fitted Δ in r_p^Δ = Σr_c^Δ | 1.8–2.3 (emergent if stress-driven girth replaces n) | Eloy 2011; well supported, explanation debated |
| Length–diameter | log l vs log d by order | l ∝ d^(2/3) under elastic similarity | McMahon & Kronauer 1976; debated |
| Leaf vs stem area | Leaves above a section vs area | Roughly linear, variable | Shinozaki et al. 1964; Lehnebach et al. 2018 |
| Height trajectory | Height vs age | Sigmoidal, plateau | Koch et al. 2004; Ryan & Yoder 1997 |
| Bud fates | Fraction of buds ever breaking | Most never form lasting branches | Sachs & Novoplansky 1995 via Palubicki et al. |
| Branch angles | Distribution by order | Near effective-leaf-area optima in tiered trees | Honda & Fisher 1978; Fisher & Honda 1979 |
| Gravitropic recovery | Tilted-stem curvature dynamics | Overshoot then straightening set by one ratio | Bastien et al. 2013 |
| Neighbour response | Crown centroid offset vs neighbour distance | Displacement toward gaps | Purves et al. 2007, 2008; Takenaka 1994 |
| Crown shyness | Gap width vs slenderness | Positive association | van der Zee et al. 2021 |
| Size inequality | CV/Gini vs density over time | Rises with density; possible bimodality | Weiner 1990; Weiner et al. 2001 |
| Self-thinning | log mean mass vs log density, together with size CV and bimodality | 3D: −3/2 (debated); simulations −0.9 to −1.8 by competition mode. Untested 2D hypotheses: w ∝ ρ^(−2) if mass ∝ L² and ground occupancy ∝ L; w ∝ ρ^(−3) if 3D-cylinder mass ∝ L³ is kept. Expect size asymmetry to matter more than dimension | Yoda et al. 1963; Westoby 1984; Mrad et al. 2020; Ma et al. 2019; Reynolds & Ford 2005 |
| Slenderness | Height / stem diameter | Stand-grown ≈ 60–80 (risky > 80, slender > 100); open-grown markedly lower | Watt et al. 2023; Stăncioiu et al. 2021; MacFarlane et al. 2017 |
| Light extinction | Ground light under a closed stand; crown extinction | Understorey a few % of open sky; crown K 0.35 (orthotropic) to 0.53–0.80 (plagiotropic), crown LAI 2–8 | Kitajima et al. 2004 |
| Self-pruning | Light at crown base vs light at crown top | Lower in shade-tolerant species; rises with crown-top light | Kothari et al. 2025 |
| Short shoots | Leaf-area share on short shoots | > 50% in species with spurs | Millan et al. 2022 |

---

## 11. Open questions and known gaps

1. **Auxin vs sugar in apical dominance.** Evidence favours sugar as the initial trigger (Mason et al. 2014) with sugar–auxin–strigolactone integration (Bertheloot et al. 2020);\[29\]\[50\] BH is a defensible abstraction, not a mechanism.
2. **Leonardo's rule explanations are contested** (pipes, elastic similarity, wind); fixed-n and stress-driven girth may disagree in old, exposed trees.
3. **The pipe model is not universal** (Lehnebach et al. 2018); treat n as a tunable target.\[13\]\[51\]
4. **West–Brown–Enquist scaling is contested.** Kozłowski and Konarzewski (2004, 2005) argued it is internally inconsistent and that 3/4 scaling is not universal; Brown et al. (2005) replied.\[52\]\[53\]\[54\] Do not build WBE exponents into rules.
5. **Hydraulic height limitation is debated** (Koch & Sillett 2009); L_h is phenomenological.\[17\]
6. **Crown-shyness mechanism is unresolved**; abrasion is convenient, not proven.
7. **Self-thinning universality** has been debated since Westoby (1984); the 2D analogue is untested.\[43\]
8. **2D validity is unstudied.** Honda's (1971) models are 3D; planar precedents (Ulam's 2D automata, Fisher & Honda's *Terminalia* tiers, Borchert & Honda's bifurcating systems) are abstract or specific to tiered architectures.\[2\] A 2026 search found no test of a vertical-plane tree model against 3D. The closest precedents are Jirasek et al.'s (2000) planar branch bending, Loehle's (2025) cellular crown model and Korzukhin et al.'s (1995) vertical-screen crowns. Drawing, not simulation, decides how full a 2D crown looks: the page projects the simulated shell as a pseudo-3D crown (ADR 0008).
9. **Light-model choice matters**; Nauber et al. (2025) compare light-distribution models for tree growth simulation.\[55\]
10. **Branch autonomy is partial** in real trees.
11. **Scope items:** of limited use here are JABOWA (no geometry; borrow mortality logic), Pirk et al. 2012 (adapts an existing skeleton rather than growing one)\[56\] and Stava et al. 2014 (useful later for fitting parameters).\[57\] Contested: WBE, Leonardo explanations, auxin-only apical dominance. Still central: Palubicki et al. 2009, Barthélémy & Caraglio 2007, Hallé–Oldeman (descriptive), pipe model (approximate), Bastien's AC model, Takenaka 1994. Notable post-2015 work: Makowski et al. 2019; Pałubicki et al. 2022 (Ecoclimates); Li et al. 2025 (strand-based breakage and reaction wood); Pirk et al. 2017 (combustion); Hädrich et al. 2021 (wildfire);\[58\]\[59\] Li et al.'s Interactive Invigoration (ACM TOG 43(4), Article 146, 2024), which builds branches from strands, "fixed-size volumetric pipes that define the branching structure"; DeepTree (Zhou et al., arXiv 2305.05153).

---

## 12. References

- _Added after the 2026-10-27 literature review (`docs/research/2026-10-27-literature-review.md` has links):_ Becker, Meinzer & Wullschleger 2000 (*Funct. Ecol.*); Beveridge et al. 2023 (*J. Exp. Bot.*); Cao et al. 2023 (*Plant Physiol.*); Costes et al. 2008 (MAppleT, *Funct. Plant Biol.*); Henriksson 2001 (*Oecologia*); Jarčuška et al. 2012 (*J. Plant Ecol.*); Jirasek, Prusinkiewicz & Moulia 2000; Kitajima, Mulkey & Wright 2004 (*Ann. Bot.*); Kobe et al. 1995 (*Ecol. Appl.*); Korzukhin & Ter-Mikaelian 1995 (*Ecol. Model.*); Kothari et al. 2025 (*Funct. Ecol.*); Kull et al. 2002 (*Tree Physiol.*); Loehle 2025 (*Ecol. Model.*); Ma et al. 2019 (*Ecol. Model.*); MacFarlane & Kane 2017 (*Funct. Ecol.*); Martínez-Vilalta et al. 2006 (*Oecologia*); Mencuccini et al. 2005 (*Ecol. Lett.*); Millan et al. 2022 (*New Phytol.*); Minamino & Tateno 2014 (*PLoS ONE*); Mrad et al. 2020; Petritan et al. 2007 (*Forestry*); Reynolds & Ford 2005 (*J. Ecol.*); Roychoudhry et al. 2013 (*Curr. Biol.*), 2017 (*Sci. Rep.*); Ryan, Phillips & Bond 2006 (*Plant Cell Environ.*); Schneider et al. 2019 (*Front. Plant Sci.*); Sprugel 2002 (*Tree Physiol.*); Stăncioiu et al. 2021 (*Forests*); Taylor-Hell 2005 (SIBGRAPI); Watt et al. 2023 (*Front. For. Glob. Change*); Yagi 2000 (*J. Plant Res.*); Yang et al. 2024 (Treegraph, *Remote Sens. Ecol. Conserv.*); Yun et al. 2025 (*Plant Commun.*); Zahnd et al. 2026 (*Plant Cell Environ.*).
- Alméras, T. & Fournier, M. (2009). *J. Theor. Biol.* 256(3): 370–381. doi:10.1016/j.jtbi.2008.10.011
- Barczi, J.-F. et al. (2008). AmapSim. *Annals of Botany* 101(8): 1125–1138.
- Barthélémy, D. & Caraglio, Y. (2007). Plant architecture. *Annals of Botany* 99(3): 375–407. doi:10.1093/aob/mcl260
- Barthélémy, D., Edelin, C. & Hallé, F. (1989). Architectural concepts for tropical trees. In *Tropical Forests*. Academic Press.
- Bastien, R., Bohr, T., Moulia, B. & Douady, S. (2013). *PNAS* 110(2): 755–760. doi:10.1073/pnas.1214301109
- Bastien, R. et al. (2015). A unified model of shoot tropism in plants. *PLoS Comput. Biol.* 11(2).
- Bertheloot, J. et al. (2020). Sugar availability suppresses the auxin-induced strigolactone pathway to promote bud outgrowth. *New Phytologist* 225(2): 866–879. doi:10.1111/nph.16201
- Borchert, R. & Honda, H. (1984). *Botanical Gazette* 145(2): 184–195.
- Borchert, R. & Slade, N. (1981). *Botanical Gazette* 142(3): 394–401.
- Botkin, D.B., Janak, J.F. & Wallis, J.R. (1972). *J. Ecology* 60: 849–872.
- Brown, J.H., West, G.B. & Enquist, B.J. (2005). *Functional Ecology* 19: 735–738.
- Eloy, C. (2011). *Phys. Rev. Lett.* 107: 258101. doi:10.1103/PhysRevLett.107.258101
- Fisher, J.B. & Honda, H. (1979). *Am. J. Bot.* 66: 633–644; 645–655.
- Franklin, K.A. (2008). Shade avoidance. *New Phytologist* 179: 930–944. doi:10.1111/j.1469-8137.2008.02507.x
- Guerra, C. (2026). Growing trees. https://brashandplucky.com/2026/10/15/growing-trees.html
- Hädrich, T. et al. (2021). Fire in paradise. *ACM TOG* 40(4).
- Hallé, F. & Oldeman, R.A.A. (1970). *Essai sur l'architecture et la dynamique de croissance des arbres tropicaux*. Masson.
- Hallé, F., Oldeman, R.A.A. & Tomlinson, P.B. (1978). *Tropical Trees and Forests*. Springer.
- Honda, H. (1971). *J. Theor. Biol.* 31: 331–338.
- Honda, H. & Fisher, J.B. (1978). *Science* 199: 888–890.
- Koch, G.W., Sillett, S.C., Jennings, G.M. & Davis, S.D. (2004). *Nature* 428: 851–854. doi:10.1038/nature02417
- Koch, G.W. & Sillett, S.C. (2009). *Am. J. Bot.* doi:10.3732/ajb.0800399
- Kozłowski, J. & Konarzewski, M. (2004). *Functional Ecology* 18: 283–289; (2005) 19: 739–743.
- Lehnebach, R., Beyer, R., Letort, V. & Heuret, P. (2018). *Annals of Botany* 121(5): 773–795. doi:10.1093/aob/mcx194
- Li, B., Schwarz, N.A., Pałubicki, W., Pirk, S. & Benes, B. (2024). Interactive Invigoration: volumetric modeling of trees with strands. *ACM TOG* 43(4): 146. doi:10.1145/3658206
- Li, B., Schwarz, N., Pałubicki, W. & Pirk, S. (2025). Stressful tree modeling. SIGGRAPH 2025.
- Makowski, M. et al. (2019). Synthetic silviculture. *ACM TOG* 38(4): 131. doi:10.1145/3306346.3323039
- Mason, M.G. et al. (2014). *PNAS* 111(16): 6092–6097. doi:10.1073/pnas.1322045111
- McMahon, T.A. & Kronauer, R.E. (1976). *J. Theor. Biol.* 59(2): 443–466.
- Měch, R. & Prusinkiewicz, P. (1996). *Proc. SIGGRAPH 1996*: 397–410.
- Moulia, B., Coutand, C. & Lenne, C. (2006). *Am. J. Bot.* 93(10): 1477–1489. doi:10.3732/ajb.93.10.1477
- Nahas et al. (2024). *New Phytologist*. doi:10.1111/nph.19664
- Nauber et al. (2025). *Computer Graphics Forum*. doi:10.1111/cgf.15268
- Pacala, S.W., Canham, C.D. & Silander, J.A. (1993). *Can. J. For. Res.* 23: 1980–1988.
- Pacala, S.W. et al. (1996). *Ecological Monographs* 66(1): 1–43.
- Pałubicki, W. et al. (2009). Self-organizing tree models for image synthesis. *ACM TOG* 28(3): 58. doi:10.1145/1531326.1531364
- Pałubicki, W. et al. (2022). Ecoclimates. *ACM TOG* 41(4): 155.
- Perttunen, J. et al. (1996). LIGNUM. *Annals of Botany* 77(1): 87–98.
- Pfisterer, J.A. (2000). Modern models in tree architecture (arboritecture.org).
- Pirk, S. et al. (2012). Plastic trees. *ACM TOG* 31(4): 50.
- Pirk, S. et al. (2014). Windy trees. *ACM TOG* 33(6): 204. doi:10.1145/2661229.2661252
- Pirk, S. et al. (2017). Interactive wood combustion. *ACM TOG* 36(6): 197.
- Prusinkiewicz, P. & Lindenmayer, A. (1990). *The Algorithmic Beauty of Plants*. Springer.
- Prusinkiewicz, P. et al. (2009). *PNAS* 106(41): 17431–17436. doi:10.1073/pnas.0906696106
- Purves, D.W., Lichstein, J.W. & Pacala, S.W. (2007). *PLoS ONE* 2(9): e870.
- Purves, D.W. et al. (2008). *PNAS* 105: 17018–17022.
- Runions, A., Lane, B. & Prusinkiewicz, P. (2007). *Eurographics Workshop on Natural Phenomena*: 63–70.
- Ryan, M.G. & Yoder, B.J. (1997). *BioScience* 47(4): 235–242.
- Sachs, T. & Novoplansky, A. (1995). *Israel J. Plant Sci.* 43: 203–212.
- Schwinning, S. & Weiner, J. (1998). Mechanisms determining the degree of size asymmetry in competition among plants. *Oecologia* 113: 447–455. doi:10.1007/s004420050397
- Shinozaki, K. et al. (1964). *Japanese J. Ecology* 14(3): 97–104.
- Stava, O. et al. (2014). *Computer Graphics Forum* 33(6): 118–131. doi:10.1111/cgf.12282
- Takenaka, A. (1994). *J. Plant Research* 107: 321–330.
- Ulam, S. (1962). *Proc. Symp. Applied Math.* 14: 215–224.
- van der Zee, J., Lau, A. & Shenkin, A. (2021). *Annals of Botany* 128(6): 725–736. doi:10.1093/aob/mcab035
- Weiner, J. (1990). *Trends Ecol. Evol.* 5(11): 360–364.
- Weiner, J., Stoll, P., Muller-Landau, H. & Jasentuliyana, A. (2001). *American Naturalist* 158(4): 438–450. doi:10.1086/321988
- West, G.B., Brown, J.H. & Enquist, B.J. (1997). *Science* 276: 122–126.
- Westoby, M. (1984). *Adv. Ecol. Res.* 14: 167–225. doi:10.1016/S0065-2504(08)60171-3
- Yan, H.-P. et al. (2004). GreenLab. *Annals of Botany* 93(5): 591–602. doi:10.1093/aob/mch078
- Yoda, K., Kira, T., Ogawa, H. & Hozumi, K. (1963). *J. Biol. Osaka City Univ.* 14: 107–129.
- Zhou, X. et al. (2023). DeepTree. arXiv:2305.05153.

## Sources

1. [Self-organizing tree models for image synthesis](https://dl.acm.org/doi/10.1145/1531326.1531364)
2. <https://algorithmicbotany.org/papers/selforg.sig2009.small.pdf>
3. [competition for light](https://iland-model.org/wiki/competition-for-light.html)
4. [Plant form analysis based on the pipe model theory I. A statical model within the crown](https://link.springer.com/article/10.1007/BF02346992)
5. [Growing trees](https://brashandplucky.com/2026/10/15/growing-trees.html)
6. [A simulation model of tree architecture development based on growth response to local light environment](https://link.springer.com/article/10.1007/BF02344260)
7. [Unifying model of shoot gravitropism reveals proprioception as a central feature of posture control in plants - ADS](https://ui.adsabs.harvard.edu/abs/2013PNAS..110..755B)
8. [Unifying model of shoot gravitropi ...](https://archive.connect.h1.co/article/717967835/)
9. [Unifying model of shoot gravitropism reveals proprioception as a central feature of posture control in plants - PubMed](https://www.ncbi.nlm.nih.gov/pubmed/23236182)
10. [\[PDF\] The pipe model theory half a century on: a review](https://www.semanticscholar.org/paper/The-pipe-model-theory-half-a-century-on:-a-review-Lehnebach-Beyer/8bf7c7dfcfc3f9753bd8bcb3a8d13a3788b3b49b)
11. [Leonardo's rule, self-similarity and wind-induced stresses in trees](https://arxiv.org/pdf/1105.2591)
12. [The Pipe Model Theory half a century on](https://botany.one/2018/04/the-pipe-model-theory-half-a-century-on/)
13. [The pipe model theory half a century on: a review - CentraleSupélec](https://centralesupelec.hal.science/hal-01823925v1)
14. [The limits to tree height : Nature](https://www.ovid.com/00006056-200404220-00047)
15. [A FUNCTIONAL-STRUCTURAL MODEL GREENLAB FOR \<i\>PINUS TABULAEFORMIS\</i\>](https://www.plant-ecology.com/EN/10.3773/j.issn.1005-264x.2009.05.014)
16. [(PDF) A Dynamic, Architectural Plant Model Simulating Resource-dependent Growth](https://www.researchgate.net/publication/8643863_A_Dynamic_Architectural_Plant_Model_Simulating_Resource-dependent_Growth)
17. [A response to: Limitations within “The Limits to Tree Height”\<link href='#fn1'\>\</link\>](https://bsapubs.onlinelibrary.wiley.com/doi/10.3732/ajb.0800399)
18. [Evolution and ecology of plant architecture: integrating insights from the fossil record, extant morphology, developmental genetics and phylogenies](https://academic.oup.com/aob/article/120/6/855/4641815)
19. [modern-models-in-tree-architecture-as-a-helpful-tool-for- ...](https://www.arboritecture.org/pdf/pfisterer/modern-models-in-tree-architecture-as-a-helpful-tool-for-natural-pruning-pfisterer-2000.pdf)
20. [UVED - Plant Growth Modelling - Botany - Plant Axis typology - Architectural Models](https://greenlab.cirad.fr/GLUVED/html/P1_Prelim/Bota/Bota_typo_018.html)
21. [Architectural concepts for tropical trees (Barthélémy, Édelin ...](https://www.arboritecture.org/pdf_uploads/barthelemy/architectural-concepts-for-tropical-trees-barthelemy-edelin-halle-1989.pdf)
22. [FSPM-P: towards a general functional-structural plant model for robust and comprehensive model development](https://link.springer.com/article/10.1007/s11704-015-4472-8)
23. [Posture control and skeletal mechanical acclimation in terrestrial plants: implications for mechanical modeling of plant architecture\<link href='#FN1'\>\</link\>](https://bsapubs.onlinelibrary.wiley.com/doi/10.3732/ajb.93.10.1477)
24. [Introduction](https://www.frontiersin.org/journals/forests-and-global-change/articles/10.3389/ffgc.2020.00089/xml)
25. [Biomechanical control of beech pole verticality (\<i\>Fagus sylvatica\</i\>) before and after thinning: theoretical modelling and ground‐truth data using terrestrial Li\<fc\>DAR\</fc\>](https://bsapubs.onlinelibrary.wiley.com/doi/10.1002/ajb2.1228)
26. [\[PDF\] Windy trees](https://www.semanticscholar.org/paper/Windy-trees%3A-computing-stress-response-for-tree-Pirk-Niese/13882ce4d67c179a240bc4fd61a03b504a953f30)
27. [Stressful Tree Modeling: Breaking Branches with Strands](https://dl.acm.org/doi/abs/10.1145/3721238.3730745)
28. [Sugar demand, not auxin, is the initial regulator of apical dominance](https://www.pnas.org/doi/abs/10.1073/pnas.1322045111)
29. [Sugar demand, not auxin, is the in ...](https://archive.connect.h1.co/article/718342744/)
30. [The activation of Arabidopsis axillary buds involves a switch from slow to rapid committed outgrowth regulated by auxin and strigolactone - Nahas - 2024 - New Phytologist - Wiley Online Library](https://nph.onlinelibrary.wiley.com/doi/10.1111/nph.19664)
31. [Predicting and understanding forest dynamics using a simple tractable model](https://www.pnas.org/doi/10.1073/pnas.0807754105)
32. [Crown Plasticity and Competition for Canopy Space: A New Spatially Implicit Model Parameterized for 250 North American Tree Species](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0000870)
33. [Control of bud activation by an auxin transport switch](https://algorithmicbotany.org/papers/activation.pnas2009.pdf)
34. [Frontiers](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2019.01296/full)
35. [Understanding crown shyness from a 3-D perspective - PubMed](https://pubmed.ncbi.nlm.nih.gov/33713413/)
36. [SCALING FROM TREES TO FORESTS: TRACTABLE MACROSCOPIC EQUATIONS FOR FOREST DYNAMICS - Strigul - 2008 - Ecological Monographs - Wiley Online Library](https://esajournals.onlinelibrary.wiley.com/doi/abs/10.1890/08-0082.1)
37. [Analysis Of Neighborhood Dynamics Of Forest Ecosystems Using Likelihood Methods And Modeling - Canham - 2006 - Ecological Applications - Wiley Online Library](https://esajournals.onlinelibrary.wiley.com/doi/10.1890/04-0657)
38. [(PDF) Will the real self-thinning rule please stand up?](https://www.researchgate.net/publication/258728470_Will_the_real_self-thinning_rule_please_stand_up)
39. [Models for plant self‐thinning - Wade - 2018 - Ecosphere - Wiley Online Library](https://esajournals.onlinelibrary.wiley.com/doi/10.1002/ecs2.2219)
40. [The Effects of Density, Spatial Pattern, and Competitive Symmetry on Size Variation in Simulated Plant Populations](https://doi.org/10.1086/321988)
41. [Review Asymmetric competition in plant populations](https://www.sciencedirect.com/science/article/abs/pii/016953479090095U)
42. [Mechanisms determining the degree of size asymmetry in ...](https://cales.arizona.edu/research/schwinn/downloads/SS_JW1998.pdf)
43. [A Hierarchical Bayesian Model to Predict Self-Thinning Line for Chinese Fir in Southern China](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0139788)
44. [Synthetic silviculture: multi-scale modeling of plant ecosystems: ACM Transactions on Graphics: Vol 38, No 4](https://dl.acm.org/doi/abs/10.1145/3306346.3323039)
45. [Synthetic silviculture: Multi-Scale Modeling of Plant Ecosystems](https://research.google/pubs/pub49196/)
46. [Comparative performances of new and existing indices of crown asymmetry: an evaluation using tall trees of Eucalyptus pilularis (Smith)](https://link.springer.com/article/10.1007/s11676-020-01180-0)
47. [Architectural models 3. (A) Aubréville's model, here exemplified by...](https://www.researchgate.net/figure/Architectural-models-3-A-Aubrevilles-model-here-exemplified-by-Terminalia-catappa_fig3_321208460)
48. [Computer simulation of tree development with random ...](https://pdfs.semanticscholar.org/e968/349daf5adf349110efcc5b63671fb4b2153b.pdf)
49. [Aubreville%27s model](https://en.wikipedia.org/wiki/Aubreville%27s_model)
50. [Sugar availability suppresses the auxin‐induced strigolactone pathway to promote bud outgrowth - Bertheloot - 2020 - New Phytologist - Wiley Online Library](https://nph.onlinelibrary.wiley.com/doi/10.1111/nph.16201)
51. [The pipe model theory half a century on: a review - PubMed](https://pubmed.ncbi.nlm.nih.gov/29370362/)
52. [Yes, West, Brown and Enquist"s model of allometric scaling is both mathematically correct and biologically relevant - BROWN - 2005 - Functional Ecology - Wiley Online Library](https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/j.1365-2435.2005.01022.x)
53. [West, Brown and Enquist's model of allometric scaling again: the same questions remain - KOZŁOWSKI - 2005 - Functional Ecology - Wiley Online Library](https://besjournals.onlinelibrary.wiley.com/doi/10.1111/j.1365-2435.2005.01021.x)
54. [Is West, Brown and Enquist's model of allometric scaling mathematically correct and biologically relevant? - Kozłowski - 2004 - Functional Ecology - Wiley Online Library](https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/j.0269-8463.2004.00830.x)
55. [Light Distribution Models for Tree Growth Simulation - Nauber - 2025 - Computer Graphics Forum - Wiley Online Library](https://onlinelibrary.wiley.com/doi/10.1111/cgf.15268?af=R)
56. [“Plastic trees: interactive self-adapting botanical tree models” by Pirk, Stava, Kratt, Said, Neubert, et al. …](https://history.siggraph.org/learning/plastic-trees-interactive-self-adapting-botanical-tree-models-by-pirk-stava-kratt-said-neubert-et-al/)
57. [Inverse Procedural Modelling of Trees - Stava - 2014 - Computer Graphics Forum - Wiley Online Library](https://onlinelibrary.wiley.com/doi/abs/10.1111/cgf.12282)
58. [Procedural Urban Forestry](https://arxiv.org/pdf/2008.05567)
59. [TreeSketchNet: From Sketch To 3D Tree Parameters Generation](https://arxiv.org/pdf/2207.12297)
