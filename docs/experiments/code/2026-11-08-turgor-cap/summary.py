"""Exploratory (seeds 1-3): the sink (turgor) limit on extension, wayfinder #87, HEAD against patch.

Reads runs/turgor/cap/<cond>-<species>-s<seed>_*.csv (cond: head | fric | grav), written by
rust/core/examples/cap_probe.rs on the open-grown box (60 m square, ADR 0062). The crown geometry
follows the open-box note's summary.py: leafy buds give leafLo (5th percentile of leaf height), the
frontal half-width w (95th percentile of |dx|), and rho, theta about the crown's centre; shell
rho >= 0.7, flank 30-60 degrees from vertical. Cells are 0.25 m. The rounded-crown page's
diagnostics 1-6:

1. top5: share of the leaf above 0.8 H (0.15-0.30 rounded; 0.38-0.46 cap).
2. flankNew: upper-flank shell's share of new metamers (>= 5% for oak and maple).
3. extension (metamers per shoot) against path length and height: Spearman rho over shoots, and the
   mean shoot by path band, leader and laterals apart.
4. leader: height gain (m) per window, and the leader shoot's mean metamers.
5. W/H against DBH (m) at 30/60/100.
6. r45: the leaf envelope at 45 degrees (cone of the same W/H 0.47, ellipse 1, box 1.41); topW, the
   width at 0.9 H over the widest band (about 1 for a flat cap).

    uv run --project analysis python docs/experiments/code/2026-11-08-turgor-cap/summary.py runs/turgor
"""
import sys, glob, os
import polars as pl

d = sys.argv[1]
M = 0.25
pl.Config.set_tbl_rows(400); pl.Config.set_tbl_cols(40); pl.Config.set_tbl_width_chars(260)
SECT = pl.when(pl.col.theta < 30).then(pl.lit("1 top")).when(pl.col.theta < 60).then(pl.lit("2 flank")) \
    .when(pl.col.theta < 120).then(pl.lit("3 side")).otherwise(pl.lit("4 below"))


def load(kind):
    out = []
    for f in sorted(glob.glob(f"{d}/cap/*_{kind}.csv")):
        case = os.path.basename(f).removesuffix(f"_{kind}.csv")
        cond, sp, seed = case.split("-")
        if os.path.getsize(f) == 0:
            continue
        df = pl.read_csv(f, infer_schema_length=None)
        if df.height:
            out.append(df.drop("species", strict=False).with_columns(
                case=pl.lit(case), cond=pl.lit(cond), sp=pl.lit(sp), seed=pl.lit(int(seed[1:]))))
    return pl.concat(out, how="vertical_relaxed")


S, B, N, SH = (load(k) for k in ("season", "buds", "new", "shoots"))
# The leader: the shoot on the tree's highest node that season (the trunk's own axis ends early,
# handed to relays and forks, so the probe's axis flag is not used).
SH = SH.with_columns(leader=(pl.col.hostH == pl.col.hostH.max().over("cond", "sp", "seed", "season")).cast(pl.Int8))
K = ["cond", "sp", "seed"]
leafy = B.filter(pl.col.leaf > 0)
geo = leafy.group_by(*K, "season").agg(
    leafLo=pl.col.dy.quantile(0.05), w=pl.col.dx.abs().quantile(0.95), q90=pl.col.q.quantile(0.9),
    wL=pl.col.dx.quantile(0.02), wR=pl.col.dx.quantile(0.98),
).join(S.select(*K, "season", "height", "rDbh"), on=[*K, "season"])
geo = geo.with_columns(yc=(pl.col.leafLo + pl.col.height) / 2, hh=(pl.col.height - pl.col.leafLo) / 2)


def place(df, on="season"):
    df = df.join(geo.select(*K, pl.col.season.alias(on), "w", "yc", "hh", "height", "q90", "leafLo"), on=[*K, on])
    return df.with_columns(u=pl.col.dx / pl.col.w, v=(pl.col.dy - pl.col.yc) / pl.col.hh).with_columns(
        rho=(pl.col.u ** 2 + pl.col.v ** 2).sqrt(),
        theta=pl.arctan2(pl.col.u.abs(), pl.col.v).degrees(),
        rel=pl.col.dy / pl.col.height,
    ).filter(pl.col.theta.is_not_nan()).with_columns(sector=SECT, shell=pl.col.rho >= 0.7)


lb = place(leafy)
nw = place(N)
SEAS = [30, 60, 100]
top5 = lb.group_by(*K, "season").agg(top5=(pl.col.leaf * (pl.col.rel >= 0.8)).sum() / pl.col.leaf.sum())
env = lb.filter((pl.col.theta - 45).abs() < 7.5).group_by(*K, "season").agg(r45=pl.col.rho.quantile(0.95))
band = lb.with_columns(b=((pl.col.dy - pl.col.leafLo) / (pl.col.height - pl.col.leafLo) * 10).floor().clip(0, 9)) \
    .group_by(*K, "season", "b").agg(bw=pl.col.dx.quantile(0.98) - pl.col.dx.quantile(0.02))
flat = band.group_by(*K, "season").agg(topW=pl.col.bw.filter(pl.col.b == 9).first() / pl.col.bw.max())
shape = geo.join(top5, on=[*K, "season"]).join(flat, on=[*K, "season"]).join(env, on=[*K, "season"]) \
    .with_columns(H=pl.col.height * M, WH=(pl.col.wR - pl.col.wL) / pl.col.height, DBH=pl.col.rDbh * 2 * M) \
    .filter(pl.col.season.is_in(SEAS)) \
    .select(*K, "season", pl.col.H.round(1), pl.col.WH.round(2), pl.col.DBH.round(2), pl.col.top5.round(2),
            pl.col.topW.round(2), pl.col.r45.round(2)).sort("sp", "season", "cond", "seed")
print("== 1, 5, 6: crown at seasons 30/60/100 (H m, W/H frontal, DBH m, top5, topW, r45)")
print(shape)
shape.write_csv(f"{d}/shape.csv")

print("== 2: upper-flank and lower outer shell, share of new metamers (and of leaf), by window")
rows = []
for lo, hi in [(30, 60), (60, 100)]:
    win = pl.col.season.is_between(lo, hi)
    G = nw.filter(win).group_by(*K, "sector", "shell").agg(new=pl.len())
    G = G.with_columns(newShare=pl.col.new / pl.col.new.sum().over(K))
    L = lb.filter(win).group_by(*K, "sector", "shell").agg(leaf=pl.col.leaf.sum())
    L = L.with_columns(leafShare=pl.col.leaf / pl.col.leaf.sum().over(K))
    T = L.join(G, on=[*K, "sector", "shell"], how="full", coalesce=True).filter(
        pl.col.shell & pl.col.sector.is_in(["2 flank", "4 below"])).with_columns(win=pl.lit(f"{lo}-{hi}"))
    rows.append(T.select(*K, "win", "sector", pl.col.leafShare.round(3), pl.col.newShare.round(3)))
flank = pl.concat(rows).sort("sp", "win", "sector", "cond", "seed")
print(flank)
flank.write_csv(f"{d}/flank.csv")

print("== 3: extension (metamers per shoot) against path length and height, seasons 50-100")
sh = SH.filter(pl.col.season.is_between(50, 100))
fp = sh.group_by(*K, "leader").agg(
    shoots=pl.len(), nMean=pl.col.n.mean(),
    rhoPath=pl.corr("n", "hostPath", method="spearman"), rhoH=pl.corr("n", "hostH", method="spearman"))
print(fp.with_columns(pl.col(pl.Float64).round(2)).sort("sp", "leader", "cond", "seed"))
fp.write_csv(f"{d}/fingerprint.csv")
# Mean shoot by path band (laterals), pooled over seeds.
bands = sh.filter(pl.col.leader == 0).with_columns(pathBand=(pl.col.hostPath // 10 * 10).cast(pl.Int32)) \
    .group_by("cond", "sp", "pathBand").agg(n=pl.col.n.mean(), shoots=pl.len()) \
    .filter(pl.col.shoots >= 30).sort("sp", "cond", "pathBand")
print(bands.with_columns(pl.col.n.round(2)).pivot(on="pathBand", index=["sp", "cond"], values="n",
                                                    sort_columns=True))
bands.write_csv(f"{d}/pathbands.csv")

print("== 4: the leader, height gain (m) per window and its shoot (metamers, dump seasons)")
lead = []
for lo, hi in [(0, 30), (30, 60), (60, 100)]:
    w = S.filter(pl.col.season.is_between(lo, hi))
    lead.append(w.group_by(*K).agg(
        gain=((pl.col.height.filter(pl.col.season == hi).first() - pl.col.height.filter(pl.col.season == lo).first()) * M),
    ).join(SH.filter(pl.col.leader == 1, pl.col.season.is_between(lo + 1, hi)).group_by(*K).agg(leaderN=pl.col.n.mean()),
           on=K, how="left").with_columns(win=pl.lit(f"{lo}-{hi}")))
lead = pl.concat(lead)
print(lead.with_columns(pl.col(pl.Float64).round(2)).pivot(on="win", index=K, values=["gain", "leaderN"])
      .sort("sp", "cond", "seed"))
lead.write_csv(f"{d}/leader.csv")
print("== heights (m) by season")
print(S.filter(pl.col.season.is_in([30, 45, 60, 75, 90, 100])).with_columns(H=(pl.col.height * M).round(1))
      .pivot(on="season", index=K, values="H").sort("sp", "cond", "seed"))
print("== size: metamers and live buds at 100, reserve not logged")
print(S.filter(pl.col.season == 100).select(*K, "metamers", "buds", pl.col.leaf.round(0)).sort("sp", "cond", "seed"))
