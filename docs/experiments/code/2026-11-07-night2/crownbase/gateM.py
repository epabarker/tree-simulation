"""M's gates (docs/plans/2026-11-06-day2.md, fixed before any result): per variant over the six opening seeds,
metamers at 150 (median) >= 0.45x today's; every seed >= 2 live trees >= 10 m (40 cells) at 150; median crown
base (like-for-like cbG) of planted beech+hornbeam at 150 over counted trees >= 0.10."""
import sys, json, glob, os, subprocess, statistics, polars as pl
D = sys.argv[1]
rows = json.loads(subprocess.run([sys.executable, "-I", D + "/limbs_rows.py", D], capture_output=True, text=True, check=True).stdout)
cb = pl.DataFrame(rows)
met, can = {}, {}
for run in glob.glob(f"{D}/runs/*"):
    k = os.path.basename(run).split("-")[0]; s = os.path.basename(run).split("-s")[-1]
    m = pl.read_csv(run + "/run/metrics.csv", infer_schema_length=0).with_columns([pl.col(c).cast(pl.Float64) for c in ("season", "alive", "height", "metamers")])
    L = m.filter((pl.col("season") == 150) & (pl.col("alive") == 1))
    met.setdefault(k, []).append(L["metamers"].sum()); can.setdefault(k, []).append((s, L.filter(pl.col("height") >= 40).height))
today = statistics.median(met["today"])
for k in sorted(met):
    ratio = statistics.median(met[k]) / today
    empt = [s for s, n in can[k] if n < 2]
    x = cb.filter((pl.col("kind") == k) & (pl.col("season") == 150) & pl.col("species").is_in(["beech", "hornbeam"]))
    cbm = x["cbG"].median() if x.height else float("nan")
    ok = ratio >= 0.45 and not empt and cbm >= 0.10
    print(f"{k:8s} metamers {ratio:.2f}x  seeds<2 canopy: {empt or 'none'}  canopy/seed {[n for _, n in sorted(can[k])]}  crown base beech+hornbeam @150 median {cbm:.2f} (n {x.height})  -> {'PASS' if ok else 'fail'}")
