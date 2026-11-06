"""Crown base diagnostics from metamers.csv snapshots.
Per planted tree of beech/hornbeam/oak at each snapshot season:
  cbG   = height of the lowest first-order limb whose subtree reaches >= 10 cells (2.5 m) from its attachment, / H
          (the QSM cbH's rule: lowest limb >= 2.5 m; here only live wood exists in the model)
  low3  = for the three lowest such limbs: attach height / H, light per metamer relative to the crown top
          (qSum/nSum at the limb's root over the median qSum/nSum of the top-decile metamers' own light), and pSum/mSum.
"""
import sys, glob, json, os
import numpy as np
import polars as pl

D = sys.argv[1]
SPECIES = ("beech", "hornbeam", "oak")
rows = []
for run in sorted(glob.glob(f"{D}/runs/*")):
    kind, arg, seed = os.path.basename(run).split("-")
    p = json.load(open(f"{run}/params.json"))
    n_planted = len(p["trees"])
    mpath = f"{run}/run/metamers.csv"
    if not os.path.exists(mpath):
        continue
    met = pl.read_csv(f"{run}/run/metrics.csv", infer_schema_length=0).select(
        pl.col("season").cast(pl.Int32), pl.col("tree").cast(pl.Int32), pl.col("species"), pl.col("alive").cast(pl.Int32))
    sp_of = {(r[0], r[1]): r[2] for r in met.filter(pl.col("alive") == 1).iter_rows()}
    m = pl.read_csv(mpath, infer_schema_length=0)
    m = m.with_columns([pl.col(c).cast(pl.Float64) for c in ("x0", "y0", "x1", "y1", "z0", "z1", "qSum", "nSum", "pSum", "mSum")] +
                       [pl.col(c).cast(pl.Int64) for c in ("season", "tree", "birthId", "parentBirthId", "order")])
    for (season, tree), g in m.group_by(["season", "tree"]):
        sp = sp_of.get((season, tree))
        if sp not in SPECIES or (kind != "stand" and tree >= n_planted):
            continue
        bid = g["birthId"].to_numpy(); par = g["parentBirthId"].to_numpy(); order = g["order"].to_numpy()
        y0 = g["y0"].to_numpy(); y1 = g["y1"].to_numpy(); x0 = g["x0"].to_numpy(); x1 = g["x1"].to_numpy()
        z0 = g["z0"].to_numpy(); z1 = g["z1"].to_numpy()
        q = g["qSum"].to_numpy(); n = g["nSum"].to_numpy(); P = g["pSum"].to_numpy(); M = g["mSum"].to_numpy()
        base_y = y0.min()
        H = y1.max() - base_y
        if H < 40:
            continue
        idx = {b: i for i, b in enumerate(bid)}
        # limb of each metamer: the order-1 root it descends from (rows are parent-before-child)
        limb = np.full(len(bid), -1)
        for i in range(len(bid)):
            j = idx.get(par[i], -1)
            if j < 0:
                continue
            if order[i] == 1 and order[j] == 0:
                limb[i] = i
            elif limb[j] >= 0:
                limb[i] = limb[j]
        light = np.where(n > 0, q / np.maximum(n, 1), 0.0)
        top = y1 >= base_y + 0.9 * H
        qtop = np.median(light[top]) if top.any() else np.nan
        roots = np.unique(limb[limb >= 0])
        limbs = []
        for r in roots:
            sel = limb == r
            ax, ay, az = x0[r], y0[r], z0[r]
            reach = np.sqrt((x1[sel] - ax) ** 2 + (y1[sel] - ay) ** 2 + (z1[sel] - az) ** 2).max()
            if reach >= 10:
                limbs.append(((ay - base_y) / H, light[r] / qtop if qtop > 0 else np.nan, P[r] / M[r] if M[r] > 0 else np.nan))
        limbs.sort()
        if not limbs:
            continue
        low = limbs[:3]
        rows.append(dict(kind=kind, arg=arg, seed=int(seed[1:]), season=int(season), tree=int(tree), species=sp, Hm=H * 0.25,
                         cbG=limbs[0][0], relLight=float(np.median([l[1] for l in low])), PM=float(np.median([l[2] for l in low])),
                         nlimbs=len(limbs)))
import json as _j; print(_j.dumps(rows)); raise SystemExit
pl.Config.set_tbl_rows(60)
print(df.group_by(["kind", "arg", "species", "season"]).agg(pl.len(), pl.col("Hm").median().round(1), pl.col("cbG").median().round(2),
      pl.col("cbG").quantile(0.9).round(2).alias("cbG_p90"), pl.col("relLight").median().round(3), pl.col("PM").median().round(2))
      .sort(["species", "kind", "arg", "season"]))
