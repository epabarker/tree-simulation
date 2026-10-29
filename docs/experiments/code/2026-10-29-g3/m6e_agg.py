"""THROWAWAY (G3): the M6e-in-3D pattern table from run.ts's results (runs/g3/m6e).

    python3 docs/experiments/code/2026-10-29-g3/m6e_agg.py runs/g3/m6e
"""

import glob
import json
import statistics as st
import sys

d = sys.argv[1] if len(sys.argv) > 1 else "runs/g3/m6e"
res: dict = {}
for f in glob.glob(f"{d}/results-r6-s*.json"):
    seed = f.split("-s")[1].split("-")[0]
    for k, v in json.load(open(f)).items():
        if k.startswith("g3-"):
            res.setdefault(k.replace("-r6", ""), {})[seed] = v["rows"]
print("| sky | season | metamers (seeds) | height p50 | crown depth p50 | crown width p50 | below half p50 | light ms |")
for K in [8, 12, 16, 24, 32]:
    for rot in ["", "-rot"]:
        name = f"g3-k{K}{rot}"
        for s in ["40", "100"]:
            rows = [res[name][seed][s] for seed in sorted(res[name])]
            m = lambda key, sub=None: st.mean((r[key][sub] if sub else r[key]) for r in rows)
            mets = ", ".join(str(r["metamers"]) for r in rows)
            print(f"| K {K}{' rotated' if rot else ''} | {s} | {mets} | {m('height', 'p50'):.1f} | {m('crownDepth', 'p50'):.1f} | {m('crownWidth', 'p50'):.1f} | {100 * m('below', 'p50'):.1f}% | {m('lightMs'):.0f} |")
