# A7: the flat cap, and within-tree regularity (read-only investigation, 2026-11-05)

Scripts (read-only, on existing runs only): `scratchpad/a7/code/{buds,growth,shoots,lengths}.py`, run on
`runs/cap/lone-{base,noShed,Lh2x,kExt0.25}` and `runs/cap/stand-base` (ADR 0031's hornbeam, seed 1,
oakOpen world: 160 × 200, D 64, faces [0.2, 0.2]). Nothing was run through the CLI. Palubicki et al.
2009 was read from the authors' small PDF (algorithmicbotany.org/papers/selforg.sig2009.small.pdf).

## 1. The flat cap

### 1.1 What the six diagnostics established (ADR 0031, species note §"The cap")
- The lone cap's *leaf distribution* (top fifth 40% of the leaf, bare lower crown) is shedding's:
  with no shedding at all the top fifth falls to 22–24% and the crown is leafy to the base.
- The shed branches are single leafy short shoots shed for P_b < M_b (foliage cost; sapwood < 1%),
  compensation light m_f(1 + L/L_h)/α ≈ 0.04–0.08.
- Every relaxation of one or both shedding rules (saturating response, k_shed, acclimated leaf cost,
  T_rel at shade-leaf values) fills the crown but leaves its top flat; the stand's thin lid is light
  recession under neighbours, a different thing.
- Decision 4 (the user): "the flat top is in growth, not in pruning".

### 1.2 What I measured (new, seed 1 only: treat as a hypothesis with strong support, not a result)
- **The top outline is flat with and without shedding.** Dome index D = (top(0) − top(0.75R))/R,
  where top(r) is the 98th percentile of leafy-bud tip height in a front-view radial bin |x − x_root|,
  R the 98th percentile of |x − x_root| (a hemisphere gives 0.34, a flat top 0): base 0.03,
  noShed −0.08 (a slight bowl) at season 100. What noShed changes is the skirt (the leaf's lower
  edge at 0.8–1.0 R: 94–99 cells in base, 55 in noShed), not the top. The cap figure
  (`figures/2026-10-31-cap-hornbeam-100.png`) agrees: noShed is a dense vase with a flat top.
- **Growth happens only at the top, one metamer at a time.** New shoots at season 60 / 100: 1,433 /
  993, **1.02 / 1.01 metamers per shoot**, 58–64% of them with v in [1, 1.25) (their length is v·l0
  when n = 1), **88–90% in the top fifth of the height**. Lh2x at 100: 3,016 shoots, 1.03 metamers
  per shoot, 90% in the top fifth. The shoot cap (3) is never reached after season ~30.
- **The tree's resource per unit of bud light collapses with size.** k = v_base/Q_base (metrics.csv):

  | season | 5 | 10 | 20 | 30 | 40 | 60 | 80 | 100 |
  |---|---|---|---|---|---|---|---|---|
  | lone base | 2.26 | 1.93 | 1.20 | 0.99 | 0.82 | 0.65 | 0.50 | 0.46 |
  | lone noShed | 2.26 | 1.93 | 1.12 | 0.86 | 0.72 | 0.51 | 0.39 | 0.33 |
  | lone Lh2x | | | 1.42 | 1.22 | 1.06 | 0.87 | 0.71 | 0.63 |

  At λ = 0.5 BH gives a bud v = k·w·Q (w = R6's a_ss 2.327 for a short shoot, 1 otherwise;
  `r6.rs:29–35`, `c3.rs:24–48`). The light a bud needs to grow one metamer on its own share,
  Q* = 1/(k·w), rises for a short shoot from 0.43 (season 30) to 0.66 (60) and 0.94 (100); an active
  bud (w 1) can never grow on its own share after season ~30 (Q* > 1 with C = 1). Only buds at
  nearly open sky, or ones that λ's and acrotony's bias lifts, cross v ≥ 1. About 85% of v_base
  lands on buds below threshold and is lost (≈ 1,000 shoots × v ≈ 1.15 against v_base 7,500).
- **Positive control (D calibrated):** ADR 0030's saturating response (`runs/response/lone-sat0.2`,
  the tree that ADR calls a dome at 60). At 60: **D = 0.58** (linear twin 0.055), **k = 1.68**
  (linear 0.65), 12,217 shoots that season at 1.10 metamers each, **only 34% in the top fifth**
  (linear 90%). At 100 it is pressed against the woods' top (H 205) with k down to 0.92 and D 0.01,
  as ADR 0030 reported. So D sees a dome when there is one, and the one rule that ever rounded the lone
  crown did it by keeping k above 1, with growth spread over the shell; its costs were the ones
  ADR 0030 rejected it for (H 171 at 60 against 107; 115k metamers against 28k).
- **Which hornbeam:** the `runs/cap` and `runs/response` trees (2026-10-31, commit 8e79176) carry the
  flat leaf cost (no `leafCost` in run.json), i.e. before ADR 0032 made the acclimated cost
  hornbeam's own. ADR 0031's diagnostics 5–6 ran the acclimated cost and stayed flat, so the
  conclusion should hold, but the k table is for the old hornbeam; the probes below target today's.
- **Against ADR 0031's reading:** it calls noShed "a dense rounded crown"; by D (seed 1) its top is
  flat, and what rounds is the skirt. This agrees with Decision 4 (the top is in growth) and refines
  diagnostic 1 rather than overturning it.

### 1.3 The mechanism (hypothesis, with the evidence above)
k = (1 − s_r − f_rep)·α·d̄·(1 − M/P) (`r1.rs:43–125`): R1's foliage and sapwood costs and the
hydraulic discount d(L) take a growing share as the tree grows, and Q_base grows with the bud count,
so the resource per unit of light falls below the one-metamer threshold (`season.rs:441–446`;
`c1.rs:222–231`: n = ⌊min(v, cap)⌋, v < 1 → nothing). From then on the crown's growth front has a
**step-shaped speed**: one internode a season where a bud sees nearly the whole sky, zero elsewhere.
Only upward-facing surface qualifies, so the top advances as a plateau; its rim also sees full sky and
creeps outward on its set point (30–44° from vertical in hornbeam), so the plateau widens as it rises
over a lower crown that stopped growing at season ~30–40: **a flat cap on an inverted cone**. Shedding
then strips the frozen lower crown as the cap thickens over it (ADR 0031's finding), which is why
"no shedding" keeps the leaf but not a rounded top. A dome needs a *graded* speed: the shoulders
advancing at a fraction of the top's rate. Palubicki's BH has that: v_base = α·Q_base with α = 2 and
no costs, so k ≡ 2 for the tree's life, Q* = 0.5 at λ = 0.5, the brightest buds grow 2+ metamers
(n = ⌊v⌋, l = v/n, no cap stated), and shoulders at Q 0.5–0.9 grow one: the speed falls off with
orientation and the front rounds (their Fig. 7, λ 0.46–0.50; Fig. 21b's hemisphere without apical
control).

Hornbeam's λ makes it worse: `r2.rs:97–108` applies dΛ to every level, so after aC + ramp
λ1 = 0.50 − 0.079 ≈ 0.42 and λ2 ≈ 0.42, below Palubicki's whole range (0.46–0.54). λ < 0.5 sends
resource into laterals at every node, spreading it thinner over sub-threshold buds.

**The light model is a secondary difference.** Palubicki's shadow is additive and local (a·b^−q in a
pyramid q_max = 4–8 voxels deep; Q = max(C − s + a, 0)), so a bud's light reflects crowding within a few
voxels above it and recovers in open space under a dense layer. Our slab sweep integrates Beer–Lambert
along the whole path from the sky (K 16, cosine-weighted p = 1, ≥ 15° elevation), so light falls
monotonically with all leaf above. That deepens the step but does not create it: the step is the
threshold against k. **Face transmission (τ 0.2) is not the cause:** at 0.3–0.7 H, mean bud Q by
|z − 32| is 0.127 / 0.137 / 0.139 / 0.140 (no darkening toward the faces); by |x − 80| it rises
0.11 → 0.23 outward. **Clipping by the slab's depth is untested:** buds outside the slab get Q = 0,
the crown fills the slab in depth (leafy |z − 32| to 32, 90th percentile 22–25, against |x − 80| to
50), and the G0.5 review noted that clipping "shifts allocation, so D shapes the crowns".

### 1.4 Ranked candidates (none repeats ADR 0030, 0031's six, 0043 or 0045; the form grids and the
dome sweep varied ramp, pTerm, generator and set points, not the growth threshold)

Common probe unless stated: hornbeam (fitted + hand overrides), lone, seasons 60 and 100, seeds 1–5.
Metrics: D (above; falsify if < 0.10 on ≥ 4 of 5 seeds), share of new shoots outside the top fifth
(today 10–12%), top fifth's leaf share (today 0.40), W/H, metamers (phone budget), k by season. The
stand check for anything that passes: the closed hornbeam stand at 100 (floor, crown ratio, alive),
then `forest` seeds 1–3 to 300 (plateau, H/D, crown base, floor 100) before any 20-seed run.

1. **Graded extension below one metamer.** A bud with v_min ≤ v < 1 grows one internode of length
   v·l0 (Palubicki's l = v/n continued below n = 1), instead of nothing. Where: `c1.rs:222–231`
   (`shoot_size`) and the gate `season.rs:441–446` (R4's v_cont, today 1). Why it rounds: the front's
   speed becomes ~linear in light, so shoulders at Q 0.4–0.9 advance at a fraction of the top's rate.
   Spec: §C3.4 ("v < 1 → none") and ADR 0004. At risk: metamer count (the most likely failure: ≈ 3,400
   live buds have Q ≥ 0.5 at 100 against ≈ 1,000 shoots a season now); the stand's lid buds at Q 0.2–0.4
   extending (floor, LAI); plateau probably safe (the top already grows). A cheaper variant limits it
   to main-slot (terminal) buds, which set the outline. Probe: v_min ∈ {1, 0.6, 0.4}, both variants.
   **Rule change** (v_min = 1 bit-identical), plus R4's existing `vCont` param.
2. **Keep apical control in the limbs: dΛ on the trunk (pa 0) only.** Where: `r2.rs:97–108`
   (`lambda_at` subtracts d_lambda at every level). Why: with λ ≥ 0.5 inside each limb, a limb's
   resource concentrates in its terminal, which crosses v ≥ 1 wherever the limb as a whole is lit, so
   limb tips all round the shell keep extending (Palubicki Fig. 10 right: "apical control removed early
   in the main stem, persistent in first-order lateral branches"). Spec: §R2.4's ontogeny rule (which
   λ declines). At risk: stand crown ratio and LAI (stand trees' limbs also keep λ), the fork/W/H picks
   (ADR 0029). Probe: the scope flag; a param-only proxy is levels 1–2 λ raised by dΛ (0.58) so the
   late value is 0.50. **Rule-scope change**; the proxy is params.
3. **Palubicki's priority model (§C3.4's listed alternative).** Per axis, rank supported branches by
   light per bud, weights w_max 1 … w_min 0.006, κ 0.35–0.5, terminal first. Where: a new `c3.mode`
   in `c3.rs:allocate`. Why: allocation concentrates per axis, so every lit limb grows its best twigs
   whatever the tree-wide k; Palubicki's rounded crowns in Fig. 9–11. Spec: implements §C3 as written.
   At risk: everything calibrated on BH (every species' fit, all four stand checks). Probe: the generic
   tree (`forest`'s params) lone, then `forest` seeds 1–3. **Rule (mode).**
4. **Leaves as isotropic receptors: `c2.skyExponent` 0** (today 1; the overcast preset 1.5). With
   directions spaced in equal solid angle (`slab_sweep.rs:62–90`), p = 0 is a uniform sky seen by a
   spherical leaf-angle distribution (G = 0.5), the canopy-model default; p = 1 treats every bud as a
   horizontal leaf and starves the flanks. Why: raises flank light against the top, lowering the gap
   to Q*. Alone, predicted insufficient (flank Q 0.17–0.25 now); useful with 1 or 2. Spec: §C2.6
   (sky weighting). At risk: floor light (the floor checks), crown base. p 0.5 was tried only for
   the stand's crown ratio (crown-competition note: flat). **Parameter** (a world param, not a species').
5. **The planned arching (ADR 0031 Decision 4, Troll's reiteration), but only after 1 or 2.** Under
   the step regime the flanks do not grow (v < 1), so limbs that rise and then arch would still carry
   a plateau on top. An R2 form rule; probe it on top of whichever of 1–2 passes, with D and the
   like-for-like sheet.

Controls worth one run each, cheap: a lone tree in a slab deeper than its crown (depth 128 or more;
faces [1, 1] alone does not remove clipping), and Lh2x's D (expect flat: k higher, still < 1 by 40).

Note on candidate 1: it departs from Palubicki, whose rule also gives nothing for v < 1; his crowns are
graded only because k stays at α = 2. The saturating control shows that raising k rounds the crown but
also raises production everywhere (height into the ceiling, 4× metamers). Candidate 1 lowers the
threshold instead of raising k, so the top's rate (one metamer a season) and the tree's carbon are
unchanged and only the shoulders gain growth: that is the case for trying it first.

### 1.5 Palubicki's regime as a "generic tree" reference
Mostly reproducible, and worth it as a mechanism test rather than a target: R1 off (v_base = α·Q_base,
α = 2, so k ≡ 2), `c3` bh with λ 0.46 / 0.50 / 0.54, C5 with an absolute T and T_rel 0, R2–R6 off.
The M2 presets `spreading`, `bh` and `leader` are exactly Fig. 7's series, already in the slab
(`presets.ts:187–215`), but in a 90-cell world: raise the top to 200. Not reproducible: the shadow
pyramid (we have Beer–Lambert), "no cap" (ours is 3). Prediction from §1.3: these trees keep k = 2,
grow multi-metamer shoots on the shoulders, and score D > 0.2 at 60. If they are flat too, the
mechanism above is wrong and the light model (§1.3's secondary difference) moves up. It cannot be a
stand reference: with no costs there is no plateau, H/D or floor to speak of.

## 2. Within-tree regularity

### 2.1 What makes or suppresses irregularity today
- **C4's direction noise is small, white and mean-reverting.** `season.rs:508–512`: angle σ·N(0, 1)
  about a uniformly drawn axis [DIRECTION_NOISE, keyed per metamer and season]; `c4.rs:47–55`:
  d = w_d·prev + ξ·V + η·t(set point) + ε·u. Defaults ε 0.5, σ 20°, ξ 0.3 (`params.ts:623`), no species
  overrides them; η per level (hornbeam 0.25–0.4). The net turn per metamer is ≈ atan(0.5·sin 20° /
  ~1.9) ≈ 5° SD, independent from metamer to metamer, and pulled back each season by η toward the
  level's set point and by R3's posture. It makes a fine wiggle that averages out over a limb: it can
  bring tortuosity05 into band (pilot v4) without making crooks, i.e. persistent changes of course.
- **Phyllotaxis and branching are deterministic after one draw per axis.** `c1.rs:108–118` (axis
  start, SIDE_SEQUENCE), `c1.rs:130–147` (azimuth = phase + k·step + j·2π/n), β fixed per level
  (`r2.rs:111`). Every node forms its laterals, distichous for hornbeam and beech: the herringbone.
- **Bud break is deterministic.** `r4.rs:15–29`, `season.rs:441–446`: thresholds in v and light, no
  draw. The purposes BUD_BREAK (5) and SHEDDING (3) are registered (`rng.rs:11–13`) but never drawn
  in the core; §C5.4's "optional stochastic p_shed [RNG]" is not implemented. The only stochastic bud
  fate is SYMPODIAL_TERMINATION (`r2.rs:327`), and hornbeam's pTerm is 0 on every level.
- **Internode length barely varies.** `c1.rs:222–231`: l = (min(v, cap)/n)·l0, which is in [1, 2)·l0 by
  construction. Lone hornbeam at 60: median 1.23, 5–95% 1.00–1.80, CV 0.19, the same in every decade
  of birth; shoots are 1.01–1.02 metamers. Real shoot lengths span more than ten-fold.
- **R3 is a restoring force.** Sag is deterministic from load; posture turns each metamer toward its
  set point within c·Δr/r (`r3.rs:1–9`, c 0.059 hornbeam). It erases deviations rather than recording
  them (ADR 0045's finding on old wood).
- **R4's reiteration exists but is light-triggered and deterministic** (`r4.rs:1–5`, `released_shift`
  `r4.rs:43`): 1,415 releases by 60 in the lone hornbeam, each a new young axis, the main source of
  irregularity today.
- **Breakage is effectively off for lone trees.** `r3.rs:180–190` breaks a metamer only when its
  (storm-loaded) stress passes σ_break 7000; the trials' world is oakOpen with `o2.stormP` 0
  (`presets.ts:367–380`), so a lone tree has no breakage history. A real 100-year oak has lost limbs.
- **Shedding leaves no stub.** `c5.rs:113–135` (`remove_branches`) removes the subtree from its base,
  keeps only a scar in the radius, and with R4's bank a dormant bud in the slot.
- **Uniform environment:** the sky rotates every season (`slab_sweep.rs:111–118`), deliberately
  averaging out directional light. Per-tree variation is only the seedling azimuth (ADR 0054).
- **Young trees grow too fast and too regularly** (the coordinator's 16 m at 25): k ≈ 1.2–2.3 before
  season 30 puts every vigorous shoot at the cap, 3 metamers of length exactly l0, so the leader rises
  0.75 m a year (54.6 cells at 20, 74 at 30; cell 0.25 m) from h_J 8.8 cells (2.2 m). The cap and h_J
  set juvenile height, and identical full shoots are the most regular phase of the tree.

### 2.2 Ranked candidates (at most 5)
Common probe: lone hornbeam and oak at 60 and 100, seeds 1–5, coarsened to QSM resolution and put
before the same blinded judge (falsify if it still tells them 100% of the time), plus cheap
descriptors: CV of internode length, CV of spacing between branches along first-order limbs, share of
nodes bearing a live lateral branch, tortuosity05, metamers.

1. **Stochastic bud break and lateral loss.** Draw BUD_BREAK (already registered, unused): a lateral
   breaks with probability rising smoothly through the threshold (e.g. logistic in v around v_cont),
   and/or a share of laterals is never set or aborts in its first season. Breaks the herringbone and
   the uniform texture; it lowers the metamer count. **Rule** (spec §C1/§R4), new param(s); default off.
2. **Shoot length that varies.** A per-shoot multiplier on length, lognormal with SD s [a new purpose,
   appended as 15], or flat-cap candidate 1's graded extension (which spreads lengths over (0, 2)·l0).
   Targets the "fine uniform line texture" (40%). **Rule.**
3. **Persistent deviations instead of white noise.** First the existing params: `c4.epsilon` (0.5) and
   `c4.sigma` (20°) up, e.g. ε 1, σ 35 (expected weak, since white noise averages out). Then the rule:
   a per-axis offset to the set point drawn once per axis (N(0, s), keyed by axis), ADR 0053's per-tree
   draw extended to limbs; limbs then differ in angle and keep their crooks. Targets "crooked,
   irregular, leaning" (87%) and "smooth, straight limbs" (32%). **Params first, then a rule.**
4. **A breakage history for lone trees.** `o2.stormP` 0.05 with `forest`'s stormLoad 1.5 and σ_break
   7000 in the lone trials (all **existing params**; today stormP 0 there). Broken tops and limbs
   release dormant buds (R4), giving reiterated, irregular crowns. At risk: lone heights (Level 0
   targets) and windthrow of tall lone trees; the stand's evidence already has storms on.
5. **Stubs.** A shed branch leaves its first one or two metamers as dead wood for a number of seasons
   (no leaf, no cost), then drops. Targets the 15% stubs cue and the "like for like" note. **Rule**
   (C5/§R1 shedding), a column or a dead state; checkpoint layout at stake, so last.

Related, already params: `c1.maxMetamersPerShoot` (3) and `r2.hJ` (8.8 for hornbeam) for the
too-fast juvenile height; `levels.*.pTerm` (0) gives sympodial zigzags if raised on twig levels, which
the judge already names as a regularity cue ("repetitive zigzag bifurcations"), so it is not a fix.
