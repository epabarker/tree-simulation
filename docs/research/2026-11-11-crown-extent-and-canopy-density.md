# What bounds a crown's lateral extent, and how many canopy trees a stand holds (issue #121)

_Researched 2026-11-11 for the garden's canopy-count problem ([#121](https://github.com/epabarker/tree-simulation/issues/121)). Question: the garden thins to 47–109 canopy trees/ha by season 100 and its dominants' crowns are 12.5–19 m wide, because survivors spread into whatever space dead neighbours leave. What limits lateral crown extent in real closed-canopy broadleaves, what are the numbers, how do other models handle it, and is the thinning itself too fast? This note changes no code._

## Revision, 2026-11-11 (later the same day): four papers read in full

The user supplied PDFs of Hossain & Olson 2023, Choi et al. 2001, Hajek et al. 2015 and Pretzsch & Biber 2005. Each was read page by page and is now tagged [FT]. What changed:

1. **Authorship.** The 2023 *Forests* paper is by Hossain & **Olson**, not Hossain & Caspersen (the 2012 dieback paper is Hossain & Caspersen). Corrected throughout.
2. **Hossain & Olson's size decline is narrower than the abstract reads.** Before release, small trees' branches grew *slower* than large trees' (2.8–8.1 against 3.6–9.0 cm/yr). The decline with stem diameter exists only after release, only in sugar maple and yellow birch; beech showed none. Reproduction is the authors' hypothesis, resting on DBH being the retained predictor; they state that height and branch length were collinear with DBH and that an effect of either may have been masked. The earlier wording ("found no effect of branch length or height") overstated a model-selection result.
3. **Choi's decline is with height, diameter and age together, and it has a floor.** The fitted equations have no age term: sugar maple's best single predictor of crown radial increment is tree height (−0.092 per metre in ln cm/yr), then DBH; crown radius, the nearest thing to branch length, is the weakest. Exposed margins grow about 15 cm/yr at 10 m tall, under 5 cm/yr above 20 m, and still 2.3–3 cm/yr at 150–250 years. The paper gives no crown-radius-on-DBH equation and no simulated gap-closure rate.
4. **The garden's late lateral rate is not "inside the measured range" for a shade-tolerant canopy tree.** 12 cm/yr at seasons 50–100 is 2–4× Choi's exposed sugar maples of that size and Hossain & Olson's large maple and beech (3.9 and 6.6 cm/yr), though inside Hibbs's and Runkle & Yetter's gap-edge means. Summary point 1 and section 1.2 are reworded.
5. **Hajek: per-species numbers added, and two cautions.** (a) The forest was under selection cutting until 1997 and the canopy trees are 90–120 years old, so "old-growth" is loose. (b) The Results text gives breakage shares (20–50% of beech laterals, 25–33% of hornbeam, 10–45% of lime, 14–25% of ash) lower than the abstract's "more than 50 percent" and than its own Fig. 3, from which I read 48–72%, 65–82%, 50–80% and 15–50% broken. The paper is internally inconsistent here; both readings are given.
6. **Self-thinning intercepts obtained; section 4's verdict is sharper.** With the paper's lines, a fully stocked beech stand holds about 530/ha at a quadratic mean diameter of 30 cm and 320/ha at 40 cm (oak 460 and 310). 2,500/ha does not reach the line until 9–13 cm. The garden's canopy counts sit on the line only at diameters real stands reach at 140–160 years (season 25) or never reached in the data (season 100). The rate (about 2%/yr) is confirmed as ordinary; the earlier "about 550 to 260/ha" comparison from the managed hornbeam table understated the gap.
7. **Mechanism ranking unchanged; mechanism 1's variable and shape are changed** (section 5): root-collar path length is defensible only as a size proxy, the from-the-trunk variant loses its support, and g must level off at a floor, not fall to zero.

**Background read first.** The two probe notes, [canopy levers](../experiments/2026-11-11-garden-canopy-levers.md) (branch `probe/121-suppression`) and [crown occupancy](../experiments/2026-11-11-garden-crown-occupancy.md) (branch `probe/121-occupancy`); [stand density and demography](../features/stand-density-and-demography.md) and ADR 0063 (same branches).

**What this note does not repeat.** These notes are on the feature-playbook branches, not yet on this one:
- Pretzsch et al. 2015's open-grown coefficients and Hemery et al. 2005's woodland lines: [crown rounding](2026-11-08-crown-rounding.md) §3. Only arithmetic from them is new here.
- Ryan & Yoder 1997, Wilson 2000, Roloff's phases (Innes 1998): crown rounding §1.
- The carbon-supply against sink-limit question for shoot extension, and branch autonomy (Sprugel 2002, Lacointe 2004, Hoch 2005): [turgor sink limit](2026-11-08-turgor-sink-limit.md).
- Uholka's stand structure: [regeneration](2026-11-08-regeneration.md) §3.
- Pałubicki 2009 and Makowski 2019 as systems: [simulators](2026-11-01-simulators.md).

**Verification tags.** [PMC] = PubMed Central full text, read through a fetch-and-summarise tool (so tables in supplements were not seen); [OA] = open-access publisher copy read the same way; [arXiv] = preprint pages read directly; [FT] = the publisher's PDF, supplied by the user and read in full, page by page (values read by eye from a figure are marked "read from the figure"); [abs] = abstract only (the Consensus or publisher record); [repo] = data or text already in this repository; [arith] = my arithmetic from the cited numbers; [mem] = from memory, a lead only, not evidence. DOIs are given only where a tool confirmed them; otherwise the link is the record I read.

**How the sources were found.** Consensus search (six queries), PubMed ID conversion, OpenAlex open-access lookups, alphaXiv, and web search. MDPI, ScienceDirect, HAL, the Göttingen repository and the TUM chair's archive all refused the fetcher (list in section 6). No file was downloaded.

## Summary

1. **The simulated crowns start at a plausible rate and fail to slow.** Canopy trees at gap edges extend 6–18 cm/yr on average (Hibbs 1982; Runkle & Yetter 1987, both [abs]). The garden's dominants gain about 12 cm/yr of radius between seasons 50 and 100 (46 → 94 cells of width in seed 2, [arith] from the levers note). That is inside those gap-edge means but 2–4× what exposed sugar maple crowns of that size do: under 5 cm/yr above 20 m of height, about 3 cm/yr at 150 years (Choi et al. 2001 [FT]); 3.9 cm/yr for released maples over 30 cm DBH (Hossain & Olson 2023 [FT]). What real crowns have and the garden lacks is a rate that **falls about fivefold with tree size** to a low floor, and a lateral closure that **stalls after about 11–16 years** (Lu et al. 2015 [abs]).
2. **The missing limit is intrinsic, not a neighbour effect.** The garden's *lone* hornbeam is 29–38 m wide at season 100 (levers note §1). Pretzsch et al. 2015's open-grown upper envelope for hornbeam is 12.6 m at 40 cm DBH and 15.8 m at 60 cm ([arith] from the coefficients in crown rounding §3). A stand crown cannot be narrower than its neighbours force it to be if the open-grown crown has no ceiling. No occupancy or shyness rule can supply one, which is what the occupancy probe found.
3. **In real closed broadleaf canopies, net lateral growth is set mainly by mechanical abrasion, not light.** In the Hainich mixed forest more than half of the lateral branches of beech, hornbeam and lime in the contact zone had broken at least once in six years, and lateral increment did not depend on light (Hajek et al. 2015 [FT]; the paper's text and figure disagree on the exact shares, section 1.1). In mature sugar maple a third of twigs died back each year, more in larger trees and within 3 m of another crown (Hossain & Caspersen 2012 [abs]).
4. **Vacated space is taken from below as much as from the side.** Small gaps (< 100 m²) close laterally in a few years; larger ones are filled by the sub-canopy and regeneration (Feldmann et al. 2018, 2020; Kucbel et al. 2010 [abs]). In Berchtesgaden, lateral crown expansion closed 20% of gap area over 12 years (Krüger et al. 2024 [abs]). One dead co-dominant with a 10 m crown leaves about 80 m², at the boundary.
5. **The ≥ 120 canopy trees/ha bar is the old-stand end of the real range.** Crown-packing arithmetic gives 120–250 canopy trees/ha for a mean canopy DBH of 40–60 cm; a hornbeam yield table has 207–443 stems/ha at age 100 (section 2).
6. **The garden's thinning *rate* is ordinary; its *phase* is early.** About 2%/yr of canopy trees lost between seasons 25 and 100 is what unthinned beech and oak stands average over a century (3.0 and 2.0%/yr, [arith] from Pretzsch & Biber 2005 [FT]). But 2,500/ha should not self-thin at all before a mean diameter of 9–13 cm, and the garden's 250–340 canopy trees/ha at season 25 is the density of a fully stocked stand of 37–46 cm mean diameter, which the real plots reached at 140–160 years. Its 47–109/ha at season 100 is below anything in the data (section 4). The comparison is canopy trees against all stems and awaits the simulated diameters, but the direction is not in doubt, and it again points at crown size.
7. **Almost every stand-scale model imposes a potential crown radius from stem diameter.** SORTIE, the PPA, TASS and a 2026 crown-shyness simulator all do. The models that let crown width emerge bound it with a cost (mechanical reinforcement, carbon) or do not check it (section 3).

## 1. What limits lateral crown extent

### 1.1 Mechanical abrasion and crown shyness

- **Hajek, Seidel & Leuschner (2015)**, *For. Ecol. Manage.* 348: 108–116, [DOI 10.1016/j.foreco.2015.03.019](https://doi.org/10.1016/j.foreco.2015.03.019) [FT].
  - **Site and sample** (pp. 109–110). Hainich National Park, Thuringia; a mixed stand under selection cutting until 1997; canopy trees 90–120 years old, 19–29 m tall, DBH 12.3–66.8 cm. 63 tree pairs, each with a beech: beech–beech 20, beech–ash 17, beech–hornbeam 22, beech–lime 4. 184 terminal first-order branches in the contact zone at 12.1–27.7 m (114 beech, 21 ash, 29 hornbeam, 20 lime) and 125 in the upper sun canopy, reached from a 30 m lift. Annual shoot segments were measured back to 2006 from bud-scale scars; breakage was inferred from snags and from departures from the expected branching.
  - **Annual shoot length, contact zone against sun canopy** (Table 3, sums for 2006–2010 divided by 5, [arith]):

    | Species | Sun canopy, cm/yr | Contact zone, cm/yr | Reduction |
    |---|---|---|---|
    | Beech | 20.4 | 18.1 | 11% |
    | Ash | 42.1 | 29.8 | 29% |
    | Hornbeam | 34.5 | 15.5 | 55% |
    | Lime | 19.3 | 13.6 | 30% |

    The text (p. 113) gives six-year sun-canopy means of 35 (ash), 29 (hornbeam), 17 (beech) and 16 cm/yr (lime), and calls the reduction largest in hornbeam (over 50%) and smallest in beech (about 22%; the table gives 11%). These are shoot lengths, not net advance of the crown edge, and the sun-canopy branches grew mostly upward, so the comparison is not lateral against lateral.
  - **Breakage, 2006–2011.** The abstract says more than half of the lateral branches of beech, hornbeam and lime broke at least once, and ash's thicker branches little. Fig. 3 (read from the figure, by neighbour species) agrees: beech 48–72% broken, hornbeam 65–82%, lime 50–80%, ash 15–50%. The Results text (p. 113) gives lower shares: 20–50% of beech laterals, 25–33% of hornbeam, 10–45% of lime, 14–25% of ash. I could not reconcile the two; the text's figures for beech, hornbeam and lime are close to the *unbroken* shares in Fig. 3. Multiple breaks were commonest in lime and hornbeam, most of all beside ash. Same-species pairs (beech–beech, ash–ash) had the least damage.
  - **Distance between crowns** (Table 2, laser scans; mean ± SE of the smallest gap): beech–ash 1.0 ± 0.3 m (n = 4 pairs; 12.2% of the stem distance), beech–hornbeam 0.6 ± 0.5 m (n = 7; 8.2%), beech–beech 0.2 ± 0.2 m (n = 5; 2.9%), beech–lime under 0.1 m (n = 3). Only beech–ash differs significantly from the others. The vertical contact zone is 2.9 m long beside ash and 4.8 m beside hornbeam.
  - **Light** (Fig. 4, p. 114). Shoot length in the contact zone was unrelated to canopy openness above the branch (hemispherical photographs, one summer, weighted by the sun's track) in beech, hornbeam and lime. In ash it rose with openness (R² 0.34 in the text, 0.36 on the figure; n = 14).
  - **Crown size of the study trees** (Table 1; equivalent diameter is [arith], 2·√(area/π)): beech 41.7 m² (7.3 m) at 42.2 cm DBH and 25.4 m tall (n = 58); hornbeam 69.5 m² (9.4 m) at 44.6 cm (n = 6); ash 28.1 m² (6.0 m) at 35.7 cm (n = 9); lime 24.6 m² (5.6 m) at 30.3 cm (n = 23).
  - **Their conclusion** (p. 115): branch sensitivity to damage and capacity to regrow decide canopy space more than resource competition does; growth continues unchecked until damage occurs. They add that in ash and hornbeam shoot length fell over the six years only in the contact zone, and that a darkening contact zone could explain that only for ash.
  - **Not in the paper:** any dependence of breakage or increment on tree size; anything about growth into space with no living neighbour.
- **Hossain & Caspersen (2012)**, *For. Ecol. Manage.*, [record](https://consensus.app/papers/details/4c50eb5be19b58a486350d9d1c61855e/?utm_source=claude_desktop) [abs]. Mature sugar maple (*Acer saccharum*), canopy lift. One third of twigs suffered dieback in one year, 1.41 cm on average. Percent dieback was higher within 3 m of another crown and rose with tree size; regrowth was slower in large trees and near neighbours.
- **Meng et al. (2006)**, *J. Ecol.*, [record](https://consensus.app/papers/details/4d1b7ade7bbc59d8a53d800d00d5616f/?utm_source=claude_desktop) [abs]. Lodgepole pine, 15 m tall, tethered in webs at 10 m so the crowns could not collide. Six years later crown cover had risen 14.4% in webbed plots and 2.1% in controls, with longer branches, "despite little change in light regime". A conifer, but it is the one manipulation.
- **Rudnicki et al. (2001)**, *Trees*, [record](https://consensus.app/papers/details/78a378b582c8504e9ef2aa992acef418/?utm_source=claude_desktop) [abs]: 65 collisions a minute per tree at a mean wind of 4.5 m/s in 15 m lodgepole pine. Rudnicki et al. (2004) and Fish et al. (2006) [abs]: crown closure falls as stands get taller and more slender; **crown radius reached a plateau by 8–10 m of stand height** although the spacing between boles kept widening.
- **Putz, Parker & Archibald (1984)**, *Am. Midl. Nat.* 112: 24–28 [abs]: in black mangrove, gap width correlates with the sway of the adjacent crowns (n = 22).
- **Onoda & Bando (2021)**, *Ecol. Res.* 36: 733–743, DOI 10.1111/1440-1703.12233 [abs]: wider shyness between broadleaved *Castanopsis* than between conifers; within *Castanopsis*, gap size rises with slenderness and falls with stem diameter.
- **Clatterbuck et al. (2024)**, *Forests*, [record](https://consensus.app/papers/details/6d3a1878b7ab54019d2cc7479cef793c/?utm_source=claude_desktop) [abs; MDPI refused the fetcher]: branch elongation was greater on the side of the crown not touching a neighbour for most deciduous species studied; preformed (determinate) buds are more durable than indeterminate ones.
- **van der Zee, Lau & Shenkin (2021)**, *Ann. Bot.* 128: 725–735, [DOI 10.1093/aob/mcab035](https://doi.org/10.1093/aob/mcab035) [abs; a PMC copy exists, PMC8557382, not read]: 3D crown complementarity from laser scans rises with slenderness (n = 14 trees).
- **Reading (ours).** Hajek's species order is usable: hornbeam loses most in contact (55%), beech least (11%), and ash does the damage. Abrasion acts only where a living neighbour is. It explains why living crowns do not merge, which the garden's light competition already achieves (occupancy note §3: 0.5–3.5% shared cells). It does not by itself stop a crown spreading into space a dead neighbour left. The part that would is the **size dependence**: dieback rising with tree size (Hossain & Caspersen 2012) and crown radius levelling off as trees get taller and sway more (Fish et al. 2006).

### 1.2 Lateral growth rates, and their decline with size

- **Hibbs (1982)**, *Can. J. For. Res.*, [record](https://consensus.app/papers/details/351345f01d10532cb707ec62f3a96e23/?utm_source=claude_desktop) [abs]. Hemlock–hardwood stand, Harvard Forest. Lateral growth of canopy trees into openings: **6–14 cm/yr by species, maximum 26**; red oak fastest. Tree reproduction fails in openings under about 0.5 × tree height across, because they close first.
- **Runkle & Yetter (1987)**, *Ecology*, [record](https://consensus.app/papers/details/c9d8df9bcdb4575591b90f273650da4b/?utm_source=claude_desktop) [abs]. 273 gaps in old-growth southern Appalachian forest, 1976–1983. **Mean crown extension 18 cm/yr**, with some crowns growing 4 m in 7 years. Saplings grew 30 cm/yr in height.
- **Hossain & Olson (2023)**, *Forests* 14: 1350, [DOI 10.3390/f14071350](https://doi.org/10.3390/f14071350) [FT; cited as Hossain & Caspersen in this note's first version, which was wrong].
  - **Site and sample** (pp. 3–4). Haliburton Forest, Ontario; single-tree selection, canopy 20–25 m. 31 gaps, 122 gap-border trees of 13–67 cm DBH: sugar maple 79, yellow birch 23, American beech 20. One branch per tree, the longest reaching into the gap, cut from a canopy lift; lateral growth is internode length corrected for angle, up to 10 years back. Mean branch length 3.0–3.4 m (SD 0.9–1.3 m); mean height 17.6–21.3 m (Table 1).
  - **Rates by species** (p. 5, Fig. 1), before → after gap formation: yellow birch 8.7 → 10.1 cm/yr (+16%, not significant), beech 5.2 → 7.1 (+39%), sugar maple 3.3 → 4.7 (+42%).
  - **Rates by size class** (Table 3; cm/yr, before → after; small 10–20 cm DBH, medium 21–30, large over 30):

    | Species | Small | Medium | Large |
    |---|---|---|---|
    | Yellow birch | 8.1 → 12.9 | 8.9 → 8.7 | 9.0 → 8.8 |
    | American beech | 3.4 → 8.0 | 6.2 → 6.6 | 6.1 → 6.6 |
    | Sugar maple | 2.8 → 6.4 | 3.6 → 3.7 | 3.7 → 3.9 |

    Only the small class changed significantly. Before release, small trees grew no faster than large ones, and slower in beech and maple.
  - **Against diameter after release** (Fig. 3, fitted points read from the figure): yellow birch about 16 cm/yr at 14 cm DBH falling to about 5.5 at 56 cm (R² 0.48); sugar maple about 7 at 14 cm falling to under 1 at 67 cm (R² 0.31). Beech's rate did not vary with DBH (p. 6). The change in rate falls with DBH in all three and crosses zero near 40 cm (Fig. 2, R² 0.25–0.36).
  - **What explains it** (Table 2, pp. 4 and 8). The best mixed model has species and DBH; adding branch length, height or gap light index worsens AIC by 5–27. The authors read this as no evidence for support costs or hydraulic limitation and as consistent with reproduction taking a growing share (they cite their own 2017 study of sugar maple at the same site, not read here). They also report that height and branch length failed their collinearity test against DBH, and say that with more independent variation "we might have observed" an effect of either.
  - **Reading (ours).** The data show that lateral growth after release falls with stem diameter in two of three species. They cannot say whether diameter, height, branch length or reproduction is the cause; the sample branches were also all about 3 m long. The abstract's "five times" is the small trees' absolute gain (about 5 cm/yr) against the large trees' (0–0.5).
- **Choi, Lorimer, Vanderwerker, Cole & Martin (2001)**, *For. Ecol. Manage.* 152: 235–258 [FT]. The CANOPY model.
  - **Data** (pp. 237–239). 63 plots in 15 northern hardwood stands, northern Wisconsin and Upper Michigan; 382 felled or cored subject trees aged 17–311 (30% over 100, 10% over 200); sugar maple, basswood, white ash. Crown radial increment ΔCR is the horizontal extension of the longest branch in each of four cardinal directions over the last 5–7 years, one value per tree (the mean of the exposed radii where any is exposed).
  - **Sugar maple equations** (Table 4; ΔCR in cm/yr, H in m, D in cm, natural logs; LCR = live crown ratio; EXPOS = 1 for a radius open to the sky or a gap, 0 if overtopped):
    - Eq. 22: ln ΔCR = 2.20 − 0.092·H + 1.33·LCR + 0.58·EXPOS (n = 168, R² 0.48);
    - Eq. 26: ln ΔCR = 2.12 − 0.036·D + 0.54·EXPOS (R² 0.38); with stocking, Eq. 25: 3.25 − 0.038·D − 0.007·%STOCKING + 0.40·EXPOS (R² 0.45);
    - Eq. 24: ln ΔCR = 2.06 − 0.17·CR − 1.19·RH + 1.29·LCR + 0.64·EXPOS (R² 0.34; CR = crown radius in m, RH = relative height);
    - Eq. 27, the best: ln ΔCR = 2.26 − 0.002·D·H + 0.919·LCR − 0.006·%STOCKING + 0.009·%ECA (R² 0.50; %ECA = percent of crown area exposed).
    - Basswood and white ash fit poorly (R² 0.16–0.49) with some counter-intuitive signs, which the authors put down to thrips dieback and correlated predictors.
  - **Eq. 22 evaluated** at the mean LCR of 0.47 [arith]: an exposed margin grows 12.0 cm/yr at H = 10 m, 7.6 at 15 m, 4.8 at 20 m, 3.0 at 25 m, 1.9 at 30 m; a shaded one 0.56 of that (e^−0.58). Eq. 26: 7.0, 3.4 and 1.6 cm/yr exposed at 20, 40 and 60 cm DBH.
  - **The form of the decline** (pp. 247–249, Fig. 3). Lateral growth is negatively correlated with height, crown radius, DBH and age alike; against age it is "best modeled using a negative power function", so the fall slows. Observed means: about 15 cm/yr for exposed margins on trees 10 m tall; under 5 cm/yr for canopy trees over 20 m and 40 cm DBH; about 3 cm/yr at 150 years and 2.3 cm/yr at 250. There is no age term in the equations: the decline enters through H and D.
  - **Means** (p. 247): 5.5–7.6 cm/yr across all crown classes by species. In intermediate-class sugar maples, exposed branches averaged 15.0 cm/yr (n = 60) and shaded ones 8.3 (n = 158); in dominants and codominants exposed and shaded did not differ.
  - **Crown radius against age** (Fig. 6b, pp. 251–252): simulated radius of a sugar maple canopy tree at 200 years is 5–7.5 m (shaded to exposed margin throughout life); the trend is nearly linear past 100 years and not asymptotic. Observed radii in old growth "seldom exceed 8 m".
  - **Gap closure** (pp. 254–255). No closure rate is simulated in this paper. A preliminary mapping gave gap-border crowns a mean of 9–10 cm/yr, slower than the rates reported further south (Hibbs; Runkle & Yetter). Their argument against a constant rate is arithmetic: a 100-year tree of 4 m crown radius growing 9 cm/yr would reach 13 m by 200 years, far beyond what is observed.
  - **Model rules worth noting** (p. 241). Each of four radii grows by the equation until it meets a competitor crown of similar height, which is treated as a solid barrier (field observation: little intertwining within a stratum); it resumes when the crown's widest part is above the competitor's top. Mortality is a logistic function of exposed crown area, DBH, relative height and canopy status (Dahir 1994; coefficients not given). Canopy trees live 200–250 years on average and few pass 350.
  - **Other trends.** Basal area increment does not fall with age; sugar maple DBH = 0.328·Age^0.94 (Fig. 2), about 25 cm at 100 years and 48 cm at 200 [arith].
  - **Not in the paper:** a crown-radius-on-DBH equation (the allometric fits are in the theses of Cole 1991, Singer 1995 and Choi 1998); mortality coefficients.
- **Lu et al. (2015)**, [record](https://consensus.app/papers/details/117232ad65165123ae0796655d334f6e/?utm_source=claude_desktop) [abs; journal not given in the record]. Twelve artificial gaps in a temperate secondary forest in north-east China, followed 7 years. Closure slows with gap age. By their fitted curves lateral growth lasts **11, 13 and 16 years** in small (68–125 m²), middle (174–321 m²) and large (514–621 m²) gaps and **leaves 12, 69 and 223 m² open**.
- **Bayer, Seifert & Pretzsch (2017)**, *Silva Fennica*, [article 7748](https://www.silvafennica.fi/article/7748) [OA]. Kranzberger Forst, Bavaria; beech 66 years and 26.6–27.6 m tall, spruce 56 years; three cut gaps of 32–84 m², laser-scanned 2006–2012; 12 beech and 10 spruce.
  - Beech crown projection area: 19.4 m² (2006) → 26.3 (2008) → 22.0 (2010) → 24.4 (2012). A burst, then a partial retreat.
  - Spruce: 14.3 → 17.8 m², steadily; spruce put its gain into stem diameter instead.
  - The beech gap's single-layer cover rose from 59% to 90% in six years.
  - No linear rates are given. [arith]: a mean beech crown of 19.4 m² is 5.0 m across at 66 years and 27 m tall, and 24.4 m² is 5.6 m, so about 5 cm/yr of radius over six years after release.
- **Schröter, Härdtle & von Oheimb (2012)**, *Eur. J. For. Res.*, [record](https://consensus.app/papers/details/c561c4f64b10586eb0fe8d4c5546e7e0/?utm_source=claude_desktop) [abs]. Old-growth beech, Serrahn, 2.8 ha. Crown centres are displaced from the stem base by a mean of **1.95 m** (0.37 of crown radius), away from neighbours within 12 m; plastic crowns give about 10% more canopy cover than circular ones would.
- **Roloff's shoot lengths (Innes 1998, in crown rounding §1.3)** [repo]: beech long shoots are up to 75 cm in young trees but generally 10–20 cm at 60–150 years.
- **Reading (ours).**
  - One internode in the core is one cell, 0.25 m. A real mature crown edge advances 0.24–0.72 internodes a season on average, and less as the tree ages.
  - The garden's young trees advance about 0.8–0.9 cells a season (40–45 cells wide at season 25), 20–22 cm/yr. Choi's exposed margins on 10 m sugar maples average 15 cm/yr with individual values to 40 (Fig. 3), so this is high but not outside the data.
  - The garden's dominants advance about 0.48 cells a season between seasons 50 and 100 (seed 2: width 46 → 94 cells, [arith]), 12 cm/yr. **Revised:** this is inside the gap-edge means of Hibbs and Runkle & Yetter and near yellow birch's 8.8–10 cm/yr, but 2–4× sugar maple and beech of canopy size: under 5 cm/yr above 20 m tall (Choi), 3.9 and 6.6 cm/yr for large released maple and beech (Hossain & Olson). Contact-zone beech in Hainich puts on 18 cm/yr of shoot before breakage (Hajek), so gross shoot length is not the constraint. The first version called 12 cm/yr inside the measured range without that qualification.
  - In the core's units Choi's sugar maple curve is 0.6 cells a season at 10 m tall, 0.2 at 20 m, 0.12 at 150 years and 0.09 at 250: a fall of five to six times, to a floor that is not zero.
  - What differs most is persistence. Real displacement toward a gap is of order 2 m (Schröter), real closure stalls after 11–16 years (Lu), and the rate falls with height and diameter (Choi) and, after release, with diameter (Hossain & Olson). The garden's survivor keeps 12 cm/yr for 50 seasons and gains 6 m of radius; Choi's exposed 200-year crown has a radius of 7.5 m in all.

### 1.3 Mechanical and hydraulic cost of long branches

- **Loehle (2016)**, *Trees*, [record](https://consensus.app/papers/details/f2241af318b95dc1ad42bafb57ef1cf6/?utm_source=claude_desktop) [abs]: torque on a branch is mass times moment arm, so "the need for support rises faster than branch length"; this breaks the pipe model's assumptions in large trees and limits crown width.
- **Sterck, van Gelder & Poorter (2006)**, *J. Ecol.*, [record](https://consensus.app/papers/details/742cbc2df27456c7b614ddb0ffa93e67/?utm_source=claude_desktop) [abs]: across 30 Bolivian rain-forest species (saplings), shade-tolerant species build a stable 1 m horizontal branch at lower cost and have wider crowns; light-demanders have weak, short branches at a high cost per unit of branch length.
- **Eloy, Fournier, Lacointe & Moulia (2017)**, *Nat. Commun.*, [record](https://consensus.app/papers/details/f822524e453b5a7ea751482fb73c53b4/?utm_source=claude_desktop) [abs]: the MECHATREE model. Trees that split photosynthate between seeds, new branches and reinforcing existing ones against wind loads, under light competition and with no hydraulics, evolve the observed branch allometries.
- **Jucker et al. (2025)**, *Nat. Commun.*, [record](https://consensus.app/papers/details/f9e912a7a58a58fe9c2f78beb0beab8e/?utm_source=claude_desktop) [abs]: 374,888 trees, 1,914 species. Height–diameter scaling is controlled mainly by water and light competition; **crown width "is predominantly shaped by exposure to wind and fire"** and covaries with traits for mechanical stability.
- **Lines et al. (2012)**, *Glob. Ecol. Biogeogr.*, [record](https://consensus.app/papers/details/cbb33d3b72395a59a7c1bdadf39c4f40/?utm_source=claude_desktop) [abs]: 700,000 Spanish inventory trees. Competition strongly shapes allometry, but trees are "far shorter than predicted by biomechanical models"; they point to hydraulic limits in dry and cold sites.
- **Against a branch-length cost, weakly:** Hossain & Olson 2023 (1.2) [FT] found that branch length and height added nothing to a model with stem diameter, but say themselves that the three were collinear. Choi et al. 2001 [FT] found crown radius the weakest of the size predictors of crown radial increment, behind height and diameter. Neither isolates branch length.
- **Hydraulic path length:** covered in crown rounding §1.2 and the turgor note. The sign that matters here: Ryan & Yoder expect the limit to bite at "the tips of very long branches" as well as the treetop; the turgor note found the measured gradients are dominated by gravity (height), which does not penalise a long low limb. No broadleaf measurement of extension against horizontal path length was found.

### 1.4 Apical control and branch autonomy

Nothing new beyond crown rounding §1.1 (Wilson 2000) and the turgor note (Sprugel 2002; Lacointe 2004; Hoch 2005). Apical control is weaker in old, slow-growing trees, which predicts *more* lateral freedom with age, not less; it is not a candidate limit on width.

### 1.5 Gap capture from below

- **Feldmann et al. (2018)**, *For. Ecol. Manage.*, [record](https://consensus.app/papers/details/9fff006dafe65396bbcad5e0ce80e421/?utm_source=claude_desktop) [abs]. Virgin beech forest, Slovakian Carpathians, 3,217 m of transect, 2003 and 2013. Gap fraction 13.6% → 8.2%, mean gap 261 → 96 m². Small gaps closed "within a few years through rapid horizontal canopy expansion of neighboring beech trees"; vertical ingrowth of lower layers was the dominant process in larger gaps.
- **Feldmann et al. (2020)**, *Forests*, [record](https://consensus.app/papers/details/a3082d798dd555b0913034d25cf02505/?utm_source=claude_desktop) [abs]: the threshold is about **100 m²**. Below it, regeneration is soon suppressed again by lateral closure; above it, saplings fill the gap.
- **Kucbel et al. (2010)**, *Eur. J. For. Res.* [abs]: the same split in an old-growth fir–beech forest; gaps and expanded gaps cover 11.3% and 37.9% of the area.
- **Krüger et al. (2024)**, *J. Ecol.*, [record](https://consensus.app/papers/details/64d8bd9a275951ac8ec3bb9ec6f3c04f/?utm_source=claude_desktop) [abs]: 11,331 gaps, 3,999 ha of unmanaged mountain forest, lidar 2009–2021. Regeneration ingrowth was the main mode of closure; **lateral crown expansion closed 20% of gap area**.
- **Reading (ours).** A real co-dominant's death is as likely to promote a tree from below as to widen its neighbours. In the garden the neighbours always win, because their lateral growth never stalls.

## 2. Calibration anchors

### 2.1 Crown width against stem diameter

Crown diameter in metres at a given DBH. Hemery and Tallo are forest-grown; Pretzsch's 95% quantile is the open-grown upper edge.

| Species | Tallo median (10–90%) at d ≈ 40 cm [repo] | Tallo median (10–90%) at the largest supported d [repo] | Hemery woodland mean at 40 / 60 cm [arith] | Pretzsch open-grown 95% at 40 / 60 cm [arith] |
|---|---|---|---|---|
| Oak (*Q. robur*, *Q. petraea*) | 7.4 (5.2–10.2) at 38 | 12.8 (10.4–16.6) at 75 | 8.0 / 11.1 | 9.6 / 13.4 |
| Beech | 8.0 (5.8–10.2) at 36 | 10.6 (8.4–13.6) at 54 | 7.2 / 10.3 | 11.5 / 13.9 |
| Hornbeam | 11.6 (8.0–15.8) at 39 | the same (support ends at 39) | not in the paper | 12.6 / 15.8 |
| Birch (*B. pendula*) | 8.0 (6.2–9.8) at 39 | 10.8 (8.8–12.0) at 52 | 7.4 / 10.7 | 8.3 / 10.8 |
| Field maple | 7.6 (5.4–9.2) at 40 | 9.0 (6.6–10.4) at 54 | not in the paper | not in the paper |
| Sycamore | 7.8 (5.4–10.4) at 41 | 10.0 (6.4–13.2) at 58 | 8.2 / 11.9 | 9.2 / 11.4 |

- **Tallo** (Jucker et al. 2022, *Glob. Change Biol.*, DOI 10.1111/gcb.16302): the numbers are 2 × the crown-radius quantile curves already fitted in `analysis/fit/sources/tallo-level0-curves.csv` (n = 3,522 beech, 542 oak, 1,034 hornbeam, 261 birch, 154 field maple, 440 sycamore). The paper itself was not re-read.
- **Hemery et al. 2005** and **Pretzsch et al. 2015**: computed from the coefficients in crown rounding §3 (K = a + b·d; cr = exp(a)·d^α). Hemery's line is most reliable at 20–50 cm.
- **Hornbeam is the widest-crowned of the set at a given diameter** in both Tallo and Pretzsch (Pretzsch's "large crown" type, with beech and lime).
- **What the bar's 10 m means.** A 10 m crown is the forest-grown median at about 50–60 cm DBH (40 cm for hornbeam). The garden's dominants at 12.5–19 m match the Tallo median to 90% range only for oak at 75 cm DBH. Whether that is wrong depends on the simulated trees' DBH, which the probe notes do not report. **The comparison should be made at matched DBH**, not as a single width.
- **The open-grown ceiling.** The garden's lone hornbeam, 29–38 m wide at season 100, is about twice Pretzsch's open-grown envelope at 60 cm DBH (15.8 m).
- **Hainich canopy trees** (Hajek et al. 2015 [FT], Table 1; laser-scanned, 90–120 years, 24–26 m tall): beech 7.3 m at 42 cm DBH, on Hemery's line (7.2 m at 40) and inside Tallo's range; hornbeam 9.4 m at 45 cm (n = 6), below Tallo's hornbeam median (11.6 m at 39) and wider than the beech beside it; ash 6.0 m at 36 cm; lime 5.6 m at 30 cm. Equivalent diameters from crown projection area [arith].
- **Sugar maple by age** (Choi et al. 2001 [FT], Fig. 6b): crown radius 5–7.5 m at 200 years (10–15 m across, at a DBH near 48 cm by their age curve [arith]); old-growth radii seldom over 8 m. A North American species, but the only age series found.
- **Not obtained:** Hasenauer (1997), *For. Ecol. Manage.* 96: 197–206, [record](https://consensus.app/papers/details/0a23d1523fca5add92ded1d6f4ac9587/?utm_source=claude_desktop) [abs]: 435 open-grown trees of 11 species in Austria, with crown-width equations; closed access, coefficients not seen. Pretzsch et al. 2015's 50% and 5% quantile coefficients (average and suppressed trees) are in the paper and not in our notes.
- **Stand effects on crown width** [abs]: crown width at a given DBH rises with dominant height and falls with slenderness, crown-base height and competition (Sharma et al. 2016, beech and spruce, Czech plots); shade-tolerant species widen in mixture and light-demanders narrow (Buchacher et al. 2020, Austrian inventory, about 8,900 trees).

### 2.2 Canopy trees per hectare

- **Crown packing** [arith]. If canopy crowns tile the ground once with no overlap, N = 10⁴ / (π/4 · K²). From Hemery's woodland lines:

  | Mean canopy DBH | Oak: K, N/ha | Beech: K, N/ha |
  |---|---|---|
  | 30 cm | 6.4 m, 311 | 5.7 m, 392 |
  | 40 cm | 8.0 m, 200 | 7.2 m, 244 |
  | 50 cm | 9.5 m, 140 | 8.8 m, 166 |
  | 60 cm | 11.1 m, 104 | 10.3 m, 121 |

  Real canopies are not a perfect tiling (shyness gaps lower N; plastic, non-circular crowns raise cover by about 10%, Schröter 2012), so read these to within about 20%.
- **Hornbeam yield table** (Lockow & Lockow 2009, north-east German lowlands; `analysis/fit/sources/hornbeam_yield_table_lockow2009.csv`) [repo]. Remaining stand, a managed (thinned) table, all stems:

  | Site index (top height at 100, m) | N/ha at 60 | at 80 | at 100 | at 120 | at 160 | Mean DBH at 100 (cm) |
  |---|---|---|---|---|---|---|
  | 32 | 423 | 271 | 207 | 175 | 144 | 35.9 |
  | 30 | 546 | 345 | 260 | 217 | 176 | 32.5 |
  | 28 | 721 | 449 | 335 | 277 | 221 | 29.1 |
  | 26 | 978 | 600 | 443 | 363 | 288 | 25.7 |

- **Unthinned, fully stocked stands** (Pretzsch & Biber 2005 [FT]; all living stems; section 4 has the arithmetic): the self-thinning line gives beech about 530/ha at a quadratic mean diameter of 30 cm, 320 at 40, 210 at 50, 150 at 60; oak 460, 310, 220, 170. Last surveys of the nine beech plots (Table 1): 269–840/ha at 27–44 cm and 104–162 years. Beyond 44 cm (beech) and 33 cm (oak) the line is extrapolated.
- **Old-growth:** Uholka has 435 trees/ha ≥ 6 cm DBH in three layers, of which 10/ha are ≥ 80 cm (regeneration note §3) [repo]. The number in the upper canopy layer alone was not found.
- **What it means for the bar.** ≥ 120 canopy trees/ha is right for a canopy of mean DBH 55–60 cm, a stand well past 100 years. At a top height of 26–32 m and age 100 a managed hornbeam stand holds 200–450. On Pretzsch & Biber's lines 120 stems/ha is reached at a mean diameter of 69 cm (beech) or 78 cm (oak) [arith], beyond any plot in their data; their unthinned beech still held 269–650/ha at 136–162 years. The bar is not too high; it is the low end.

### 2.3 Lateral expansion rates

Collected in 1.1 and 1.2:

- **Gap-edge means, North American hardwoods:** 6–14 cm/yr (max 26; Hibbs) and 18 cm/yr (Runkle & Yetter), both [abs]; 9–10 cm/yr for gap-border crowns in northern hardwoods (Choi, preliminary).
- **By species, branch reaching into a single-tree gap** (Hossain & Olson [FT]): yellow birch 8.7 → 10.1 cm/yr, American beech 5.2 → 7.1, sugar maple 3.3 → 4.7 (before → after release). By size after release: small trees (10–20 cm DBH) 6.4–12.9, large (over 30 cm) 3.9–8.8.
- **Against tree size, sugar maple, exposed margin** (Choi [FT], Eq. 22 at LCR 0.47): 12.0, 4.8 and 1.9 cm/yr at 10, 20 and 30 m of height; observed about 3 cm/yr at 150 years and 2.3 at 250. Shaded margins 0.56 of these.
- **European shoot lengths in the canopy** (Hajek [FT], gross, before breakage): contact zone beech 18, hornbeam 16, lime 14, ash 30 cm/yr; sun canopy 20, 35, 19, 42.
- **Net, European beech:** about 5 cm/yr of radius for 66-year beech after release ([arith] from Bayer 2017).
- **Persistence:** lateral closure lasting 11–16 years (Lu); a mean crown displacement of 1.95 m in old beech (Schröter).
- Still no net crown-edge rate in cm/yr for European oak, hornbeam or birch.

## 3. How other models keep crown widths and densities realistic

| Model | Crown width | Stand density | Source |
|---|---|---|---|
| **PPA** (perfect plasticity approximation; Purves et al. 2008) | **Imposed:** a flat-topped crown of radius proportional to DBH (crown area π(φ·dbh)²), species-specific φ | Emergent from canopy and understorey growth and mortality rates. Trees taller than Z* are in the canopy; Z* is set so that sun-exposed crown area does not exceed ground area | [PMC] PMC2579370; parameter tables are in the supplement, not seen |
| **ITD** (ideal tree distribution; Purves, Lichstein & Pacala 2007) | **Imposed potential, emergent realised:** a potential crown radius by species and DBH (radii at 0 and 40 cm DBH; R40's 90% range 1.72–7.96 m across species, 2.54–5.63 m for the 30 commonest), trimmed at Z* | Not a dynamic model; predicts canopy status and crown depth for 147,995 trees on 6,675 US inventory plots | [PMC] PMC1964803, [DOI 10.1371/journal.pone.0000870](https://doi.org/10.1371/journal.pone.0000870) |
| **SORTIE** | **Imposed, rigid:** crown radius from DBH. Purves et al. 2007 note that SORTIE's rigid crowns predict "extensive interdigitation between adjacent crowns" | Emergent from light-dependent growth and growth-dependent mortality | Purves 2007 [PMC] for the remark; SORTIE-ND's own manual could not be reached (certificate error), so its equations are [mem] |
| **TASS / crown-shyness model** (Goudie, Polsson & Ott 2009) | **Imposed maximum:** potential crown area is a Voronoi polygon "constrained by estimates of maximum crown width"; observed area is an empirical fraction of it | Lodgepole pine; adding shyness raised below-canopy light by 0.07–0.11 | [abs] |
| **CANOPY** (Choi et al. 2001) | **Empirical increment, no imposed maximum:** four crown radii each grow by a regression on tree height (or D, or D·H), live crown ratio, stocking and exposure (sugar maple R² 0.45–0.50). The rate falls with size, so radius reaches 5–7.5 m at 200 years. A radius stops at a competitor crown of similar height (a solid barrier) and resumes once the tree overtops it | Emergent from a logistic mortality on exposed crown area, DBH and relative height; no regeneration. Stand basal area peaks at 34–40 m²/ha | [FT]; section 1.2 |
| **Yang & Liu (2026)**, "Growing a stand, not a tree" | **Imposed target:** each crown grows toward an open-grown radius R_i in 24 sectors. A sector freezes on entering a neighbour's crown (occupancy) and then dies back by a fraction β of its length (abrasion): β 0.06 from their mechanism gate, 0.16 calibrated to a field median | Stems are given. Occupancy alone leaves no gap (+0.03 m); with die-back, 0.36–0.42 m | [arXiv 2608.28692](https://www.alphaxiv.org/abs/2608.28692), read in full; 2.5D, validated on 23 trees of one tropical oak forest |
| **MECHATREE** (Eloy et al. 2017) | **Emergent** from a wind-load reinforcement cost and light | Evolved on a virtual island | [abs] |
| **LIGNUM** (Sievänen et al. 2018) | **Emergent:** extended Borchert–Honda on light and position plus local density control | Fitted to scanned Scots pine | turgor note [repo, abs] |
| **Pałubicki et al. 2009** | **Emergent** from markers or shadow propagation; no crown-width check | None reported | simulators note [repo] |
| **Makowski et al. 2019** | **Emergent** between module prototypes | Checked: logistic biomass, the −3/2 self-thinning law, H–D against Eloy 2017. No crown-width or canopy-count check | simulators note [repo] |

- **Purves et al. 2008's finding on what sets canopy composition:** late-successional species win "primarily attributable to lower understory mortality", not faster growth [PMC]. Their model predicted the basal area of 100-year stands "to within a few percent" from individual-level parameters.
- **Reading (ours).** No published self-organising bud model that we found demonstrates realistic crown width at stand scale. Every model with a validated stand imposes a diameter-dependent potential crown. The emergent alternative with evidence behind it is a cost that grows with branch size (MECHATREE). Forest gap models (JABOWA, FORMIND) were not read; from memory they also derive crown diameter from DBH [mem].

## 4. Self-thinning: is 2,500/ha to under 100/ha by "age 100" too fast?

- **The self-thinning line.** Pretzsch & Biber (2005), *For. Sci.* 51(4): 304–320 [FT].
  - **Data** (Table 1, pp. 306–308). 28 unthinned, fully stocked pure stands in Germany ("A-grade" plots: only dead and dying trees removed), some surveyed since 1870: 9 beech (119 surveys, ages 38–162, 11,242 → 269 stems/ha, quadratic mean diameter 5.7–43.6 cm), 9 Norway spruce, 6 Scots pine, 4 sessile oak (33 surveys, ages 48–132, 1,676 → 457/ha, 13.4–33.2 cm; a planted beech understorey is ignored). N is all living stems per hectare; d is the diameter of the stem of mean basal area, in cm.
  - **Slopes** of ln N = a + b·ln d, pooled per species (Table 3, bootstrapped 95% limits): **beech −1.789** (−1.877 to −1.706), spruce −1.664, pine −1.593, **oak −1.424** (−1.627 to −1.184). Beech differs from all others.
  - **Intercepts** (Table 2, means of the per-plot fits, natural logs): **beech 12.359** (plots 11.866–13.179), spruce 12.499, pine 11.508, **oak 10.984** (10.317–11.603). The paper's own species lines (Fig. 4, p. 314) pair these mean intercepts with the pooled slopes, and so do I. They are mean lines through fully stocked stands, not upper envelopes.
  - **Maximum stand density index** (p. 309), the largest N·(25/d)^b a plot reached, stems/ha at d = 25 cm: beech 796–1,013 (mean 885), oak 672–854 (mean 758), spruce 1,246–1,549, pine 590–972.
  - **Stems per hectare at a given diameter** [arith]. Line: N = exp(a + b·ln d). Envelope: N = SDI_max·(d/25)^b with the mean SDI_max.

    | d (cm) | ln d | Beech: 12.359 − 1.789·ln d | Beech N/ha, line | Beech N/ha, envelope | Oak: 10.984 − 1.424·ln d | Oak N/ha, line | Oak N/ha, envelope |
    |---|---|---|---|---|---|---|---|
    | 20 | 2.996 | 7.000 | 1,096 | 1,319 | 6.718 | 827 | 1,042 |
    | 30 | 3.401 | 6.274 | 531 | 639 | 6.141 | 464 | 585 |
    | 40 | 3.689 | 5.760 | 317 | 382 | 5.731 | 308 * | 388 * |
    | 50 | 3.912 | 5.360 | 213 * | 256 * | 5.413 | 224 * | 282 * |
    | 60 | 4.094 | 5.034 | 154 * | 185 * | 5.154 | 173 * | 218 * |

    \* extrapolated beyond the data (beech to 43.6 cm, oak to 33.2 cm). Checks against Table 1's last surveys: beech 269/ha at 43.6 cm (line 272), 400 at 36.0 cm (line 383); oak 457 at 33.2 cm (line 402), 514 at 30.9 cm (line 445). Growing space per tree, 10⁴/N on the line: beech 19 m² at 30 cm, 32 at 40, 65 at 60; oak 22, 32, 58.
  - **Mortality rates.** The paper gives none in %/yr. It gives the period ratio r = ln(N₂/N₁) / ln(d₂/d₁) (Table 4): mean −1.69 for beech (range −2.87 to −0.75), −1.47 spruce, −1.38 pine, −1.23 oak (−2.51 to −0.01), over survey periods of 6–7 years in which mean diameter rose 12.8% (beech) and 10.5% (oak) (p. 314). From those [arith]: beech loses 1 − 1.128^−1.69 = 18% of stems per 6.74-year period, 3.0%/yr; oak 1 − 1.105^−1.23 = 12% per 6.19 years, 2.0%/yr. These are averages over whole series weighted to the young, dense decades. Whole-series checks from Table 1: beech HAI 27/1, 6,533 → 269 in 124 years, 2.6%/yr; oak WAL 88/2, 1,676 → 514 in 55 years, 2.1%/yr. The same two plots grew 0.30 and 0.32 cm/yr in mean diameter; at 0.3 cm/yr the lines imply 1.8%/yr at 30 cm and 1.3%/yr at 40 cm for beech, 1.4% and 1.1% for oak.
  - **Pattern** (pp. 314–316): beech thins fast and steadily (r varies by 26%), oak holds density and then dies "in waves" (67%). The authors link beech's low self-tolerance to its wider and more dynamic lateral crown extension.
  - Pretzsch (2005, *Oecologia*), "Species-specific allometric scaling under self-thinning" [abs]: self-tolerance oak > spruce > pine > beech; efficiency of space occupation beech > pine > spruce > oak.
- **Other lines** [abs]: slopes of −1.5 to −2.0 across 15 Austrian species, with broadleaves' potential density "considerably lower" than conifers' (Vospernik & Sterba 2015, [DOI 10.1007/s13595-014-0433-x](https://doi.org/10.1007/s13595-014-0433-x)); a concave line for 7 of 11 French species, meaning self-tolerance falls with stand development (Charru et al. 2012, [DOI 10.1007/s13595-011-0149-0](https://doi.org/10.1007/s13595-011-0149-0)); in Slovenian uneven-aged stands maximum density differs significantly between beech- or spruce-dominated types and other broadleaf mixtures such as sessile oak with hornbeam, and the line's intercept and slope rise with the share of beech (Trifković et al. 2023).
- **Rate** [arith].
  - Garden: 22 canopy trees at season 25 to 3–7 at season 100 is 1.5–2.7%/yr; 22 → 12–16 over seasons 25–50 is about 1.8%/yr.
  - Lockow's hornbeam table, site index 30: 1,271 → 546 → 260 → 176/ha at 40, 60, 100, 160 years is 4.2%, 1.9% and 0.65%/yr (thinnings included).
  - On a line of slope −1.6, a stand growing 0.35 cm/yr in mean diameter loses 1.9%/yr at 30 cm and 1.1%/yr at 50 cm (the increment is my assumption).
  - Pretzsch & Biber's unthinned plots average 3.0%/yr (beech) and 2.0%/yr (oak) over their whole series, and about 1.1–1.8%/yr at mean diameters of 30–40 cm (above).
  - So about 2%/yr is a normal pole-stage rate. The full text confirms this part of the first version.
- **Against the self-thinning line** [arith from the table above; the garden numbers are from the levers note].
  - **Start.** 2,500 stems/ha meets the line at d = exp((12.359 − ln 2,500)/1.789) = 12.6 cm for beech and exp((10.984 − ln 2,500)/1.424) = 9.2 cm for oak. Below that diameter a stand planted at 2,500/ha is under-stocked and should lose trees only to chance and to overtopping, not to density. The real plots were far denser when young: 5,146–11,242/ha at 5.7–8.6 cm and 38–49 years (beech).
  - **Season 25.** 16–22 canopy trees on 0.064 ha is 250–344/ha. On the line that is a beech stand of 38–46 cm mean diameter, or an oak stand of 37–46 cm. The beech plots reached 34–44 cm at 136–162 years.
  - **Season 100.** 3–7 canopy trees is 47–109/ha, which the lines reach at 73–116 cm (beech) and 83–150 cm (oak), far outside the data. At 104–114 years the unthinned plots held 755–840/ha (beech, at 27–28 cm) and 457–514/ha (oak, at 31–33 cm): 4 to 18 times the garden's canopy count.
  - **Two cautions.** The line counts every living stem, the garden's figure only canopy trees; in an even-aged unthinned stand most survivors are in the canopy, but not all. And the comparison needs the simulated quadratic mean diameter and the count of all living trees, which the probe notes do not report. If season 25's canopy trees are 10–15 cm in diameter, the garden is 3–10× below the line while still thinning.
- **Level against the managed table** [arith]. At season 25 the garden has 340 canopy trees/ha, a density the hornbeam table reaches at age 80. At season 100 it has 47–109/ha where the table has 207–443 at 100 years and still 144–288 at 160. The garden's stand is about 50–75 years "ahead" in density, and its end state is below any age in the table.
- **Mortality of established canopy trees** [abs].
  - Stand-level annual mortality in unmanaged European forests: a median of 1.1% across 299 reserves (Idoate-Lacasia et al. 2025); 1.5% long-term in Swiss plots (Etzold et al. 2019); 0.5–2.1% in Hessian beech stands, the higher values "largely confined to suppressed trees" (Meyer et al. 2022); 0.7–2.5% in old-growth sites (Woods et al. 2021). These count all stems and are dominated by small ones.
  - By size: mortality is U-shaped in beech and hornbeam, with "medium-sized trees [having] the highest chance of survival"; small trees die standing or crushed, very large ones by uprooting and snapping (Holzwarth et al. 2013, 28 ha, Hainich, more than 13,000 trees, [DOI 10.1111/1365-2745.12015](https://doi.org/10.1111/1365-2745.12015)). Oak and beech mortality falls with DBH; oak's rises with stand basal area, beech's does not (Rohner et al. 2012, Swiss reserves, 17,600 trees).
  - No per-class rate for co-dominants was found in an abstract. From the above, a rate well under 1%/yr for medium-to-large canopy trees is the supported order of magnitude; the garden's canopy class loses about 2%/yr from season 50 to 100.
- **Mixed beech–hornbeam regeneration:** mortality begins at a relative density of 0.5 in mixed beech–hornbeam against 0.29 in pure beech (Le Goff et al. 2025, bioRxiv preprint [abs]): the mixture tolerates crowding longer before it starts to thin.
- **Verdict (revised with the intercepts).** Too early, and to too low a level; not too fast as a rate. By season 25 the garden has already gone from 2,500/ha to a canopy density that fully stocked beech and oak reach at about 40 cm mean diameter and 140–160 years, and a stand planted that thinly should not be self-thinning at all before 9–13 cm. From there it continues at an ordinary 2%/yr to a density no plot in the data approaches. The first version put the season-100 shortfall at 2–5× from the managed hornbeam table; against unthinned stands of the same age it is 4–18×, with the canopy-against-all-stems caution above. All of it follows from crowns that are too wide for the stem's size at every stage, which is what Pretzsch & Biber's growing space says too: 19–22 m² a tree at 30 cm, a crown about 5 m across.

## 5. Candidate mechanisms for this simulator, ranked

**A measurement to make before any of them** (no rule change): from existing runs, the crown-edge radial rate (cells per season) against tree age and DBH, for the lone hornbeam and for a stand survivor; the stand's quadratic mean diameter and count of all living trees by season, to place it on Pretzsch & Biber's line (section 4); and crown width against DBH beside the Tallo quantiles in `tallo-level0-curves.csv`. Section 1.2 predicts the early rate is plausible and the late rate is the fault. If instead the simulated DBH is very large for the age, the fault is in girth, not width.

### 1. A sink limit on extension that grows with the tree's size, read locally as path length (probe first)

- **Local rule.** A shoot's extension this season is scaled by g(L), where L is the bud's path length from the root collar (the core already carries it for R1's exp(−L/L_h)). For example g = 1 / (1 + (L/L_x)^k), applied to the number of metamers a bud may add, or as the chance that it extends at all. It acts at the tip, after allocation: the turgor note's "sink limit", not a change to what C3 allocates on.
- **Params.** L_x (cells) per species, a steepness k, and (revised) a floor g_min, because the measured rate levels off and does not reach zero.
- **Evidence.** Lateral rates of exposed crown margins fall five- to sixfold with tree size and then hold at 2–3 cm/yr (Choi 2001 [FT]); after release they fall with stem diameter in sugar maple and yellow birch, not in beech (Hossain & Olson 2023 [FT]); lateral closure stalls after 11–16 years (Lu 2015); mature beech long shoots are 10–20 cm (Innes 1998); crown radius levels off with stand height (Fish 2006).
- **Is path length a defensible variable? (revised)** As a mechanism, no; as a local proxy for tree size, yes, with one variant ruled out.
  - What the two full texts support is a decline with **whole-tree size**. Choi's best single predictor is height, then diameter, and the best equation uses D·H; Hossain & Olson's is diameter. Height, diameter, age and branch length are collinear in both, and neither separates them. Hossain & Olson's attribution to reproduction is a hypothesis; the simulator has no reproductive sink to carry it.
  - **Branch length as such has the least support:** crown radius is Choi's weakest size predictor, and Hossain & Olson found nothing for branch length (on branches that were all about 3 m). So the from-the-trunk variant offered in the first version, which penalises reach alone, is withdrawn as a first choice.
  - **Path length from the root collar** is height plus reach. In a stand tree it is mostly height, so it tracks Choi's Eq. 22, and it is the one size measure a bud can read locally. It should be presented as that, not as hydraulics: Ryan & Yoder's long-branch-tip limit was not confirmed by either paper.
  - **The alternative the data fit as well** is a whole-tree signal: scale every bud's extension by a function of the tree's basal girth or height (an ontogenetic or reproductive sink). It is simpler to calibrate against Choi's Eq. 26 or 27 and does not cap height by the same term, but it is not local and it cannot make a low limb stop before the leader does.
- **Calibration.** The rate first (Choi's sugar maple, exposed margin): 0.6 cells a season at 10 m of height, 0.2 at 20 m, about 0.1 from 150 years on; a shaded margin 0.56 of that. Species spread from Hossain & Olson: birch about twice maple, beech about 1.5× maple. Then the open-grown envelope: Pretzsch's 2·cr at 40 and 60 cm (oak 9.6 / 13.4 m, beech 11.5 / 13.9, hornbeam 12.6 / 15.8, birch 8.3 / 10.8). Then the stand: Tallo medians at matched DBH, and a released crown edge gaining about 2 m, not 6.
- **Expected effect.** Bounds the lone crown, which nothing does now. In the stand, a survivor's spread into vacated space stalls, so gaps of a crown's size stay open long enough for sub-canopy trees and recruits to take them (1.5): more, narrower canopy crowns. It should also help the phone width, where one crown now spans the ring.
- **Risks.**
  - It overlaps R1's L_h (the height plateau) and the crown-rounding work's path-length candidate (#83). Path length from the root also caps height; the from-the-trunk variant avoids that but has the least evidence (above). A floor g_min limits the damage to height.
  - The calibration rates are sugar maple's, a shade-tolerant North American species; beech showed no size decline in Hossain & Olson's sample of 20.
  - Oak's crown radius keeps rising with girth (α_cr 0.816), so oak needs a longer L_x or it loses its long limbs.
  - Lone-tree fits (W/H, the open-grown box) and the goldens move.
  - It contradicts nothing in the spec that I know of, but it is a new C1/C3 term and needs an ADR.

### 2. Size-dependent tip die-back at the crown periphery

- **Local rule.** Each season an exposed peripheral shoot tip loses its last metamer with a probability that rises with the tree's height (sway) and with a neighbour's foliage within about 3 m (12 cells). O2's abrasion and `pTerm` are the nearest existing pieces; the new part is the dependence on the tree's own size, which acts even where the neighbour has died.
- **Params.** A base probability, a height scale, the neighbour radius.
- **Evidence.** A third of twigs die back each year in mature sugar maple, more in larger trees and within 3 m of a crown (Hossain & Caspersen 2012); about half or more of contact-zone laterals broken in six years in beech, hornbeam and lime, and contact-zone shoots 11% (beech) to 55% (hornbeam) shorter than sun-canopy ones (Hajek 2015 [FT]; its text and figure disagree on the breakage shares); the tethering experiment (Meng 2006); Yang & Liu's β of 0.06–0.16 of sector length per contact; CANOPY treats a neighbour's crown as a solid barrier (Choi 2001 [FT]). Hajek gives a species order for a per-species parameter: hornbeam and lime fragile, beech intermediate, ash robust and damaging.
- **Expected effect.** Lowers net lateral growth in a closed canopy and opens shyness gaps of 0.2–1.0 m. On the canopy count, small unless the size term is strong: the levers note's b1 (O2 on) changed nothing, and the occupancy note explains why (contact rules cannot see vacated space).
- **Risks.** Ragged outlines; a random draw per tip per season (a new RNG purpose); the size term has one source, in one North American species.

### 3. A support cost that rises faster than branch length

- **Local rule.** A limb's maintenance or its C5 shedding threshold grows with its length (torque ∝ mass × lever arm), so a limb is kept only while its own foliage pays for it. R1's wood cost (m_w·π·r²·l) is linear in length and charged to the whole tree; this would be charged to the limb and be superlinear.
- **Params.** A cost exponent and a per-limb coefficient, perhaps by wood density.
- **Evidence.** Loehle 2016; Sterck et al. 2006; Eloy et al. 2017 (the one emergent model with matching allometry); Jucker et al. 2025 (crown width covaries with mechanical-stability traits). Against: Lines et al. 2012 (trees far from the biomechanical limit); Hossain & Olson 2023 and Choi et al. 2001, where branch length or crown radius explained least (both confounded with size).
- **Expected effect.** Bounded limb length with a species difference that follows from wood traits. Effect on the canopy count similar in kind to mechanism 1, slower to appear.
- **Risks.** It lands in C5/R1 shedding, which STATUS lists as fog; it may shed the open-grown oak's massive limbs; branch autonomy is only partly supported (turgor note).

### 4. Demography timing (complementary; not a crown rule)

- **Rule.** None new: O4's suppression signal and thresholds, so that medium and large canopy trees die at well under 1%/yr and overtopped ones linger.
- **Evidence.** Section 4: U-shaped mortality with a minimum at medium size; stand-level rates of 0.5–2%/yr carried by small stems; the hornbeam table's densities; Pretzsch & Biber's lines, on which 2,500/ha should not self-thin before 9–13 cm of mean diameter.
- **Expected effect.** More canopy trees at season 100. The levers note already found the size of it: θ_q 0.15 took 47 to 78–94/ha, not to 120, and the survivors' crowns were as wide.
- **Risks.** Without a crown limit it only delays the same end state.

**Which first, and why.** Unchanged by the four full texts: mechanism 1, after the measurement above, but as a size limit with a floor and not as a branch-length or hydraulic limit. Choi's equations are the first direct evidence in this note that such a decline is large (five- to sixfold), and they give its shape. The lone hornbeam is already twice the open-grown envelope, so the missing limit is inside the tree, and only mechanism 1 (and, more slowly, 3) acts there. It is local, it reuses a quantity the core already tracks, and it has direct numerical anchors for both the lone tree (Pretzsch) and the stand (Tallo at matched DBH, the 2 m gap displacement). Mechanisms 2 and 4 are then small adjustments on a stand whose crowns have a ceiling.

## 6. Gaps and sources that could not be accessed

- **Since read in full from PDFs the user supplied (2026-11-11):** Hossain & Olson 2023, Choi et al. 2001, Hajek et al. 2015, Pretzsch & Biber 2005. The PDFs are not in the repository.
- **Refused the fetcher (bot walls or 403):** MDPI (Clatterbuck et al. 2024; Pretzsch 2019); ScienceDirect (Pretzsch 2014 on canopy space filling in mixtures); HAL (Charru et al. 2012's per-species self-thinning table); the TUM chair's archive (Pretzsch 2006).
- **Paywalled, abstract only:** Vospernik & Sterba 2015 (per-species maximum density); Hasenauer 1997 (open-grown crown-width equations); Holzwarth et al. 2013 (mortality by size, bronze open access on Wiley, which blocks fetching); Hibbs 1982; Runkle & Yetter 1987; Feldmann et al. 2018; Schröter et al. 2012.
- **What the four papers did not give:**
  - Choi: crown radius against DBH; the mortality equation's coefficients; any simulated gap-closure rate.
  - Hossain & Olson: a test that separates diameter from height, branch length or reproduction; rates beyond three North American species.
  - Hajek: net crown-edge advance (only gross shoot length); breakage against tree size; a consistent breakage share (text against figure); oak.
  - Pretzsch & Biber: annual mortality rates (derived here); mortality by crown class; hornbeam or birch; oak above 33 cm and beech above 44 cm of mean diameter.
- **Not found:**
  - oak and beech yield-table stem numbers by age (Schober 1967/1975; Jüttner 1955; the NW-FVA 2024 tables). The CRAN package `et.nwfva`, which the species-traits note used, holds them, but R is not installed here;
  - canopy-layer tree counts per hectare for mature mixed oak–beech–hornbeam stands or reserves (only all-stem counts);
  - net lateral crown expansion in cm/yr for European oak, hornbeam or birch (Hajek gives gross shoot lengths for hornbeam, beech, ash and lime);
  - any measurement of shoot extension against horizontal path length in a broadleaf, or any study where branch length varies independently of tree size;
  - the simulated stand's quadratic mean diameter and all-stem count, without which section 4's comparison is against canopy counts only;
  - Hossain, Caspersen & Thomas 2017, *Trees* 31: 1179–1188, on reproductive cost against branch extension in sugar maple, which is the evidence behind the reproduction reading;
  - annual mortality of co-dominant canopy trees as a class.
- **Not read although open:** van der Zee et al. 2021 (PMC8557382); Jucker et al. 2022's own text (PMC9542605); Jucker et al. 2017's H × crown-diameter allometry (PMC6849852); SORTIE-ND's manual (certificate error); the forest gap-model literature.
- **Tool caveat.** The [PMC] and [OA] readings came through a summarising fetcher, not the raw text. Numbers quoted from them should be checked against the paper before they become fit targets.
- **Cheapest next step.** Done for the four PDFs (see the Revision). Next is the measurement in section 5, from existing runs: crown-edge rate against height and DBH beside Choi's Eq. 22, and the stand's N against quadratic mean diameter beside Pretzsch & Biber's lines.
