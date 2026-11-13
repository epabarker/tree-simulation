# 0067: The lone triad's measures and the wind-load form for #133

- **Status:** accepted (user, 2026-11-13, accepting the agent's recommendations on the five open points of [the triad re-read](../experiments/2026-11-13-triad-reread.md)). Amends [ADR 0041](0041-vigour-drop.md): its accepted lone outcome (W/H 1.50 at season 100) is no longer a reference number. The vigour rule itself stands.
- **Spec:** §R3, §O2, §10. ADRs 0011, 0013, 0027, 0028, 0041, 0050, 0051.
- **Tickets:** [#129](https://github.com/epabarker/tree-simulation/issues/129), [#131](https://github.com/epabarker/tree-simulation/issues/131) (the re-read), [#133](https://github.com/epabarker/tree-simulation/issues/133) (girth), [#134](https://github.com/epabarker/tree-simulation/issues/134) (the species round).

## Context
#129's decisions (2026-11-13) judge the lone tree on a triad of ratios as a guard: crown width W at matched DBH against Pretzsch et al. 2015's open-grown edge, W/H and H/D. The stand's crown against Tallo is the gate. The re-read (#131) left five points open:
- **Two W/H targets.** The project held two numbers for the lone beech: ADR 0028's `lone.spread` 0.6 ± 0.2 at season 60, and ADR 0041's accepted 1.50 at season 100.
- **Two diameters.** The fit's `lone.slenderness` reads the root metamer's diameter (`cli/trials.ts`), while its targets are Pretzsch's breast-height H/D. In lone trees the two differ by 0.5–1.9× from seed to seed.
- **Two crown measures.** The tip measure and the robust 5–95% spread differ by about 2×.
- **Three thresholds** the note proposed.
- **The form of #133's wind load.**

R3 also grows inverted forks: gravity's moments cancel across a balanced crown, and stress wood is local (ADR 0011 §3).

## Decision
1. **W/H at season 100 follows ADR 0028, for beech and hornbeam alike:** a described, half-weight band of 0.6–1.2. It runs from `lone.spread` at season 60 toward ADR 0028's parkland 0.9–1.3 at about twice that age.
   - **Why:** W/D = (W/H)·(H/D). At DBH 40, Pretzsch's edge (11.5 m) with the beech's H/D 48 gives W/H 0.60, so `lone.spread` already is the triad's W/H. At 1.50 the crown-width limit could never pass.
   - **ADR 0041's 1.50 becomes a panel check:** the lone beech must still be named a beech, but 1.50 is not a target.
   - **#134's knob list adds `r2.vigourShare` and `r2.vigourLambda`,** ADR 0041's broadening rule.
2. **The lone H/D reads D at 1.3 m,** where every anchor reads it.
   - **The measure:** `cli/allometry.ts`'s trunk cylinder spanning 1.3 m, continued by subtree volume.
   - **A codominant fork below 1.3 m** (its existing `codominant` flag, `CODOMINANT` 0.5) is pooled as √Σd², Tallo's convention.
   - **The root metamer's H/D** is reported beside it.
   - **In the fit:** `allometry.ts` gains a pooled DBH beside `dbh`. `dbh` itself is unchanged: it is Level 0's gated measurement, pinned by `test_level0_parity.py`. `cli/trials.ts` gains a breast-height slenderness, which `lone.slenderness` is scored on from #134's round. Existing fits are rescored, not refit.
   - **Until then,** probe analyses compute it themselves.
3. **The stand gate reads the tip measure,** with the robust crown reported beside it, as ADR 0050's ruling 2 decided for Level 0.
   - **Why:** Tallo's crown radii are field radii or crown projection areas (ADR 0051, citing Jucker et al. 2022 §2.1), sighted to the drip line, which is what the tip measure reads. The robust spread reads inside the crown by construction.
   - **Upper bound:** dbh.py's version reads every tip, and Level 0's reads live-bud tips, so dbh.py's is an upper bound wherever the runs carry no bud states.
4. **The thresholds:**
   - **Bar 4's taper window (0.8–1.25) is kept** as a guard on when the lone W at matched DBH can be read. It is a window for the simulator: no butt swell is modelled.
   - **Bar 10 becomes a junction test:** at every trunk fork below 1.3 m, Σr_c² ≤ 1.3·r_p². The taper ratio stays reported.
   - **Bar 6 is stated as Level 0's statistic,** |median z| ≤ 1 per species, with z = (ln y − q50)/(q90 − q50) above the median. "Half the trees inside q10–q90" is reported beside it.
   - **Bar 6 is read only on at least 8 trees** pooled over seeds, pooling seasons where needed.
5. **#133's wind load is drag on leaf and stem, times a height profile, as a moment that cannot cancel.**
   - **The moment:** in R3's basipetal pass, M_w,i = Σ_j f_j·max(0, y_j − y_base,i) over the subtree, with f_j = k_w·(a_leaf,j + k_s·2·r_j·l_j)·(y_j / H_ref)^β.
   - **Why it cannot cancel:** a horizontal force's lever is the vertical offset. So no wind direction or randomness is needed, every term is non-negative, and a parent's moment is at least the sum of its children's.
   - **Where it enters:** σ = 4(|M_g| + M_w)/(πr³), for stress wood and the storm's loaded check only. Sag and posture stay on gravity's moment M_g, because wind is transient and the ring locks gravity's increment (ADR 0011).
   - **The probe's params:** `r3.windLoad` (k_w; 0 is off and bit-identical), `r3.windStem` (k_s), β 1 and H_ref 100 cells.
   - **Arms:** leaf-only and leaf plus wood, each on HEAD and `H4k8`, lone and garden, seeds 1–3, beside the σ ÷ 2 bracket.
   - **HEAD's wide crowns will read worse lone H/D under it, by construction.** That is not a rejection. The load's job is to make D independent of crown width, so #134 can narrow crowns without thrown stems.

## Alternatives
- **Keep 1.50 at season 100:** incompatible with the triad (decision 1).
- **H/D over the root metamer, or below the first fork:** the first mismatches every target; the second hides the inverted fork that bar 10 tests.
- **Gate on the robust crown:** it reads inside the drip line that Tallo's field radii measure, and reopens ADR 0050's ruling.
- **A wind load on leaf area alone:** the thrown stems are sparse (lone birch 8–9k metamers against 111–126k), so it barely loads them. A load on height alone, whatever the tree carries, is less physical than counting the stem's own silhouette.
- **Pass stress wood down the pipe** (undo ADR 0011 §3) to cure the inverted fork: kept in reserve if bar 10 still fails under the wind load.

## Consequences
- **No code, golden or regression changes now.** The note's §5 is amended to these bars, and #133 and #134 are updated.
- **#133's acceptance reads stand H/D in each species' `stand.slenderness` band** (bar 7; beech 70–94, hornbeam 74–98), not §10's generic 60–80. ADR 0028 §3 superseded the generic range.
- **If #133 adopts the wind load:** an ADR superseding ADR 0013's deferral and closing ADR 0011's and 0027's revisit clauses; spec §R3.4, §R3.6 and §O2.4's "as built" sentence; that species' goldens, both slenderness fits, the windthrow ramp and #126.
- **#134 carries the fit-side change of decision 2** and the knob list of decision 1.
- **Risk:** the panel may not name a beech at W/H 0.8. If so, the shape has to come from the crown's profile, not its width.
