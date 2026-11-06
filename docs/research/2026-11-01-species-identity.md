# Species identity: what makes each garden species recognisable at 15–30 m (track A, 2026-11-01)

Track A's first deliverable ([tracks plan](../plans/2026-11-01-tracks.md) §1, row A). There is one card per species, then the table **feature × species × where it lives today**. Tracks B (vocabulary) and C (foliage) act on the table. The cards serve the picture: a frontal 2D illustration on a phone, with the tree 15–30 m away. A cue counts only if it survives at that distance.

## How the sources were read
**First pass (morning).** The container reached only GitHub and a search engine, so every claim was tagged [r], [s] or [u].

**Second pass (afternoon, a wider network policy).**
- **What could be opened:** PMC, algorithmicbotany.org, arboritecture.org, Trees and Shrubs Online (TSO), Wikipedia, Commons, the JRC atlas PDFs (`forest.jrc.ec.europa.eu/media/atlas/<Species>.pdf`, after a first 503), RHS, Woodland Trust, Trees for Life, BSBI, NCSU, EUFORGEN, Morton Arboretum, waldwissen, conifers.org, van den Berk, and the author PDFs of the papers below.
- **What stayed shut:** Wiley (the Biological Floras), Kew and POWO, ScienceDirect, MDPI, Springer, HAL and ACM.

Every [s] and [u] claim was checked against its cited page. Each one is now marked [r], corrected in place, or left [s] or [u] with a note.

The tags now mean:
- **[r]** read directly, in the page or the full text. Some pages came through the fetch tool's summariser, so treat a quotation as close wording. Check it against the page before printing it.
- **[s]** only an abstract or a search snippet was read; the page itself was refused or not found.
- **[u]** no source read states it. This is field-guide knowledge from memory (Mitchell 1974; Johnson & More 2006): a claim to check, not evidence.

**What the second pass changed:**
- **Corrections:**
  - Beech is not in `catm.tree2000`.
  - Hornbeam is Troll in Pfisterer 2000.
  - Holly is under Massart's "*Abies* type", not a type of its own.
  - Several quotations were wrongly attributed (NCSU, Trees for Life, Sternberg, the "holly PDF").
  - The JRC atlas has birch "up to 30 m", not 15–25.
  - The JRC atlas has no "stork's nest" for fir.
  - Beech leaves are 4–10 cm.
  - Nicolini & Caraglio's forking finding runs the other way from the first pass's wording.
- **Additions:** the numbers in **§ Crown numbers** below.

Limb angles and open-grown W/H are still scarce.
- **Unreachable:** Pretzsch et al. 2015 (UFUG 14:466) is open access, but every copy was refused (ScienceDirect 403, the TUM mirror gone, the others behind bot challenges). Hasenauer 1997 is closed access.
- **What stands in for them:** a UK urban study (Coombes et al. 2019) for crown diameter against DBH, and two beech stand studies.

Photographs are linked, never copied. Commons has a "Solitary …" category only for birch, pedunculate oak and Scots pine [r]. For the other species, the "(standalone)", "Famous …" and "… in winter" categories are the best places to look for open-grown silhouettes (listed per card).

## Architectural models (Hallé, Oldeman & Tomlinson 1978)
| species | model | basis |
|---|---|---|
| beech | **Troll** ("*Fagus* type"): "All axes develop plagiotropically, the architecture being built by their continual superposition. Young trees may develop a leader, aged crowns usually are polyarchic" | Pfisterer 2000 [r]; Millet et al. 1999 put *F. grandifolia* in Troll [r]; Nicolini 2000 (abstract) [s] |
| oak | **Rauh**, section II "Fruit Tree Shape (*Malus* type)": *Quercus* except *Q. rubra* (Rauh I) and *Q. palustris* (Massart) | Pfisterer 2000 [r]; Prusinkiewicz & Remphrey 2000: "Temperate examples of Rauh's model include ash, oak, pine, maple, and larch" [r] |
| birch | **no source assigns *B. pendula***. Pfisterer, Barthélémy & Caraglio 2007 and Prusinkiewicz & Remphrey do not name *Betula* [r]. Millet et al. 1999 on *B. populifolia*: "Its organization is related to Rauh's model …, although it is sympodial" [r]. Bartha 2011 (the Pannonian table, restricted until 2031) reportedly puts *B. pendula* under Rauh | [r]; Bartha [s] |
| hornbeam | **Troll**: Pfisterer lists *Carpinus* with *Fagus* in the *Fagus* type | Pfisterer 2000 [r]. Bartha 2011 reportedly puts it under Rauh [s]; the two disagree |
| goat willow | **no model in any source read**. Pfisterer: "adult … pussy willows (*Salix caprea*) … usually have flat, polyarchic crowns … Young trees … are hierarchically organized" | Pfisterer 2000 [r]; *Salix* long shoots sympodial (Flora of North America [s]) |
| rowan | **Rauh II** (*Malus* type), at genus level (*Sorbus*) | Pfisterer 2000 [r] |
| field maple | **Rauh I**, "Candelabrum Shape (*Acer–Pinus* type)", at genus level (*Acer*) | Pfisterer 2000 [r] |
| holly | **Massart** (*Abies* type); "Hierarchy may be complete or it may decline when the tree grows old (*Cedrus*, *Ginkgo*, *Ilex*)" | Pfisterer 2000 [r] |
| silver fir | **Massart** | Pfisterer 2000 [r]; Barthélémy, Édelin & Hallé 1989 (*Abies*) [r]; Prusinkiewicz & Remphrey ("species of fir") [r] |
| Scots pine | **Rauh** (Pfisterer's Rauh I, *Acer–Pinus*) | Barthélémy, Édelin & Hallé 1989, Fig. 2: "Specific expression of Rauh's model … *Pinus sylvestris*" [r]; Pfisterer 2000 [r] |

`catm.tree2000` is Prusinkiewicz & Remphrey 2000, *Characterization of architectural tree models using L-systems and Petri nets*, in Labrecque (ed.), *L'arbre – The Tree 2000*, 177–186 [r]. It gives L-system productions for the models.
- Its Troll examples are *Ulmus*, *Celtis* and *Prunus*. It never mentions beech.
- Its Massart examples are Norfolk Island pine and firs.

**Buds.**
- A winter key (LEAF, Wisconsin 2014) keys *Quercus* under "Terminal bud present … Buds crowded near tip of twig". It keys *Salix* and *Betula* under "Terminal bud absent (false terminal bud)" [r].
- *Carpinus* is not in that key.
- The "Forestry Chronicle 2008" source was not found.
- So: oak has a true terminal bud in a cluster, and birch and willow are sympodial at the shoot tip [r]. Hornbeam's bud is [u].

**Reiteration.** Millet et al. 1999 measure it as total reiteration (TR) of the crown [r]:
- In birch and aspen, "Total reiteration is virtually non-existent", with at most two crowns per birch.
- "For maple and beech, total reiteration in the crown promotes lateral spread."
- Barthélémy & Caraglio 2007 show sequential ("automatic") reiteration building the crown of *Fagus sylvatica* (Fig. 27) and ash (Figs. 25–26). They call it "a very common and major morphogenetic process underlying crown construction in most forest trees" [r].
- The first pass said every species except birch, fir and young pine "leaves its model" through reiteration. That is our reading of these two papers, not a claim either of them makes.

---

## Silver birch (*Betula pendula*)
**Silhouette.**
- **Young to old:** "pyramidal form when young, more oval as it matures", with "drooping or pendulous branches" (NCSU [r]). "Elegant, narrowly conical … up to 25m in height, with slender drooping twigs" (RHS [r]). The crown is "oval or pyramidical, open" (Naturalis, Flora of the Burren [r]). The first pass's "open and airy" is not on the NCSU page.
- **Height:** "growing up to 30 m" (JRC atlas [r]); "typically reaches 15 to 25 m" (Wikipedia, after Vedel & Lange 1971 [r]).
- **At 20 m** the crown is see-through and the white trunk shows through it [u].
- **In a stand:** crown-released birch in 38 stands (Dubois et al. 2021 [r]):
  - mean height 17.4 m, median age 19;
  - live crown ratio mean 0.60, median 0.59, quartiles 0.52–0.66, range 0.29–0.91;
  - crown diameter C = 0.761 + 0.186·dbh (m, cm);
  - W/H about 0.24 at the mean size (our computation). These are released stand trees, not open-grown ones.
- **Free-standing urban birch** (UK): crown diameter = 1.92 + 18.30·DBH (m) (Coombes et al. 2019 [r]).

**Scaffold.**
- **Trunk:** one straight trunk to the top, unless damaged young (first-nature [s]).
- **Total reiterates are rare** (above): grey birch's "main axes … are long and vertical, with a narrow aperture angle between them". Shaded young birches lose leader dominance and fork from two sub-terminal buds (Millet et al. 1999 [r]).
- **Main limbs:** many, slender, of similar thickness, rising at ≈ 40–50° from vertical near the trunk and **arching outward along their length** [u]. BSBI: pendula has "fine long-pendulous shoots that hang from elegantly arched branches borne on a straight trunk" [r].
- **Thickness hierarchy:** trunk ≫ limbs, the limbs ≈ one another [u].

**Twig habit.**
- **Hanging twigs:** "branches characteristically droop" (JRC [r]). The young twigs hang (Kew, a search snippet: "young twigs tend to hang downwards" [s], page refused). TSO's photograph caption reads "A curtain of drooping shoots of *Betula pendula*" [r].
- **Correction:** the first pass said TSO judges habit alone not decisive between *pendula* and *pubescens*. That is not on the TSO page. TSO separates the birches by "white bark, triangular or deltoid leaves, and translucent, sticky warts on the young twigs" [r].
- **Short and long shoots:** short shoots carry the leaves and female catkins, and can revert to long ones (Ishihara & Kikuzawa 2004 [s]).
- **Leaf-off:** a fine purplish-brown haze [u].

**Foliage at distance.**
- **Leaves:** 1–3 in (2.5–7.5 cm), doubly serrate (NCSU [r]). NCSU calls them ovate, where Woodland Trust has "small and triangular-shaped with a toothed edge" [r] and TSO "triangular or deltoid" [r].
- **Colour:** light mid-green [u]; first to flush and early gold in autumn (earthwatch [s]).
- **Texture:** leaves clumped in pairs on short shoots along hanging twigs, so foliage hangs in strings [u]. Not marcescent [u].

**Bark and trunk.**
- **Young:** white bark "interspersed with conspicuous black patches" (Trees for Life [r]); "the bark develops dark, diamond-shaped fissures" (Woodland Trust [r]).
- **Old:** "Peeling white bark, becomes black and rugged at the base" (RHS [r]); on old trees it "can become corklike and deeply fissured" (Trees for Life [r]).
- **At 20 m** the white trunk is the strongest single cue [u].

**Ontogeny.**
- **20 years:** a cone with a leader [u].
- **40–60 years:** the oval with hanging twigs [u].
- **Lifespan:** "Typically around 60–90 years, although some trees can live for 150 years or more" (Trees for Life [r]); "commonly live for 90-100 years, and, more rarely, up to 150 years" (JRC [r]).
- **Suppression in youth:** "trees never recovered a high growth rate if crown expansion was hindered during youth" (Vanhellemont et al., cited in Dubois et al. 2021 [r]). This is about growth, not crown shape.

Arbaro has no birch. Its `quaking_aspen` is the nearest sheet [r]: Shape 7 (tend flame), level-1 DownAngle 60 / V −50, Curve −40. The Grove has a paper-birch twig but no European birch twig [r].

Photos:
- [winter](https://commons.wikimedia.org/wiki/File:Betula_penuda_at_sunset_in_winter.jpg)
- [frost, Finland](https://commons.wikimedia.org/wiki/File:Betula_pendula_-_Riippakoivu_DSC00010_C.JPG)
- [Bulgaria](https://commons.wikimedia.org/wiki/File:Betula_pendula_tree_Bulgaria.jpg)
- [Solitary *Betula pendula*](https://commons.wikimedia.org/wiki/Category:Solitary_Betula_pendula), 42 files
- [in winter](https://commons.wikimedia.org/wiki/Category:Betula_pendula_in_winter)

## Oak (*Quercus robur*, *Q. petraea*)
**Silhouette.**
- **Open-grown robur:** it "develops in the open ground a broad, spreading head of rugged branches wider than the tree is high" (TSO, Bean [r]). That confirms W > H. Wikipedia (uncited): "The crown is spreading and unevenly domed, and trees often have massive lower branches" [r]. The first pass gave that wording to TSO; it is Wikipedia's.
- **Petraea:** "It has a more upright trunk and straighter branches than English oak" (Woodland Trust [r]); "a narrower crown and more upright branching" (SAPS [r]); "a trunk that usually penetrates further into the crown" (TSO [r]).
- **Height:** "fully grown trees are 60 to 80 ft high", while close-grown trees "reach 100 ft or more" (TSO [r]); "More usually … a height of 30 m" (JRC [r]).
- **Outline:** lumpy, with separate clumps of foliage on separate limbs and sky between them [u].
- **Free-standing urban oak** (Coombes et al. 2019 [r]):
  - crown diameter = 4.42 + 14.68·DBH (m);
  - their open-grown series, age → DBH, crown diameter: 15 y → 0.25 m, 7.3 m; 30 → 0.37, 9.7; 50 → 0.50, 12.4; 80 → 0.65, 15.4; 110 → 0.74, 17.1.

**Scaffold.**
- **JRC:** "The main trunk of *Q. robur* tends to disappear in the crown, developing irregular boughs with twisting branches, while *Q. petraea* usually develops a main stem with boughs gradually dec[r]easing in size" [r].
- **So robur is decurrent:** a short bole (3–6 m [u]) dividing into 3–6 massive limbs [u].
- **Kinks (Sternberg, corrected):**
  - "Loss of a terminal bud will stimulate the development of subapical buds", which "may produce a co-dominant leader"; when several develop, "a whorl of branches is formed" [r].
  - Separately, as the tree ages, "apical buds become less dominant and subapical buds may assume dominance, causing bends and kinks in the tree or branch" [r].
  - So the elbows are an age effect of subapical takeover, and the forks follow a lost tip.
  - Lammas shoots add more kinks (bugwood [s]).
- **Limb angles:** lower limbs near level, upper ones at 30–60° [u]. No measured oak limb angle was found.
- **Thickness hierarchy:** steep [u].

**Twig habit.** "Buds crowded near tip of twig" (LEAF key [r]). Short shoots fork often, so twigs are dense and clustered at the limb ends [u].

**Foliage at distance.**
- **Leaves:** "Around 10cm long with 4–5 deep lobes" (Woodland Trust [r]).
- **Colour:** yellow-green at the late flush, then dark green, then russet [u].
- **Marcescence:** "most pronounced in young trees, coppice and low epicormic branches" (BSBI, quoted on a woodlands.co.uk blog [s]). Sternberg does not mention it; the first pass cited him.
- **Texture:** clotted at shoot tips [u].

**Bark and trunk.**
- **Bark:** deeply fissured, grey-brown [u].
- **Epicormics:** shoots come "from dormant buds in the bark", after "stress i.e. sudden environmental change, thinning, crown dieback, heavy pruning". In the UK they are "largely confined to oak, elm, lime, poplar and willow"; *Q. robur* forms a "cat's claw" bud pad (Bartlett, Percival [r]).
- **Burrs:** "large burrs on the trunk, which typically produce many small shoots" (Wikipedia, after Forestry England [r]).

**Ontogeny.**
- **20 years:** oval [u].
- **40–80 years:** the leader is lost and the crown broadens [u]; the JRC sentence above describes the mature result.
- **Age:** over 1000 years possible (JRC [r]).
- **Old trees:** stag-headed (oakleafgardening [s]).

Arbaro's `ca_black_oak` (*Q. kelloggii*), as in Weber & Penn's appendix [r]:
- Shape 2, a hemispherical envelope;
- 0BaseSplits 2 and 0SegSplits 0.4: the trunk splits, which makes it decurrent;
- level-1 limbs: Length 0.8, DownAngle 30 / V −30, Curve 40, CurveBack −70, CurveV 150;
- level 2: 120 short branches (Length 0.2).

Photos:
- [hedgerow oak, winter](https://commons.wikimedia.org/wiki/File:Quercus_robur_in_hedge.jpg)
- [over 300 years, Moscow](https://commons.wikimedia.org/wiki/File:Oak_tree_-_Qu%C3%A9rcus_r%C3%B3bur.jpg)
- [Solitary *Quercus robur*](https://commons.wikimedia.org/wiki/Category:Solitary_Quercus_robur), 55 files
- [in winter](https://commons.wikimedia.org/wiki/Category:Quercus_robur_in_winter)

## Goat willow (*Salix caprea*)
**Silhouette.**
- **Habit:** "A large, spreading, rounded deciduous shrub or small tree to about 9m tall"; height 8–12 m, spread 4–8 m (RHS [r]). That puts a nursery tree's W/H at about 0.5–0.9. "A shrub or a small tree of bushy habit" (TSO [r]).
- **Size and age:** "Mature trees grow to 10m and can live for 300 years" (Woodland Trust [r]).
- **Light:** "very shade intolerant … occurring in open areas with full sun" (JRC, search snippet [s]). The first pass cited USGS; no such page was found.
- **In a stand:** it leans out of the wood [u].

**Scaffold.**
- **Crown:** flat and polyarchic when adult, hierarchic when young (Pfisterer 2000 [r]).
- **Trunk and limbs:** a short trunk, often several stems from a low fork [u]. "Many ascending branches … and more divergent twigs" (illinoiswildflowers [s]). Limbs straight, ascending at ≈ 30–45° [u].
- **Shoot tips:** a false terminal bud (LEAF key [r]).

**Twig habit.** Young shoots "at first grey with down, becoming smoother" (TSO [r]). Stout and ascending [u].

**Foliage at distance.**
- **Leaves:** "3–12 cm long and from 2.5–8 cm wide", var. *caprea* 5–12 cm. They are "dull green and slightly hairy above, grey and woolly pubescent below" (Wikipedia, after Meikle 1984 [r]); "a felty coating of fine grey hairs underneath" (Woodland Trust [r]). So the crown reads **grey-green and silvery in wind** [u].
- **Spring cue:** silver, then yellow, catkins before the leaves (MBG [s]).

**Bark and trunk.** "Grey-brown and develops diamond-shaped fissures" (Woodland Trust [r]).

**Ontogeny.**
- **Lifespan:** a pioneer, and the sources conflict: "can live for 300 years" (Woodland Trust [r]) against 15–30 years (illinoiswildflowers [s]).
- **Later life:** a broad bush-tree that falls apart and resprouts [u].

Arbaro has only `weeping_willow` [r].

Photos:
- [mature, spring](https://commons.wikimedia.org/wiki/File:(ms)_Salix_caprea_15.jpg)
- [habit](https://commons.wikimedia.org/wiki/File:Salix_caprea.jpg)
- [pollards](https://commons.wikimedia.org/wiki/Category:Salix_caprea_(pollards))
- No open-grown category exists.

## Beech (*Fagus sylvatica*)
**Silhouette.**
- **Height:** it "commonly reaches 30-40 m and is capable of attaining heights up to 50 m" (JRC [r]). "Tree to 50 m"; the UK's tallest is 45 m, in 2018 (TSO [r]).
- **Open-grown:** mature trees "develop a huge domed crown" (Woodland Trust [r]). They are "much shorter (typically 20 m) … more massive with a broader crown and stouter trunk" (Wikipedia, uncited [r]).
- **Correction:** the first pass had low branches sweeping to the ground, from treeguideuk. That page does not say it; only nursery pages do [u].
- **In a stand** (Štefančík 2017 [r]): crop trees of about 92 years were 32.4–34.0 m tall, with crown width 6.3–8.4 m, crown ratio 0.47–0.50 and W/H 0.19–0.25 (our computation).
  - "From the DBH of 45 cm, the crown constituted at least half of the tree height."
  - **Correction:** the first pass said crown width/height is constant with height (J. For. Sci. 2017). No such statement was found.
- **Mixture changes the crown** (Rais et al. 2021, abstract [s]): beech in pure stands against beech–pine mixtures:
  - branch angle 30.7° against 54.1° (the convention is not stated in the abstract);
  - crown ratio 50.0% against 71.5%.

**Scaffold.**
- **Troll, *Fagus* type** (Pfisterer, above [r]).
- **Shoot symmetry follows vigour** (Nicolini 2000, abstract [s]):
  - The least vigorous trees, "very young or under dense cover", have an inclined, plagiotropic main axis of bilateral symmetry, carrying a flat crown ("houppier plan").
  - Vigorous trees have a vertical, orthotropic, radially symmetric axis.
- **Not verified:** the first pass's "terminal fork of total plagiotropic reiterates" in the mature tree. It is not in the abstract, and the full text was refused.
- **Forks (Nicolini & Caraglio 1994, corrected [r]):** forks form at both extremes of growth rate, "un niveau où le taux de croissance est très important et un niveau où le taux de croissance est très faible". The intermediate level keeps "une structure aérienne bien hiérarchisée".
  - In deep shade, a slender vertical trunk carries a small flat crown and ends in a fork of two axes that turn horizontal.
  - Vertical lateral axes are more frequent in full light (0.18–0.45) than in shade (0.03–0.1).
  - Their angle classes: vertical 0–20°, oblique 21–50°, horizontal 51–90°.
  - Polycyclic shoots: 51% in light against 14% in shade.
  - The trees were 18 years old: 9 m tall in the open, 6 m in shade.
- **Branch angle rises with annual growth rate** (Nicolini 1998, abstract [s]).
- **Thiébaut 1982 (abstract [s]):** in nursery seedlings, plagiotropic axes come in the first growth cycle and orthotropic axes in the second. "Secondary straightening" of the stem is not in the abstract.
- **Reiteration:** sequential reiteration builds the crown (Barthélémy & Caraglio 2007, Fig. 27 [r]), and total reiteration spreads it (Millet 1999 [r]).
- **Open-grown limbs:** several steep, smooth limbs that rise and then arch over [u].

**Twig habit.**
- **Shoots and buds:** "Young shoots silky haired at first"; the bud is "sharply-pointed" (TSO [r]). Zig-zag twigs [u].
- **Leaf layers:** "In shaded branches, the leaves form a monolayer with fewer and larger leaves per branch; whilst in sunny conditions the leaves form multiple layers" (Packham et al. 2012, search snippet [s]; Wiley refused). Whether the paper names Horn is unverified.
- **At distance:** level plates [u].

**Foliage at distance.**
- **Leaves:** "4–9cm long … with a wavy edge" (Woodland Trust [r]); "(3–)4–10 cm × 2.5–4 cm" (TSO [r]).
- **Autumn:** "shades of yellow, gold and orange" (TSO [r]).
- **Marcescence:** on hedging (Woodland Trust [r]), on saplings and lower branches (Wikipedia [r]).
- **Crown:** dense and opaque [u].

**Bark and trunk.** "Bark pale grey", smooth bark "retained into old age" (TSO [r]); "smooth, thin and grey" (Woodland Trust [r]).

**Ontogeny.**
- **Lifespan:** "typical life span of around 150-300 years" (JRC [r]); "250 to 300 years is good going", and "when older than 200 years trees are liable to die suddenly" (TSO [r]).
- **From young to old:** a layered cone young [u], a dome old [r: Woodland Trust].

The Grove sells a *Fagus sylvatica* twig [r]. Arbaro has no beech.

Photos:
- [solitary, Het Loo](https://commons.wikimedia.org/wiki/File:Fagus_sylvatica.JPG)
- [standalone](https://commons.wikimedia.org/wiki/Category:Fagus_sylvatica_(standalone))
- [famous trees](https://commons.wikimedia.org/wiki/Category:Famous_Fagus_sylvatica)
- [in winter](https://commons.wikimedia.org/wiki/Category:Fagus_sylvatica_in_winter)

## Hornbeam (*Carpinus betulus*)
**Silhouette.**
- **JRC:** it "usually grows 20-25 m in height, rarely exceeding 30 m. The crown is irregular, ovoid or conic, becoming domed in old trees" [r].
- **TSO:** "Tree to 30 m, often with many slender branches" [r].
- **Next to beech:** smaller and finer than beech's dome [u].

**Scaffold.**
- **Troll**, with beech (Pfisterer [r]).
- **Correction:** TSO's sentence "The crown's many, close weak forks may look like a recipe for disaster" is about the cultivar 'Fastigiata', not the species [r]. It still describes the genus's habit of close forks, but it is weaker evidence than the first pass made it.
- **With age:** young branches steep, old ones level, hanging and breaking (storianaturale; van den Berk [s]).
- **Trunk:** low, competing stems [u].
- **Management:** "often coppiced or pollarded" (Woodland Trust [r]).

**Twig habit.**
- **TSO:** "Shoots slender, grey-brown, zig-zag"; buds "slender, brown, long-pointed, to 1 cm long" [r].
- **Density:** fine and dense (COD [s]).
- **Sprays:** distichous, like beech's [u].

**Foliage at distance.**
- **Leaves:** 4–10 × 2–5 cm (TSO [r]); 7–12 cm with a "serrated / toothed" margin (woodlands.co.uk [r], which does not say "doubly"); "doubly serrated leaf edges" (Woodland Trust [r]).
- **Autumn:** "usually a muted yellow, or sometimes orange-brown in full sun" (TSO [r]).
- **Marcescence:** "brown leaves that remain attached until new green leaves appear in the spring" (EUFORGEN [r]).
- **Shade:** tolerant (EUFORGEN [r]).

**Bark and trunk.**
- **Fluting:** "fluted as if muscles are bunched under its surface" (TSO [r]); "smooth and steel gray, but having a muscled character … Older trees become more fluted" (Morton [r]); "often has a fluted and crooked trunk" (Wikipedia [r]).
- **Correction:** "Twisting" is not on TSO.

**Ontogeny.**
- **Young:** conical (JRC [r]).
- **Old:** domed (JRC [r]).
- **Lifespan:** "more than 300 years" (Woodland Trust [r]); "may be able to live for 350 years, although 250 may be more typical" (Ancient Tree Inventory [s]).

The Grove sells a *Carpinus betulus* twig [r].

Photos:
- [habit, Karlsruhe](https://commons.wikimedia.org/wiki/File:Carpinus_betulus_001.JPG)
- [Hunsrück](https://commons.wikimedia.org/wiki/File:Carpinus_betulus_-_Hunsr%C3%BCck_001.jpg)
- [old tree, forest-grown](https://commons.wikimedia.org/wiki/File:Carpinus_betulus_(G%C3%BCrgen).JPG)
- [in winter](https://commons.wikimedia.org/wiki/Category:Carpinus_betulus_in_winter)

## Rowan (*Sorbus aucuparia*)
**Silhouette.**
- **TSO:** "Tree to 15 (–28) m", "of erect growth when young, becoming more spreading and graceful with age"; open-grown trees "frequently have several trunks" [r].
- **BSBI Fermanagh:** "a slender medium-sized tree around 20 m", with "a narrow crown and erect or somewhat spreading branches" [r]. The first pass gave this to Raspé et al. 2000, which could not be opened.
- **Wikipedia:** "loose and roundish or irregularly shaped but wide … often grows multiple trunks" (after Zauner and Harz [r]).
- **Fruit load:** fruit bends the branches round (ebben [s]).

**Scaffold.**
- **Branches:** "the branches stick out and are slanted upwards" (Wikipedia, after Erlbeck 1998 [r]).
- **Unverified:** "monopodial … at acute angles" was not found in any source read [u].
- **Limbs:** a few steep, straight limbs at ≈ 30–40° that splay with age [u].

**Twig habit.**
- **Buds:** "ovoid to ovoid-conic, dark-brown to blackish, to 15 mm long" (TSO [r]); purple and grey-hairy (Nature's Calendar [s]).
- **Twigs:** sparse and coarse, with spur shoots [u].

**Foliage at distance.**
- **Leaves:** "Leaves 12–25 cm with 6–8(9) pairs of leaflets" (TSO [r]), held in rosettes at the shoot tips, so the texture is feathery [u].
- **Seasons:** creamy flower heads in May–June and scarlet berries from August [u]. Autumn colour "yellow or red" (TSO [r]).

**Bark and trunk.** "Trunk smooth and grey" (TSO, Bean [r]).

**Ontogeny.**
- **Seed:** "Seed bearing does not begin until the tree is about 15 years old" (BSBI, after Raspé [r]); maturity at 10 (Wikipedia, after Erlbeck [r]).
- **Lifespan:** "does not often grow older than 80 years in warmer regions", "occasionally … to 150 years" (Wikipedia [r]); "Individual trunks seem to have a lifespan of about 40 years in cultivation" (TSO [r]).
- **Shade:** it "can withstand shade" (Wikipedia [r]); an understorey and edge tree [u].

Photos:
- [gallery](https://commons.wikimedia.org/wiki/Sorbus_aucuparia)
- [category](https://commons.wikimedia.org/wiki/Category:Sorbus_aucuparia)
- [in snow](https://commons.wikimedia.org/wiki/Category:Sorbus_aucuparia_in_snow)
- bioimages [58670](https://bioimages.org.uk/image.php?id=58670)

## Holly (*Ilex aquifolium*)
**Silhouette.**
- **Crown:** "very leafy, much-branched habit, forming naturally a dense pyramidal mass", up to 80 ft (TSO, Bean [r]).
- **Young to old:** "in der Jugend gerade, aufrecht und schmal kegelförmig", and in age "rundliche Formen"; most trees 6–8 m, "ausgesprochen schattentolerant", "bis zu 300 Jahre" (waldwissen [r]).
- **Wikipedia:** "pyramidal crown, branching from the base" (uncited [r]); 3–15 m (Press & Hosking [r]).
- **POWO:** "pyramidal tree growing up to 25 m" (search snippet [s]; Kew refused).
- **Skirt:** often skirted to the ground [u].

**Scaffold.** Massart; the hierarchy can decline when old (Pfisterer [r]). Branches short, level to slightly ascending [u].

**Twig habit.** Branchlets "often clothed more or less with minute dark down" (TSO [r]). Dense, green [u].

**Foliage at distance.**
- **Leaves:** 1–3 in (TSO [r]), glossy, near-black green [u].
- **Heterophylly:** lower leaves spiny, upper ones flat and spineless (waldwissen [r]). "Older trees and those in shaded environments tend to have the most smooth edged leaves" (Wikipedia, after Peterken & Lloyd 1967 [r]).
- **Sex and berries:** "usually dioecious" (Wikipedia, after Peterken & Lloyd [r]), so berries are on female trees.
- **Evergreen.**

**Bark.** Smooth, silver-grey (Wikipedia [r]).

**Ontogeny.** A narrow cone young, rounder old (waldwissen [r]); 250–300 years (Dallimore, via Wikipedia [r]).
- **Correction:** the first pass's "ACCS PDF" is not Peterken & Lloyd. It is the Alaska Natural Heritage Program's species biography (Nawrocki 2010), which cites them and gives no lifespan.

Photos: [category](https://commons.wikimedia.org/wiki/Category:Ilex_aquifolium).

## Field maple (*Acer campestre*)
**Silhouette.**
- **TSO:** "A deciduous tree to 15(–25) m"; it "makes a neatly shaped tree at its best, though may also be little more than a shrub" [r].
- **JRC:** the "crown is domed, usually low"; 15 m, exceptionally 25 [r].
- **van den Berk:** about 12 m tall and 7–8 m wide, with an "oval, dark, dense crown" [r]. That is W/H ≈ 0.6 for a nursery tree.
- **Correction:** the first pass's "Collins key" quotation was not found; Wikipedia gives 15–25 m.

**Scaffold.**
- **Model:** Rauh I, genus level (Pfisterer [r]).
- **Branches:** "steeply ascending branches" on one described tree (TSO [r]); trunks often curved and several (ebben [s]).
- **Branching:** opposite, decurrent, a low division [u].

**Twig habit.** "Branchlets greenish- to reddish-brown, soon glabrous, often developing corky ridges" (TSO [r]); "conspicuous corky fissures" (van den Berk [r]). Dense, fine [u].

**Foliage at distance.**
- **Leaves:** "(1.5–)3–8.5(–11) × (1.5–)3–8(–10) cm" (TSO [r]); 6–10(12) cm (van den Berk [r]). Matt mid-green [u].
- **Autumn:** "often turning bright yellow", and "it can also turn red" (TSO [r]). The first pass's "butter-yellow" is not TSO's word.

**Bark.** "Grey to pale brown developing shallow, longitudinal fissures with age" (TSO [r]).

**Ontogeny.** A hedgerow shrub under cutting; a coppice stool "clearly many centuries old" (TSO [r]). Open-grown, a low dome (JRC [r]).

The Grove sells a field-maple twig [r]. tree-gen's `acer` [s].

Photos: [in winter](https://commons.wikimedia.org/wiki/Category:Acer_campestre_in_winter).

## Silver fir (*Abies alba*), briefly
- **Crown:** "Crown narrowly pyramidal, neat and symmetrical in young trees, later conical, often 'stag-headed' with age" (TSO [r]). "The uppermost part of young trees has a conical shape gradually changing to become a rounded dome as the tree grows older" (JRC [r]).
- **Correction: no "stork's nest" in the JRC atlas.** The phrase rests on MDPI Forests 15:998 [s] alone.
- **Several ascending stems:** TSO says this of one tree, at Ardkinglas, not of the species [r].
- **Limb posture over age:** "First order branches erect at first, later horizontal, finally descending"; second-order branches "spreading more or less horizontally" (TSO [r]). This posture-over-age cue is new in the second pass.
- **Model:** Massart [r].
- **Needles:** "(1.2–)1.5–3(–3.5) cm" (TSO [r]); "glossy dark green above, and with two greenish-white bands of stomata below" (Wikipedia, after Rushforth [r]).
- **Bark:** "dull grey-brown, smooth, later pale silvery-grey, becoming scaly and fissured" (TSO [r]).
- **Size and age:** 500–600 years, above 60 m (JRC [r]).
- **Photos:** [standalone](https://commons.wikimedia.org/wiki/Category:Abies_alba_(standalone)).

## Scots pine (*Pinus sylvestris*), briefly
- **Habit:** "a long, bare and straight trunk topped by a rounded or flat-topped mass of foliage" (Wikipedia, after Farjon and Earle [r]). Open and egg-shaped young, then dense, domed or flat-topped (conifers.org [r]). The crown "varies in shape according to the density of the stand, the age of the trees, and the race" (TSO [r]).
- **Model:** Rauh [r].
- **Lateral growth at the top:** in young stands, terminal growth of lateral shoots "increased exponentially within the values 0.6–1.0 of the whorls position" (Ilonen et al. 1979, abstract [s]). The first pass's "top 40%" is a fair reading only if whorl position means relative height.
- **Limb angle:** about 70° from vertical near the pith of butt logs (a knot study, search snippet [s]).
- **Old limbs:** few, heavy, sinuous and level, then upturned, carrying flat plates of foliage [u].
- **Needles:** paired, 2.5–9 cm (5–9 on vigorous young trees, 2.5–5 on old ones), kept "2-6(-9) years" (conifers.org [r]; the first pass's "3–7 cm, 2–4 y" was Wikipedia's warm-climate figure).
- **Bark:** "thick, scaly-plated, grey-brown" on the lower stem, thin, flaking and orange-red on the upper stem and limbs (conifers.org [r]). This is the strongest cue at distance.
- **Size and age:** 23–27 m on average, over 40 m, 400 years or more (JRC [r]).
- **Photos:** [habitus, park-planted](https://commons.wikimedia.org/wiki/File:PinusSylvestris.jpg); [Solitary *Pinus sylvestris*](https://commons.wikimedia.org/wiki/Category:Solitary_Pinus_sylvestris), 89 files.

---

## Crown numbers (second pass)
All values are [r] unless marked. W/H is crown diameter over height, computed by us where both are given.

| species | quantity | value | trees | source |
|---|---|---|---|---|
| birch | live crown ratio | mean 0.60, median 0.59, IQR 0.52–0.66, range 0.29–0.91 | 996 crown-released stand trees, H 3.4–33.6 m, median age 19 | Dubois et al. 2021 |
| birch | crown diameter (m) vs dbh (cm) | C = 0.761 + 0.186·dbh; W/H ≈ 0.24 at the mean tree | same | Dubois et al. 2021 |
| birch | crown diameter (m) vs DBH (m) | 1.92 + 18.30·DBH (Norwich), 2.50 + 16.31·DBH (Peterborough) | free-standing urban, UK | Coombes et al. 2019 |
| oak | crown diameter vs DBH | 4.42 + 14.68·DBH, 4.66 + 14.22·DBH; at 50 y 12.4 m, at 110 y 17.1 m | free-standing urban, UK | Coombes et al. 2019 |
| oak | W/H, open-grown | > 1 ("wider than the tree is high") | open ground | TSO (Bean) |
| all four urban species | crown diameter / DBH | ≈ 25 at size (oak 26.6, birch 24.9) | free-standing urban | Coombes et al. 2019 |
| beech | H, crown width, crown ratio, W/H | 32.4–34.0 m; 6.3–8.4 m; 0.47–0.50; 0.19–0.25 | crop trees ≈ 92 y, three thinning regimes | Štefančík 2017 |
| beech | branch angle; crown ratio | 30.7° pure, 54.1° with pine; 50.0% pure, 71.5% with pine | 100 trees | Rais et al. 2021 [s] |
| beech | lateral-axis angle classes | vertical 0–20°, oblique 21–50°, horizontal 51–90°; vertical laterals 0.18–0.45 in light, 0.03–0.1 in shade | 18-year-old trees | Nicolini & Caraglio 1994 |
| goat willow | W/H, nursery | spread 4–8 m over height 8–12 m ≈ 0.5–0.9 | cultivated | RHS |
| field maple | W/H, nursery | 7–8 m over 12 m ≈ 0.6 | cultivated | van den Berk |
| Scots pine | branch angle near the pith | ≈ 70° from vertical | butt logs | knot study [s] |
| sycamore (reference) | W/H, open-grown | crown diameter "can sometimes exceed the height" | — | JRC |

**Not found:**
- Open-grown W/H with heights, for birch, beech, hornbeam, rowan, holly.
- Any measured limb angle for oak, birch, hornbeam, rowan, holly or maple.
- Limb counts for any species.

The routes are unchanged: Pretzsch et al. 2015 (open access; open it in a browser, not here), Hasenauer 1997 (closed), and QSMs from TLS (audit route C).

---

## The table: feature × species × where it lives today

**Where it lives today**, by name:
- **R2:** the physiological-age table (`r2.levels[i].{lambda, setPoint, branchAngle, generator, whorl, tierEvery, pTerm}`, `aC`, `dLambda`, `ramp`, `kappa`).
- **R3:** mechanics (`postureSetPoint`, E, sag, the posture gain `c`).
- **C4:** shoot direction (η, set point, ε/σ noise, ξ phototropism).
- **C5:** shedding (`T`, `Trel`).
- **R4:** dormancy and release.
- **R6:** short shoots (`qMin`, `leafArea`).
- **leaf style:** the renderer's `LEAF_STYLES` (`cm`, `length`, `aspect`, `shape`, `palette`, `flush`, `turn`, `marcescent`, `leafAge`).
- **bark:** the renderer's single `--bark-young → --bark-old` ramp, the same for every species.
- **missing:** no rule or field expresses it.

Species columns: Bi birch, Oa oak, Wi goat willow, Be beech, Ho hornbeam, Ro rowan, Hy holly, Ma field maple, Fi/Pi fir and pine. Entries follow the cards; a cell marked [u] on its card is still unsourced.

| feature | Bi | Oa | Wi | Be | Ho | Ro | Hy | Ma | Fi / Pi | where it lives today |
|---|---|---|---|---|---|---|---|---|---|---|
| model (Hallé) | none assigned; Rauh-like, sympodial | Rauh II | none | Troll | Troll | Rauh II (genus) | Massart | Rauh I (genus) | Massart / Rauh | R2's `generator`, `pTerm`; Troll's plagiotropy needs R3 (spec §9) |
| outline, open | narrow oval, open | broad, **wider than high** | broad bush-tree, W/H ≈ 0.5–0.9 | huge dome | ovoid, domed old | narrow, spreading with age | dense pyramid | low dome, W/H ≈ 0.6 | cone → rounded dome / bare bole, flat top | emergent from all; R2's λ, aC, dΛ set the kind |
| outline, stand | crown ratio 0.60, W/H ≈ 0.24 | long bole, narrower | edge only, leans | crown ratio ≈ 0.5, W/H 0.19–0.25 | understorey, coppice | edge, understorey | understorey cone | understorey, hedge | spire / high flat crown | C5 (`T`, `Trel`), R5; works (20-seed evidence) |
| trunk persists to top | yes; total reiteration "virtually non-existent" | robur: "tends to disappear in the crown"; petraea: persists | no; flat polyarchic adult | leader young, "aged crowns usually are polyarchic" | as beech | erect young | yes; hierarchy declines old | low division [u] | yes; fir stag-headed old / pine lost | R2 `levels.0.lambda`, `dLambda`, `aC`, `ramp`, `levels.0.pTerm` |
| how the trunk divides | rare forks from two sub-terminal buds (shade) | lost tip → subapical co-dominant leader or whorl | several stems [u] | forks at high and very low vigour; flat-crowned fork in deep shade | close forks (cultivar evidence) | several trunks open-grown | — | several [u] | — / few heavy limbs [u] | **missing**: a fork into *n* co-dominant leaders (Weber–Penn's BaseSplits/SegSplits); R2 `pTerm` only kills the leader |
| main-limb count | many, slender [u] | few (3–6), massive [u] | several [u] | several [u] | "many slender branches" | few [u] | many short [u] | several [u] | whorls / few heavy [u] | emergent (C3 λ, C5); no knob. No source gives counts |
| limb angle at the base (from vertical) | ≈ 40–50° [u] | lower near 90°, upper 30–60° [u] | 30–45° [u] | 30.7° (pure stand) to 54.1° (with pine) [s]; vertical laterals more in light | steep young, level old [s] | "slanted upwards" | level [u] | "steeply ascending" (one tree) | fir: erect → horizontal → descending with age / ≈ 70° (pine knots [s]) | R2 `levels.1.setPoint`, `branchAngle`; R3 `postureSetPoint`. **Missing**: a set point that changes with the limb's age (fir) |
| limb curvature along its length | **ascend, then arch** ("elegantly arched branches") | **bends and kinks** where subapical buds take over | straight [u] | rise, then arch over [u] | ascend, bow with age [s] | straight, splay [u] | straight | slight | tips upturned / sinuous [u] | **missing**: no curve that accumulates with distance (Weber–Penn's Curve, CurveBack); R3 sag gives only a load droop. Track B's first rule |
| thickness hierarchy | trunk ≫ limbs ≈ equal [u] | steep [u] | moderate | limbs ≈ equal | many similar | moderate | fine | moderate | whorls / few heavy | C6 pipe model (emergent from branching); no direct knob |
| twig posture | **pendulous curtains** ("branches characteristically droop") | level, tufted [u] | ascending | level sprays; flat crown on weak axes | level sprays [u] | ascending | level | ascending | level, spreading / upturned tufts | R2 `levels.2.setPoint` (≥ 80 collapses the whole crown, STATUS); **missing**: a pendulous twig level that hangs without taking the limbs with it (track B) |
| flat horizontal sprays (monolayer) | — | — | — | **yes** in shade [s]; multilayer in sun | yes [u] | — | — | — | fir: yes | R2 `generator: distichous` places the buds; **missing**: the spray's plane held level (plagiotropy by symmetry, not only by angle; Nicolini's bilateral shoots) |
| twig density | fine, sparse | dense, at the tips | moderate | very fine, dense | fine, dense, zig-zag | coarse, sparse | dense | dense, fine | regular | R2 λ and `kappa` at the twig level; R6 short shoots; the renderer draws only metamers the core grows |
| short shoots | yes, carry the leaves | — | — | yes | yes | spurs | — | — | pine: needle fascicles | R6 (`qMin`, `leafArea`) |
| sinuous / zig-zag axes | — | **yes**: age-related subapical takeover | — | zig-zag twigs | zig-zag shoots | — | — | — | old pine limbs [u] | C4 ε, σ (a random wander, not elbowed); **missing**: subapical takeover at a lost or weakened tip |
| tiers | — | — | — | young: layered [u] | — | — | weak (Massart) | — | **fir: whorls**; pine young | R2 `generator: whorled`, `whorl`, `tierEvery` |
| flat top in age | — | stag-head [s] | — | — | domed old | — | — | — | fir: stag-headed, rounded dome; **pine: flat-topped** | ADR 0031 (a growth effect; the fix is R2's reiteration, after shipping); R2 `dLambda` |
| low limbs kept in the open | yes | yes, massive | yes | low branches (Morton, Woodland Trust via Wikipedia) | yes | — | **branching from the base** | yes | fir yes / pine no | C5 `Trel` against open light; R3 `ground` |
| droop of old limbs under weight | outer limbs [u] | lower limbs [u] | — | lower limbs [u] | old limbs hang, break [s] | under fruit [s] | — | — | fir: first-order branches "finally descending" | R3 sag (E, φ) and breakage; works in principle, not tuned per species |
| reiteration (epicormics, sprouts) | virtually none (at most two crowns) | **epicormics, burrs, cat's-claw pads** | sprouts [u] | sequential reiteration builds the crown; total reiteration spreads it | coppice stools | several trunks | — | coppice stools | — | R4 release (`qRel`, bank); R2's reiteration after shipping (ADR 0031) |
| lean | to light [u] | — | leans out of the wood [u] | weak trees inclined, plagiotropic | crooked trunk | — | — | curved trunks [s] | — | C4 ξ (phototropism), R5 |
| leaf size at true scale | 2.5–7.5 cm | ≈ 10 cm | 3–12 cm | 4–10 cm | 4–12 cm | compound 12–25 cm | 2.5–7.5 cm | 3–10 cm | 1.5–3 cm / 2.5–9 cm | leaf style `cm`, `length` (all set) |
| leaf colour, summer | light green [u] | dark green [u] | **grey-green, grey below** | dark green [u] | mid green [u] | mid green [u] | **glossy near-black** [u] | matt mid green [u] | dark, white bands below / grey-green | leaf style `palette` (all set); gloss **missing** |
| flush | first [s] | last [u] | catkins first [s] | lime green [u] | early [u] | early [u] | — | early [u] | — | leaf style `flush`; catkins and flowers **missing** |
| autumn | early gold [s] | late russet [u] | dull yellow [u] | yellow, gold, orange | muted yellow, orange-brown in sun | yellow or red | — | bright yellow, sometimes red | — | leaf style `turn`, `palette` |
| marcescence | no [u] | young, coppice, low epicormics [s] | no [u] | **saplings, lower branches, hedges** | **yes, until spring** | no [u] | — | no [u] | — | leaf style `marcescent` (beech 30, hornbeam 25; oak **missing**) |
| leaf clumping along the shoot | strings on hanging twigs [u] | **clots at shoot tips** [u] | even [u] | flat layers | even [u] | **rosettes at tips** [u] | dense [u] | even [u] | pine: tufts at limb ends [u] | **missing**: one leaf per young metamer at its tip; no per-species clustering (track C) |
| fruit and flowers at distance | catkins | — | **silver-yellow catkins, March** [s] | — | — | **white flowers, red berries** [u] | **red berries on female trees** | keys | cones | **missing** (renderer) |
| bark colour | **white, black patches; black and rugged base** | grey-brown fissured [u] | grey-brown, diamond fissures | **smooth pale grey, into old age** | steel grey, vertical silver markings | smooth grey | smooth silver-grey | grey to pale brown, shallow fissures | fir: pale silvery-grey / **pine: orange-red upper stem, grey-brown plates below** | **missing**: one bark ramp for all species (`scene.css`); a per-species bark is the cheapest strong cue |
| fluting, burrs | — | burrs | — | — | **fluted, "muscled", crooked** | — | — | corky twigs | — | **missing** (renderer; minor at 20 m) |
| ontogeny 20 → 100 y | cone → open oval → dies back (60–150 y) | oval → wider than high → stag-head (to 1000 y) | bush-tree → falls apart | layered cone → dome (150–300 y) | cone → domed (250–350 y) | erect → spreading; trunks ≈ 40 y | narrow cone → rounder (to 300 y) | — | fir: pyramid → cone → stag-headed dome; pine: egg → flat top | R2 `aC`, `dLambda`, `ramp`; the pendulous and arching changes **missing**; mortality by species O4 `m0` |

### What the table says, in order of what matters at 20 m
1. **Limb curvature along the limb.** It is in four of the eight garden species' first lines (birch's arch, beech's rise-and-arch, oak's kinks, hornbeam's bow), and the vocabulary lacks it. Birch's arch now has a source (BSBI [r]); oak's kinks have a mechanism (subapical takeover with age, Sternberg [r]); beech's and hornbeam's are still [u] or [s]. Weber–Penn's `nCurve` and `nCurveBack` express it as two angles per level [r]. This is track B's first rule.
2. **Pendulous twigs that do not take the limbs with them** (birch; beech's low limbs): missing. Today `levels.2.setPoint` ≥ 80 collapses the crown instead.
3. **The trunk's division.** The sources now give a mechanism per species:
   - oak: a lost tip gives subapical co-dominant leaders or a whorl;
   - beech: forks at both extremes of vigour;
   - beech and hornbeam: Troll, "aged crowns usually are polyarchic";
   - willow: flat and polyarchic as an adult.
   - `pTerm` drops the leader but does not make *n* equal leaders. Weber–Penn's `0BaseSplits` and `nSegSplits` [r], or a sympodial reiteration (track B), would.
4. **Per-species bark** (birch white, pine orange, beech pale grey): a renderer change, likely the cheapest large gain at distance. Every bark cell is now [r] except oak's.
5. **A limb set point that changes with the limb's age** (fir: "erect at first, later horizontal, finally descending" [r]; hornbeam steep young, level old [s]): new in this pass. R3's posture holds one set point per level.
6. **Foliage clumping** (oak's clots, rowan's rosettes, pine's tufts, birch's strings) and gloss (holly): track C. All four clumping cues are still [u].
7. **Sinuous, elbowed axes** (oak, old pine): a subapical takeover at a lost or weakened tip, not random noise.
8. **Fruit and catkins** (rowan, holly, willow): seasonal colour, low priority.

## Sources
Tags as above. URLs are the ones read.

**Architecture**
- Hallé, Oldeman & Tomlinson 1978, *Tropical Trees and Forests: an Architectural Analysis*, Springer. Not read.
- Barthélémy & Caraglio 2007, *Plant architecture: a dynamic, multilevel and comprehensive approach*, Ann. Bot. 99:375–407, https://pmc.ncbi.nlm.nih.gov/articles/PMC2802949 [r] (the body text; the references tail unread).
- Barthélémy, Édelin & Hallé 1989, *Architectural concepts for tropical trees*, https://www.arboritecture.org/pdf_uploads/barthelemy/architectural-concepts-for-tropical-trees-barthelemy-edelin-halle-1989.pdf [r].
- Pfisterer 2000, *Modern models in tree architecture as a helpful tool for natural pruning*, Mitt. Biol. Bundesanst. 370:213–218, https://www.arboritecture.org/pdf/pfisterer/modern-models-in-tree-architecture-as-a-helpful-tool-for-natural-pruning-pfisterer-2000.pdf [r].
- Millet, Bouchard & Édelin 1999, *Relationship between architecture and successional status of trees in the temperate deciduous forest*, Écoscience 6:187–203, via arboritecture.org `pdf_uploads/millet/` [r].
- Millet, Bouchard & Édelin 1998, *Plagiotropic architectural development of four tree species of the temperate forest*, Can. J. Bot. 76:2100–2118. Not read.
- Prusinkiewicz & Remphrey 2000, *Characterization of architectural tree models using L-systems and Petri nets*, in Labrecque (ed.), *L'arbre – The Tree 2000*, 177–186, https://algorithmicbotany.org/papers/catm.tree2000.pdf [r].
- Bartha 2011, *Architectural models and types of the woody plants in the Pannonian Basin*, Acta Bot. Hung. 53:215–224 (restricted) [s].

**Beech architecture**
- Nicolini 2000, Can. J. Bot. 78:77–87, doi:10.1139/b99-162 (abstract) [s].
- Nicolini & Caraglio 1994, Can. J. Bot. 72:1723–1734 [r].
- Nicolini 1998, Can. J. Bot. 76:1232 (abstract) [s].
- Thiébaut 1982, Can. J. Bot. 60:1292–1303 (abstract) [s].
- Packham, Thomas, Atkinson & Degen 2012, *Biological Flora of the British Isles: Fagus sylvatica*, J. Ecol. 100:1557–1608, doi:10.1111/j.1365-2745.2012.02017.x (snippet) [s].

**Crown numbers**
- Dubois, Claessens & Ligot 2021, Forests 12:599, doi:10.3390/f12050599, https://orbi.uliege.be/bitstream/2268/260073/1/Dubois-et-al2021-BirchGrowthCrownRelease.pdf [r].
- Coombes, Martin & Slater 2019, *Defining the allometry of stem and crown diameter of urban trees*, UFUG 44:126421 [r].
- Štefančík 2017, *Crown development of beech crop trees under different thinning regimes*, J. For. Sci. 63:173–181, https://jfs.agriculturejournals.cz/pdfs/jfs/2017/04/04.pdf [r].
- Rais, Jacobs, van de Kuilen & Pretzsch 2021, Can. J. For. Res. 51:834–841, doi:10.1139/cjfr-2020-0382 (abstract) [s].
- Pretzsch et al. 2015, UFUG 14:466–479, doi:10.1016/j.ufug.2015.04.006 (open access; unread here) and Hasenauer 1997, For. Ecol. Manage. 96:197–206 (closed): the routes to open-grown W/H.

**Other species sources**
- Raspé, Findlay & Jacquemart 2000, *Biological Flora: Sorbus aucuparia*, J. Ecol. 88:910–930 (refused; its points are quoted through BSBI Fermanagh).
- Peterken & Lloyd 1967, *Biological Flora: Ilex aquifolium*, J. Ecol. 55:841–858 (through Wikipedia's citations). Nawrocki 2010, AKNHP *English holly* biography, https://accs.uaa.alaska.edu/wp-content/uploads/Ilex_aquifolium_BIO_ILAQ80.pdf [r].
- Ishihara & Kikuzawa 2004, Can. J. Bot. [s].
- San-Miguel-Ayanz et al. (eds) 2016, *European Atlas of Forest Tree Species*, JRC, https://forest.jrc.ec.europa.eu/media/atlas/ (`Fagus_sylvatica.pdf`, `Betula_spp.pdf`, `Carpinus_betulus.pdf`, `Quercus_robur_petraea.pdf`, `Abies_alba.pdf`, `Pinus_sylvestris.pdf`, `Acer_campestre.pdf`) [r]; `Salix_caprea.pdf` [s].
- Trees and Shrubs Online, https://www.treesandshrubsonline.org/articles/<genus>/<genus>-<species>/ [r]. Birch's page is `betula/pendula-for-deletion/`, which looks like a draft; *B. pubescens* returned 404.
- Sternberg, *Pruning oaks: training the young to achieve grandeur*, International Oaks 24, https://www.internationaloaksociety.org/sites/default/files/files/document/19-ios-journal-24-sternberg-sm.pdf [r].
- Percival, *Epicormic shoots*, Bartlett Tree Experts, https://www.bartlett.com/resources/Epicormic-Shoots_UK.pdf [r].
- LEAF (Wisconsin), winter twig key, 2014, https://forestry.extension.wisc.edu/files/2017/09/leaf2.pdf [r].
- Ilonen et al. 1979, Silva Fennica 13(4), https://silvafennica.fi/article/5049 (abstract) [s].
- The Gymnosperm Database, https://www.conifers.org/pi/Pinus_sylvestris.php [r].
- Field and nursery pages, cited inline:
  - [r]: RHS, Woodland Trust, Trees for Life, BSBI (Fermanagh accounts), NCSU, SAPS, EUFORGEN, Morton Arboretum, waldwissen, van den Berk, woodlands.co.uk, Naturalis, English Wikipedia species pages.
  - [s]: Kew, POWO, Ancient Tree Inventory, ebben, illinoiswildflowers, Nature's Calendar, MBG, earthwatch, bugwood, first-nature, oakleafgardening, COD, storianaturale, MDPI Forests 15:998.
- Mitchell 1974, *A Field Guide to the Trees of Britain and Northern Europe*, Collins; Johnson & More 2006, *Collins Tree Guide*: the source of the [u] claims, from memory, to be checked.

**Parameter sheets**
- Weber & Penn 1995, *Creation and rendering of realistic trees*, SIGGRAPH '95, 119–128, https://courses.cs.duke.edu/fall02/cps124/resources/p119-weber.pdf [r] (the appendix holds the four sheets).
- Arbaro presets, https://github.com/wdiestel/arbaro [r].
- tree-gen (`friggog/tree-gen`) [s].
- The Grove twigs, https://www.thegrove3d.com/twigs/ [r].
