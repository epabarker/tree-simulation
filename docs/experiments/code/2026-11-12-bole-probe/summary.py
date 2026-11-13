"""Exploratory summary of the #126 bare-bole probe: the page's diagnostics in the 0062/0063 garden.
Reads runs/bole126/out/{garden,lone}-*.csv (bole_limbs). Heights in cells (4 = 1 m).
Usage: uv run --project analysis python summary.py runs/bole126/out <figdir> [step1]"""
import glob
import os
import sys

import polars as pl

d, fig = sys.argv[1], sys.argv[2]
step1 = len(sys.argv) > 3 and sys.argv[3] == "step1"
pl.Config.set_tbl_rows(400); pl.Config.set_tbl_cols(40); pl.Config.set_tbl_width_chars(260)
pl.Config.set_tbl_hide_dataframe_shape(True); pl.Config.set_tbl_hide_column_data_types(True)
FOCUS = ["beech", "hornbeam", "holly"]
ORDER = ["head", "t010k3", "t025k3", "t040k3", "t010k6", "t025k6", "t040k6"]
W, D = 160, 64  # the garden's width and depth period (cells), periodic on both axes
GAP_R = 20  # 5 m
TALL = 40  # 10 m


def load(kind: str) -> pl.DataFrame:
    out = []
    for f in sorted(glob.glob(f"{d}/{kind}-*.csv")):
        name = os.path.basename(f).removesuffix(".csv")
        parts = name.split("-")
        cond, seed = parts[-2], int(parts[-1][1:])
        out.append(pl.read_csv(f, infer_schema_length=None, null_values=["NaN", "inf"]).with_columns(
            cond=pl.lit(cond), seed=pl.lit(seed), run=pl.lit(name)))
    return pl.concat(out, how="diagonal_relaxed").with_columns(hm=pl.col.height * 0.25)


def gaps(s: pl.DataFrame) -> pl.DataFrame:
    """Gap trees (the edge proxy; the garden has no edges): no other stem >= 0.8 H within 5 m,
    distances wrapped on both periodic axes."""
    a = s.select("run", "season", "tree", "rootX", "rootZ", "height")
    b = s.select("run", "season", o=pl.col.tree, ox=pl.col.rootX, oz=pl.col.rootZ, oh=pl.col.height)
    p = a.join(b, on=["run", "season"]).filter(pl.col.tree != pl.col.o, pl.col.oh >= 0.8 * pl.col.height)
    dx = (pl.col.rootX - pl.col.ox).abs()
    dz = (pl.col.rootZ - pl.col.oz).abs()
    p = p.with_columns(dx=pl.min_horizontal(dx, W - dx), dz=pl.min_horizontal(dz, D - dz))
    near = p.filter(pl.col.dx ** 2 + pl.col.dz ** 2 <= GAP_R ** 2).group_by("run", "season", "tree").agg(nb=pl.len())
    return s.join(near, on=["run", "season", "tree"], how="left").with_columns(gap=pl.col.nb.is_null())


def q(c: str, k: float) -> pl.Expr:
    return pl.col(c).quantile(k).round(3)


s = gaps(load("garden"))
s = s.with_columns(lowest_darkest=(pl.col.lowRatio <= pl.col.minRatio + 1e-12))
tall = s.filter(pl.col.height >= TALL, pl.col.species.is_in(FOCUS))
conds = [c for c in ORDER if c in s["cond"].unique().to_list()]

print("== 0. stand: live stems >= 1.3 m and >= 10 m (beech / hornbeam / holly >= 10 m), per seed ==")
for season in [50, 100, 150]:
    st = s.filter(pl.col.season == season).group_by("cond", "seed").agg(
        drawn=pl.len(), tall=(pl.col.height >= TALL).sum(),
        beech10=((pl.col.height >= TALL) & (pl.col.species == "beech")).sum(),
        hornbeam10=((pl.col.height >= TALL) & (pl.col.species == "hornbeam")).sum(),
        holly10=((pl.col.height >= TALL) & (pl.col.species == "holly")).sum(),
        hollyDrawn=(pl.col.species == "holly").sum(), topM=pl.col.hm.max().round(1))
    print(f"season {season}"); print(st.sort("cond", "seed"))

print("\n== 1/2. lowest living limb's light ratio (Q_b/n_b / Q_top), stems >= 10 m, seasons 50-150 ==")
r = tall.filter(pl.col.season >= 50)
print(r.group_by("cond", "species").agg(
    trees=pl.struct("run", "tree").n_unique(), treeSeasons=pl.len(),
    low10=q("lowRatio", 0.1), lowMed=q("lowRatio", 0.5), low90=q("lowRatio", 0.9),
    medRatio=q("medRatio", 0.5), minRatio=q("minRatio", 0.5),
    lowestIsDarkest=pl.col.lowest_darkest.mean().round(2),
    lcbMed=q("liveCrownBase", 0.5), lowBaseM=(pl.col.lowBase.median() * 0.25).round(2),
    trel=pl.col.trel.first()).sort("species", "cond"))
print("by gap/closed (HEAD and every cell)")
print(r.group_by("cond", "species", "gap").agg(
    treeSeasons=pl.len(), lowMed=q("lowRatio", 0.5), medRatio=q("medRatio", 0.5),
    lcbMed=q("liveCrownBase", 0.5)).sort("species", "cond", "gap"))
print("all drawn stems (>= 1.3 m), seasons 50-150")
print(s.filter(pl.col.season >= 50, pl.col.species.is_in(FOCUS)).group_by("cond", "species").agg(
    treeSeasons=pl.len(), low10=q("lowRatio", 0.1), lowMed=q("lowRatio", 0.5), low90=q("lowRatio", 0.9),
    medRatio=q("medRatio", 0.5), lowestIsDarkest=pl.col.lowest_darkest.mean().round(2),
    lcbMed=q("liveCrownBase", 0.5)).sort("species", "cond"))
if step1:
    s.write_csv(f"{d}/garden_all.csv")
    sys.exit(0)

# ---------------- the grid ----------------
late = tall.filter(pl.col.season.is_between(100, 150))
print("\n== 1. live crown base, stems >= 10 m, seasons 100-150 (tree-season median; q10-q90; share in 0.3-0.45) ==")
for by in (["cond", "species"], ["cond", "species", "gap"]):
    print(late.group_by(by).agg(
        trees=pl.struct("run", "tree").n_unique(), treeSeasons=pl.len(),
        lcb=q("liveCrownBase", 0.5), q10=q("liveCrownBase", 0.1), q90=q("liveCrownBase", 0.9),
        inBand=pl.col.liveCrownBase.is_between(0.3, 0.45).mean().round(2),
        hMed=pl.col.hm.median().round(1)).sort("species", "cond", *by[2:]))
print("the scaffold's base: the lowest living limb of >= 10 metamers over the height (sprouts set aside)")
print(late.group_by("cond", "species").agg(
    smallLowest=(pl.col.lowN <= 2).mean().round(2),
    scaffold=(pl.col.bigBase / pl.col.height).median().round(3),
    scaffoldQ90=(pl.col.bigBase / pl.col.height).quantile(0.9).round(3),
    inBand=(pl.col.bigBase / pl.col.height).is_between(0.3, 0.45).mean().round(2),
    bigRatio=q("bigRatio", 0.5)).sort("species", "cond"))
print("per seed (beech, hornbeam), seasons 100-150")
print(late.filter(pl.col.species != "holly").group_by("cond", "species", "seed").agg(
    trees=pl.struct("run", "tree").n_unique(), lcb=q("liveCrownBase", 0.5),
    scaffold=(pl.col.bigBase / pl.col.height).median().round(3)).sort("species", "seed", "cond"))
print("holly, every drawn stem (advisory where none reaches 10 m), seasons 100-150")
print(s.filter(pl.col.species == "holly", pl.col.season.is_between(100, 150)).group_by("cond").agg(
    trees=pl.struct("run", "tree").n_unique(), lcb=q("liveCrownBase", 0.5), q90=q("liveCrownBase", 0.9),
    hMed=pl.col.hm.median().round(1)).sort("cond"))

print("\n== 2. lowest-limb ratio against T_rel, stems >= 10 m, seasons 50-150 (rows above) ==")

print("\n== 3. shed causes, first-order limbs, every drawn stem of the species, seasons 1-150 ==")
sh = s.filter(pl.col.species.is_in(FOCUS)).group_by("cond", "species").agg(
    relative=pl.col.shedRelative.sum(), carbon=pl.col.shedCarbon.sum(), both=pl.col.shedBoth.sum())
sh = sh.with_columns(relShare=((pl.col.relative + pl.col.both) / (pl.col.relative + pl.col.carbon + pl.col.both)).round(2))
print(sh.sort("species", "cond"))
print("stems >= 10 m only")
sh = tall.group_by("cond", "species").agg(
    relative=pl.col.shedRelative.sum(), carbon=pl.col.shedCarbon.sum(), both=pl.col.shedBoth.sum())
print(sh.with_columns(relShare=((pl.col.relative + pl.col.both) / (pl.col.relative + pl.col.carbon + pl.col.both)).round(2)).sort("species", "cond"))

print("\n== 4. lid and crown depth, stems >= 10 m, seasons 100-150 ==")
lid = late.group_by("cond", "species").agg(
    top5=q("topFifthLeaf", 0.5), low6=q("leafBelowSixth", 0.5), buds=pl.col.buds.median(),
    crownLenM=(pl.col.crownLength.median() * 0.25).round(1), width=(pl.col.crownWidth.median() * 0.25).round(1),
    medRatio=q("medRatio", 0.5), darkShare=q("darkShare", 0.5))
h = lid.filter(pl.col.cond == "head").select("species", h5=pl.col.top5, hb=pl.col.buds)
print(lid.join(h, on="species").with_columns(top5Rel=(pl.col.top5 / pl.col.h5).round(2),
      budsRel=(pl.col.buds / pl.col.hb).round(2)).drop("h5", "hb").sort("species", "cond"))

print("\n== 7. re-clothing: sprouts from bole scars (boleSprouts) ==")
print(s.filter(pl.col.species.is_in(FOCUS)).group_by("cond", "species").agg(
    all=pl.col.boleSprouts.sum(), tall=pl.col.boleSprouts.filter(pl.col.height >= TALL).sum(),
    tallTreeSeasons=(pl.col.height >= TALL).sum()).sort("species", "cond"))

print("\n== sanity: k-cells, surviving limbs with a dark run >= kRel (should be none past the grace) ==")
print(s.filter(pl.col.krel > 1).group_by("cond", "species").agg(
    lowDarkMax=pl.col.lowDark.max(), overK=(pl.col.lowDark >= pl.col.krel).sum()).sort("species", "cond"))

# ratio histogram
from plotnine import (  # noqa: E402
    aes, coord_cartesian, facet_grid, geom_histogram, geom_vline, ggplot, labs, theme, theme_bw)

r = tall.filter(pl.col.season >= 50, pl.col.species != "holly", pl.col.cond.is_in(["head", "t010k3", "t025k3", "t040k3"]))
g = (ggplot(r.filter(pl.col.lowRatio <= 2).to_pandas(), aes("lowRatio")) + geom_histogram(binwidth=0.05)
     + coord_cartesian(xlim=(0, 2))
     + geom_vline(aes(xintercept="trel"), linetype="dashed", colour="red")
     + facet_grid("species ~ cond", scales="free_y") + theme_bw() + theme(figure_size=(11, 5))
     + labs(x="lowest living first-order limb: light per metamer / Q_top", y="tree-seasons",
            title="0062/0063 garden, stems ≥ 10 m, seasons 50–150, seeds 1–3 (exploratory); red: T_rel"))
g.save(f"{fig}/2026-11-12-bole-probe-ratio.png", dpi=90, verbose=False)
s.write_csv(f"{d}/garden_all.csv")

# ---------------- the lone open-grown guard ----------------
if not glob.glob(f"{d}/lone-*.csv"):
    sys.exit(0)
L = load("lone")
out_seeds = L.filter(pl.col.budsOutside > 0).group_by("species", "cond", "seed").agg(first=pl.col.season.min())
print("\n== 5. lone guard: seeds excluded (budsOutside > 0, ADR 0062 amendment) ==")
print(out_seeds.sort("species", "cond", "seed"))
l100 = L.filter(pl.col.season == 100).join(out_seeds, on=["species", "cond", "seed"], how="anti")
M = ["leafBelowSixth", "topFifthLeaf", "buds", "liveCrownBase"]
hd = l100.filter(pl.col.cond == "head")
print("HEAD, held seeds of 1-20, season 100: median, q05, q95, CV, and the noise floor (q05/median, q95/median)")
fl = hd.group_by("species").agg(n=pl.len(), *[e for m in M for e in (
    pl.col(m).median().alias(m + "Med"), pl.col(m).quantile(0.05).alias(m + "Q05"),
    pl.col(m).quantile(0.95).alias(m + "Q95"), (pl.col(m).std() / pl.col(m).mean()).round(2).alias(m + "CV"))])
for m in M:
    print(fl.select("species", "n", pl.col(m + "Med").round(3), pl.col(m + "CV"),
                    lo=(pl.col(m + "Q05") / pl.col(m + "Med")).round(2), hi=(pl.col(m + "Q95") / pl.col(m + "Med")).round(2)))
pt = l100.filter(pl.col.cond != "head", pl.col.seed <= 3).join(fl, on="species")
hs = hd.select("species", "seed", *[pl.col(m).alias("h_" + m) for m in M])
pt = pt.join(hs, on=["species", "seed"], how="left")
checks = [
    ((pl.col.leafBelowSixth >= pl.col.leafBelowSixthQ05) & (pl.col.leafBelowSixth <= pl.col.leafBelowSixthQ95)).alias("low6Ok"),
    ((pl.col.topFifthLeaf >= pl.col.topFifthLeafQ05) & (pl.col.topFifthLeaf <= pl.col.topFifthLeafQ95)).alias("top5Ok"),
    (pl.col.buds >= pl.col.budsQ05).alias("budsOk"),
    (pl.col.liveCrownBase <= pl.col.liveCrownBaseQ95).alias("lcbOk"),
]
print("patched seeds 1-3 at season 100, against HEAD's held range (q05-q95 of seeds 1-20) and its same seed")
print(pt.with_columns(*checks).select(
    "species", "cond", "seed", pl.col.leafBelowSixth.round(3), (pl.col.leafBelowSixth / pl.col.h_leafBelowSixth).round(2).alias("low6/same"),
    pl.col.topFifthLeaf.round(3), (pl.col.topFifthLeaf / pl.col.h_topFifthLeaf).round(2).alias("top5/same"),
    "buds", (pl.col.buds / pl.col.h_buds).round(2).alias("buds/same"), pl.col.liveCrownBase.round(3),
    "low6Ok", "top5Ok", "budsOk", "lcbOk").sort("species", "cond", "seed"))
print(L.filter(pl.col.cond != "head").group_by("species", "cond").agg(
    relative=pl.col.shedRelative.sum(), carbon=pl.col.shedCarbon.sum(), both=pl.col.shedBoth.sum(),
    sprouts=pl.col.boleSprouts.sum()).sort("species", "cond"))
