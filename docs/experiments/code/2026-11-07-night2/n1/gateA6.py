"""A6's screen (docs/plans/2026-11-06-day2.md, fixed before any result): per kind over the six opening seeds:
crown base (A4's gate per species: beech 0.10-0.56, hornbeam 0.09-0.34 at both 100 and 150, share of counted seeds),
stand LAI at 100 and 150 (median; band 5-9), canopy trees >= 15 m per hectare (soft, near 289), seeds with < 2 trees
>= 10 m (soft), metamers at 150 against today (soft)."""
import sys, json, glob, os, subprocess, statistics, polars as pl
D = sys.argv[1]; KINDS = sys.argv[2].split(",")
BAND = {"beech": (0.10, 0.56), "hornbeam": (0.09, 0.34)}
cb = pl.DataFrame(json.loads(subprocess.run([sys.executable, "-I", D + "/limbs_rows.py", D], capture_output=True, text=True, check=True).stdout))
out = {}
for k in KINDS:
    lai = {100: [], 150: []}; dens = []; thin = []; met = []
    for run in sorted(glob.glob(f"{D}/runs/{k}-x-s*")):
        p = json.load(open(run + "/params.json")); W = p["world"]["width"]; Dz = p["world"].get("depth", 64)
        m = pl.read_csv(run + "/run/metrics.csv", infer_schema_length=0).with_columns([pl.col(c).cast(pl.Float64) for c in ("season", "alive", "height", "metamers")])
        L = m.filter((pl.col("season") == 150) & (pl.col("alive") == 1))
        ha = (W * 0.25) * (Dz * 0.25) / 10000
        dens.append(L.filter(pl.col("height") >= 60).height / ha)
        thin.append(L.filter(pl.col("height") >= 40).height < 2)
        met.append(L["metamers"].sum())
        l = pl.read_csv(run + "/run/light.csv", schema_overrides={"lad": pl.Float64, "shade": pl.Float64})
        for s in (100, 150):
            x = l.filter(pl.col("season") == s)
            if x.height:
                lai[s].append(x.group_by("col").agg(pl.col("lad").sum())["lad"].mean())
    res = {"lai100": statistics.median(lai[100]) if lai[100] else float("nan"), "lai150": statistics.median(lai[150]) if lai[150] else float("nan"),
           "canopy_per_ha": statistics.median(dens), "thin_seeds": sum(thin), "metamers150": statistics.median(met)}
    for sp, (lo, hi) in BAND.items():
        x = cb.filter((pl.col("kind") == k) & (pl.col("species") == sp))
        med = x.group_by(["seed", "season"]).agg(pl.col("cbG").median())
        n = p_ = 0
        for s in med["seed"].unique().to_list():
            mm = {r[1]: r[2] for r in med.filter(pl.col("seed") == s).iter_rows()}
            if 100 in mm and 150 in mm:
                n += 1; p_ += lo <= mm[100] <= hi and lo <= mm[150] <= hi
        res[sp] = f"{p_}/{n}"
        res[sp + "_cb150"] = round(x.filter(pl.col("season") == 150)["cbG"].median() or float("nan"), 2)
    out[k] = res
base = out.get(KINDS[-1], {}).get("metamers150")
for k, r in out.items():
    print(f"{k:7s} LAI {r['lai100']:.1f}/{r['lai150']:.1f}  canopy {r['canopy_per_ha']:.0f}/ha  thin {r['thin_seeds']}  metamers {r['metamers150']/base:.2f}x  "
          f"beech {r['beech']} (cb150 {r['beech_cb150']})  hornbeam {r['hornbeam']} (cb150 {r['hornbeam_cb150']})")
