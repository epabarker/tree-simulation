# Is the size-related slowing of shoot extension a carbon-supply or a sink limit? (issue #83)

_Researched 2026-11-08 during the grilling for [Which mechanism rounds a crown?](https://github.com/epabarker/tree-simulation/issues/83). An addendum to the [crown note](https://github.com/epabarker/tree-simulation/blob/research/crown-rounding/docs/research/2026-11-08-crown-rounding.md) §1.2, which ranked a path-length limit on extension first. Question: should the model put that limit into allocation (C3 splits on what a bud *produces*, Q·d(L)) or cap extension at the tip (a sink limit)? Abstracts only, via PubMed and Consensus; no full texts were read for this addendum._

## Findings

- **The carbon-supply reading.** Ryan & Yoder (1997) framed the hydraulic limit as a carbon limit: stomata close earlier, assimilation falls, growth falls (crown note §1.2). Allocating on Q·d(L) models that reading.
- **The evidence against it.** Woodruff & Meinzer (2011), *Plant Cell Environ.* 34: 1920–1930, [DOI 10.1111/j.1365-3040.2011.02388.x](https://doi.org/10.1111/j.1365-3040.2011.02388.x) [abs, PubMed]: in Douglas-fir from 2 to 57 m, non-structural carbohydrates are highest in the tallest trees (branch NSC 30–377% above the 2 m trees), and NSC is inversely correlated with shoot extension. They conclude that the size-related growth decline "is not strongly associated with constraints on photosynthesis"; mobilisation is constrained by turgor-driven expansion or phloem transport.
- **The sink (turgor) reading.**
  - Woodruff et al. (2004), *Plant Cell Environ.*, "Does turgor limit growth in tall trees?" [abs]: turgor falls with height (gravity adds 0.01 MPa per m), osmotic adjustment does not fully compensate, and branch elongation, leaf size and leaf mass per area follow the turgor trend.
  - Meinzer et al. (2008), *Tree Physiol.*, "Biophysical constraints on leaf expansion in a tall conifer" [abs]: bulk turgor falls about 0.011 MPa per m of height during needle expansion. Elongation tracks plastic extensibility, the Lockhart quantity.
  - Chin & Sillett (2016), *Am. J. Bot.* 103: 796–807, [DOI 10.3732/ajb.1600110](https://doi.org/10.3732/ajb.1600110) [abs, PubMed]: in *Sequoiadendron* up to 95 m, shoot expansion is constrained by the hydrostatic gradient.
  - Potkay et al. (2021), *Tree Physiol.* [abs]: a turgor-driven, sink-limited growth model reproduces realistic heights, growth rates and metabolic scaling over a tree's life.
- **Dissent.** Segovia-Rivas et al. (2023), *Integr. Comp. Biol.*, and Alemán-Sancheschúlz et al. (2024, bioRxiv preprint) find no cell-size signature of a turgor limit and argue for selection rather than limitation. They dispute the framing, not the measured turgor gradient.
- **Branch autonomy.** In summer, branches mostly run on their own carbon: Lacointe et al. (2004), *Plant Cell Environ.* (walnut, ≈ 1% exchange between branches) and Hoch (2005), *Plant Cell Environ.* (fruiting branchlets of *Carpinus*, *Fagus* and *Tilia* fully autonomous). But in spring, new shoots draw mainly on tree-wide reserves (Lacointe 2004). Sprugel (2002), *Tree Physiol.*: a branch's priority depends on its position relative to the others, not only on its own carbon budget. Shoot extension falls in that spring window, so autonomy does not support allocating on local production.
- **FSPM precedent.** Sievänen et al. (2018), *Ann. Bot.* [abs]: in LIGNUM fitted to laser-scanned Scots pine, the Extended Borchert–Honda rule on light and position, plus local density control, worked best. There is no hydraulic weight in allocation.

## What it means for the model

- The literature supports a **sink limit at the tip** over a carbon-weighted allocation. The tree has the carbon; the tips cannot use it.
- The water-potential drop has a **gravity** term in height (≈ 0.01 MPa per m) and a **friction** term in path length. In the measured tall conifers, gravity dominates (Koch 2004, crown note §1.2: about two-thirds of midday xylem pressure). For a 30 m broadleaf, the split is unmeasured.
- Only the friction term penalises long low limbs. Gravity alone caps the top, and would likely make a flat cap rather than fill an oak's upper flank.
- **Caveats:** every study here is a conifer; the abstracts were read, not the full texts.
