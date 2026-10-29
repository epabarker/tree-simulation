"""THROWAWAY PROTOTYPE: the τ note's tables from run.ts's results-r6-*.json.

    python3 docs/experiments/code/2026-10-29-proto3d/agg_tau.py runs/proto3d-tau
"""

import glob
import json
import sys

out = sys.argv[1] if len(sys.argv) > 1 else "runs/proto3d-tau"
res: dict = {}
for f in sorted(glob.glob(f"{out}/results-r6*.json")):
    res.update(json.load(open(f)))

ORDER = ["d48-hard", "d48-t050", "d48-t020", "d48-t000", "d48-edge", "d48-wide",
         "d64-hard", "d64-t050", "d64-t020", "d64-t000", "d64-edge", "d64-edge02", "d64-wide"]
SEASONS = ["20", "40", "60", "100"]


def ref(name):
    return res["2d-wide-r6" if "wide" in name else "2d-r6"]


def bands(bins, width=4):
    total = sum(bins) or 1
    return " ".join(f"{100 * sum(bins[i:i + width]) / total:.1f}" for i in range(0, len(bins), width))


print("## 2D references")
for k in ("2d-r6", "2d-wide-r6"):
    for s in SEASONS:
        r = res[k][s]
        print(k, s, f"metamers {r['metamers']} h {r['height']:.0f} width {r['crownWidth']:.0f}",
              f"below p50 {r['below']['p50']:.3f} pooled {r['below']['pooled']:.3f}", "yBins", r["yBins"])

print("\n## m, below-half share, crown depth, faces")
print("| config | season | metamers | m | h p50 | depth p50 | width p50 | below p10/p50/p90 | 2D below p50 | faces (even) | beyond | light ms | μs/metamer |")
for name in ORDER:
    k = f"{name}-r6"
    if k not in res:
        continue
    for s in SEASONS:
        r = res[k]["rows"][s]
        r2 = ref(name)[s]
        b = r["below"]
        print(f"| {name} | {s} | {r['metamers']} | {r['metamers'] / r2['metamers']:.1f} | {r['height']['p50']:.0f} |"
              f" {r['crownDepth']['p50']:.1f} | {r['crownWidth']['p50']:.0f} |"
              f" {b['p10']:.2f} / {b['p50']:.2f} / {b['p90']:.2f} | {r2['below']['p50']:.2f} |"
              f" {100 * r['faceShare']:.1f} ({100 * r['faceEven']:.1f}) | {r['beyond']:.0f} | {r['lightMs']:.0f} | {r['usPerMetamer']:.2f} |")

print("\n## z profiles (4-cell bands, % of leaf area, front face first)")
for name in ORDER:
    k = f"{name}-r6"
    if k not in res:
        continue
    for s in ("40", "100"):
        print(f"| {name} | {s} | {bands(res[k]['rows'][s]['bins'])} |")

print("\n## height profiles (tenths of each tree's height, % of leaf area, ground first)")
for name in ["2d", "2d-wide"] + ORDER:
    k = f"{name}-r6"
    if k not in res:
        continue
    for s in ("40", "100"):
        rows = res[k]["rows"] if "rows" in res[k] else res[k]
        print(f"| {name} | {s} | {' '.join(f'{100 * v:.0f}' for v in rows[s]['yBins'])} |")
