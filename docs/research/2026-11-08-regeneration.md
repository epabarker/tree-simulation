# Regeneration: first seed, seedling density and the look of a mature stand

_2026-11-08. Wayfinder ticket #76 (map #73; blocks #85)._ Question: for the garden's species, when does each first seed, how dense is regeneration under a closed canopy and in gaps, how fast do suppressed seedlings die, and what stem densities and age structures make a mature broadleaf woodland look as it does from the side?

Not repeated here: shade tolerance, floor light and sapling survival light (Hagemeier & Leuschner 2019) are already in [`2026-10-28-species-traits.md`](2026-10-28-species-traits.md). Seed rain itself is ADR 0018.

**How to read the evidence.** Each number below was read in the source named, except where marked _(snippet)_: seen only in a search-result summary, not in the paper, so check before relying on it. Where I could not find a primary number I say so rather than fill it in.

## 1. What the model does today

- **Seeding is a size threshold, never an age** (`r1.maturity`, a height in cells; `src/core/params.ts`). A cell is 0.25 m (ADR 0049), so the default 70 cells is 17.5 m; the `forest` preset sets 40 (10 m); species override it: maple and holly 30 (7.5 m), rowan 20 (5 m), willow 25 (6.3 m); birch, oak, beech, fir, hornbeam and pine inherit the preset (`src/core/flora.ts`). Above it, a share `fRep` of surplus carbon (preset 0.1) goes to seed at `cSeed` carbon per seed (1.5 to 10 by species).
- **Recruits** land by a Laplace kernel (`d`, 12 to 60 cells), then establish if ground light is at least `qEst` (0.02 to 0.3) with probability `pEst` = 0.3, under a `maxTrees` cap. `m0` (0.002 to 0.012) is background mortality per tree per season.
- **Seed rain from outside** (ADR 0018) exists only for goat willow (1 seed per 100 cells per season) and birch (0.2). Seedlings that fail `qEst` are simply not created; there is no seedling bank that waits in shade and dies slowly.
- **The garden** plants one row and keeps recruits to a depth band (`o4.band`), with `maxTrees` per page (`src/web/plate.test.ts`: 24 to 75 by width, 229 with `recruits: 1`).

So the model has no age at first seed (only a height), no seedling class below an established tree, no mast variation, and recruits are born at the establishment size. Everything in section 4 is about those gaps.

## 2. Age at first seed, and interval between seed years

Primary source: the USDA _Woody Plant Seed Manual_ (Bonner & Karrfalt 2008, Agric. Handbook 727), genus chapters, which I read from the full volume ([Treesearch 32626](https://research.fs.usda.gov/treesearch/32626)). It reports _minimum_ seed-bearing age and the years between "large seedcrops". Minimum age is the earliest scattered seed, not the age at which a stand's trees seed reliably.

| Species | Minimum seed-bearing age (yr) | Years between large crops | Mature height (m) | Source and caveat |
|---|---|---|---|---|
| Silver birch _Betula pendula_ | 15 | 2–3 | 19.5 | WPSM _Betula_ Table 3 (after Brinkman 1974). Downy birch _B. pubescens_ is the same. |
| English oak _Quercus robur_ | 20 | 2–4 | 34 | WPSM _Quercus_ Table 2. Sessile oak _Q. petraea_: 40 yr, 5–7. |
| Beech _Fagus sylvatica_ | 40–80 | 5–8 (mountains), 9–12 (Great Britain), 3–10, 15–20 | 20–30 | WPSM _Fagus_ Table 3 (Rudolf & Leak 1974): "40 to 50 years for open-grown trees and 60 to 80 years for trees in stands". |
| Silver fir _Abies alba_ | 25–30 | 2–3 | 25–45 | WPSM _Abies_ Table 3. |
| Hornbeam _Carpinus betulus_ | 10–30 | 1–2 | not given | WPSM _Carpinus_ Table 3 (Allen 1995; Rudolf & Phipps 1974). |
| Sycamore _Acer pseudoplatanus_ | not given | 1 | 31 | WPSM _Acer_ Table 2 leaves the age blank for this species; its interval is 1 (annual). Norway maple likewise. **A gap in this source.** |
| Holly _Ilex aquifolium_ | 5–12 | not given | 15–24 | WPSM _Ilex_ Table 3. |
| Rowan _Sorbus aucuparia_ | about 15 | "almost annually" | 5–20 | WPSM _Sorbus_ text (after Harris & Stein 1974): "begins bearing seeds at about 15 years of age, and good seedcrops occur almost annually". |
| Willow _Salix_ (goat willow _S. caprea_ in the garden) | 5–10 from seed; 1–2 after a stump sprouts | not given | not given | WPSM _Salix_ text, genus level: sprouts "produce seeds 1 to 2 years after a fire", whereas seedlings "require 5 to 10 years". No _S. caprea_ figure. |
| Scots pine _Pinus sylvestris_ | 5–15 | 4–6 | 24–40 | WPSM _Pinus_ Table 2. The age is for cultivated and orchard trees; stand trees are later. |

Notes:

- **The seed manual's "mature height" is the species' height at maturity, not the height at first seed**, so it does not calibrate `r1.maturity`. I found no primary source that gives the height at first seed for these species.
- **Open-grown versus stand.** Only beech carries the split (40–50 v 60–80). It is the general rule: shaded crowns defer seed. The garden's trees are crowded, so the stand column, not the minimum, is the one to compare with.
- **Masting.** WPSM gives interval ranges (above). The British Biological Flora accounts (Packham et al. 2012, _J Ecol_ 100: 1557, beech; Atkinson 1992, _J Ecol_ 80: 837, birches) are the primary quantitative sources for seed counts and crop variation, but I could not open either full text, so I have no verified seeds-per-tree or coefficient-of-variation figures. Search snippets give only: a 20 cm DBH silver birch about 350,000 seeds in a non-mast year and 1,500,000 in a medium year, and 0.18–7.3 million seeds per tree per year for admixed birch (Huth 2009, as cited) _(snippet)_.
- **Oak masting** is synchronous and uneven. A UK study found all trees fruited in 2020 and none in 2021, with 18% of trees giving 51% of the acorns _(snippet)_. A 27-year record from 12 southern English trees shows synchronous annual variation _(snippet)_. Neither is verified.

## 3. Seedlings and saplings: densities and loss rates

### Beech under a mature canopy (Czech Republic)

Peña, Remeš & Bílek 2010, _J For Sci_ 56(12): 580–588 (DOI 10.17221/69/2010-JFS), read in full; permanent plots in beech shelterwood (a managed stand with a harvest cut, not a closed old wood):

- **Mast year v ordinary year.** The full mast of 2003 gave 78.1 to 298.8 thousand seedlings per hectare on the four plots. The intermediate crops of 2006, 2007 and 2008 gave 9.0–75.4, 0–5.2 and 3.8–16.9 thousand per hectare. A mast year is therefore 10 to 50 times an ordinary one.
- **Where the loss falls.** Cohort 2003 lost most of its seedlings in its second year (2005): 63% and 39% on the two plots with border cutting. From 2007 mortality was 1–15% a year, "very constant", with 0–7% a year on the plots that were not cut. The authors conclude that after the second year the rate is low and independent of the initial number.
- **Fourth-year loss across density groups:** 17%, then 3% and 6% in the next two years.
- **Old stock:** in 2009 the plots held 58.1–247.8 thousand per hectare of seedlings older than the previous year, against 3.8–16.9 thousand in their first year; one plot (a denser stand with thick humus) had only 2.1 thousand.

### A primeval beech forest (Ukraine)

Commarmot et al. 2013, _Inventory of the Largest Primeval Beech Forest in Europe_ (WSL/Swiss-Ukrainian team, 314 plots, Uholka-Shyrokyi Luh, 2010; [report](https://www.slf.ch/fileadmin/user_upload/WSL/Mitarbeitende/hobi/Inventory_Report_2013.pdf), Tables 6.3–6.4, Fig. 6.6, 6.9, read):

- **Living trees at least 6 cm DBH: 435 ± 12 per hectare**, basal area 37 ± 1 m² per hectare, growing stock 582 ± 14 m³; 97% of basal area is beech; deadwood is 162 m³ per hectare; 10 trees per hectare are at least 80 cm DBH; the largest is 150 cm.
- **Regeneration (below 6 cm DBH): 34,642 ± 3,859 per hectare, about 3 per m²**, 69% of them under 40 cm tall. So the standing bank under a closed primeval canopy is of order 10⁴ per hectare, and the 40–129 cm and 130 cm-plus classes are far smaller (Fig. 6.6; the bars are in that figure, I read only the total and the 69%).
- **Other species** are found more often in the regeneration than in the canopy: sycamore, silver fir, elm and hornbeam (together under 3% of basal area). Willows and poplars are very rare, only at forest edges and rivers.
- **Diameter distribution** (Fig. 6.9, 4 cm classes) is a reversed J. The axis runs 0–160 per hectare per class, which I could not resolve more finely from the extracted text.
- **Structure:** mostly three-layered, most gaps no larger than one crown (WSL summary, [waldwissen.net](https://waldwissen.net/en/technique-and-planning/forest-inventory/inventory-of-the-largest-primeval-beech-forest-in-europe)).

### A grazed oak and birch woodland (Scotland)

SNH Research Report 1182 (2020), Sunart SSSI, 84 random plots, 2018, read: **313 live trees at least 5 cm DBH per hectare**, seedlings 1,834–1,904 per hectare (interquartile range 351–2,772), small saplings about 260 and large saplings about 82 per hectare. Sessile oak seedlings 18 per hectare against 42 mature and 96 over-mature oaks per hectare (one small sapling, no large ones); 70% of oak seedlings browsed. Downy birch seedlings 348, small saplings 177, large saplings 58, mature 39 per hectare, with no birch seedlings in 34 of 84 plots. Rowan seedlings 1,291–1,341 per hectare but only 47 and 11 saplings. Basal area exceeded 34 m² per hectare in only five of 84 plots, so shade limited saplings over under 10% of the wood. **Use:** a ceiling on what a heavily browsed British wood looks like (no oak recruitment), not a target; the garden has no browsers. The seedling and sapling size classes are the report's own.

### Oak: where recruitment is limited

Crawley & Long 1995 (_J Ecol_ 83: 683, DOI 10.2307/2261636), abstract and a citing paper only _(snippet)_: oak recruitment was seed-limited in open sites with few herbivores and microsite-limited beneath a closed canopy; acorn losses to invertebrates followed predator satiation (a small crop loses a larger share); recruitment tracked crop size at some sites and not others. I have no density numbers from this paper. WPSM gives 30–50% acorn loss a year to a cynipid gall wasp in the United Kingdom (Collins et al. 1983, as cited in WPSM _Quercus_).

### Not found

- **Suppressed-seedling survival curves by species** (oak, hornbeam, birch, fir, maple, holly, rowan, willow, pine) under closed canopy. Only beech is covered with numbers, from two stands. Light-demander seedlings are known to be unable to persist in shade (see the species-traits note's survival-light bands), but I have no time-to-death for them.
- **Gap v canopy seedling densities** in matched plots. The Czech paper's plots vary in canopy but report no gap-versus-closed split in what I read; a Kyjov (Czech Republic) gap study found sapling density and biomass higher in gaps than under closed canopy _(snippet, not read)_.
- **Parkland and wood-pasture structure.** A survey of 390 European wood-pasture plots (Rangeland Ecol Manage 71, DOI 10.1016/j.rama.2018.04.004) sorts sites into sparse stands of large trees, dense stands of small trees and mixed-age stands, but I could not open it _(snippet)_, so I have no densities. The Spanish dehesa survey (2,816 plots) found regeneration failure widespread in open, uniform, ageing stands _(snippet)_, which is the parkland outcome, but those are _Q. ilex/suber/pyrenaica_.

## 4. What this means for the look from the side

The only side-view-relevant measurements I found are the Uholka ones in section 3: 435 trees per hectare (about one per 23 m², or roughly 4.8 m apart on average), mostly small, in a reversed-J diameter distribution, with three layers and gaps no bigger than one crown, over a regeneration carpet of about 3 per m² that is mostly under 40 cm tall. I found no primary source describing parkland or wood-pasture stem density and age structure (see "Not found"), so the parkland look has no anchor here. The garden's recruits are individually drawn trees from establishment, so it shows none of the sub-metre carpet; I did not convert the garden's `maxTrees` to a per-hectare density (it needs the slab area).

## Implications for the model

These are candidates for the decision in #85, not settled values.

1. **Seed from age and size, not size alone.** Keep `maturity` as a height gate but add (or check against) a minimum age, so a fast-grown recruit cannot seed at 5 years. Candidate minimum ages from section 2, stand-grown rather than open-grown where the source splits them: willow 5–10, birch 15, holly 5–12 (use about 10), rowan 15, pine 5–15 (use about 15–20 for stand trees, my judgment), hornbeam 10–30 (use about 25), oak robur 20 (WPSM) to 40 (petraea), fir 25–30, beech 60–80 in stands (40–50 open), sycamore unsourced. The ordering, not the exact years, is what the sources support: willow, holly, birch, rowan, pine, hornbeam, oak, fir, beech.
2. **Masting as a multiplier on `cSeed` yield.** Per-species crop interval from section 2: sycamore, rowan, birch and hornbeam near 1–3, oak robur 2–4 (petraea 5–7), fir 2–3, pine 4–6, beech 5–10, in synchronised years across the stand. The Czech beech data give the size: a mast year about 10 to 50 times an ordinary one, so a lognormal or two-state year effect, with ordinary years at a few percent of mast-year seed, would match. Synchrony within a species matters more than the exact shape.
3. **Add a seedling bank and its loss curve.** A recruit should spend its first seasons as a suppressed state (not an established tree) with a short lifetime when ground light is below its survival light. For beech, the Czech data suggest: high first- and second-year loss (about 40–60% in the second year in cut plots), then 1–15% a year under the canopy. For light-demanders, the survival-light bands in the species-traits note imply near-total loss in shade; a time constant is unsourced, so set it by experiment and report it as such.
4. **Cap what shows.** Display or count only recruits taller than a threshold, say 1.3 m, against a bank that is mostly under 40 cm in the real forest (69% under 40 cm at Uholka). A visible-stem target is then 435 per hectare over 6 cm DBH in a primeval beech forest (a closed old wood, the top of the range), 313 per hectare over 5 cm in a browsed oak and birch wood.
5. **Rain should not exceed local seeding for shade-tolerants.** At Uholka, willows and poplars are very rare and found only at edges, so a woodland interior should not receive rain of light-demanders; keep rain for willow and birch only for gaps (their `qEst` of 0.3 and 0.25 already restrict this) and consider zero for interior positions.

### Diagnostics to run

- **Age and height at first seed** per species in the current model (baseline), against the table above. This is the first number to get, and it needs a run (not done here).
- **Bank-to-tree ratio**: stems over 1.3 m per hectare equivalent over time in the garden's closed state; the real stands show 435 per hectare over 6 cm DBH.
- **Share of recruits that survive their first 5, 20 seasons** per species under a closed canopy and in a gap; compare the Czech beech curve for beech, and test that birch, willow and pine recruits mostly die in shade.
- **Mast-year spread**: ratio of the best to median year's recruit count per species, expecting about 10 or more for beech and oak.
- **Species mix of recruits** in a closed stand: shade-tolerants (beech, hornbeam, maple, fir) should dominate the bank, light-demanders appear only in gaps.

## Sources

- Bonner FT, Karrfalt RP (eds) 2008. _The Woody Plant Seed Manual_. USDA Agric. Handb. 727. https://research.fs.usda.gov/treesearch/32626 (genera _Abies, Acer, Betula, Carpinus, Fagus, Ilex, Pinus, Quercus, Salix, Sorbus_; tables as cited).
- Peña JFB, Remeš J, Bílek L 2010. Dynamics of natural regeneration of even-aged beech stands at different shelterwood densities. _J For Sci_ 56(12): 580–588. https://www.agriculturejournals.cz/publicFiles/69_2010-JFS.pdf
- Commarmot B, Brändli U-B, Hamor F, Lavnyy V (eds) 2013. _Inventory of the Largest Primeval Beech Forest in Europe_. WSL/Swiss-Ukrainian. https://www.slf.ch/fileadmin/user_upload/WSL/Mitarbeitende/hobi/Inventory_Report_2013.pdf
- Scottish Natural Heritage 2020. Research Report 1182, woodland profile survey, Sunart SSSI. https://www.nature.scot/sites/default/files/2020-07/Publication%202020%20-%20SNH%20Research%20Report%201182%20-%20A%20woodland%20profile%20survey%20and%20assessment%20of%20herbivore%20impacts%20within%20the%20East%20Loch%20Shiel%20Deer%20Management%20Group%20part%20of%20the%20Sunart%20Site%20of%20Special%20Scientific%20Interest%20%28SSSI%29.pdf
- Not opened (named for the next pass): Packham et al. 2012, _J Ecol_ 100: 1557 (beech flora); Atkinson 1992, _J Ecol_ 80: 837 (birches flora); Crawley & Long 1995, _J Ecol_ 83: 683; Stillhard et al. 2019, _Ecology_ (Uholka plot, 15 years; EnviDat doi:10.16904/envidat.84); the European wood-pasture survey, DOI 10.1016/j.rama.2018.04.004.
