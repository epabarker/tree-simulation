"""Exploratory (seeds 1-3): lone exemplars in the open-grown box against the half-walled box.

Reads runs/open-box/{cap,prune}/<cond>-<species>-s<seed>_*.csv (cond: open | wall), written by
rust/core/examples/cap_probe.rs and prune_probe.rs. The crown geometry follows the flat-cap note's
summary.py (#79): leafy buds give leafLo (5th percentile of leaf height), the frontal half-width w
(95th percentile of |dx|), and rho, theta about the crown's centre; shell rho >= 0.7, flank 30-60
degrees from vertical. Cells are 0.25 m.

    uv run --project analysis python docs/experiments/code/2026-11-08-open-box/summary.py runs/open-box
"""
import sys, glob, os
import polars as pl

d = sys.argv[1]
M = 0.25
pl.Config.set_tbl_rows(400); pl.Config.set_tbl_cols(40); pl.Config.set_tbl_width_chars(260)
SECT = pl.when(pl.col.theta < 30).then(pl.lit("1 top")).when(pl.col.theta < 60).then(pl.lit("2 flank")) \
    .when(pl.col.theta < 120).then(pl.lit("3 side")).otherwise(pl.lit("4 below"))


def load(sub, kind):
    out = []
    for f in sorted(glob.glob(f"{d}/{sub}/*_{kind}.csv")):
        case = os.path.basename(f).removesuffix(f"_{kind}.csv")
        cond, sp, seed = case.split("-")
        if os.path.getsize(f) == 0:
            continue
        df = pl.read_csv(f, infer_schema_length=None)
        if df.height:
            out.append(df.drop("species", strict=False).with_columns(
                case=pl.lit(case), cond=pl.lit(cond), sp=pl.lit(sp), seed=pl.lit(int(seed[1:]))))
    return pl.concat(out, how="vertical_relaxed")


S, B, N, X = (load("cap", k) for k in ("season", "buds", "new", "sheds"))
P = load("prune", "season")
K = ["cond", "sp", "seed"]
leafy = B.filter(pl.col.leaf > 0)
geo = leafy.group_by(*K, "season").agg(
    leafLo=pl.col.dy.quantile(0.05), w=pl.col.dx.abs().quantile(0.95), q90=pl.col.q.quantile(0.9),
    wL=pl.col.dx.quantile(0.02), wR=pl.col.dx.quantile(0.98),
    zL=pl.col.dz.quantile(0.02), zR=pl.col.dz.quantile(0.98),
).join(S.select(*K, "season", "height"), on=[*K, "season"])
geo = geo.with_columns(yc=(pl.col.leafLo + pl.col.height) / 2, hh=(pl.col.height - pl.col.leafLo) / 2)


def place(df, on="season"):
    df = df.join(geo.select(*K, pl.col.season.alias(on), "w", "yc", "hh", "height", "q90", "leafLo"), on=[*K, on])
    return df.with_columns(u=pl.col.dx / pl.col.w, v=(pl.col.dy - pl.col.yc) / pl.col.hh).with_columns(
        rho=(pl.col.u ** 2 + pl.col.v ** 2).sqrt(),
        theta=pl.arctan2(pl.col.u.abs(), pl.col.v).degrees(),
        rel=pl.col.dy / pl.col.height,
    ).filter(pl.col.theta.is_not_nan()).with_columns(sector=SECT, shell=pl.col.rho >= 0.7)


lb = place(leafy).with_columns(qn=pl.col.q / pl.col.q90)
nw = place(N)
X = X.with_columns(dump=(pl.col.season // 10) * 10)
xs = place(X, on="dump")

SEAS = [30, 60, 100]
top5 = lb.group_by(*K, "season").agg(top5=(pl.col.leaf * (pl.col.rel >= 0.8)).sum() / pl.col.leaf.sum())
env = lb.filter((pl.col.theta - 45).abs() < 7.5).group_by(*K, "season").agg(r45=pl.col.rho.quantile(0.95))
band = lb.with_columns(b=((pl.col.dy - pl.col.leafLo) / (pl.col.height - pl.col.leafLo) * 10).floor().clip(0, 9)) \
    .group_by(*K, "season", "b").agg(bw=pl.col.dx.quantile(0.98) - pl.col.dx.quantile(0.02))
flat = band.group_by(*K, "season").agg(topW=pl.col.bw.filter(pl.col.b == 9).first() / pl.col.bw.max())
bole = P.select(*K, "season", "limbs", "boleLow", "lowRatio", "lowPM", "trel").with_columns(
    clear=pl.col.boleLow / P["height"])
shape = geo.join(top5, on=[*K, "season"]).join(flat, on=[*K, "season"]).join(env, on=[*K, "season"]) \
    .join(bole, on=[*K, "season"], how="left") \
    .with_columns(H=pl.col.height * M, WH=(pl.col.wR - pl.col.wL) / pl.col.height,
                  DH=(pl.col.zR - pl.col.zL) / pl.col.height) \
    .filter(pl.col.season.is_in(SEAS)) \
    .select(*K, "season", pl.col.H.round(1), pl.col.WH.round(2), pl.col.DH.round(2), pl.col.top5.round(2),
            pl.col.topW.round(2), pl.col.r45.round(2), "limbs", (pl.col.boleLow * M).round(2).alias("boleM"),
            pl.col.clear.round(3), pl.col.lowRatio.round(3), (pl.col.lowRatio / pl.col.trel).round(0).alias("lowXtrel"),
            pl.col.lowPM.round(1)).sort("sp", "season", "cond", "seed")
print("== crown and bole, seasons 30/60/100 (H m; W/H frontal, D/H in depth; clear = lowest live limb / H)")
print(shape)
shape.write_csv(f"{d}/shape.csv")

print("== the box: buds outside it (every season), the crown's reach from the root (m), at 100 and max")
box = S.group_by(*K).agg(outsideMax=pl.col.outside.max(), outsideSeasons=(pl.col.outside > 0).sum(),
                         reachX=pl.col.maxDx.max() * M, reachZ=pl.col.maxDz.max() * M,
                         buds100=pl.col.buds.filter(pl.col.season == 100).first(),
                         H100=pl.col.height.filter(pl.col.season == 100).first() * M).sort("sp", "cond", "seed")
print(box.with_columns(pl.col(pl.Float64).round(1)))
box.write_csv(f"{d}/box.csv")

print("== the leader: height (m) by season")
print(S.filter(pl.col.season.is_in([40, 60, 75, 90, 100])).with_columns(H=(pl.col.height * M).round(1))
      .pivot(on="season", index=K, values="H").sort("sp", "cond", "seed"))

print("== sheds, seasons 20-100: by rule, the leafless share, and the leaf shed per season / standing leaf")
w = pl.col.season.is_between(20, 100)
sh = X.filter(w).group_by(*K).agg(
    n=pl.len(), pm=(pl.col.why == "P<M").sum(), light=(pl.col.why == "light").sum(), both=(pl.col.why == "both").sum(),
    leafless=(pl.col.leaf == 0).mean(), leafyPM=((pl.col.leaf > 0) & (pl.col.why == "P<M")).sum(),
    leafyLight=((pl.col.leaf > 0) & (pl.col.why != "P<M")).sum(), leafLost=pl.col.leaf.sum(),
    leaflessAge1=((pl.col.leaf == 0) & (pl.col.budAgeMax == 1)).sum() / (pl.col.leaf == 0).sum(),
    order1=(pl.col.order == 1).sum())
stand = S.filter(w).group_by(*K).agg(leafSum=pl.col.leaf.sum())
sh = sh.join(stand, on=K).with_columns(leafPerSeason=pl.col.leafLost / pl.col.leafSum).drop("leafLost", "leafSum")
print(sh.with_columns(pl.col(pl.Float64).round(4)).sort("sp", "cond", "seed"))
sh.write_csv(f"{d}/sheds.csv")

print("== upper flank and below-shell, seasons 50-100: leaf share, Q / Q90, new-metamer share")
win = pl.col.season.is_between(50, 100)
L = lb.filter(win).group_by(*K, "sector", "shell").agg(leaf=pl.col.leaf.sum(), qMed=pl.col.qn.median())
L = L.with_columns(leafShare=pl.col.leaf / pl.col.leaf.sum().over(K))
G = nw.filter(win).group_by(*K, "sector", "shell").agg(new=pl.len())
G = G.with_columns(newShare=pl.col.new / pl.col.new.sum().over(K))
T = L.join(G, on=[*K, "sector", "shell"], how="left").filter(
    (pl.col.shell & (pl.col.sector == "2 flank")) | (pl.col.shell & (pl.col.sector == "4 below")))
T = T.select(*K, "sector", pl.col.leafShare.round(3), pl.col.qMed.round(2), pl.col.newShare.round(3)) \
    .sort("sp", "sector", "cond", "seed")
print(T)
T.write_csv(f"{d}/flank.csv")
