# Y2: lower lone height, keep the crown (hornbeam, rowan, oak), 2026-11-06

Build: `claude/garden-0.16.0` (d2c4f53; worktree y2/wt, native treesim), lone trial (oakOpen, cli/trials.ts loneParams), dotted-path species patches,
seeds 1-5 (unless marked 1-2 = screening), 150 seasons. Measures: A's (a/code/probe.py): D, W/H (4-azimuth, T's measure, d_min coarsened),
metamers (tree 0), height in m. Data: full.csv (all measured rows), screen/full logs `full*.log`. Code: y2/code/.
Rows marked "ac" use A's `a-crown` build (b783d73), where `r2.dLambdaTrunk` (A's F3) exists; it is the only non-garden-build param here.

## The mechanism that works: R1's reproductive sink as a height ceiling
`r1.fRep` (share of the surplus going to reproduction once height >= `r1.maturity`, in cells; 4 cells = 1 m) at 0.8 or more is a hard ceiling:
the surplus no longer feeds v_base, the leader stops at about `maturity` cells and the crown keeps filling out below it. fRep 0.6 only slows
(35-38 m at 150); fRep 0.8 and 0.95 are identical (height pinned). Height = 0.25 x maturity (+0 to 1 m). It does **not** starve the crown the way
L_h does: metamers stay at 0.5-0.9x shipped, and the crown is lone-tree broad. Lh trade (seed 1, hornbeam, metamers at 100): Lh 30 = 19.9k (0.30x), Y's
Lh 10 + dLambda .06 = 3.7k (0.06x). The shape issue left by the cap is a flat lid (D 0.12 at the shipped dLambda), cured by dLambda or A's F3.

Caveat: fRep feeds `seed_pool` (O4 seed rain), so in a stand the cap changes recruitment; needs a G-forest check before it is adopted.

## Hornbeam (lone; shipped: 26.8 / 37.1 / 48.8 m at 60/100/150, metamers 67.1k at 100, W/H 0.67, D 0.07)
Targets: height 20-25 m lone mature, <= 32 m at 150; metamers >= 0.6x (40.2k at 100); W/H in 0.51-0.73; D >= 0.25.

| setting | build | seeds | H 60/100/150 m | metamers 100 (x shipped) | W/H 100 | D 100 (seeds D>=.25 of n) | verdict |
|---|---|---|---|---|---|---|---|
| shipped | g | 5 | 26.8/37.1/48.8 | 67.1k (1.00) | 0.67 | 0.07 (0/5) | height fails |
| Y: Lh 10 + dLambda .06 | g | 5 (A) | 17.9/20.7/23.8 | 3.7k (0.06) | 0.36 | -0.34 | crown starved |
| Lh 30 | g | 1 | 22.1/29.1/37.4 | 19.9k (0.30) | 0.75* | - | metamers fail, still tall |
| fRep .5, mat 70 | g | 1 | 24.0/32.7/44.5 | 35.4k (0.53) | - | - | not a stop |
| fRep .8, mat 70 / 90 | g | 1 | 17.6 / 23.1 flat | 18.0k / 34.4k (0.27 / 0.51) | - | - | metamers fail |
| fRep .6 mat 90-100 | g | 1 | 24-26/29-30/35-38 | 36-42k | - | - | not a stop |
| fRep .8, mat 100 | g | 5 | 25.1/25.1/25.1 | 41.1k (0.61) | 0.75 | 0.12 (0/5) | D fails, W/H just over |
| fRep .8, mat 95 | g | 5 | 24.1 flat | 38.0k (0.57) | 0.75 | 0.16 (0/5) | D fails |
| fRep .7, mat 90 | g | 5 | 23.5/26.3/29.3 | 34.4k (0.51) | 0.66 | 0.16 (0/5) | slow stop; D, metamers fail |
| fRep .8, mat 100 + dLambda .04 | g | 2 | 25.6 flat | 21.1k (0.32) | 0.45 | 0.94 | narrow, metamers fail |
| ... + dLambda .065 | g | 2 | 25.3 flat | 24.6k (0.37) | 0.57 | 0.81 | metamers fail |
| ... + dLambda .07 | g | 2 | 25.3 flat | 27.6k (0.41) | 0.60 | 0.62 | metamers fail |
| ... + dLambda .075 | g | 2 | 25.3 flat | 37.2k (0.55) | 0.73 | 0.32 | borderline |
| ... + dLambda .0775 | g | 2 | 25.2 flat | 39.1k (0.58) | 0.74 | 0.23 | borderline |
| ... + dLambda .12 | g | 2 | 24.1/25.2/25.2 | 57.2k (0.85) | 0.99 | 0.05 | too wide, flat |
| ... + dLambda .2 | g | 2 | 23.2/29.5/37.5 | 61.9k | 0.91 | -0.09 | cap leaks, bowl |
| fRep .8, mat 100, dLambda .075 | g | 5 | 25.3/25.3/25.3 | 36.7k (0.55) | 0.74 | 0.33 (4/5) | metamers just short |
| fRep .8, mat 110, dLambda .075 | g | 5 | 28.1/28.0/28.0 | 43.0k (0.64) | 0.72 | 0.25 (2/5) | D marginal |
| fRep .8, mat 110, dLambda .0725 | g | 5 | 27.7/27.8/27.8 | 38.8k (0.58) | 0.66 | 0.38 (5/5) | metamers just short |
| **fRep .8, mat 115, dLambda .0725** | g | 5 | 29.2/29.1/29.1 | 41.3k (0.62) | 0.65 | 0.34 (5/5) | **passes all four** |
| ac: dLambdaTrunk + fRep .8, mat 105 | ac | 5 | 26.2/26.8/26.8 | 38.3k (0.57) | 0.63 | 0.36 (5/5) | metamers just short |
| **ac: dLambdaTrunk + fRep .8, mat 115** | ac | 5 | 26.2/29.1/29.1 | 42.8k (0.64) | 0.60 | 0.31 (5/5) | **passes all four** |
| ac: dLambdaTrunk alone (A's F3) | ac | 2 | 25.7/35.7/43.8 | 55.7k | 0.50 | 0.26 | tall |

(*) W/H from metrics' crownWidth/height in the screening-only rows (not T's measure).

**Verdict hornbeam: `{"r1.fRep":0.8,"r1.maturity":115,"r2.dLambda":0.0725}` passes all four on the garden build, params only**
(H 29.1 m at 100 and 150: inside Lockow's SI-32 (32 m) and Tallo's q90 (31 m), above the 20-25 m "lone mature" ask; 5/5 seeds have D >= 0.25).
Trade-offs, honestly: height follows `maturity` linearly (0.25 m per cell), metamers follow height, so the metamer floor (0.6x of a 37 m tree) and a
22-25 m tree cannot both hold: at 25 m (mat 100) the best is 0.55-0.58x. Choose mat 105-110 (26-28 m, 0.57-0.58x) if the height ask outweighs the metamer ask.
dLambda is the sensitive lever: the crown switches between narrow/dense-leader (<= 0.07) and flat/wide (>= 0.0775) within 0.01; 0.0725 sits in the
dome window, so it needs the 20-seed/other-seed check. dLambda 0.0725 also lifts juvenile height a little (29.2 m at 60 vs shipped 26.8).
Variant on A's build (needs A's `dLambdaTrunk` code): same cap with F3, wider dome window, mat 115: 0.64x, D 0.31, W/H 0.60 on 5/5 seeds.

## Rowan (shipped: 24.5/29.8/32.8 m; band ~17 (Chapman-Richards) to Tallo q10 21; no rowan lone crown target, T's hornbeam band used as a generic W/H)
| setting | seeds | H 60/100/150 | metamers 100 (x shipped 18.2k) | W/H 100 | D 100 (n>=.25) |
|---|---|---|---|---|---|
| shipped | 5 | 24.5/29.8/32.8 | 18.2k | 0.50 | 0.09 (2/5) |
| Y: Lh 8 | A/Y | 8.8@20, 16.5@100 | not measured | | |
| fRep .8, mat 70 | 2 | 17.8 flat | 13.0k (0.71) | 0.80 | 0.23 |
| fRep .8, mat 75 | 5 | 19.0 flat | 13.8k (0.76) | 0.76 | 0.22 (2/5) |
| **fRep .8, mat 80** | 5 | 20.3 flat | 14.4k (0.79) | 0.73 | 0.30 (3/5) |
| **fRep .8, mat 85** | 5 | 21.6 flat | 15.2k (0.84) | 0.70 | 0.33 (4/5) |

**Verdict rowan: `{"r1.fRep":0.8,"r1.maturity":85}` passes** (21.6 m, 1.27x the 17 m curve and at Tallo's q10; metamers 0.84x; D 0.33; W/H 0.70);
mat 80 is the lower-height variant (20.3 m, W/H at the 0.73 edge, D 0.30 on 3/5). mat 70 matches the 17 m curve but is a wide flat lid.

## Oak (shipped: 34.3/44.6/50.9 m; NW-FVA 21-33 at 100, Tallo q50 34; lone crown: oak W/H 0.64 [0.55-0.82], D 0.36 [0.16-0.59])
| setting | seeds | H 60/100/150 | metamers 100 (x shipped 29.6k) | W/H 100 | D 100 |
|---|---|---|---|---|---|
| shipped | 5 | 34.3/44.6/50.9 | 29.6k | 0.50 | 2.30 (pointed leader) |
| Y: Lh 15 | A/Y | 29.7@100, 37.8@150 | not measured | | |
| fRep .8, mat 120 | 5 | 30.9/30.9/31.2 | 30.4k (1.03) | 0.77 | 1.18 |
| **fRep .8, mat 130** | 5 | 33.1/33.3/33.2 | 31.0k (1.05) | 0.71 | 1.36 |

**Verdict oak: `{"r1.fRep":0.8,"r1.maturity":130}` passes** (33.2 m flat from 60, on Tallo's q50 and NW-FVA's best class; metamers 1.05x; W/H 0.71 inside 0.55-0.82; D 1.36 is a
pointed leader as shipped, not the real lone oak's 0.36: that is a separate crown problem, unchanged by the cap). Oak reaches 33 m by season 60, so the cap leaves its juvenile curve alone.

## Not done / suspicions
- No G-forest (stand) check; fRep raises O4 seed rain for capped species.
- The cap is a ceiling, not a mechanism of ageing: heights are flat from the cap season on. The shipped curve plateau (Lh) is not what stops height here.
- Why Lh starves: hyperbolic/exp discount at path length L multiplies production of the whole crown, not just the leader, so Lh <= 30 drops outer-crown carbon (metamers 0.06-0.3x).
Sheet: y2/sheet.png (hornbeam at 100 and 150: shipped, garden patch, A-build patch).
