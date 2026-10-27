# 0010: R1 carbon balance as built

- **Status:** accepted
- **Date:** 2026-10-27
- **Spec:** §R1, §C5, §C3.4, §6 (CARBON, deaths last), §7 M8

## Context
§R1 gives P = α·Σ Q·exp(−L_path/L_h), M = m_w·Σ πr²l ("sapwood"), a reserve, starvation after k_starve empty seasons, and "per-branch P_b < M_b → shed (replaces C5 threshold)". Probes in M8 showed four open points ([note](../experiments/2026-10-27-m8-carbon.md)). The user asked that research settle them.

1. **Which wood costs.**
   - Charging live sapwood only (the pipes serving foliage) let a shaded tree shrink instead of starving.
   - Charging the whole C6 radius produced deaths and a plateau, but only because wood cost reached ≈ 100% of production.
2. **What kills a suppressed tree.** Wood costs alone vanish as a seedling shrinks, so an understorey seedling lived forever as a stub.
3. **Shedding.** The spec replaces C5 with a carbon test, which would drop ADR 0007's relative threshold.
4. **The plateau freezes.** Once every bud's share of resource is below one metamer, nothing changes.

## Evidence
- **Stem maintenance follows sapwood volume,** not stem size or surface (Ryan 1990; Ryan et al. 1995). It uses 5–13% of net assimilation (Ryan et al. 1995). The sapwood–heartwood boundary sits where keeping inner rings alive no longer pays (Petit et al. 2023).
- **Rising wood respiration does not cause the age-related growth decline.** Direct measurements refute it (Ryan et al. 1997, 2004; Binkley et al. 2002; Murty et al. 1996; Tang et al. 2014). The spec's two plateau causes remain:
  - hydraulic limitation, "common, but not universal" (Ryan et al. 2006);
  - reproduction (Becker et al. 2000).
- **Foliage and fine roots** take a growing share as stands age (Ryan et al. 2004).
  - Saplings at 6% light keep their stores for years, but die after added leaf loss (Weber et al. 2018).
  - Starving trees die back piece by piece (Wiley et al. 2017).
  - Low-light survival is what shade tolerance means (Kobe et al. 1995).
- **Branch death** follows the branch's own carbon budget (autonomy), modified by the rest of the crown (correlative inhibition: Sprugel 2002; Kothari et al. 2025; Forests 8:26, 2017).

## Decision
- **Wood:** M_wood = m_w·Σ π r_live²·l, where r_live is the pipe-model radius of the pipes still serving foliage. Heartwood (C6 memory, scars) costs nothing. m_w = 1 puts stem maintenance near 10% of production.
- **Foliage:** M_foliage = m_f·Σ a over live buds' leaf area a, which sets a compensation light Q_c = m_f/α. This term extends §R1.
  - Production counts the same leaf area: a dormant, leafless bud neither produces nor respires.
  - m_f = 0.06 (Q_c ≈ 0.02) is the generic value. It becomes a species knob for shade tolerance.
- **Reserve:** s_r of a surplus, capped at `store` (2) seasons of maintenance after the seed's first season.
- **Plateau:** L_h = 60 is the default cause. Reproduction (f_rep after a maturity height) stays available as a switch.
- **Resource scale:** with R1 on, α = 3 (was 2). Costs and the L_h discount take ≈ 40% of the resource, and at α 2 the leader lost its advantage and trees forked low.
- **Shedding (`r1.shed: "carbon"`, the default with R1):** a lateral is shed if P_b < M_b (autonomy) or if its light per metamer is below T_rel·Q_top (ADR 0007). The carbon test replaces C5's absolute floor T, as §R1 says; the relative term stays. `"c5"` keeps C5 unchanged.
- **Presets:** R1 is on in the sky presets, which are also the page default. The species presets stay pre-R1 until they are calibrated with it. Tests of M6–M7 pin the pre-R1 settings (`PRE_R1`).
- **The freeze is accepted for M8.** Turnover and regeneration come with R4 (bud release, M10) and O4 (recruitment, M11).

## Consequences
- **Height levels off:** the stand at ≈ 78 cells, the open-grown tree near 89 and still slowly rising at season 100.
- **Seedlings die:** one planted under the closed canopy dies within 5 seasons.
- **Crown bases rise:** from 25 to 31 cells between seasons 50 and 100.
- **Self-thinning does not emerge yet** in the even ten-tree stand: no deaths in 100 seasons. M11 tests it on denser, uneven stands.
- **Shape:** stand H/D falls to 56 (target 60–80) and crowns look sparser.
- **Revisit when** the species get R1, R4 adds turnover, or M11 needs self-thinning.
