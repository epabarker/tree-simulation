import sys, json, subprocess, polars as pl
D = sys.argv[1]; KINDS = sys.argv[2].split(",")
df = pl.DataFrame(json.loads(subprocess.run([sys.executable, "-I", D + "/limbs_rows.py", D], capture_output=True, text=True, check=True).stdout))
BAND = {"beech": (0.10, 0.56), "hornbeam": (0.09, 0.34), "oak": (0.12, 0.37)}
for k in KINDS:
    x = df.filter((pl.col("kind") == k) & (pl.col("season") == 150))
    for sp, (lo, hi) in BAND.items():
        y = x.filter(pl.col("species") == sp)
        if y.height == 0: continue
        inb = y.filter((pl.col("cbG") >= lo) & (pl.col("cbG") <= hi)).height
        print(f"{k:8s} {sp:8s} trees {y.height:3d}  in band {inb:3d} ({inb/y.height:.0%})  cb median {y['cbG'].median():.2f}  lower-limb light {y['relLight'].median():.2f}  seeds {y['seed'].n_unique()}")
