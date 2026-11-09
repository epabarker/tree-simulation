"""Exploratory summary of the bole probe (wayfinder #88): the bare-bole page's diagnostics 1–7.
Reads runs/bole-probe/out/{garden,lone}-<cond>-s<seed>_{season,sheds}.csv. Heights in cells (4 = 1 m).
Usage: uv run --project analysis python summary.py runs/bole-probe/out <figdir>"""
import glob
import os
import sys

import polars as pl
from plotnine import aes, facet_grid, geom_histogram, geom_vline, ggplot, labs, theme, theme_bw

d, fig = sys.argv[1], sys.argv[2]
pl.Config.set_tbl_rows(300); pl.Config.set_tbl_cols(40); pl.Config.set_tbl_width_chars(260)
FOCUS = ["beech", "hornbeam", "holly"]
ORDER = ["head", "t010k3", "t025k3", "t040k3", "t025k1", "t025k5"]
W = 160  # garden width (cells), periodic in x


def load(kind: str) -> tuple[pl.DataFrame, pl.DataFrame]:
    S, X = [], []
    for f in sorted(glob.glob(f"{d}/{kind}-*_season.csv")):
        name = os.path.basename(f).removesuffix("_season.csv")
        parts = name.split("-")
        cond, seed = parts[-2], int(parts[-1][1:])
        extra = dict(cond=pl.lit(cond), seed=pl.lit(seed), run=pl.lit(name))
        S.append(pl.read_csv(f, infer_schema_length=None).with_columns(**extra))
        X.append(pl.read_csv(f.replace("_season", "_sheds"), infer_schema_length=None).with_columns(**extra))
    return pl.concat(S, how="vertical_relaxed"), pl.concat(X, how="vertical_relaxed")


def rng(c: str) -> pl.Expr:
    return (pl.col(c).min().round(2).cast(pl.Utf8) + "–" + pl.col(c).max().round(2).cast(pl.Utf8)).alias(c + "Rng")


# ---------------- garden (HEAD's: advisory) ----------------
s, x = load("garden")
s = s.with_columns(hm=pl.col.height * 0.25, clear=pl.col.boleLow / pl.col.height)
# gap/edge trees (diagnostic 6): no other live stem ≥ 0.8 of the tree's height within 5 m along x
pairs = s.select("run", "season", "tree", "rootX", "height").join(
    s.select("run", "season", pl.col.tree.alias("o"), pl.col.rootX.alias("ox"), pl.col.height.alias("oh")),
    on=["run", "season"])
pairs = pairs.filter(pl.col.tree != pl.col.o).with_columns(
    dx=((pl.col.rootX - pl.col.ox).abs()).map_elements(lambda v: min(v, W - v), return_dtype=pl.Float64))
closed = (pairs.filter(pl.col.dx <= 20, pl.col.oh >= 0.8 * pl.col.height)
          .group_by("run", "season", "tree").agg(nb=pl.len()))
s = s.join(closed, on=["run", "season", "tree"], how="left").with_columns(edge=pl.col.nb.is_null())
tall = s.filter(pl.col.hm >= 10, pl.col.species.is_in(FOCUS))

print("\n== 1. live crown base of garden stems >= 10 m (median over tree-seasons; trees = distinct trees) ==")
for win in [(45, 55), (95, 105), (140, 150)]:
    t = tall.filter(pl.col.season.is_between(*win))
    print(f"seasons {win}")
    print(t.group_by("cond", "species").agg(
        trees=pl.struct("run", "tree").n_unique(), clearMed=pl.col.clear.median().round(3),
        q10=pl.col.clear.quantile(0.1).round(3), q90=pl.col.clear.quantile(0.9).round(3),
        hMed=pl.col.hm.median().round(1), limbs=pl.col.limbs.median()).sort("species", "cond"))
print("per seed, seasons 95-150, beech/hornbeam/holly >= 10 m")
print(tall.filter(pl.col.season >= 95).group_by("cond", "species", "seed").agg(
    trees=pl.struct("run", "tree").n_unique(), clearMed=pl.col.clear.median().round(3)).sort("species", "seed", "cond"))

print("\n== 2. lowest-limb light ratio / T_rel (garden stems >= 10 m, seasons 50-150) ==")
r = tall.filter(pl.col.season >= 50).with_columns(rt=pl.col.lowRatio / pl.col.trel)
print(r.group_by("cond", "species").agg(
    ratioMed=pl.col.lowRatio.median().round(3), ratioQ10=pl.col.lowRatio.quantile(0.1).round(3),
    trel=pl.col.trel.first(), xTrelMed=pl.col.rt.median().round(2), pmMed=pl.col.lowPM.median().round(2),
    runMax=pl.col.lowRun.max()).sort("species", "cond"))
g = (ggplot(r.filter(pl.col.cond.is_in(["head", "t010k3", "t025k3", "t040k3"])).to_pandas(), aes("lowRatio"))
     + geom_histogram(bins=40) + geom_vline(aes(xintercept="trel"), linetype="dashed", colour="red")
     + facet_grid("species ~ cond", scales="free_y") + theme_bw() + theme(figure_size=(11, 5.5))
     + labs(x="lowest living first-order limb: light per metamer / Q_top", y="tree-seasons",
            title="Garden stems ≥ 10 m, seasons 50–150, seeds 1–3; red: T_rel (exploratory, HEAD's garden: advisory)"))
g.save(f"{fig}/2026-11-08-bole-probe-ratio.png", dpi=100, verbose=False)

print("\n== 3. shed causes, first-order limbs (all garden trees of the species) and all branch roots ==")
xf = x.filter(pl.col.species.is_in(FOCUS))
print(xf.filter(pl.col.firstOrder).group_by("cond", "species", "why").agg(n=pl.len(), ratioMed=pl.col.ratio.median().round(3),
      pmMed=pl.col.pm.median().round(2), baseMedM=(pl.col.baseHeight.median() * 0.25).round(2)).sort("species", "cond", "why"))
print(xf.group_by("cond", "species", "why").agg(n=pl.len(), metamers=pl.col.metamers.sum()).sort("species", "cond", "why"))

print("\n== 4. lid and crown depth (garden stems >= 10 m, seasons 95-150) ==")
print(tall.filter(pl.col.season >= 95).group_by("cond", "species").agg(
    depth=(1 - pl.col.clear).median().round(3), leafyMed=pl.col.leafy.median(), top5=pl.col.leafTop5.median().round(3),
    low6=pl.col.leafLow6.median().round(3), hMed=pl.col.hm.median().round(1)).sort("species", "cond"))
print("stand: live stems, >= 1.3 m, >= 10 m, and planted survivors (seasons 50/100/150; median over seeds)")
st = s.filter(pl.col.season.is_in([49, 99, 149])).group_by("cond", "seed", "season").agg(
    alive=pl.len(), drawn=(pl.col.hm >= 1.3).sum(), tall=(pl.col.hm >= 10).sum(),
    beechHorn10=((pl.col.hm >= 10) & pl.col.species.is_in(["beech", "hornbeam"])).sum())
print(st.group_by("cond", "season").agg(pl.col("alive", "drawn", "tall", "beechHorn10").median()).sort("season", "cond"))

print("\n== 6. edge/gap trees (no stem >= 0.8 H within 5 m along x) vs closed, garden >= 10 m, seasons 95-150 ==")
print(tall.filter(pl.col.season >= 95).group_by("cond", "species", "edge").agg(
    treeSeasons=pl.len(), clearMed=pl.col.clear.median().round(3)).sort("species", "cond", "edge"))

print("\n== 7. re-clothing: first-order limbs born below last season's lowest limb (garden, all seasons) ==")
print(s.filter(pl.col.species.is_in(FOCUS), pl.col.season >= 10).group_by("cond", "species").agg(
    sprouts=pl.col.sproutsBelow.sum(), sproutsTall=pl.col.sproutsBelow.filter(pl.col.hm >= 10).sum(),
    treeSeasonsTall=(pl.col.hm >= 10).sum()).sort("species", "cond"))

# ---------------- lone open-grown guard (60 m box) ----------------
print("\n== 5. lone open-grown guard (60 m box), season 100 ==")
ls, lx = load("lone")
l100 = ls.filter(pl.col.season == 100).with_columns(hm=pl.col.height * 0.25, clear=pl.col.boleLow / pl.col.height)
head = l100.filter(pl.col.cond == "head").select("species", "seed", h6=pl.col.leafLow6, h5=pl.col.leafTop5, hl=pl.col.leafy)
g5 = l100.join(head, on=["species", "seed"]).with_columns(
    low6Rel=(pl.col.leafLow6 / pl.col.h6).round(2), top5Rel=(pl.col.leafTop5 / pl.col.h5).round(2),
    leafyRel=(pl.col.leafy / pl.col.hl).round(2))
print(g5.select("species", "cond", "seed", pl.col.hm.round(1), "limbs", pl.col.clear.round(3), pl.col.leafLow6.round(3),
                "low6Rel", pl.col.leafTop5.round(3), "top5Rel", "leafy", "leafyRel").sort("species", "cond", "seed"))
print(lx.filter(pl.col.firstOrder).group_by("cond", "species", "why").agg(n=pl.len()).sort("species", "cond", "why"))
print("lone re-clothing (sprouts below the lowest limb), seasons 10-100")
print(ls.filter(pl.col.season >= 10).group_by("cond", "species").agg(sprouts=pl.col.sproutsBelow.sum()).sort("species", "cond"))
s.write_csv(f"{d}/garden_all.csv")
