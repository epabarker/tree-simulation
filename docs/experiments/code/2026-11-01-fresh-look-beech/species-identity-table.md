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

