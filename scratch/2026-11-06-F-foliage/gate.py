"""A4's hard crown-base gate (plan, "A4 and A5's gates", fixed before the result): per species (beech, hornbeam),
seeds with >= 1 planted survivor >= 10 m at both 100 and 150 count; a seed passes when the species' median
like-for-like crown base (lowest first-order limb reaching 2.5 m, / H) is inside the real stand p10-p90 at both.
Pass: >= 75% of counted seeds."""
import sys, subprocess, json, polars as pl
BAND = {"beech": (0.10, 0.56), "hornbeam": (0.09, 0.34), "oak": (0.12, 0.37)}
D = sys.argv[1]
out = subprocess.run([sys.executable, "-I", D + "/limbs_rows.py", D], capture_output=True, text=True, check=True).stdout
df = pl.DataFrame(json.loads(out))
for sp, (lo, hi) in BAND.items():
    x = df.filter(pl.col("species") == sp)
    med = x.group_by(["seed", "season"]).agg(pl.col("cbG").median())
    seeds = []
    for s in sorted(med["seed"].unique().to_list()):
        m = {r[1]: r[2] for r in med.filter(pl.col("seed") == s).iter_rows()}
        if 100 in m and 150 in m:
            seeds.append((s, m[100], m[150], lo <= m[100] <= hi and lo <= m[150] <= hi))
    n = len(seeds); p = sum(1 for t in seeds if t[3])
    tag = "(advisory: oak goes to its form work)" if sp == "oak" else ("PASS" if n and p / n >= 0.75 else "FAIL")
    print(f"{sp}: {p}/{n} counted seeds in band [{lo}-{hi}] {tag}")
    print("   ", " ".join(f"s{s}:{a:.2f}/{b:.2f}{'' if ok else '✗'}" for s, a, b, ok in seeds))
